package router

import (
	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/api/handlers"
)

type RouterConfig struct {
	CartHandler *handlers.CartHandler
	OrderHandler *handlers.OrderHandler
}

func SetupRouter(config RouterConfig) *gin.Engine {
	router := gin.Default()

	// simulación autenticación
	router.Use(func(c *gin.Context) {
		c.Set(handlers.ContextUserIDKey, "100") 
		c.Next()
	})

	api := router.Group("/api/v1")
	{
		cart := api.Group("/cart")
		{
			cart.POST("/update-quantity", config.CartHandler.AdjustItemQuantity)
			cart.GET("/", config.CartHandler.GetCart) 
			cart.DELETE("/:product_id", config.CartHandler.RemoveItemFromCart)
			cart.DELETE("/", config.CartHandler.ClearCart)
		}

		orders := api.Group("/orders")
		{
			orders.POST("/checkout", config.OrderHandler.Checkout)
			orders.GET("/", config.OrderHandler.GetUserOrders) 
		}
	}

	return router
}