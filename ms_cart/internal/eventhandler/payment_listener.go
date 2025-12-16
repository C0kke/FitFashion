package eventhandler

import (
	"encoding/json"
	"log"

	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/streadway/amqp"
)

type PaymentListener struct {
	channel      *amqp.Channel
	orderService *service.OrderService
}

func NewPaymentListener(conn *amqp.Connection, orderService *service.OrderService) (*PaymentListener, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}

	exchangeName := "payment_events"
	err = ch.ExchangeDeclare(
		exchangeName,
		"topic",
		true,
		false, false, false, nil,
	)
	if err != nil {
		return nil, err
	}

	q, err := ch.QueueDeclare(
		"ms_cart_payments",
		true,       
		false, false, false, nil,
	)
	if err != nil {
		return nil, err
	}

	err = ch.QueueBind(
		q.Name,
		"payment.*", 
		exchangeName,
		false,
		nil,
	)
	if err != nil {
		return nil, err
	}

	return &PaymentListener{channel: ch, orderService: orderService}, nil
}

func (l *PaymentListener) Start() {
	msgs, err := l.channel.Consume(
		"ms_cart_payments",
		"", false, false, false, false, nil,
	)
	if err != nil {
		log.Fatalf("Fallo al consumir eventos de pago: %v", err)
	}

	go func() {
		for d := range msgs {
			log.Printf("Evento de pago recibido: %s", d.Body)

			var notification struct {
				Data struct {
					ID string `json:"id"`
				} `json:"data"`
				Type string `json:"type"`
			}

			if err := json.Unmarshal(d.Body, &notification); err != nil {
				log.Printf("Error parseando evento de pago: %v", err)
				d.Ack(false)
				continue
			}

			if notification.Data.ID != "" {
				l.orderService.ApproveOrder(nil, notification.Data.ID)
			} else {
				var altNotification struct {
					ID string `json:"id"`
				}
				json.Unmarshal(d.Body, &altNotification)
				if altNotification.ID != "" {
					l.orderService.ApproveOrder(nil, altNotification.ID)
				}
			}

			d.Ack(false)
		}
	}()
	log.Println("Escuchando eventos de pago en RabbitMQ...")
}