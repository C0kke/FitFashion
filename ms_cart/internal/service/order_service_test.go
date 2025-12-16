package service

import (
	"context"
	"testing"
	"time"
	"gorm.io/gorm"
	"errors"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
	"github.com/C0kke/FitFashion/ms_cart/internal/payments"
	"github.com/go-redis/redismock/v8"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- TESTS ---

func TestProcesarCompra_Success(t *testing.T) {
	// A. Setup
	db, mockRedis := redismock.NewClientMock()
	mockRepo := new(MockOrderRepo)
	mockCart := new(MockCartRepo)
	mockPublisher := new(MockOrderPublisher)
	mockPayment := new(MockPaymentClient)
	mockProduct := new(MockProductClient)

	svc := NewOrderService(mockRepo, mockCart, mockProduct, mockPublisher, mockPayment)
	svc.RedisClient = db // Inyectamos el mock de Redis

	ctx := context.Background()
	userID := "10"
	shipping := "Calle Falsa 123"

	// Datos mock
	cart := &models.Cart{
		UserID: 10,
		Items: []models.CartItem{{ProductID: "p1", Quantity: 2}},
	}
	
	calcOutput := &product.CartCalculationOutput{
		TotalPrice: 5000,
		Items: []product.CartItemSnapshot{
			{ProductID: "p1", Quantity: 2, UnitPrice: 2500, NameSnapshot: "Polera"},
		},
	}

	// B. Expectativas
	// 1. Obtener carrito
	mockCart.On("FindByUserID", ctx, userID).Return(cart, nil)
	
	// 2. Redis Expire (usando redismock)
	mockRedis.ExpectExpire("cart:10", 10*time.Minute).SetVal(true)

	// 3. Calcular total (RPC)
	mockProduct.On("CalculateCart", ctx, mock.Anything).Return(calcOutput, nil)

	// 4. Crear Orden en DB
	mockRepo.On("Create", ctx, mock.AnythingOfType("*models.Order")).Return(nil)

	// 5. Iniciar pago
	mockPayment.On("StartTransaction", ctx, mock.Anything, int64(5000), mock.Anything).Return("http://mp.com/pay", nil)

	// 6. Publicar evento (Async)
	// Como va en una goroutine, usamos mock.Anything para no trabarnos en la comparación exacta del puntero
	mockPublisher.On("PublishOrderCreated", mock.Anything, mock.AnythingOfType("*models.Order")).Return(nil)

	// C. Ejecución
	resp, err := svc.ProcesarCompra(ctx, userID, shipping)

	// D. Assertions
	assert.NoError(t, err)
	assert.Equal(t, "PENDIENTE", resp.Status)
	assert.Equal(t, "http://mp.com/pay", resp.PaymentURL)

	// Esperamos un poco para que la goroutine se ejecute
	time.Sleep(50 * time.Millisecond)

	// Verificamos que todo se llamó
	if err := mockRedis.ExpectationsWereMet(); err != nil {
		t.Errorf("Redis expectations failed: %s", err)
	}
	mockRepo.AssertExpectations(t)
	mockPublisher.AssertExpectations(t)
}

func TestVerifyAndFinalizePayment_Approved(t *testing.T) {
	mockRepo := new(MockOrderRepo)
	mockCart := new(MockCartRepo)
	mockPublisher := new(MockOrderPublisher)
	mockPayment := new(MockPaymentClient)
	mockProduct := new(MockProductClient)

	svc := NewOrderService(mockRepo, mockCart, mockProduct, mockPublisher, mockPayment)

	ctx := context.Background()
	paymentID := "pay_123"
	
	// Simulamos respuesta de MP
	paymentDetails := &payments.PaymentStatusDetails{
        Status:            "approved",
        ExternalReference: "55",
    }

	order := &models.Order{
    Model: gorm.Model{ID: 55},
    UserID: 10,
    OrderItems: []models.OrderItem{{ProductID: "p1", Quantity: 1}},
}

	// Expectativas
	mockPayment.On("GetPaymentStatus", ctx, paymentID).Return(paymentDetails, nil)
	mockRepo.On("UpdateStatus", ctx, uint(55), "PAGADO").Return(nil)
	mockRepo.On("FindByID", ctx, uint(55)).Return(order, nil)
	
	// Restar Stock
	mockProduct.On("DecreaseStock", ctx, mock.Anything).Return(&product.DecreaseStockOutput{
        Success: true, 
    }, nil)
	
	// Borrar Carrito
	mockCart.On("DeleteByUserID", ctx, "10").Return(nil)
	
	// Publicar evento
	mockPublisher.On("PublishOrderCreated", ctx, order).Return(nil)

	// Ejecución
	err := svc.VerifyAndFinalizePayment(ctx, paymentID)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockProduct.AssertExpectations(t)
}

func TestVerifyAndFinalizePayment_Rejected(t *testing.T) {
	mockRepo := new(MockOrderRepo)
	mockPayment := new(MockPaymentClient)
	// Los otros mocks no se usan en el path de rechazo
	svc := NewOrderService(mockRepo, nil, nil, nil, mockPayment)

	ctx := context.Background()
	paymentDetails := &payments.PaymentStatusDetails{
        Status:            "rejected",
        ExternalReference: "55",
    }

	mockPayment.On("GetPaymentStatus", ctx, "pay_rej").Return(paymentDetails, nil)
	mockRepo.On("UpdateStatus", ctx, uint(55), "RECHAZADO").Return(nil)

	err := svc.VerifyAndFinalizePayment(ctx, "pay_rej")

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestGetUserOrders(t *testing.T) {
	mockRepo := new(MockOrderRepo)
	svc := NewOrderService(mockRepo, nil, nil, nil, nil)

	ctx := context.Background()
	mockRepo.On("FindByUserID", ctx, uint(10)).Return([]models.Order{{Model: gorm.Model{ID: 1}}}, nil)

	orders, err := svc.GetUserOrders(ctx, 10)

	assert.NoError(t, err)
	assert.Len(t, orders, 1)
	mockRepo.AssertExpectations(t)
}

func TestGetAllOrders(t *testing.T) {
	mockRepo := new(MockOrderRepo)
	svc := NewOrderService(mockRepo, nil, nil, nil, nil)

	ctx := context.Background()
	mockRepo.On("FindAll", ctx).Return([]models.Order{{Model: gorm.Model{ID: 1}}}, nil)

	orders, err := svc.GetAllOrders(ctx)

	assert.NoError(t, err)
	assert.Len(t, orders, 1)
	mockRepo.AssertExpectations(t)
}

func TestApproveOrder(t *testing.T) {
    // Este testea la función wrapper ApproveOrder
	mockRepo := new(MockOrderRepo)
    mockPayment := new(MockPaymentClient)
    mockProduct := new(MockProductClient)
    mockCart := new(MockCartRepo)
    // Necesitamos pasar todos los mocks porque ApproveOrder llama a VerifyAndFinalizePayment
    // que es complejo. Pero podemos testear el caso simple de error en payment status.
    
	svc := NewOrderService(mockRepo, mockCart, mockProduct, nil, mockPayment)

    // Simulamos error en payment status para terminar rápido
    mockPayment.On("GetPaymentStatus", mock.Anything, "pay_1").Return(nil, errors.New("fail"))

	err := svc.ApproveOrder(context.Background(), "pay_1")
	assert.Error(t, err)
}

func TestUpdateStatus(t *testing.T) {
	mockRepo := new(MockOrderRepo)
	// Los otros mocks pueden ser nil porque UpdateStatus no los usa
	svc := NewOrderService(mockRepo, nil, nil, nil, nil)

	ctx := context.Background()
	// Esperamos que llame al repo con ID 1 y estado "ENVIADO"
	mockRepo.On("UpdateStatus", ctx, uint(1), "ENVIADO").Return(nil)

	err := svc.UpdateStatus(ctx, 1, "ENVIADO")

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestProcesarCompra_EmptyCart(t *testing.T) {
	mockCart := new(MockCartRepo)
	svc := NewOrderService(nil, mockCart, nil, nil, nil)

	ctx := context.Background()
	cart := &models.Cart{UserID: 10, Items: []models.CartItem{}}

	mockCart.On("FindByUserID", ctx, "10").Return(cart, nil)

	_, err := svc.ProcesarCompra(ctx, "10", "address")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "carrito está vacío")
}

func TestProcesarCompra_ErrorFindingCart(t *testing.T) {
	mockCart := new(MockCartRepo)
	svc := NewOrderService(nil, mockCart, nil, nil, nil)

	ctx := context.Background()
	mockCart.On("FindByUserID", ctx, "10").Return(nil, assert.AnError)

	_, err := svc.ProcesarCompra(ctx, "10", "address")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "fallo al buscar carrito")
}

func TestProcesarCompra_ErrorExtendingTTL(t *testing.T) {
	db, mockRedis := redismock.NewClientMock()
	mockCart := new(MockCartRepo)
	svc := NewOrderService(nil, mockCart, nil, nil, nil)
	svc.RedisClient = db

	ctx := context.Background()
	cart := &models.Cart{UserID: 10, Items: []models.CartItem{{ProductID: "p1", Quantity: 1}}}

	mockCart.On("FindByUserID", ctx, "10").Return(cart, nil)
	mockRedis.ExpectExpire("cart:10", 10*time.Minute).SetErr(assert.AnError)

	_, err := svc.ProcesarCompra(ctx, "10", "address")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "fallo al extender TTL")
}

