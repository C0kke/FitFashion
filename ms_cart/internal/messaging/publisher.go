package messaging

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/streadway/amqp"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
)

// AMQPConnection interface para permitir mocking
type AMQPConnection interface {
	Channel() (AMQPChannel, error)
	Close() error
}

// AMQPChannel interface para permitir mocking
type AMQPChannel interface {
	Close() error
	ExchangeDeclare(name, kind string, durable, autoDelete, internal, noWait bool, args amqp.Table) error
	Publish(exchange, key string, mandatory, immediate bool, msg amqp.Publishing) error
}

// RealAMQPConnection wrapper para *amqp.Connection que implementa AMQPConnection
type RealAMQPConnection struct {
	conn *amqp.Connection
}

func NewRealAMQPConnection(conn *amqp.Connection) *RealAMQPConnection {
	return &RealAMQPConnection{conn: conn}
}

func (r *RealAMQPConnection) Channel() (AMQPChannel, error) {
	return r.conn.Channel()
}

func (r *RealAMQPConnection) Close() error {
	return r.conn.Close()
}

type OrderPublisher struct {
	conn AMQPConnection
}

func NewOrderPublisher(conn *amqp.Connection) *OrderPublisher {
	return &OrderPublisher{
		conn: NewRealAMQPConnection(conn),
	}
}

// NewOrderPublisherWithConn para testing, acepta una interfaz directamente
func NewOrderPublisherWithConn(conn AMQPConnection) *OrderPublisher {
	return &OrderPublisher{
		conn: conn,
	}
}

func (p *OrderPublisher) PublishOrderCreated(ctx context.Context, order *models.Order) error {
	
	ch, err := p.conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	err = ch.ExchangeDeclare(
		"order_events", 
		"fanout",    
		true,      
		false, 
		false,   
		false,      
		nil,
	)
	if err != nil {
		return err
	}

	messageBody := map[string]interface{}{
		"order_id":    order.ID,
		"user_id":     order.UserID,
		"total":       order.Total,
		"items":       order.OrderItems,
        "timestamp":   time.Now(),
	}
	body, _ := json.Marshal(messageBody)

	err = ch.Publish(
		"order_events", 
		"",         
		false,      
		false,       
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)
	if err != nil {
		log.Printf("Advertencia: Fallo al publicar evento order.created: %v", err)
	} else {
        log.Printf("Evento 'order.created' publicado para la orden #%d", order.ID)
    }

	return nil
}