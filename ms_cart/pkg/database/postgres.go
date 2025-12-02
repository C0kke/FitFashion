package database

import (
	"fmt"
	"log"
	
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	
	"github.com/Cokke/FitFashion/tree/main/ms_cart/internal/models" 
)

var DB *gorm.DB 

func ConectarPostgres() {
	dsn := "host=localhost user=postgres password=postgres dbname=ms_cart_db port=5432 sslmode=disable TimeZone=America/Santiago"
	
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Fallo al conectar a PostgreSQL: %v", err)
	}

	fmt.Println("Conexión exitosa a PostgreSQL!")

	err = db.AutoMigrate(&models.Orden{}, &models.ItemOrden{})
	if err != nil {
		log.Fatalf("Fallo la migración de la DB: %v", err)
	}
	fmt.Println("Migraciones de PostgreSQL completadas.")

	DB = db
}