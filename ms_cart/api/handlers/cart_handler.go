package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
)

const ContextUserIDKey = "UserID" 

type CartHandler struct {
	CartService *service.CartService
}

func NewCartHandler(cartService *service.CartService) *CartHandler {
	return &CartHandler{
		CartService: cartService,
	}
}

type AdjustQuantityPayload struct {
	ProductID string `json:"product_id" binding:"required"`
	QuantityChange int    `json:"quantity_change" binding:"required"` 
}

func (h *CartHandler) AdjustItemQuantity(c *gin.Context) {
    userIDStr, exists := c.Get(ContextUserIDKey)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	userID := userIDStr.(string)

	var payload AdjustQuantityPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos de entrada inválidos. Se requiere product_id y quantity_change (int)", "details": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()
	
    updatedCart, err := h.CartService.UpdateItemQuantity(ctx, userID, payload.ProductID, payload.QuantityChange) 
    
	if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al ajustar la cantidad", "details": err.Error()})
		return
	}
	
	c.JSON(http.StatusOK, updatedCart)
}

func (h *CartHandler) RemoveItemFromCart(c *gin.Context) {
    
	userIDStr, exists := c.Get(ContextUserIDKey)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	userID := userIDStr.(string)

	productID := c.Param("product_id")
	if productID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Se requiere el ID del producto"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	_, err := h.CartService.RemoveItemFromCart(ctx, userID, productID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al eliminar el ítem del carrito", "details": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil) 
}

func (h *CartHandler) GetCart(c *gin.Context) {
    userIDStr, exists := c.Get(ContextUserIDKey)
    if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
    userID := userIDStr.(string)

    ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

    cart, err := h.CartService.GetCartByUserID(ctx, userID)
    if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al obtener carrito", "details": err.Error()})
		return
	}

    c.JSON(http.StatusOK, cart)
}

func (h *CartHandler) ClearCart(c *gin.Context) {
    
	userIDStr, exists := c.Get(ContextUserIDKey) 
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	userID := userIDStr.(string) 

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	err := h.CartService.ClearCartByUserID(ctx, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al vaciar el carrito", "details": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil) 
}