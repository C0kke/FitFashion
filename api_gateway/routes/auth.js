const express = require('express');
const router = express.Router();
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

router.post('/token/login', async (req, res) => {
    const { username, password } = req.body;
    const correlationId = uuidv4();
    
    const { producer, responseEmitter } = req;

    try {
        await producer.send({
            topic: 'auth-request',
            messages: [{ 
                value: JSON.stringify({ 
                    type: 'LOGIN',
                    username, 
                    password, 
                    correlationId 
                }) 
            }],
        });

        const result = await waitForResponse(correlationId, responseEmitter);
        
        if (result.token && !result.auth_token) result.auth_token = result.token;
        
        res.status(result.status).json(result);
    } catch (error) {
        res.status(504).json({ error: error.message });
    }
});

router.post('/users', async (req, res) => {
    const { username, password, email, name } = req.body;
    const correlationId = uuidv4();
    const { producer, responseEmitter } = req;

    try {
        await producer.send({
            topic: 'auth-request',
            messages: [{ 
                value: JSON.stringify({ 
                    type: 'REGISTER',
                    username, 
                    password,
                    email,
                    first_name: name,
                    correlationId 
                }) 
            }],
        });

        const result = await waitForResponse(correlationId, responseEmitter);
        res.status(result.status).json(result);
    } catch (error) {
        res.status(504).json({ error: error.message });
    }
});

router.get('/users/me', async (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Token ', '') : null;

    const correlationId = uuidv4();
    const { producer, responseEmitter } = req;

    try {
        await producer.send({
            topic: 'auth-request',
            messages: [{ 
                value: JSON.stringify({ 
                    type: 'GET_PROFILE',
                    token: token,
                    correlationId 
                }) 
            }],
        });
        const result = await waitForResponse(correlationId, responseEmitter);
        res.status(result.status).json(result);
    } catch (error) {
        res.status(504).json({ error: error.message });
    }
});

router.get('/users', async (req, res) => {
    const correlationId = uuidv4();
    const { producer, responseEmitter } = req;

    try {
        await producer.send({
            topic: 'auth-request',
            messages: [{ 
                value: JSON.stringify({ 
                    type: 'LIST_USERS',
                    correlationId 
                }) 
            }],
        });
        const result = await waitForResponse(correlationId, responseEmitter);
        res.status(result.status).json(result);
    } catch (error) {
        res.status(504).json({ error: error.message });
    }
});

module.exports = router;