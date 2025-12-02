package database

import (
	"context"
	"fmt"
	"log"
	
	"github.com/go-redis/redis/v8"
)

var RedisClient *redis.Client
var Ctx = context.Background()

func ConectarRedis() {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "",               
		DB:       0,                
	})

	_, err := RedisClient.Ping(Ctx).Result()
	if err != nil {
		log.Fatalf("Fallo al conectar a Redis: %v", err)
	}
	
	fmt.Println("Conexión exitosa a Redis!")
}