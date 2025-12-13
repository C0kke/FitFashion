package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database" 
	"github.com/joho/godotenv"
	"github.com/C0kke/FitFashion/ms_cart/api/handlers"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/C0kke/FitFashion/ms_cart/internal/messaging"
	"github.com/C0kke/FitFashion/ms_cart/pkg/router"
	mqconn "github.com/C0kke/FitFashion/ms_cart/pkg/messaging"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Advertencia: No se encontró archivo .env.")
	}
    
    port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	database.ConectarPostgres()
	database.ConectarRedis()
	mqconn.ConectarRabbitMQ()

	mpAccessToken := os.Getenv("MP_ACCESS_TOKEN")
    if mpAccessToken == "" {
        log.Fatal("MP_ACCESS_TOKEN no encontrado en .env")
    }

	userClient := &service.MockUserClient{}
	productClient := &service.MockProductClient{}

	mpAccessToken := os.Getenv("MP_ACCESS_TOKEN")
    if mpAccessToken == "" {
        log.Fatal("MP_ACCESS_TOKEN no encontrado en .env")
    }

    paymentClient, err := service.NewMercadoPagoClient(mpAccessToken)
    if err != nil {
        log.Fatalf("Error al inicializar Mercado Pago Client: %v", err)
    }

	cartRepo := repository.NewRedisCartRepository()
	orderRepo := repository.NewPostgresOrderRepository()

    orderPublisher := messaging.NewOrderPublisher() 

	cartService := service.NewCartService(cartRepo)
	orderService := service.NewOrderService(orderRepo, cartRepo, userClient, productClient, orderPublisher, paymentClient)

	cartHandler := handlers.NewCartHandler(cartService)
	orderHandler := handlers.NewOrderHandler(orderService)

	routerConfig := router.RouterConfig{
		CartHandler: cartHandler,
		OrderHandler: orderHandler,
	}
	r := router.SetupRouter(routerConfig)
    
    r.GET("/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "UP", "service": "ms_cart_orders"})
    })

	log.Printf("Servidor iniciado en http://localhost:%s", port)
	log.Fatal(r.Run(":" + port)) 
}