const { v4: uuidv4 } = require('uuid');

const waitForResponse = (correlationId, responseEmitter) => {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            responseEmitter.removeAllListeners(correlationId);
            reject(new Error('Timeout: MS Auth no respondió'));
        }, 10000);

        responseEmitter.once(correlationId, (data) => {
            clearTimeout(timeout);
            resolve(data);
        });
    });
};

const sendKafkaRequest = async (producer, responseEmitter, topic, type, payload, token = null) => {
    const correlationId = uuidv4();
    
    const messageValue = {
        type,
        correlationId,
        ...payload
    };

    if (token) {
        if (type === 'ADMIN_UPDATE_USER' || type === 'LIST_USERS') {
            messageValue.admin_token = token;
        } else {
            messageValue.token = token;
        }
    }

    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(messageValue) }],
    });

    return await waitForResponse(correlationId, responseEmitter);
};

module.exports = { sendKafkaRequest };