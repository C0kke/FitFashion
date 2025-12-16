package rpc

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/streadway/amqp"
)

// --- INTERFACES PARA MOCKEAR SERVICIOS ---
type CartController interface {
	UpdateItemQuantity(ctx context.Context, userID string, productID string, quantityChange int) (*models.Cart, error)
	GetCartWithPrices(ctx context.Context, userID string) (*product.CartCalculationOutput, error)
	RemoveItemFromCart(ctx context.Context, userID string, productID string) (*models.Cart, error)
}

type OrderController interface {
	ProcesarCompra(ctx context.Context, userID string, shippingAddress string) (*models.CheckoutResponse, error)
	GetUserOrders(ctx context.Context, userID uint) ([]models.Order, error)
	GetAllOrders(ctx context.Context) ([]models.Order, error)
}

// ------------------------------------------

type NestJSRequest struct {
	Pattern string          `json:"pattern"`
	Data    json.RawMessage `json:"data"`
}

type RPCResponse struct {
	Response interface{} `json:"response"`
	Status   string      `json:"status"`
}

type Listener struct {
	Channel      *amqp.Channel
	Service      CartController  // Usamos la interfaz
	OrderService OrderController // Usamos la interfaz
	QueueName    string
}

// Mantenemos la firma recibiendo concretos para no romper main.go, pero los guardamos como interfaz
func NewRpcListener(conn *amqp.Connection, queueName string, cartS *service.CartService, orderS *service.OrderService) (*Listener, error) {
	ch, err := conn.Channel()
	if err != nil {
		return nil, err
	}
	_, err = ch.QueueDeclare(queueName, false, false, false, false, nil)
	if err != nil {
		return nil, err
	}
	return &Listener{
		Channel:      ch,
		Service:      cartS,  // Go convierte automáticamente el struct a la interfaz
		OrderService: orderS, // Go convierte automáticamente el struct a la interfaz
		QueueName:    queueName,
	}, nil
}

// NewRpcListenerForTesting constructor simplificado para tests unitarios
func NewRpcListenerForTesting(cartS CartController, orderS OrderController) *Listener {
	return &Listener{
		Channel:      nil, // No necesita canal en tests
		Service:      cartS,
		OrderService: orderS,
		QueueName:    "test_queue",
	}
}

func (l *Listener) StartConsuming() {
	msgs, err := l.Channel.Consume(l.QueueName, "", false, false, false, false, nil)
	if err != nil {
		log.Fatalf("Fallo al registrar consumidor RPC: %v", err)
	}

	forever := make(chan bool)
	go func() {
		for d := range msgs {
			go l.handleMessage(d)
		}
	}()

	log.Printf("RPC Listener iniciado en cola: %s", l.QueueName)
	<-forever
}

func (l *Listener) handleMessage(d amqp.Delivery) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("PÁNICO durante el manejo del mensaje: %v", r)
			d.Nack(false, true)
		}
	}()

	var req NestJSRequest
	if err := json.Unmarshal(d.Body, &req); err != nil {
		log.Printf("Error deserializando payload: %v", err)
		d.Reject(false)
		return
	}

	// Llamamos al método público (ahora ProcessRequest)
	respPayload, err := l.ProcessRequest(context.Background(), req.Pattern, req.Data)

	status := "success"
	if err != nil {
		status = "error"
		respPayload = map[string]string{"message": err.Error()}
	}

	responseBody, _ := json.Marshal(RPCResponse{
		Response: respPayload,
		Status:   status,
	})
	log.Printf("[DEBUG] Respuesta de %s a Gateway: %s", req.Pattern, string(responseBody))

	if d.ReplyTo != "" {
		err = l.Channel.Publish(
			"",
			d.ReplyTo,
			false,
			false,
			amqp.Publishing{
				ContentType:   "application/json",
				CorrelationId: d.CorrelationId,
				Body:          responseBody,
			},
		)
		if err != nil {
			log.Printf("Error al publicar respuesta RPC: %v", err)
		}
	}

	d.Ack(false)
}

// CAMBIO: Ahora es Público (Mayúscula P) para poder testearlo
func (l *Listener) ProcessRequest(ctx context.Context, pattern string, data json.RawMessage) (interface{}, error) {

	var userID string
	var temp map[string]interface{}
	if err := json.Unmarshal(data, &temp); err == nil {
		if id, ok := temp["user_id"]; ok {
			switch v := id.(type) {
			case string:
				userID = v
			case float64:
				userID = strconv.FormatFloat(v, 'f', 0, 64)
			default:
				log.Printf("[DEBUG] user_id no es string ni float64: %T", v)
			}
		}
	}

	log.Printf("[DEBUG] Procesando request. Pattern: %s, UserID: %s", pattern, userID)

	switch pattern {
	case "adjust_item_quantity":
		var payload struct {
			ProductID      string `json:"product_id"`
			QuantityChange int    `json:"quantity"`
		}
		if err := json.Unmarshal(data, &payload); err != nil {
			log.Printf("Deserialización de adjust_item_quantity fallida: %v", err)
			return nil, fmt.Errorf("datos de entrada inválidos para adjust_item_quantity")
		}
		return l.Service.UpdateItemQuantity(ctx, userID, payload.ProductID, payload.QuantityChange)

	case "get_cart_by_user":
		return l.Service.GetCartWithPrices(ctx, userID)

	case "process_checkout":
		var payload struct {
			ShippingAddress string `json:"shippingAddress"`
		}

		if err := json.Unmarshal(data, &payload); err != nil {
			return nil, fmt.Errorf("datos de entrada inválidos para process_checkout")
		}
		return l.OrderService.ProcesarCompra(ctx, userID, payload.ShippingAddress)

	case "get_user_orders":
		userIDUint64, err := strconv.ParseUint(userID, 10, 64)
		if err != nil {
			return nil, fmt.Errorf("ID de usuario RPC inválido: %w", err)
		}
		userIDUint := uint(userIDUint64)

		return l.OrderService.GetUserOrders(ctx, userIDUint)

	case "remove_item_from_cart":
		var payload struct {
			ProductID string `json:"product_id"`
		}
		if err := json.Unmarshal(data, &payload); err != nil {
			return nil, fmt.Errorf("datos de entrada inválidos para remove_item_from_cart")
		}
		return l.Service.RemoveItemFromCart(ctx, userID, payload.ProductID)

	case "get_all_orders":
		return l.OrderService.GetAllOrders(ctx)

	default:
		return nil, fmt.Errorf("patrón RPC no reconocido: %s", pattern)
	}
}