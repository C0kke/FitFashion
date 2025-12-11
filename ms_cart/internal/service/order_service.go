package service

import (
	"context"
	"fmt"
	"time"
	
	"github.com/go-redis/redis/v8"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database"
)

const CheckoutTTL = 10 * time.Minute 

type OrderService struct {
	OrderRepo     repository.OrderRepository
	CartRepo      repository.CartRepository
	RedisClient   *redis.Client 
    
    UserClient    UserClient 
    ProductClient ProductClient 
}

func NewOrderService(orderRepo repository.OrderRepository, cartRepo repository.CartRepository, userClient UserClient, productClient ProductClient) *OrderService {
	return &OrderService{
		OrderRepo:   orderRepo,
		CartRepo:    cartRepo,
		RedisClient: database.RedisClient,
        UserClient:  userClient,
        ProductClient: productClient,
	}
}

func (s *OrderService) ProcesarCompra(ctx context.Context, userID string) (*models.Order, error) {
	//cambiar lógica al comunicarme con el otro ms
    cart, err := s.CartRepo.FindByUserID(ctx, userID)
	if err != nil { return nil, fmt.Errorf("fallo al buscar carrito: %w", err) }
    if len(cart.Items) == 0 { return nil, fmt.Errorf("el carrito está vacío") }

    cartKey := "cart:" + userID
    
    err = s.RedisClient.Expire(ctx, cartKey, CheckoutTTL).Err()
    if err != nil { return nil, fmt.Errorf("fallo al extender TTL: %w", err) }
    
    user, err := s.UserClient.GetUserDetails(ctx, userID)
    if err != nil { return nil, fmt.Errorf("fallo al obtener detalles de usuario: %w", err) }

    orderItems, total, err := s.getSnapshotAndTotal(ctx, cart)
    if err != nil { return nil, fmt.Errorf("fallo al obtener snapshot de productos: %w", err) }

    if total > 5000 { 
        return nil, fmt.Errorf("pago rechazado por la pasarela de pagos (simulación)")
    }
    
    newOrder := &models.Order{
        UserID: user.ID,
        Total: total,
        Status: "PAGADO", 
        ShippingAddress: user.ShippingAddress, 
        OrderItems: orderItems,
    }

    err = s.OrderRepo.Create(ctx, newOrder)
    if err != nil {
        return nil, fmt.Errorf("fallo al guardar la orden en PostgreSQL: %w", err)
    }

    err = s.CartRepo.DeleteByUserID(ctx, userID)
    if err != nil {
        fmt.Printf("Advertencia: Fallo al eliminar el carrito de Redis: %v\n", err)
    }

	return newOrder, nil
}

func (s *OrderService) getSnapshotAndTotal(ctx context.Context, cart *models.Cart) ([]models.ItemOrder, float64, error) {
    items := make([]models.ItemOrder, 0, len(cart.Items))
    var total float64
    
    for _, cartItem := range cart.Items {
        productDetails, err := s.ProductClient.GetProductDetails(ctx, cartItem.ProductID)
        if err != nil {
            return nil, 0, fmt.Errorf("producto %s no encontrado o stock agotado: %w", cartItem.ProductID, err)
        }

        items = append(items, models.ItemOrder{
            ProductID: cartItem.ProductID,
            Quantity:   uint(cartItem.Quantity),
            UnitPrice: productDetails.Price,
            NameSnapshot: productDetails.Name,
        })
        
        total += productDetails.Price * float64(cartItem.Quantity)
    }
    
    return items, total, nil
}