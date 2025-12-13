package models

type CheckoutResponse struct {
    OrderID uint `json:"order_id"`
    Status string `json:"status"` //pendiente
    PaymentURL string `json:"payment_url"` 
}