func TestProcesarCompra_InvalidUserID(t *testing.T) {
	db, mockRedis := redismock.NewClientMock()
	mockCart := new(MockCartRepo)
	svc := NewOrderService(nil, mockCart, nil, nil, nil)
	svc.RedisClient = db

	ctx := context.Background()
	cart := &models.Cart{UserID: 10, Items: []models.CartItem{{ProductID: "p1", Quantity: 1}}}

	mockCart.On("FindByUserID", ctx, "invalid").Return(cart, nil)
	mockRedis.ExpectExpire("cart:invalid", 10*time.Minute).SetVal(true)

	_, err := svc.ProcesarCompra(ctx, "invalid", "address")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ID de usuario RPC inválido")
}

func TestProcesarCompra_ErrorCalculatingCart(t *testing.T) {
	db, mockRedis := redismock.NewClientMock()
	mockCart := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewOrderService(nil, mockCart, mockProduct, nil, nil)
	svc.RedisClient = db

	ctx := context.Background()
	cart := &models.Cart{UserID: 10, Items: []models.CartItem{{ProductID: "p1", Quantity: 2}}}

	mockCart.On("FindByUserID", ctx, "10").Return(cart, nil)
	mockRedis.ExpectExpire("cart:10", 10*time.Minute).SetVal(true)
	mockProduct.On("CalculateCart", ctx, mock.Anything).Return(nil, assert.AnError)

	_, err := svc.ProcesarCompra(ctx, "10", "address")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "fallo al obtener snapshot")
}

