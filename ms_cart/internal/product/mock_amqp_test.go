package product

import (
    "github.com/streadway/amqp"
    "github.com/stretchr/testify/mock"
)

// Mock de la conexión AMQP
type MockAMQPConnection struct {
    mock.Mock
}

func (m *MockAMQPConnection) Channel() (*amqp.Channel, error) {
    args := m.Called()
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*amqp.Channel), args.Error(1)
}

func (m *MockAMQPConnection) Close() error {
    args := m.Called()
    return args.Error(0)
}

// Mock del canal AMQP
type MockAMQPChannel struct {
    mock.Mock
}

func (m *MockAMQPChannel) QueueDeclare(name string, durable, autoDelete, exclusive, noWait bool, args amqp.Table) (amqp.Queue, error) {
    callArgs := m.Called(name, durable, autoDelete, exclusive, noWait, args)
    if callArgs.Get(0) == nil {
        return amqp.Queue{}, callArgs.Error(1)
    }
    return callArgs.Get(0).(amqp.Queue), callArgs.Error(1)
}

func (m *MockAMQPChannel) Consume(queue, consumer string, autoAck, exclusive, noLocal, noWait bool, args amqp.Table) (<-chan amqp.Delivery, error) {
    callArgs := m.Called(queue, consumer, autoAck, exclusive, noLocal, noWait, args)
    if callArgs.Get(0) == nil {
        return nil, callArgs.Error(1)
    }
    return callArgs.Get(0).(<-chan amqp.Delivery), callArgs.Error(1)
}

func (m *MockAMQPChannel) Publish(exchange, key string, mandatory, immediate bool, msg amqp.Publishing) error {
    args := m.Called(exchange, key, mandatory, immediate, msg)
    return args.Error(0)
}

func (m *MockAMQPChannel) Close() error {
    args := m.Called()
    return args.Error(0)
}

// Mock de Queue
type MockQueue struct {
    mock.Mock
}

func (m *MockQueue) GetName() string {
    args := m.Called()
    return args.String(0)
}

// Mock de Delivery
type MockDelivery struct {
    Body          []byte
    CorrelationId string
}