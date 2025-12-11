package router

import (
	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/api/handlers"
)

type RouterConfig struct {
	CartHandler *handlers.CartHandler
	// OrderHandler *handlers.OrderHandler
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
		carrito := api.Group("/carrito")
		{
			carrito.POST("/agregar", config.CartHandler.AddItemToCart)
			carrito.GET("/", config.CartHandler.GetCart) 
			// implementar delete
		}
	}

	return router
}