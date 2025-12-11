package main

import (
	"log"
	"github.com/gin-gonic/gin"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database" 
	"os"
)

func main() {
    
	port := os.Getenv("SERVER_PORT")
	if port == "" {
        port = "8080"
    }

	database.ConectarPostgres()
	database.ConectarRedis()

	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	log.Printf("Servidor iniciado en http://localhost:%s", port)
	log.Fatal(router.Run(":" + port))
}