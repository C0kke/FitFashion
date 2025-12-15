package main

import (
	"log"
	"os"

	"github.com/C0kke/FitFashion/ms_cart/pkg/database" 
	"github.com/joho/godotenv"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
	"github.com/C0kke/FitFashion/ms_cart/internal/service"
	"github.com/C0kke/FitFashion/ms_cart/internal/messaging"
	"github.com/C0kke/FitFashion/ms_cart/internal/payments"
	"github.com/C0kke/FitFashion/ms_cart/internal/rpc"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
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

	if os.Getenv("FRONTEND_URL") == "" {
    log.Fatal("FRONTEND_URL no encontrado en .env")
	}
	if os.Getenv("WEBHOOK_BASE_URL") == "" {
		log.Fatal("WEBHOOK_BASE_URL no encontrado en .env")
	}

	database.ConectarPostgres()
	database.ConectarRedis()
	mqconn.ConectarRabbitMQ()

	rabbitConn := mqconn.RabbitMQConn
	if rabbitConn == nil {
		log.Fatal("Fallo al obtener la conexión de RabbitMQ (RabbitMQConn es nil)")
	}

	productClientRPC := product.NewProductClient(rabbitConn)

	mpAccessToken := os.Getenv("MP_ACCESS_TOKEN")
    if mpAccessToken == "" {
        log.Fatal("MP_ACCESS_TOKEN no encontrado en .env")
    }

    paymentClient, err := payments.NewMercadoPagoClient(mpAccessToken)
    if err != nil {
        log.Fatalf("Error al inicializar Mercado Pago Client: %v", err)
    }

	cartRepo := repository.NewRedisCartRepository()
	orderRepo := repository.NewPostgresOrderRepository()
    orderPublisher := messaging.NewOrderPublisher(rabbitConn) 

	cartService := service.NewCartService(cartRepo, productClientRPC)
	orderService := service.NewOrderService(orderRepo, cartRepo, productClientRPC, orderPublisher, paymentClient)

	rpcQueueName := os.Getenv("RPC_QUEUE_NAME")
	listener, err := rpc.NewRpcListener(rabbitConn, rpcQueueName, cartService, orderService)
    if err != nil {
        log.Fatalf("Fallo al configurar RPC Listener: %v", err)
    }

	log.Println("MS_CART iniciado y escuchando peticiones RPC...")
    listener.StartConsuming()
}