package models

import "time"

// redis
type ItemCarrito struct {
	ProductoID string `json:"producto_id"`
	Cantidad   int    `json:"cantidad"`
}

type Carrito struct {
	ID    string        `json:"id"`
	Items []ItemCarrito `json:"items"`
    UltimaActualizacion time.Time `json:"ultima_actualizacion"`
}