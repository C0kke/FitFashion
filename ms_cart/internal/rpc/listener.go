package rpc

import (
	"context"
	"encoding/json"
	"log"
	"strconv"
	"fmt"

	"github.com/streadway/amqp"
	"github.com/C0kke/FitFashion/ms_cart/internal/service" 
)

type NestJSRequest struct {
    Pattern string `json:"pattern"`
    Data 	json.RawMessage `json:"data"` 
}

type RPCResponse struct {
    Response 	interface{} `json:"response"`
    Status 		string 		`json:"status"`
}

type Listener struct {
	Channel *amqp.Channel
	Service *service.CartService
	OrderService *service.OrderService
	QueueName string
}

func NewRpcListener(conn *amqp.Connection, queueName string, cartS *service.CartService, orderS *service.OrderService) (*Listener, error) {
    ch, err := conn.Channel()
    if err != nil {
        return nil, err
    }
    _, err = ch.QueueDeclare(
        queueName, 
        false,
        false, 
        false,  
        false,  
        nil,
    )
    if err != nil {
        return nil, err
    }
    return &Listener{
		Channel: ch, 
		Service: cartS, 
		OrderService: orderS, 
		QueueName: queueName,
	}, nil
}

func (l *Listener) StartConsuming() {
	msgs, err := l.Channel.Consume(
		l.QueueName, 
		"",     
		false,  
		false,  
		false,  
		false,  
		nil,
	)
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
    
	respPayload, err := l.processRequest(context.Background(), req.Pattern, req.Data)
    
	status := "success"
	if err != nil {
		status = "error"
		respPayload = map[string]string{"message": err.Error()}
	}

	responseBody, _ := json.Marshal(RPCResponse{
        Response: respPayload,
        Status: status,
    })

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

func (l *Listener) processRequest(ctx context.Context, pattern string, data json.RawMessage) (interface{}, error) {
    
    var userID string 
    var temp map[string]interface{}
    if err := json.Unmarshal(data, &temp); err == nil {
        if id, ok := temp["userID"].(string); ok {
            userID = id
        }
    }
    
    switch pattern {
    case "adjust_item_quantity":
        var payload struct {
            ProductID string `json:"productID"`
            QuantityChange int `json:"quantityChange"`
        }
        if err := json.Unmarshal(data, &payload); err != nil {
            return nil, fmt.Errorf("datos de entrada inválidos para adjust_item_quantity")
        }
        return l.Service.UpdateItemQuantity(ctx, userID, payload.ProductID, payload.QuantityChange)

    case "get_cart":
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
        
    default:
        return nil, fmt.Errorf("patrón RPC no reconocido: %s", pattern)
    }
}