package service

import (
    "context"
    "github.com/C0kke/FitFashion/ms_cart/internal/models"
)

type PaymentStatusDetails struct {
	Status 				string 
	ExternalReference 	string 
}

type PaymentClient interface {
	StartTransaction(ctx context.Context, orderID uint, total int64, items []models.OrderItem) (string, error)
	GetPaymentStatus(ctx context.Context, paymentID string) (*PaymentStatusDetails, error)
}