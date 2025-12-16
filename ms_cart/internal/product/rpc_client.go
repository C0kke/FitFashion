package product

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/streadway/amqp"
)

const (
	ProductQueue = "products_queue"
)

// --- 1. ESTA ES LA INTERFAZ QUE FALTABA ---
type ClientInterface interface {
	ValidateStock(ctx context.Context, items []ProductInput) (*StockValidationOutput, error)
	CalculateCart(ctx context.Context, items []ProductInput) (*CartCalculationOutput, error)
	DecreaseStock(ctx context.Context, items []ProductInput) (*DecreaseStockOutput, error)
}

// 2. Interfaz para abstraer la llamada RPC (Interna)
type RPCCaller interface {
	Call(ctx context.Context, pattern string, data interface{}, response interface{}) error
}

// 3. Struct principal
type ProductClient struct {
	caller RPCCaller
}

// 4. Implementación real de RabbitMQ
type amqpCaller struct {
	conn      *amqp.Connection
	queueName string
}

// Constructor
func NewProductClient(conn *amqp.Connection) ClientInterface {
	return &ProductClient{
		caller: &amqpCaller{
			conn:      conn,
			queueName: ProductQueue,
		},
	}
}

// NewProductClientWithCaller constructor para testing que acepta un RPCCaller
func NewProductClientWithCaller(caller RPCCaller) ClientInterface {
	return &ProductClient{
		caller: caller,
	}
}

// --- Implementación de los Métodos de Negocio ---

func (c *ProductClient) ValidateStock(ctx context.Context, items []ProductInput) (*StockValidationOutput, error) {
	var rpcResponse StockValidationOutput
	err := c.caller.Call(ctx, "validate_stock", items, &rpcResponse)
	if err != nil {
		return nil, err
	}
	log.Printf("[DEBUG-RPC] Validación de stock completada. Válido: %t, Mensaje: %s", rpcResponse.Valid, rpcResponse.Message)
	return &rpcResponse, nil
}

func (c *ProductClient) CalculateCart(ctx context.Context, items []ProductInput) (*CartCalculationOutput, error) {
	var output CartCalculationOutput
	err := c.caller.Call(ctx, "calculate_cart", items, &output)
	if err != nil {
		return nil, err
	}
	return &output, nil
}

func (c *ProductClient) DecreaseStock(ctx context.Context, items []ProductInput) (*DecreaseStockOutput, error) {
	var output DecreaseStockOutput
	err := c.caller.Call(ctx, "decrease_stock", items, &output)
	if err != nil {
		return nil, err
	}
	return &output, nil
}

// --- Implementación de la Infraestructura (Call) ---

type NestJSRequest struct {
	Pattern string      `json:"pattern"`
	Data    interface{} `json:"data"`
}

func (a *amqpCaller) Call(ctx context.Context, pattern string, data interface{}, response interface{}) error {
	ch, err := a.conn.Channel()
	if err != nil {
		return fmt.Errorf("fallo al abrir canal AMQP: %w", err)
	}
	defer ch.Close()

	replyQueue, err := ch.QueueDeclare("", false, true, true, false, nil)
	if err != nil {
		return fmt.Errorf("fallo al declarar cola de respuesta: %w", err)
	}

	msgs, err := ch.Consume(replyQueue.Name, "", true, false, false, false, nil)
	if err != nil {
		return fmt.Errorf("fallo al consumir de cola de respuesta: %w", err)
	}

	reqBody, _ := json.Marshal(NestJSRequest{
		Pattern: pattern,
		Data:    data,
	})

	log.Printf("[DEBUG-RPC] Enviando a %s: %s", a.queueName, string(reqBody))

	err = ch.Publish(
		"",
		a.queueName,
		false,
		false,
		amqp.Publishing{
			ContentType:   "application/json",
			CorrelationId: fmt.Sprintf("%d", time.Now().UnixNano()),
			ReplyTo:       replyQueue.Name,
			Body:          reqBody,
		})
	if err != nil {
		return fmt.Errorf("fallo al publicar mensaje RPC: %w", err)
	}

	select {
	case d := <-msgs:
		rawBody := string(d.Body)
		if err := json.Unmarshal(d.Body, response); err != nil {
			return fmt.Errorf("fallo al deserializar respuesta NestJS: %w", err)
		}
		if rawBody == "{}" || rawBody == "null" || rawBody == "" {
			return errors.New("ms_products devolvió un cuerpo vacío")
		}
		return nil

	case <-ctx.Done():
		return ctx.Err()
	}
}