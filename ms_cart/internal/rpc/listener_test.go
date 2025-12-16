package rpc

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
	"github.com/streadway/amqp"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- MOCKS LOCALES ---

type MockCartController struct {
	mock.Mock
}

func (m *MockCartController) UpdateItemQuantity(ctx context.Context, userID string, productID string, quantityChange int) (*models.Cart, error) {
	args := m.Called(ctx, userID, productID, quantityChange)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*models.Cart), args.Error(1)
}
func (m *MockCartController) GetCartWithPrices(ctx context.Context, userID string) (*product.CartCalculationOutput, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*product.CartCalculationOutput), args.Error(1)
}
func (m *MockCartController) RemoveItemFromCart(ctx context.Context, userID string, productID string) (*models.Cart, error) {
	args := m.Called(ctx, userID, productID)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*models.Cart), args.Error(1)
}

type MockOrderController struct {
	mock.Mock
}

func (m *MockOrderController) ProcesarCompra(ctx context.Context, userID string, shippingAddress string) (*models.CheckoutResponse, error) {
	args := m.Called(ctx, userID, shippingAddress)
	if args.Get(0) == nil { return nil, args.Error(1) }
	return args.Get(0).(*models.CheckoutResponse), args.Error(1)
}
func (m *MockOrderController) GetUserOrders(ctx context.Context, userID uint) ([]models.Order, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.Order), args.Error(1)
}
func (m *MockOrderController) GetAllOrders(ctx context.Context) ([]models.Order, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.Order), args.Error(1)
}

type MockAMQPConnection struct {
    mock.Mock
}
func (m *MockAMQPConnection) Channel() (*amqp.Channel, error) {
    args := m.Called()
    if args.Get(0) == nil { return nil, args.Error(1) }
    return args.Get(0).(*amqp.Channel), args.Error(1)
}
func (m *MockAMQPConnection) Close() error {
    args := m.Called()
    return args.Error(0)
}

// Mock del canal AMQP (amqp.Channel)
type MockAMQPChannel struct {
    mock.Mock
}
func (m *MockAMQPChannel) Close() error { return m.Called().Error(0) }
func (m *MockAMQPChannel) QueueDeclare(name string, durable, autoDelete, exclusive, noWait bool, args amqp.Table) (amqp.Queue, error) {
    call := m.Called(name, durable, autoDelete, exclusive, noWait, args)
    return call.Get(0).(amqp.Queue), call.Error(1)
}

// --- TESTS ---

func TestProcessRequest_GetCart(t *testing.T) {
	mockCart := new(MockCartController)
	mockOrder := new(MockOrderController)
	listener := Listener{Service: mockCart, OrderService: mockOrder}

	// Simulamos request { "user_id": "123" }
	data := json.RawMessage(`{"user_id": "123"}`)

	mockCart.On("GetCartWithPrices", mock.Anything, "123").Return(&product.CartCalculationOutput{TotalPrice: 100}, nil)

	resp, err := listener.ProcessRequest(context.Background(), "get_cart_by_user", data)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	mockCart.AssertExpectations(t)
}

func TestProcessRequest_AdjustQuantity(t *testing.T) {
	mockCart := new(MockCartController)
	listener := Listener{Service: mockCart}

	data := json.RawMessage(`{"user_id": "123", "product_id": "p1", "quantity": 5}`)

	mockCart.On("UpdateItemQuantity", mock.Anything, "123", "p1", 5).Return(&models.Cart{}, nil)

	_, err := listener.ProcessRequest(context.Background(), "adjust_item_quantity", data)

	assert.NoError(t, err)
	mockCart.AssertExpectations(t)
}

func TestProcessRequest_ProcessCheckout(t *testing.T) {
	mockOrder := new(MockOrderController)
	listener := Listener{OrderService: mockOrder}

	data := json.RawMessage(`{"user_id": "123", "shippingAddress": "Casa"}`)

	mockOrder.On("ProcesarCompra", mock.Anything, "123", "Casa").Return(&models.CheckoutResponse{Status: "OK"}, nil)

	_, err := listener.ProcessRequest(context.Background(), "process_checkout", data)

	assert.NoError(t, err)
	mockOrder.AssertExpectations(t)
}

func TestProcessRequest_UnknownPattern(t *testing.T) {
	listener := Listener{}
	data := json.RawMessage(`{}`)

	_, err := listener.ProcessRequest(context.Background(), "patron_desconocido", data)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "no reconocido")
}

func TestProcessRequest_RemoveItem(t *testing.T) {
	mockCart := new(MockCartController)
	listener := Listener{Service: mockCart}

	data := json.RawMessage(`{"user_id": "123", "product_id": "p1"}`)

	mockCart.On("RemoveItemFromCart", mock.Anything, "123", "p1").Return(&models.Cart{}, nil)

	_, err := listener.ProcessRequest(context.Background(), "remove_item_from_cart", data)
	assert.NoError(t, err)
}

func TestProcessRequest_GetAllOrders(t *testing.T) {
	mockOrder := new(MockOrderController)
	listener := Listener{OrderService: mockOrder}
	
	mockOrder.On("GetAllOrders", mock.Anything).Return([]models.Order{}, nil)

	_, err := listener.ProcessRequest(context.Background(), "get_all_orders", json.RawMessage(`{}`))
	assert.NoError(t, err)
}

