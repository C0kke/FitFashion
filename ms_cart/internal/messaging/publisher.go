package messaging

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/streadway/amqp"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/pkg/messaging"
)

type OrderPublisher struct {
	conn *amqp.Connection
}

func NewOrderPublisher() *OrderPublisher {
	return &OrderPublisher{
		conn: messaging.RabbitMQConn,
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