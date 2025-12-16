package repository

import (
	"context"
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/stretchr/testify/assert"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Helper para configurar GORM con el Mock de SQL
func setupMockDB() (*gorm.DB, sqlmock.Sqlmock, error) {
	// 1. Crear conexión mock
	db, mock, err := sqlmock.New()
	if err != nil {
		return nil, nil, err
	}

	// 2. Abrir GORM usando el driver de postgres pero con la conexión mock
	dialector := postgres.New(postgres.Config{
		Conn:       db,
		DriverName: "postgres",
	})
	
	gormDB, err := gorm.Open(dialector, &gorm.Config{})
	return gormDB, mock, err
}

func TestOrderCreate(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	order := &models.Order{
		UserID: 1,
		Total:  1000,
		Status: "PENDIENTE",
	}

	// GORM inicia una transacción por defecto al crear
	mock.ExpectBegin()

	// Esperamos un INSERT en orders. 
	// Usamos regex porque GORM puede cambiar el orden de las columnas.
	// AnyArg() se usa para los timestamps (CreatedBy, UpdatedAt) que genera GORM.
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "orders"`)).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), 1, 1000, "PENDIENTE", ""). // Ajusta los args según tus columnas
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(1))

	mock.ExpectCommit()

	err = repo.Create(context.Background(), order)

	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOrderFindByID_Found(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	// Definimos las filas que devolverá la "base de datos"
	rows := sqlmock.NewRows([]string{"id", "user_id", "status", "total"}).
		AddRow(1, 10, "PENDIENTE", 5000)

	// CORRECCIÓN AQUÍ:
	// 1. Actualizamos el SQL esperado para incluir "deleted_at", "ORDER BY" y "LIMIT"
	// 2. Actualizamos .WithArgs(1, 1) -> El primer 1 es el ID, el segundo 1 es el LIMIT
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "orders" WHERE "orders"."id" = $1 AND "orders"."deleted_at" IS NULL ORDER BY "orders"."id" LIMIT $2`)).
		WithArgs(1, 1). 
		WillReturnRows(rows)

	// Como tienes Preload("OrderItems"), GORM hará una segunda query.
	// Esta generalmente no lleva LIMIT ni deleted_at complejo si es una relación simple, 
	// pero por seguridad usamos un regex más permisivo al final.
	itemRows := sqlmock.NewRows([]string{"id", "order_id", "product_id", "quantity"}).
		AddRow(1, 1, "prod_abc", 2)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "order_items" WHERE "order_items"."order_id" = $1`)).
		WithArgs(1).
		WillReturnRows(itemRows)

	order, err := repo.FindByID(context.Background(), 1)

	// Usamos 'require' en vez de 'assert' para detener el test si hay error
	// y evitar el PANIC de memoria.
	if err != nil {
		t.Fatalf("Error inesperado en FindByID: %v", err)
	}

	assert.NotNil(t, order)
	assert.Equal(t, uint(10), order.UserID)
	assert.NotEmpty(t, order.OrderItems)
	assert.Equal(t, "prod_abc", order.OrderItems[0].ProductID)
	
	// Verificar que se cumplieron todas las expectativas
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOrderUpdateStatus_Success(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	// Esperamos un UPDATE
	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "orders" SET "status"=$1,"updated_at"=$2 WHERE id = $3`)).
		WithArgs("PAGADO", sqlmock.AnyArg(), 55).
		WillReturnResult(sqlmock.NewResult(0, 1)) // 1 fila afectada
	mock.ExpectCommit()

	err = repo.UpdateStatus(context.Background(), 55, "PAGADO")

	assert.NoError(t, err)
}

func TestOrderUpdateStatus_NotFound(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	mock.ExpectBegin()
	// Simulamos que el update afecta a 0 filas
	mock.ExpectExec(regexp.QuoteMeta(`UPDATE "orders"`)).
		WithArgs("PAGADO", sqlmock.AnyArg(), 999).
		WillReturnResult(sqlmock.NewResult(0, 0)) // 0 filas afectadas
	mock.ExpectCommit()

	err = repo.UpdateStatus(context.Background(), 999, "PAGADO")

	// Debe retornar error porque RowsAffected == 0
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "orden no encontrada")
}

func TestOrderFindByUserID(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	// Filas esperadas
	rows := sqlmock.NewRows([]string{"id", "user_id", "status", "total"}).
		AddRow(1, 10, "PENDIENTE", 5000).
		AddRow(2, 10, "PAGADO", 3000)

	// Esperamos SELECT con filtro por user_id
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "orders" WHERE user_id = $1`)).
		WithArgs(10).
		WillReturnRows(rows)

	// GORM intentará cargar OrderItems para cada orden (Preload)
	// Simulamos que no tienen items para simplificar el mock
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "order_items" WHERE "order_items"."order_id" IN ($1,$2)`)).
		WithArgs(1, 2).
		WillReturnRows(sqlmock.NewRows([]string{"id", "order_id"}))

	orders, err := repo.FindByUserID(context.Background(), 10)

	assert.NoError(t, err)
	assert.Len(t, orders, 2)
	assert.Equal(t, uint(10), orders[0].UserID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOrderFindAll(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	rows := sqlmock.NewRows([]string{"id", "user_id", "status"}).
		AddRow(1, 10, "PENDIENTE").
		AddRow(2, 11, "ENVIADO")

	// Esperamos SELECT sin WHERE
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "orders"`)).
		WillReturnRows(rows)

	// Mock del Preload de items
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "order_items" WHERE "order_items"."order_id" IN ($1,$2)`)).
		WithArgs(1, 2).
		WillReturnRows(sqlmock.NewRows([]string{"id", "order_id"}))

	orders, err := repo.FindAll(context.Background())

	assert.NoError(t, err)
	assert.Len(t, orders, 2)
	
	// Verificamos tu lógica de inicializar arrays vacíos si son nil
	assert.NotNil(t, orders[0].OrderItems) 
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestNewPostgresOrderRepository(t *testing.T) {
	repo := NewPostgresOrderRepository()
	assert.NotNil(t, repo)
}

func TestOrderCreate_Error(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	order := &models.Order{
		UserID: 1,
		Total:  1000,
		Status: "PENDIENTE",
	}

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta(`INSERT INTO "orders"`)).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), 1, 1000, "PENDIENTE", "").
		WillReturnError(assert.AnError)
	mock.ExpectRollback()

	err = repo.Create(context.Background(), order)

	assert.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOrderFindByID_NotFound(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	// Retornamos 0 filas (no encontrado)
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "orders" WHERE "orders"."id" = $1 AND "orders"."deleted_at" IS NULL ORDER BY "orders"."id" LIMIT $2`)).
		WithArgs(999, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	order, err := repo.FindByID(context.Background(), 999)

	assert.Error(t, err)
	assert.Nil(t, order)
	assert.Contains(t, err.Error(), "record not found")
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOrderFindByUserID_Empty(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	// Retornamos 0 filas
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "orders" WHERE user_id = $1`)).
		WithArgs(999).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	orders, err := repo.FindByUserID(context.Background(), 999)

	assert.NoError(t, err)
	assert.Empty(t, orders)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestOrderFindAll_Empty(t *testing.T) {
	gormDB, mock, err := setupMockDB()
	assert.NoError(t, err)

	repo := &PostgresOrderRepository{DB: gormDB}

	// Retornamos 0 filas
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "orders"`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	orders, err := repo.FindAll(context.Background())

	assert.NoError(t, err)
	assert.Empty(t, orders)
	assert.NoError(t, mock.ExpectationsWereMet())
}