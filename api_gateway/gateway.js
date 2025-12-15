const express = require('express');
const { Kafka } = require('kafkajs');
const EventEmitter = require('events');
const cors = require('cors');
const schema = require('./graphql/index');
require('dotenv').config(); 
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');

const app = express();

const responseEmitter = new EventEmitter();

const kafka = new Kafka({ 
    clientId: 'api-gateway', 
    brokers: [process.env.KAFKA_BROKER], 
    retry: { retries: 5 }
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'gateway-listener-group' });

async function startGateway() {
    await producer.connect();
    await consumer.connect();
    
    await consumer.subscribe({ topic: 'auth-response', fromBeginning: false });

    await consumer.run({
        eachMessage: async ({ message }) => {
            try {
                const value = JSON.parse(message.value.toString());
                if (value.correlationId) {
                    responseEmitter.emit(value.correlationId, value);
                }
            } catch (err) {
                console.error("Error parseando mensaje en Gateway:", err);
            }
        },
    });

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
                
                return {
                    producer,
                    responseEmitter,
                    token: djangoToken 
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