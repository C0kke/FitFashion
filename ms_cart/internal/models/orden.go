package models

import (
	"gorm.io/gorm"
)

type Orden struct {
    gorm.Model 
	
	UsuarioID   uint      `gorm:"not null;index"` 
	Total       float64   `gorm:"type:numeric"`
	Estado      string    `gorm:"default:'PENDIENTE'"`
	
	ItemsOrden  []ItemOrden `gorm:"foreignKey:OrdenID"` 
}