package repository

import (
	"context"
	"errors" 
	"fmt"
	"gorm.io/gorm" 
	
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database" 
)

type OrderRepository interface {
	Create(ctx context.Context, order *models.Order) error 
	FindByID(ctx context.Context, orderID uint) (*models.Order, error)
	FindByUserID(ctx context.Context, userID uint) ([]models.Order, error)
	UpdateStatus(ctx context.Context, orderID uint, status string) error
	FindAll(ctx context.Context) ([]models.Order, error)
}


type PostgresOrderRepository struct {
	DB *gorm.DB 
}

func NewPostgresOrderRepository() OrderRepository {
	return &PostgresOrderRepository{
		DB: database.DB, 
	}
}

func (r *PostgresOrderRepository) Create(ctx context.Context, order *models.Order) error {
	result := r.DB.WithContext(ctx).Create(order) 
	
	if result.Error != nil {
		return fmt.Errorf("error al crear la orden en PostgreSQL: %w", result.Error)
	}
	return nil
}

func (r *PostgresOrderRepository) FindByID(ctx context.Context, orderID uint) (*models.Order, error) {
	order := &models.Order{}
	
	result := r.DB.WithContext(ctx).Preload("OrderItems").First(order, orderID)
	
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
		}
		return nil, result.Error
	}
	return order, nil
}

func (r *PostgresOrderRepository) FindByUserID(ctx context.Context, userID uint) ([]models.Order, error) {
	var orders []models.Order
	
	result := r.DB.WithContext(ctx).Where("user_id = ?", userID).Preload("OrderItems").Find(&orders)

	if result.Error != nil {
		return nil, result.Error
	}
	return orders, nil
}

func (r *PostgresOrderRepository) UpdateStatus(ctx context.Context, orderID uint, status string) error {
	result := r.DB.WithContext(ctx).Model(&models.Order{}).Where("id = ?", orderID).Update("status", status)
	
	if result.Error != nil {
		return fmt.Errorf("error al actualizar el estado de la orden: %w", result.Error)
	}
	
	if result.RowsAffected == 0 {
		return fmt.Errorf("orden no encontrada con ID: %d", orderID)
	}
	
	return nil
}

func (r *PostgresOrderRepository) FindAll(ctx context.Context) ([]models.Order, error) {
	var orders []models.Order
	result := r.DB.WithContext(ctx).
		Preload("OrderItems").
		Find(&orders) 
		
	if result.Error != nil {
		return nil, result.Error
	}

	for i := range orders {
		if orders[i].OrderItems == nil {
			orders[i].OrderItems = []models.OrderItem{} 
		}
	}

	return orders, nil
}