package main

import (
	"log"

	"github.com/gin-gonic/gin"
	
	"github.com/Cokke/FitFashion/tree/main/ms_cart/pkg/database" 
)

func main() {
	database.ConectarPostgres()
	database.ConectarRedis()
    
	router := gin.Default()

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "UP"})
	})

	fmt.Println("Servidor iniciado en http://localhost:8080")
	log.Fatal(router.Run(":8080")) 
}