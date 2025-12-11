package handlers

import (
	"context"
	"net/http"
	"strconv"

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

func (h *CartHandler) AddItemToCart(c *gin.Context) {
	userIDStr, exists := c.Get(ContextUserIDKey) 
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Usuario no autenticado"})
		return
	}
	userID := userIDStr.(string)

	var req struct {
		ProductID string `json:"product_id" binding:"required"`
		Quantity int    `json:"quantity" binding:"required,min=1"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Datos de entrada inválidos", "details": err.Error()})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
	defer cancel()

	cart, err := h.CartService.AddItemToCart(ctx, userID, req.ProductID, req.Quantity)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Fallo al agregar producto al carrito", "details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Producto agregado exitosamente",
		"cart":    cart,
	})
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