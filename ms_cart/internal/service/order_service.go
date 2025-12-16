package service

import (
	"context"
	"fmt"
	"time"
    "log"
    "strconv"
	
	"github.com/go-redis/redis/v8"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
	"github.com/C0kke/FitFashion/ms_cart/pkg/database"
    "github.com/C0kke/FitFashion/ms_cart/internal/product"
    "github.com/C0kke/FitFashion/ms_cart/internal/payments"
)

const CheckoutTTL = 10 * time.Minute 

type OrderPublisherInterface interface {
    PublishOrderCreated(ctx context.Context, order *models.Order) error
}

type OrderService struct {
    OrderRepo      repository.OrderRepository
    CartRepo       repository.CartRepository
    RedisClient    *redis.Client 
    ProductClient  product.ClientInterface
    OrderPublisher OrderPublisherInterface 
    PaymentClient  payments.PaymentClient
}

func NewOrderService(orderRepo repository.OrderRepository, cartRepo repository.CartRepository, productClient product.ClientInterface, orderPublisher OrderPublisherInterface, paymentClient payments.PaymentClient) *OrderService {
    return &OrderService{
        OrderRepo:      orderRepo,
        CartRepo:       cartRepo,
        RedisClient:    database.RedisClient,
        ProductClient:  productClient,
        OrderPublisher: orderPublisher,
        PaymentClient:  paymentClient,
    }
}

func (s *OrderService) ProcesarCompra(ctx context.Context, userID string, shippingAddress string) (*models.CheckoutResponse, error) {
    cart, err := s.CartRepo.FindByUserID(ctx, userID)
	if err != nil { return nil, fmt.Errorf("fallo al buscar carrito: %w", err) }
    if len(cart.Items) == 0 { return nil, fmt.Errorf("el carrito está vacío") }

    cartKey := "cart:" + userID
    
    err = s.RedisClient.Expire(ctx, cartKey, CheckoutTTL).Err()
    if err != nil { return nil, fmt.Errorf("fallo al extender TTL: %w", err) }
    
    userIDUint64, err := strconv.ParseUint(userID, 10, 64)
    if err != nil { return nil, fmt.Errorf("ID de usuario RPC inválido: %w", err) }

    orderItems, total, err := s.getSnapshotAndTotal(ctx, cart)
    if err != nil { return nil, fmt.Errorf("fallo al obtener snapshot de productos: %w", err) }
    
    newOrder := &models.Order{
        UserID: uint(userIDUint64),
        Total: total,
        Status: "PENDIENTE", 
        ShippingAddress: shippingAddress, 
        OrderItems: orderItems,
    }

    s.OrderRepo.Create(ctx, newOrder) 

    paymentURL, err := s.PaymentClient.StartTransaction(ctx, newOrder.ID, newOrder.Total, orderItems)
    if err != nil {
        return nil, fmt.Errorf("fallo al generar URL de pago en Mercado Pago: %w", err)
    }

    go func() {
        ctxPub := context.Background()
        if pubErr := s.OrderPublisher.PublishOrderCreated(ctxPub, newOrder); pubErr != nil {
            log.Printf("Error ASÍNCRONO al publicar evento de orden: %v", pubErr)
        }
    }()

	return &models.CheckoutResponse{
        OrderID: newOrder.ID,
        Status: newOrder.Status,
        PaymentURL: paymentURL,
    }, nil
}

