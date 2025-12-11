package models

import (
	"gorm.io/gorm"
)

// postgreSQL
type Order struct {
    gorm.Model 
	
	UserID   uint      `gorm:"not null;index"` 
	Total       float64   `gorm:"type:numeric"`
	Status      string    `gorm:"default:'PENDING'"`
	ShippingAddress string   `gorm:"type:text;not null"`
	OrderItems  []OrderItem `gorm:"foreignKey:OrderID"` 
}