package database

import (
	"context"
	"fmt"
	"log"
	"os"
	
	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client
var Ctx = context.Background()

func ConectarRedis() {
	redisHost := os.Getenv("REDIS_HOST")
	redisPort := os.Getenv("REDIS_PORT")
	redisPassword := os.Getenv("REDIS_PASSWORD")
	addr := fmt.Sprintf("%s:%s", redisHost, redisPort)

	if redisHost == "" || redisPort == "" {
		addr = "localhost:6379"
	}

	RedisClient = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: redisPassword,               
		DB:       0,                
	})

	_, err := RedisClient.Ping(Ctx).Result()
	if err != nil {
		log.Fatalf("Fallo al conectar a Redis: %v", err)
	}
	
	fmt.Println("Conexión exitosa a Redis")
}