package models

import (
	"gorm.io/gorm"
)

// postgreSQL
type OrderItem struct {
	gorm.Model
	
	OrderID        uint    `gorm:"index"`
	ProductID     string  `gorm:"not null"`
	NameSnapshot string  `gorm:"not null"` 
	UnitPrice float64 `gorm:"type:numeric"`
	Quantity       int     `gorm:"not null"`
}