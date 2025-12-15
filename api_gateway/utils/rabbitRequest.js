const amqp = require('amqplib');

// Enviar mensajes y esperar respuesta de RabbitMQ
const rabbitRequest = async (queueName, payload) => {
  const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';
  
  try {
    // 1. Conectar a RabbitMQ
    const connection = await amqp.connect(url);
    const channel = await connection.createChannel();

    // 2. Crear una cola temporal exclusiva para recibir respuesta del mensaje
    const q = await channel.assertQueue('', { exclusive: true });

    // Generamos un ID único para saber que la respuesta es para esta solicitud
    const correlationId = generateUuid();

    return new Promise((resolve, reject) => {
      // Timeout de seguridad: Si en 5 segundos no responden, cancelamos
      const timeout = setTimeout(() => {
        channel.close();
        connection.close();
        reject(new Error('Tiempo de espera agotado para RabbitMQ'));
      }, 5000);

      // 3. Escuchar en la cola temporal esperando la respuesta
      channel.consume(q.queue, (msg) => {
        if (msg.properties.correlationId === correlationId) {
          // LLegó la respuesta
          clearTimeout(timeout);
          const content = JSON.parse(msg.content.toString());
          
          // Cerramos conexión y canal
          channel.close();
          connection.close();
          
          // Resolvemos la promesa con los datos
          resolve(content);
        }
      }, { noAck: true });

      // 4. Enviar el mensaje a la cola del Microservicio (ej: 'products_queue')
      // IMPORTANTE: NestJS espera el formato { pattern: '...', data: ... }
      const messageBuffer = Buffer.from(JSON.stringify(payload));

      channel.sendToQueue(queueName, messageBuffer, {
        correlationId: correlationId,
        replyTo: q.queue
      });
    });

  } catch (error) {
    console.error('Error en rabbitRequest:', error);
    throw new Error('Error conectando con el microservicio');
  }
};

// Función auxiliar para generar IDs únicos
function generateUuid() {
  return Math.random().toString() + Math.random().toString() + Math.random().toString();
}

module.exports = rabbitRequest;