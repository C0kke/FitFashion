const express = require('express');
const { Kafka } = require('kafkajs');
const EventEmitter = require('events');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth'); 

const app = express();
app.use(express.json());
app.use(cors());

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
            const value = JSON.parse(message.value.toString());
            if (value.correlationId) {
                responseEmitter.emit(value.correlationId, value);
            }
        },
    });

    app.use((req, res, next) => {
        req.producer = producer;
        req.responseEmitter = responseEmitter;
        next();
    });

    // RUTAS
    app.use('/api/auth', authRoutes);

    const PORT = process.env.PORT;
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
}

startGateway();