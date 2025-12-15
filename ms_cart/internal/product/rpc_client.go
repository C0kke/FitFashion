package product

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/streadway/amqp"
)

type ProductClient struct {
    conn *amqp.Connection
    queueName string
}

type ClientInterface interface {
	ValidateStock(ctx context.Context, items []ProductInput) (*StockValidationOutput, error)
	CalculateCart(ctx context.Context, items []ProductInput) (*CartCalculationOutput, error)
	DecreaseStock(ctx context.Context, items []ProductInput) (*DecreaseStockOutput, error)
}

const (
    ProductQueue = "products_queue"
)

func NewProductClient(conn *amqp.Connection) *ProductClient {
    return &ProductClient{
        conn: conn,
        queueName: ProductQueue,
    }
}

type NestJSRequest struct {
    Pattern string `json:"pattern"`
    Data    interface{} `json:"data"`
}

type NestJSResponse struct {
    Response json.RawMessage `json:"response"`
    Status   string          `json:"status"`
}

func (c *ProductClient) CallRPC(ctx context.Context, pattern string, data interface{}, response interface{}) error {
    ch, err := c.conn.Channel()
    if err != nil {
        return fmt.Errorf("fallo al abrir canal AMQP: %w", err)
    }
    defer ch.Close()

    replyQueue, err := ch.QueueDeclare(
        "",    
        false, 
        true, 
        true,  
        false, 
        nil,
    )
    if err != nil {
        return fmt.Errorf("fallo al declarar cola de respuesta: %w", err)
    }

    msgs, err := ch.Consume(
        replyQueue.Name, 
        "",             
        true,       
        false,
        false,
        false,
        nil,
    )
    if err != nil {
        return fmt.Errorf("fallo al consumir de cola de respuesta: %w", err)
    }

    reqBody, _ := json.Marshal(NestJSRequest{
        Pattern: pattern,
        Data:    data,
    })

    err = ch.Publish(
        "",         
        c.queueName,    
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
        var nestResponse NestJSResponse
        if err := json.Unmarshal(d.Body, &nestResponse); err != nil {
            return fmt.Errorf("fallo al deserializar respuesta NestJS: %w", err)
        }

        if nestResponse.Status == "error" {
            return fmt.Errorf("error en ms_products (RPC): %s", string(nestResponse.Response))
        }

        if err := json.Unmarshal(nestResponse.Response, response); err != nil {
            return fmt.Errorf("fallo al deserializar payload de respuesta: %w", err)
        }
        return nil

    case <-ctx.Done():
        return ctx.Err()
    }
}

func (c *ProductClient) ValidateStock(ctx context.Context, items []ProductInput) (*StockValidationOutput, error) {
    var output StockValidationOutput
    err := c.CallRPC(ctx, "validate_stock", items, &output) 
    if err != nil {
        return nil, err
    }
    return &output, nil
}

func (c *ProductClient) CalculateCart(ctx context.Context, items []ProductInput) (*CartCalculationOutput, error) {
    var output CartCalculationOutput
    err := c.CallRPC(ctx, "calculate_cart", items, &output) 
    if err != nil {
        return nil, err
    }
    return &output, nil
}

func (c *ProductClient) DecreaseStock(ctx context.Context, items []ProductInput) (*DecreaseStockOutput, error) {
    var output DecreaseStockOutput
    err := c.CallRPC(ctx, "decrease_stock", items, &output) 
    if err != nil {
        return nil, err
    }
    return &output, nil
}