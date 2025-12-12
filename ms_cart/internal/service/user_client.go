// internal/service/user_client.go

package service

import (
	"context"
	"fmt" 
)

type UserDetails struct {
	ID             uint 
	ShippingAddress string 
}

type UserClient interface {
	GetUserDetails(ctx context.Context, userID string) (*UserDetails, error)
}

type MockUserClient struct{}

func (m *MockUserClient) GetUserDetails(ctx context.Context, userID string) (*UserDetails, error) {
    if userID == "100" {
        return &UserDetails{
            ID: 100,
            ShippingAddress: "Avenida de los Volcanes 45, Coquimbo",
        }, nil
    }
    return nil, fmt.Errorf("usuario ID %s no encontrado o acceso denegado (mock)", userID)
}