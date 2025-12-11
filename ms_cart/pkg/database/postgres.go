package database

import (
	"fmt"
	"log"
	"os"
	
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	
	"github.com/Cokke/FitFashion/ms_cart/internal/models" 
)

var DB *gorm.DB 

func ConectarPostgres() {
    
    dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
        os.Getenv("DB_HOST"),
        os.Getenv("DB_USER"),
        os.Getenv("DB_PASSWORD"),
        os.Getenv("DB_NAME"),
        os.Getenv("DB_PORT"),
        os.Getenv("DB_SSLMODE"),
        os.Getenv("DB_TIMEZONE")
    )
    
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Fallo al conectar a PostgreSQL: %v", err)
	}

	fmt.Println("Conexión exitosa a PostgreSQL")

	err = db.AutoMigrate(&models.Orden{}, &models.ItemOrden{})
	if err != nil {
		log.Fatalf("Fallo la migración de la DB: %v", err)
	}
	fmt.Println("Migraciones de PostgreSQL completadas.")

	DB = db
}