package repository

import (
	"context"
	"encoding/json"
	"time"
	
	"github.com/go-redis/redis/v8"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database" 
)

type CartRepository interface {
	Save(ctx context.Context, cart *models.Cart) error
	FindByUserID(ctx context.Context, userID string) (*models.Cart, error)
	DeleteByUserID(ctx context.Context, userID string) error
}

type RedisCartRepository struct {
	client *redis.Client
	ttl time.Duration 
}

func NewRedisCartRepository() CartRepository {
	return &RedisCartRepository{
		client: database.RedisClient, 
		ttl: time.Hour * 24 * 5, // 5 días de TTL
	}
}

const cartKeyPrefix = "cart:"

func getCartKey(userID string) string {
	return cartKeyPrefix + userID
}

func (r *RedisCartRepository) Save(ctx context.Context, cart *models.Cart) error {
	cartJSON, err := json.Marshal(cart)
	if err != nil {
		return err
	}
	
	return r.client.Set(ctx, getCartKey(cart.UsuarioID), cartJSON, r.ttl).Err()
}

func (r *RedisCartRepository) FindByUserID(ctx context.Context, userID string) (*models.Cart, error) {
	val, err := r.client.Get(ctx, getCartKey(userID)).Result()
	
	if err == redis.Nil {
		return &models.Cart{
            UserID: userID, 
            Items: []models.CartItem{}, 
            LastUpdated: time.Now(),
        }, nil
	}
	if err != nil {
		return nil, err
	}

	cart := &models.Cart{}
	err = json.Unmarshal([]byte(val), cart)
	return cart, err
}

func (r *RedisCartRepository) DeleteByUserID(ctx context.Context, userID string) error {
	return r.client.Del(ctx, getCartKey(userID)).Err()
}