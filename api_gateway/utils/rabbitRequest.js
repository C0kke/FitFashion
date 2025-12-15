const rabbitRequest = (channel, responseEmitter, queueName, payload) => {
  return new Promise((resolve, reject) => {
    
    if (!channel) return reject(new Error("El canal de RabbitMQ no está listo"));

    const correlationId = Math.random().toString() + Date.now().toString();

    const timeout = setTimeout(() => {
      responseEmitter.removeAllListeners(correlationId);
      reject(new Error('Tiempo de espera agotado (RabbitMQ Timeout)'));
    }, 10000);

    responseEmitter.once(correlationId, (data) => {
      clearTimeout(timeout);
      resolve(data);
    });

    const messageBuffer = Buffer.from(JSON.stringify(payload));

    channel.sendToQueue(queueName, messageBuffer, {
      correlationId: correlationId,
      replyTo: 'gateway_replies_v2' 
    });
  });
};

module.exports = rabbitRequest;