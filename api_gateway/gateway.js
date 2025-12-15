const express = require('express');
const { Kafka } = require('kafkajs');
const amqp = require('amqplib'); 
const EventEmitter = require('events');
const cors = require('cors');
const schema = require('./graphql/index');
require('dotenv').config(); 
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const app = express();

const responseEmitter = new EventEmitter();

// --- KAFKA ---
const kafka = new Kafka({ 
    clientId: 'api-gateway', 
    brokers: [process.env.KAFKA_BROKER], 
    retry: { retries: 5 }
});
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'gateway-listener-group' });

let rabbitChannel = null;

async function startGateway() {
    // 1. Iniciar Kafka
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: 'auth-response', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const value = JSON.parse(message.value.toString());
                if (value.correlationId) responseEmitter.emit(value.correlationId, value);
            } catch (err) { console.error("Error Kafka:", err); }
        },
    });

    // 2. Iniciar RabbitMQ
    try {
        const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
        const connection = await amqp.connect(rabbitUrl);
        rabbitChannel = await connection.createChannel();
        
        const replyQueue = 'gateway_replies_v2';
        await rabbitChannel.assertQueue(replyQueue, { durable: true });

        console.log(`🐰 Gateway escuchando en RabbitMQ (${replyQueue})`);

        // Listener de RabbitMQ
        rabbitChannel.consume(replyQueue, (msg) => {
            if (msg) {
                console.log(`[RABBIT] Llegó mensaje. ID: ${msg.properties.correlationId}`);
                if (msg.properties.correlationId) {
                    const content = JSON.parse(msg.content.toString());
                    const data = content.response !== undefined ? content.response : content;
                    responseEmitter.emit(msg.properties.correlationId, data);
                }
            }
        }, { noAck: true });

    } catch (error) {
        console.error("Error iniciando RabbitMQ en Gateway:", error);
    }

    // 3. Iniciar Apollo
    const server = new ApolloServer({ schema });
    await server.start();

    app.use((req, res, next) => {
        req.producer = producer;
        req.responseEmitter = responseEmitter;
        next();
    });

    app.use(
        '/graphql',
        cors({
            origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'], 
            credentials: true 
        }),
        express.json(),
        expressMiddleware(server, {
            context: async ({ req }) => {
                const authHeader = req.headers.authorization || '';
                const rawKey = authHeader.replace('Token ', '').replace('Bearer ', '').trim();
                const djangoToken = rawKey ? `Token ${rawKey}` : null;
                
                let userContext = {
                    user_id: null,
                    shipping_address: null,
                    role: null
                };

                if (djangoToken) {
                    try {
                        const authResponse = await sendKafkaRequest(
                            producer, 
                            responseEmitter, 
                            'auth-request', 
                            'GET_PROFILE',
                            {}, 
                            djangoToken
                        );

                        if (authResponse && authResponse.status === 200 && authResponse.user) {
                            userContext.user_id = authResponse.user.id;
                            userContext.role = authResponse.user.role;
                            if (authResponse.user.addresses && authResponse.user.addresses.length > 0) {
                                userContext.shipping_address = authResponse.user.addresses[0];
                            }
                        }
                    } catch (error) {
                        console.warn("Error validando token en Gateway:", error.message);
                    }
                }

                return {
                    producer,
                    responseEmitter,
                    token: djangoToken,
                    rabbitChannel,
                    ...userContext
                };
            },
        })
    );

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
        console.log(`GraphQL listo en http://localhost:${PORT}/graphql`);
    });
}

startGateway().catch(err => console.error("Error iniciando Gateway:", err));