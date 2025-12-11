package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database" 
	"github.com/joho/godotenv"
	"github.com/C0kke/FitFashion/ms_cart/api/handlers"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database"
	"github.com/C0kke/FitFashion/ms_cart/pkg/router"
)

func main() {
	err := godotenv.Load()
    if err != nil {
        log.Println("Advertencia: No se encontró archivo .env.")
    }

	database.ConectarPostgres()
	database.ConectarRedis()

	userClient := &service.MockUserClient{}
    productClient := &service.MockProductClient{}

	cartRepo := repository.NewRedisCartRepository()
	orderRepo := repository.NewPostgresOrderRepository()

	cartService := service.NewCartService(cartRepo)
	orderService := service.NewOrderService(orderRepo, cartRepo, userClient, productClient)

	cartHandler := handlers.NewCartHandler(cartService)
	// orderHandler := handlers.NewOrderHandler(orderService)

	routerConfig := router.RouterConfig{
		CartHandler: cartHandler,
		// OrderHandler: orderHandler
	}
	r := router.SetupRouter(routerConfig)
    
	port := os.Getenv("SERVER_PORT")
	if port == "" {
        port = "8080"
    }

	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	log.Printf("Servidor iniciado en http://localhost:%s", port)
	log.Fatal(router.Run(":" + port))
}