func (s *OrderService) getSnapshotAndTotal(ctx context.Context, cart *models.Cart) ([]models.OrderItem, int64, error) {
    productInputs := make([]product.ProductInput, len(cart.Items))
    for i, cartItem := range cart.Items {
        productInputs[i] = product.ProductInput{
            ProductID: cartItem.ProductID,
            Quantity:  cartItem.Quantity,
        }
    }
    
    calculation, err := s.ProductClient.CalculateCart(ctx, productInputs)
    if err != nil {
        return nil, 0, fmt.Errorf("fallo RPC al obtener snapshot y total de productos: %w", err)
    }

    orderItems := make([]models.OrderItem, len(calculation.Items))
    for i, snapshotItem := range calculation.Items {
        orderItems[i] = models.OrderItem{
            ProductID:    snapshotItem.ProductID,
            Quantity:     snapshotItem.Quantity,
            UnitPrice:    int64(snapshotItem.UnitPrice), // Usamos int64 para el precio CLP
            NameSnapshot: snapshotItem.NameSnapshot,
        }
    }

    return orderItems, int64(calculation.TotalPrice), nil
}

func (s *OrderService) GetUserOrders(ctx context.Context, userID uint) ([]models.Order, error) {
    return s.OrderRepo.FindByUserID(ctx, userID)
}

func (s *OrderService) VerifyAndFinalizePayment(ctx context.Context, paymentID string) error {
	
    paymentDetails, err := s.PaymentClient.GetPaymentStatus(ctx, paymentID)
    if err != nil {
        return fmt.Errorf("fallo al obtener detalles de pago #%s desde MP: %w", paymentID, err)
    }

	externalRef := paymentDetails.ExternalReference 
    orderID, err := strconv.ParseUint(externalRef, 10, 64)
    if err != nil {
        return fmt.Errorf("referencia externa inválida: %s", externalRef)
    }

    internalOrderID := uint(orderID)

	if paymentDetails.Status == "approved" {
        if err := s.OrderRepo.UpdateStatus(ctx, internalOrderID, "PAGADO"); err != nil {
            return fmt.Errorf("fallo al actualizar DB a PAGADO: %w", err)
        }
        
        order, err := s.OrderRepo.FindByID(ctx, internalOrderID)
        if err != nil {
            log.Printf("Advertencia: Orden #%d pagada pero no encontrada para limpieza: %v", orderID, err)
            return fmt.Errorf("orden no encontrada para pago aprobado: %w", err)
        }
        
        itemsToDecrease := make([]product.ProductInput, len(order.OrderItems)) // 🛑 Usamos OrderItems, no Items
        for i, item := range order.OrderItems {
            itemsToDecrease[i] = product.ProductInput{
                ProductID: item.ProductID, 
                Quantity:  item.Quantity,
            }
        }

        _, rpcErr := s.ProductClient.DecreaseStock(ctx, itemsToDecrease)
        if rpcErr != nil {
            log.Printf("Fallo RPC al restar stock para Orden #%d: %v", orderID, rpcErr)
            s.OrderRepo.UpdateStatus(ctx, internalOrderID, "STOCK_FALLIDO")
            return fmt.Errorf("fallo la reducción de stock: %w", rpcErr)
        }

        if err := s.CartRepo.DeleteByUserID(ctx, strconv.FormatUint(uint64(order.UserID), 10)); err != nil {
			log.Printf("Advertencia: Fallo al eliminar el carrito de Redis después de pago: %v\n", err)
		}

        if pubErr := s.OrderPublisher.PublishOrderCreated(ctx, order); pubErr != nil {
			log.Printf("Error al publicar evento de orden PAGADA: %v", pubErr)
		}
        
    } else if paymentDetails.Status == "rejected" {
        s.OrderRepo.UpdateStatus(ctx, internalOrderID, "RECHAZADO")
    }

	return nil
}

func (s *OrderService) GetAllOrders(ctx context.Context) ([]models.Order, error) {
    return s.OrderRepo.FindAll(ctx)
}

func (s *OrderService) UpdateStatus(ctx context.Context, orderID uint, status string) error {
    return s.OrderRepo.UpdateStatus(ctx, orderID, status)
}

func (s *OrderService) ApproveOrder(ctx context.Context, paymentID string) error {
    if ctx == nil {
        ctx = context.Background()
    }

    log.Printf("Procesando aprobación de orden para Payment ID: %s", paymentID)

    return s.VerifyAndFinalizePayment(ctx, paymentID)
}