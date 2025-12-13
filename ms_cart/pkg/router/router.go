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

	public := router.Group("/api/v1")

	{
        public.POST("/payments/webhook", config.OrderHandler.HandlePaymentWebhook) 
    }
	
	private := router.Group("/api/v1")
	private.Use(func(c *gin.Context) {
        c.Set(handlers.ContextUserIDKey, "100") 
        c.Next()
    })

	{
        cart := private.Group("/cart")
        {
            cart.POST("/update-quantity", config.CartHandler.AdjustItemQuantity)
            cart.GET("/", config.CartHandler.GetCart) 
            cart.DELETE("/:product_id", config.CartHandler.RemoveItemFromCart)
            cart.DELETE("/", config.CartHandler.ClearCart)
        }

        orders := private.Group("/orders")
        {
            orders.POST("/checkout", config.OrderHandler.Checkout)
            orders.GET("/", config.OrderHandler.GetUserOrders) 
        }
    }

	return router
}