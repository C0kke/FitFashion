const express = require('express');
const router = express.Router();

module.exports = (rabbitChannel) => {
    
    router.post('/pagos/webhook', async (req, res) => {
        res.status(200).send('OK');

        try {
            const notification = req.body;
            console.log("[Webhook Gateway] Notificación recibida:", JSON.stringify(notification));

            const isPayment = notification.type === 'payment' || notification.topic === 'payment';
            const paymentId = notification.data?.id || notification.data;

            if (isPayment && paymentId) {
                const exchangeName = 'payment_events';
                const routingKey = 'payment.notification';
                const msgBuffer = Buffer.from(JSON.stringify(notification));

                await rabbitChannel.assertExchange(exchangeName, 'topic', { durable: true });

                rabbitChannel.publish(exchangeName, routingKey, msgBuffer, { persistent: true });
                
                console.log(`[Webhook Gateway] Evento enviado a RabbitMQ: ID ${paymentId}`);
            } else {
                console.log("[Webhook Gateway] Notificación ignorada (no es pago o falta ID)");
            }

        } catch (error) {
            console.error("[Webhook Gateway] Error procesando webhook:", error);
        }
    });

    return router;
};