// Test para NewRpcListenerForTesting
func TestNewRpcListenerForTesting(t *testing.T) {
	mockCart := new(MockCartController)
	mockOrder := new(MockOrderController)
	
	listener := NewRpcListenerForTesting(mockCart, mockOrder)
	
	assert.NotNil(t, listener)
	assert.Equal(t, mockCart, listener.Service)
	assert.Equal(t, mockOrder, listener.OrderService)
	assert.Nil(t, listener.Channel)
	assert.Equal(t, "test_queue", listener.QueueName)
}

// Test para error de JSON inválido en add_to_cart
func TestProcessRequest_AddToCart_InvalidJSON(t *testing.T) {
	listener := Listener{}
	
	_, err := listener.ProcessRequest(context.Background(), "adjust_item_quantity", json.RawMessage(`{"invalid json`))
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "datos de entrada inválidos")
}

// Test para error de user_id inválido en get_user_orders
func TestProcessRequest_GetUserOrders_InvalidUserID(t *testing.T) {
	listener := Listener{}
	
	_, err := listener.ProcessRequest(context.Background(), "get_user_orders", json.RawMessage(`{"user_id": "invalid"}`))
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "ID de usuario RPC inválido")
}

// Tests adicionales para mejorar cobertura

// Test para error en GetCartWithPrices
func TestProcessRequest_GetCart_Error(t *testing.T) {
	mockCart := new(MockCartController)
	listener := Listener{Service: mockCart}

	data := json.RawMessage(`{"user_id": "123"}`)
	mockCart.On("GetCartWithPrices", mock.Anything, "123").Return(nil, assert.AnError)

	_, err := listener.ProcessRequest(context.Background(), "get_cart", data)
	assert.Error(t, err)
}

// Test para error en UpdateItemQuantity
func TestProcessRequest_AddToCart_Error(t *testing.T) {
	mockCart := new(MockCartController)
	listener := Listener{Service: mockCart}

	data := json.RawMessage(`{"user_id": "123", "product_id": "p1", "quantity": 2}`)
	mockCart.On("UpdateItemQuantity", mock.Anything, "123", "p1", 2).Return(nil, assert.AnError)

	_, err := listener.ProcessRequest(context.Background(), "add_to_cart", data)
	assert.Error(t, err)
}

// Test para error en ProcesarCompra
func TestProcessRequest_ProcessCheckout_Error(t *testing.T) {
	mockOrder := new(MockOrderController)
	listener := Listener{OrderService: mockOrder}

	data := json.RawMessage(`{"user_id": "123", "shippingAddress": "Calle 123"}`)
	mockOrder.On("ProcesarCompra", mock.Anything, "123", "Calle 123").Return(nil, assert.AnError)

	_, err := listener.ProcessRequest(context.Background(), "process_checkout", data)
	assert.Error(t, err)
}

// Test para error en GetUserOrders
func TestProcessRequest_GetUserOrders_Error(t *testing.T) {
	mockOrder := new(MockOrderController)
	listener := Listener{OrderService: mockOrder}

	data := json.RawMessage(`{"user_id": "10"}`)
	mockOrder.On("GetUserOrders", mock.Anything, uint(10)).Return([]models.Order{}, assert.AnError)

	_, err := listener.ProcessRequest(context.Background(), "get_user_orders", data)
	assert.Error(t, err)
}

// Test para error en RemoveItemFromCart
func TestProcessRequest_RemoveItem_Error(t *testing.T) {
	mockCart := new(MockCartController)
	listener := Listener{Service: mockCart}

	data := json.RawMessage(`{"user_id": "123", "product_id": "p1"}`)
	mockCart.On("RemoveItemFromCart", mock.Anything, "123", "p1").Return(nil, assert.AnError)

	_, err := listener.ProcessRequest(context.Background(), "remove_item_from_cart", data)
	assert.Error(t, err)
}

// Test para error en GetAllOrders
func TestProcessRequest_GetAllOrders_Error(t *testing.T) {
	mockOrder := new(MockOrderController)
	listener := Listener{OrderService: mockOrder}
	
	mockOrder.On("GetAllOrders", mock.Anything).Return([]models.Order{}, assert.AnError)

	_, err := listener.ProcessRequest(context.Background(), "get_all_orders", json.RawMessage(`{}`))
	assert.Error(t, err)
}

// Test para JSON inválido en process_checkout
func TestProcessRequest_ProcessCheckout_InvalidJSON(t *testing.T) {
	listener := Listener{}
	
	_, err := listener.ProcessRequest(context.Background(), "process_checkout", json.RawMessage(`{"invalid`))
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "datos de entrada inválidos")
}

// Test para JSON inválido en remove_item_from_cart
func TestProcessRequest_RemoveItem_InvalidJSON(t *testing.T) {
	listener := Listener{}
	
	_, err := listener.ProcessRequest(context.Background(), "remove_item_from_cart", json.RawMessage(`{"invalid`))
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "datos de entrada inválidos")
}