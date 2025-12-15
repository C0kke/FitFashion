package messaging

import (
	"log"
    "os"
	"github.com/streadway/amqp"
)

var RabbitMQConn *amqp.Connection 

func ConectarRabbitMQ() {
    url := os.Getenv("RABBITMQ_URL")
    if url == "" {
        log.Fatal("RABBITMQ_URL no encontrado en .env")
    }
    
    conn, err := amqp.Dial(url)
    if err != nil {
        log.Fatalf("Fallo al conectar a RabbitMQ: %v", err)
    }
    
    RabbitMQConn = conn
    log.Println("Conexión a RabbitMQ exitosa.")
    
}