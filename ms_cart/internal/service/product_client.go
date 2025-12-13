package service

import (
	"context"
	"fmt"
)

type ProductDetails struct {
	Name string
	Price int64

}

type ProductClient interface {
	GetProductDetails(ctx context.Context, productID string) (*ProductDetails, error)
}

type MockProductClient struct{}

func (m *MockProductClient) GetProductDetails(ctx context.Context, productID string) (*ProductDetails, error) {
    switch productID {
    case "P101":
        return &ProductDetails{
            Name: "Zapatillas Running X-Fast",
            Price: 85,
        }, nil
    case "P202":
        return &ProductDetails{
            Name: "Pantalón Cargo Casual",
            Price: 45,
        }, nil
    default:
        return nil, fmt.Errorf("producto ID %s no válido o stock agotado (mock)", productID)
    }
}