func TestVerifyAndFinalizePayment_ErrorGettingStatus(t *testing.T) {
	mockPayment := new(MockPaymentClient)
	svc := NewOrderService(nil, nil, nil, nil, mockPayment)

	mockPayment.On("GetPaymentStatus", mock.Anything, "pay_123").Return(nil, assert.AnError)

	err := svc.VerifyAndFinalizePayment(context.Background(), "pay_123")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "fallo al obtener detalles de pago")
}

func TestVerifyAndFinalizePayment_InvalidExternalReference(t *testing.T) {
	mockPayment := new(MockPaymentClient)
	svc := NewOrderService(nil, nil, nil, nil, mockPayment)

	paymentDetails := &payments.PaymentStatusDetails{
		Status:            "approved",
		ExternalReference: "invalid",
	}

	mockPayment.On("GetPaymentStatus", mock.Anything, "pay_123").Return(paymentDetails, nil)

	err := svc.VerifyAndFinalizePayment(context.Background(), "pay_123")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "referencia externa inválida")
}

func TestApproveOrder_ErrorUpdatingStatus(t *testing.T) {
	mockPayment := new(MockPaymentClient)
	mockRepo := new(MockOrderRepo)
	mockCart := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	
	svc := NewOrderService(mockRepo, mockCart, mockProduct, nil, mockPayment)

	paymentDetails := &payments.PaymentStatusDetails{
		Status:            "approved",
		ExternalReference: "123",
	}

	mockPayment.On("GetPaymentStatus", mock.Anything, "pay_123").Return(paymentDetails, nil)
	// El flujo primero actualiza a PAGADO
	mockRepo.On("UpdateStatus", mock.Anything, uint(123), "PAGADO").Return(assert.AnError)

	err := svc.ApproveOrder(context.Background(), "pay_123")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "fallo al actualizar DB a PAGADO")
}