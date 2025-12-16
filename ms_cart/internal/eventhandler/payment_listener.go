package eventhandler

import (
	"context"
	"encoding/json"
	"log"

	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/streadway/amqp"
)

// 1. Interfaz para poder Mockear el servicio
type OrderApprover interface {
	ApproveOrder(ctx context.Context, paymentID string) error
}

type PaymentListener struct {
	channel      *amqp.Channel
	orderService OrderApprover // Usamos la interfaz
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

// NewPaymentListenerForTesting constructor simplificado para tests
func NewPaymentListenerForTesting(orderService OrderApprover) *PaymentListener {
	return &PaymentListener{
		channel:      nil, // No necesita canal en tests unitarios
		orderService: orderService,
	}
}

// 2. Método EXTRAÍDO para ser testeado unitariamente (Pura lógica, sin RabbitMQ)
func (l *PaymentListener) ProcessEvent(body []byte) error {
	// Intentamos decodificar la estructura anidada: { data: { id: "..." } }
	var notification struct {
		Data struct {
			ID string `json:"id"`
		} `json:"data"`
		Type string `json:"type"`
	}

	if err := json.Unmarshal(body, &notification); err != nil {
		log.Printf("Error parseando evento de pago: %v", err)
		return nil // Retornamos nil para hacer Ack (mensaje basura)
	}

	paymentID := notification.Data.ID

	// Si no vino en 'data.id', intentamos estructura plana: { id: "..." }
	if paymentID == "" {
		var altNotification struct {
			ID string `json:"id"`
		}
		// Ignoramos error aquí, si falla ya falló el de arriba o está vacío
		_ = json.Unmarshal(body, &altNotification)
		paymentID = altNotification.ID
	}

	if paymentID != "" {
		// Llamamos al servicio mockeable
		return l.orderService.ApproveOrder(context.Background(), paymentID)
	}
	
	return nil
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
		log.Println("Escuchando eventos de pago en RabbitMQ...")
		for d := range msgs {
			log.Printf("Evento de pago recibido: %s", d.Body)

			// 3. Start solo llama a ProcessEvent
			_ = l.ProcessEvent(d.Body)

			d.Ack(false)
		}
	}()
}