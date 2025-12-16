package event

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"strings"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/payments"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/streadway/amqp"
)

// 1. Interfaz para mockear el servicio de órdenes
type OrderStatusUpdater interface {
	UpdateStatus(ctx context.Context, orderID uint, status string) error
}

type WebhookConsumer struct {
	Channel       *amqp.Channel
	OrderService  OrderStatusUpdater // Usamos la interfaz
	PaymentClient payments.PaymentClient
}

// Mantenemos la firma del constructor para no romper main.go
func NewWebhookConsumer(ch *amqp.Channel, orderS *service.OrderService, payClient payments.PaymentClient) *WebhookConsumer {
	return &WebhookConsumer{
		Channel:       ch,
		OrderService:  orderS, // El struct concreto cumple la interfaz
		PaymentClient: payClient,
	}
}

// 2. Nueva función PÚBLICA y TESTEABLE (Lógica pura)
// Retorna error si hay fallo de sistema (para hacer Nack y reintentar).
// Retorna nil si todo salió bien O si el mensaje es inválido (para hacer Ack y descartar).
func (c *WebhookConsumer) ProcessWebhook(ctx context.Context, body []byte) error {
	var notif models.WebhookNotification
	if err := json.Unmarshal(body, &notif); err != nil {
		log.Printf("Error JSON Webhook: %v", err)
		return nil // Ack (Descartar basura)
	}

	paymentID := notif.Data.ID
	if paymentID == "" {
		log.Printf("Webhook sin PaymentID, descartando.")
		return nil // Ack (Descartar sin ID)
	}

	log.Printf("🔔 Procesando Pago ID: %s", paymentID)

	details, err := c.PaymentClient.GetPaymentStatus(ctx, paymentID)
	if err != nil {
		log.Printf("Error consultando API MercadoPago: %v", err)
		return err // Nack (Reintentar por error de red/API)
	}

	log.Printf("Verificado MP: %s | Orden Ref: %s", details.Status, details.ExternalReference)

	orderIDUint, err := strconv.ParseUint(details.ExternalReference, 10, 64)
	if err != nil {
		log.Printf("Error ExternalReference no es un ID válido: %v", err)
		return nil // Ack (Referencia inválida, no recuperable)
	}

	nuevoEstado := MapStatus(details.Status) // Usamos la función helper (ahora pública con Mayúscula opcionalmente, o la dejamos local)
	
	err = c.OrderService.UpdateStatus(ctx, uint(orderIDUint), nuevoEstado)
	if err != nil {
		log.Printf("Error actualizando DB Orden %d: %v", orderIDUint, err)
		return err // Nack (Error de DB, reintentar)
	}

	return nil // Ack (Éxito)
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

	// Delegamos la lógica a la función testeable
	err := c.ProcessWebhook(context.Background(), d.Body)

	if err != nil {
		// Si devolvió error, es un fallo transitorio -> Reintentar
		d.Nack(false, true)
	} else {
		// Si devolvió nil, es éxito o error irrecuperable -> Confirmar
		d.Ack(false)
	}
}

// Helper function (Exportada para testearla fácil si quieres, o déjala minúscula)
func MapStatus(mpStatus string) string {
	switch mpStatus {
	case "approved":
		return "PAGADO"
	case "rejected", "cancelled":
		return "CANCELADO"
	case "in_process", "pending":
		return "PENDIENTE"
	default:
		return strings.ToUpper(mpStatus)
	}
}