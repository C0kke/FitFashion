package handlers

import (
	"context"
	"net/http"
	"time"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
)

type OrderHandler struct {
	OrderService *service.OrderService
}

func NewOrderHandler(orderService *service.OrderService) *OrderHandler {
	return &OrderHandler{
		OrderService: orderService,
	}
}

func (h *OrderHandler) Checkout(c *gin.Context) {
    
	userIDStr, exists := c.Get(ContextUserIDKey) 
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	userID := userIDStr.(string)

	ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second) 
	defer cancel()

	order, err := h.OrderService.ProcesarCompra(ctx, userID)
	if err != nil {
        
        if err.Error() == "el carrito está vacío" {
            c.JSON(http.StatusBadRequest, gin.H{"error": "El carrito está vacío o el stock es insuficiente.", "details": err.Error()})
            return
        }
        
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al procesar la compra", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Orden creada y pagada exitosamente",
		"order_id": order.ID,
		"total": order.Total,
		"status": order.Status,
	})
}

func (h *OrderHandler) GetUserOrders(c *gin.Context) {
	userIDStr, exists := c.Get(ContextUserIDKey) 
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
    
    userIDUint, err := strconv.ParseUint(userIDStr.(string), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "ID de usuario inválido"})
        return
    }

    ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
    
    orders, err := h.OrderService.GetUserOrders(ctx, uint(userIDUint))
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al obtener historial de órdenes", "details": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, orders)
}