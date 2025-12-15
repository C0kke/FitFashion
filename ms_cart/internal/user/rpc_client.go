package user

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/streadway/amqp"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/C0kke/FitFashion/ms_cart/internal/models" 
)

const RpcQueueName = "auth_rpc_queue"

type ClientInterface interface {
	GetUserDetails(ctx context.Context, userID string) (*models.User, error)
}

type RpcClient struct {
	conn *amqp.Connection
}

func NewRpcClient(conn *amqp.Connection) ClientInterface { 
	return &RpcClient{conn: conn}
}

func (c *RpcClient) GetUserDetails(ctx context.Context, userID string) (*models.User, error) {
	ch, err := c.conn.Channel()
	if err != nil {
		return nil, fmt.Errorf("fallo al abrir canal RPC (ms_auth): %w", err)
	}
	defer ch.Close()

	req := GetUserDetailsRequest{UserID: userID}
    body, _ := json.Marshal(req)

	err = ch.Publish(
		"",     
		RpcQueueName, 
		false,
		false,
		amqp.Publishing{
			ContentType:   "application/json",
			CorrelationId: "unique_id", 
			ReplyTo:       "response_queue_name", 
			Body:          body,
		},
	)
	if err != nil {
		return nil, fmt.Errorf("fallo RPC al publicar (ms_auth): %w", err)
	}
    
    var res GetUserDetailsResponse
	if res.Error != "" {
		return nil, fmt.Errorf("error RPC desde ms_auth: %s", res.Error)
	}
	
	return res.User, nil 
}