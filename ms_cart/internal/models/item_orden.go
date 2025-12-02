package models

import (
	"gorm.io/gorm"
)

// postgreSQL
type ItemOrden struct {
	gorm.Model
	
	OrdenID        uint    `gorm:"index"`
	ProductoID     string  `gorm:"not null"`
	NombreSnapshot string  `gorm:"not null"` 
	PrecioUnitario float64 `gorm:"type:numeric"`
	Cantidad       int     `gorm:"not null"`
}