package repository

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/go-redis/redismock/v8"
	"github.com/stretchr/testify/assert"
)

func TestCartSave(t *testing.T) {
	// 1. Setup Mock
	db, mock := redismock.NewClientMock()

	// Instanciamos el repo MANUALMENTE para inyectar el mock en lugar de la conexión real
	repo := &RedisCartRepository{
		client: db,
		ttl:    time.Hour,
	}

	ctx := context.Background()
	cart := &models.Cart{UserID: 1, Items: []models.CartItem{{ProductID: "A", Quantity: 1}}}
	cartJSON, _ := json.Marshal(cart)

	// 2. Expectativa: Esperamos un SET en Redis
	mock.ExpectSet("cart:1", cartJSON, time.Hour).SetVal("OK")

	// 3. Ejecución
	err := repo.Save(ctx, cart)

	// 4. Aserción
	assert.NoError(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCartFindByUserID_Found(t *testing.T) {
	db, mock := redismock.NewClientMock()
	repo := &RedisCartRepository{client: db}

	ctx := context.Background()
	expectedCart := &models.Cart{UserID: 1, Items: []models.CartItem{{ProductID: "A"}}}
	cartJSON, _ := json.Marshal(expectedCart)

	// Expectativa: GET retorna el JSON string
	mock.ExpectGet("cart:1").SetVal(string(cartJSON))

	cart, err := repo.FindByUserID(ctx, "1")

	assert.NoError(t, err)
	assert.Equal(t, 1, cart.UserID)
	assert.Equal(t, "A", cart.Items[0].ProductID)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCartFindByUserID_NotFound_ReturnsEmpty(t *testing.T) {
	db, mock := redismock.NewClientMock()
	repo := &RedisCartRepository{client: db}

	ctx := context.Background()

	// Expectativa: GET retorna redis.Nil (No encontrado)
	mock.ExpectGet("cart:99").RedisNil()

	cart, err := repo.FindByUserID(ctx, "99")

	// Tu lógica dice: Si es redis.Nil, retorna un carrito vacío sin error.
	assert.NoError(t, err)
	assert.NotNil(t, cart)
	assert.Equal(t, 99, cart.UserID)
	assert.Empty(t, cart.Items)
}

func TestCartDeleteByUserID(t *testing.T) {
	db, mock := redismock.NewClientMock()
	repo := &RedisCartRepository{client: db}

	mock.ExpectDel("cart:1").SetVal(1)

	err := repo.DeleteByUserID(context.Background(), "1")

	assert.NoError(t, err)
}

// Después de tus otros tests
func TestNewRedisCartRepository(t *testing.T) {
	repo := NewRedisCartRepository()
	assert.NotNil(t, repo)
}

func TestCartSave_Error(t *testing.T) {
	db, mock := redismock.NewClientMock()
	repo := &RedisCartRepository{
		client: db,
		ttl:    time.Hour,
	}

	ctx := context.Background()
	cart := &models.Cart{UserID: 1, Items: []models.CartItem{{ProductID: "A", Quantity: 1}}}
	cartJSON, _ := json.Marshal(cart)

	// Simulamos un error de Redis
	mock.ExpectSet("cart:1", cartJSON, time.Hour).SetErr(assert.AnError)

	err := repo.Save(ctx, cart)

	assert.Error(t, err)
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCartFindByUserID_InvalidJSON(t *testing.T) {
	db, mock := redismock.NewClientMock()
	repo := &RedisCartRepository{client: db}

	ctx := context.Background()

	// Retornamos JSON inválido
	mock.ExpectGet("cart:1").SetVal("invalid-json")

	cart, err := repo.FindByUserID(ctx, "1")

	// json.Unmarshal retorna error pero también devuelve el objeto cart (con valores por defecto)
	assert.Error(t, err)
	assert.NotNil(t, cart) // El cart existe pero tiene valores por defecto
	assert.NoError(t, mock.ExpectationsWereMet())
}

func TestCartFindByUserID_RedisError(t *testing.T) {
	db, mock := redismock.NewClientMock()
	repo := &RedisCartRepository{client: db}

	ctx := context.Background()

	// Simulamos un error de Redis que NO es redis.Nil
	mock.ExpectGet("cart:1").SetErr(assert.AnError)

	cart, err := repo.FindByUserID(ctx, "1")

	assert.Error(t, err)
	assert.Nil(t, cart)
	assert.NoError(t, mock.ExpectationsWereMet())
}