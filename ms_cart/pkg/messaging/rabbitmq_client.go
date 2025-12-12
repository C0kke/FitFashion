package messaging

import (
	"log"
	"os"
	"github.com/streadway/amqp"
)

var RabbitMQConn *amqp.Connection

func ConectarRabbitMQ() {
	rabbitURL := os.Getenv("RABBITMQ_URL")
    if rabbitURL == "" {
        rabbitURL = "amqp://guest:guest@localhost:5672/" 
    }

	conn, err := amqp.Dial(rabbitURL)
	if err != nil {
		log.Fatalf("Fallo al conectar a RabbitMQ: %v", err)
	}
	RabbitMQConn = conn
	log.Println("Conexión exitosa a RabbitMQ!")
}