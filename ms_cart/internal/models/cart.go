package models

import "time"

// redis
type CartItem struct {
	ProductID string `json:"product_id"`
	Quantity   int    `json:"quantity"`
}

type Cart struct {
	UserID    int        `json:"user_id"`
	Items []CartItem `json:"items"`
    LastUpdated time.Time `json:"last_updated"`
}

type PaymentDetails struct {
    Status            string `json:"status"`
    ExternalReference string `json:"external_reference"`
}