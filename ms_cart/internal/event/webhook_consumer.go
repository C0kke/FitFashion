package event

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"

	"github.com/streadway/amqp"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/payments"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
)

type WebhookConsumer struct {
	Channel       *amqp.Channel
	OrderService  *service.OrderService
	PaymentClient payments.PaymentClient
}

func NewWebhookConsumer(ch *amqp.Channel, orderS *service.OrderService, payClient payments.PaymentClient) *WebhookConsumer {
	return &WebhookConsumer{
		Channel:       ch,
		OrderService:  orderS,
		PaymentClient: payClient,
	}
}

func (c *WebhookConsumer) Start() {
	err := c.Channel.ExchangeDeclare("payment_events", "topic", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("Error declarando exchange: %v", err)
	}

	q, err := c.Channel.QueueDeclare("cart_payment_updates", true, false, false, false, nil)
	if err != nil {
		log.Fatalf("Error declarando cola: %v", err)
	}

	err = c.Channel.QueueBind(q.Name, "payment.#", "payment_events", false, nil)
	if err != nil {
		log.Fatalf("Error binding cola: %v", err)
	}

	msgs, err := c.Channel.Consume(q.Name, "", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("Error consumiendo: %v", err)
	}

	go func() {
		log.Println("🎧 [Consumer] Escuchando Webhooks de Pagos...")
		for d := range msgs {
			c.handleMessage(d)
		}
	}()
}

func (c *WebhookConsumer) handleMessage(d amqp.Delivery) {
    defer func() {
		if r := recover(); r != nil {
			log.Printf("Pánico en consumer: %v", r)
			d.Nack(false, false)
		}
	}()

	var notif models.WebhookNotification
	if err := json.Unmarshal(d.Body, &notif); err != nil {
		log.Printf("Error JSON Webhook: %v", err)
		d.Ack(false)
		return
	}

    paymentID := notif.Data.ID
	if paymentID == "" {
        log.Printf("Webhook sin PaymentID, descartando.")
		d.Ack(false)
		return
	}

	log.Printf("🔔 Procesando Pago ID: %s", paymentID)

	details, err := c.PaymentClient.GetPaymentStatus(context.Background(), paymentID)
	if err != nil {
		log.Printf("Error consultando API MercadoPago: %v", err)
		d.Nack(false, true) 
		return
	}

	log.Printf("Verificado MP: %s | Orden Ref: %s", details.Status, details.ExternalReference)

	orderIDUint, err := strconv.ParseUint(details.ExternalReference, 10, 64)
	if err != nil {
		log.Printf("Error ExternalReference no es un ID válido: %v", err)
		d.Ack(false)
		return
	}

	nuevoEstado := mapStatus(details.Status)
	err = c.OrderService.UpdateStatus(context.Background(), uint(orderIDUint), nuevoEstado)
	
    if err != nil {
		log.Printf("Error actualizando DB Orden %d: %v", orderIDUint, err)
		d.Nack(false, true) 
		return
	}

	d.Ack(false) 
}

func mapStatus(mpStatus string) string {
	switch mpStatus {
	case "approved": return "PAGADO"
	case "rejected", "cancelled": return "CANCELADO"
	case "in_process", "pending": return "PENDIENTE"
	default: return strings.ToUpper(mpStatus)
	}
}