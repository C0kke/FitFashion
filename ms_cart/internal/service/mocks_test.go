package service

import (
	"context"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
	"github.com/C0kke/FitFashion/ms_cart/internal/payments" // Asegúrate de importar esto
	"github.com/stretchr/testify/mock"
)

// --- MOCKS COMPARTIDOS ---

// 1. Mock CartRepo
type MockCartRepo struct {
	mock.Mock
}
func (m *MockCartRepo) FindByUserID(ctx context.Context, id string) (*models.Cart, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*models.Cart), args.Error(1)
}
func (m *MockCartRepo) Save(ctx context.Context, cart *models.Cart) error {
	args := m.Called(ctx, cart)
	return args.Error(0)
}
func (m *MockCartRepo) DeleteByUserID(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// 2. Mock OrderRepo
type MockOrderRepo struct {
	mock.Mock
}
func (m *MockOrderRepo) Create(ctx context.Context, order *models.Order) error {
	args := m.Called(ctx, order)
	order.ID = 1
	return args.Error(0)
}
func (m *MockOrderRepo) FindByUserID(ctx context.Context, id uint) ([]models.Order, error) {
	args := m.Called(ctx, id)
	return args.Get(0).([]models.Order), args.Error(1)
}
func (m *MockOrderRepo) FindByID(ctx context.Context, id uint) (*models.Order, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*models.Order), args.Error(1)
}
func (m *MockOrderRepo) FindAll(ctx context.Context) ([]models.Order, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.Order), args.Error(1)
}
func (m *MockOrderRepo) UpdateStatus(ctx context.Context, id uint, status string) error {
	args := m.Called(ctx, id, status)
	return args.Error(0)
}

// 3. Mock ProductClient (CORREGIDO)
type MockProductClient struct {
	mock.Mock
}
func (m *MockProductClient) ValidateStock(ctx context.Context, items []product.ProductInput) (*product.StockValidationOutput, error) {
	args := m.Called(ctx, items)
	if args.Get(0) == nil { return nil, args.Error(1) }
    // Aquí también casteamos al nuevo tipo
	return args.Get(0).(*product.StockValidationOutput), args.Error(1)
}
func (m *MockProductClient) CalculateCart(ctx context.Context, items []product.ProductInput) (*product.CartCalculationOutput, error) {
	args := m.Called(ctx, items)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*product.CartCalculationOutput), args.Error(1)
}
// CORREGIDO: Ahora devuelve *product.DecreaseStockOutput
func (m *MockProductClient) DecreaseStock(ctx context.Context, items []product.ProductInput) (*product.DecreaseStockOutput, error) {
	args := m.Called(ctx, items)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*product.DecreaseStockOutput), args.Error(1)
}

// 4. Mock PaymentClient (CORREGIDO)
type MockPaymentClient struct {
	mock.Mock
}
func (m *MockPaymentClient) StartTransaction(ctx context.Context, orderID uint, amount int64, items []models.OrderItem) (string, error) {
	args := m.Called(ctx, orderID, amount, items)
	return args.String(0), args.Error(1)
}
// CORREGIDO: Ahora devuelve *payments.PaymentStatusDetails
func (m *MockPaymentClient) GetPaymentStatus(ctx context.Context, id string) (*payments.PaymentStatusDetails, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*payments.PaymentStatusDetails), args.Error(1)
}

// 5. Mock Publisher
type MockOrderPublisher struct {
	mock.Mock
}
func (m *MockOrderPublisher) PublishOrderCreated(ctx context.Context, order *models.Order) error {
	args := m.Called(ctx, order)
	return args.Error(0)
}