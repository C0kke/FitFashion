package product

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- MOCK ---
type MockRPCCaller struct {
	mock.Mock
}

func (m *MockRPCCaller) Call(ctx context.Context, pattern string, data interface{}, response interface{}) error {
	args := m.Called(ctx, pattern, data, response)
	
	// Si el mock está configurado para devolver un valor en response, lo inyectamos
	if args.Get(0) != nil {
		// Simulación de "llenar" el puntero de respuesta
		// Esto es un truco común en Go cuando se mockean funciones que reciben punteros
		switch v := response.(type) {
		case *StockValidationOutput:
			*v = *args.Get(0).(*StockValidationOutput)
		case *CartCalculationOutput:
			*v = *args.Get(0).(*CartCalculationOutput)
		case *DecreaseStockOutput:
			*v = *args.Get(0).(*DecreaseStockOutput)
		}
	}

	return args.Error(1)
}

// --- TESTS ---

func TestValidateStock(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller} // Inyectamos el mock

	items := []ProductInput{{ProductID: "p1", Quantity: 1}}
	expectedResp := &StockValidationOutput{Valid: true, Message: "OK"}

	// Esperamos llamada con patrón "validate_stock"
	mockCaller.On("Call", mock.Anything, "validate_stock", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.ValidateStock(context.Background(), items)

	assert.NoError(t, err)
	assert.True(t, resp.Valid)
	mockCaller.AssertExpectations(t)
}

func TestCalculateCart(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 2}}
	expectedResp := &CartCalculationOutput{TotalPrice: 5000}

	mockCaller.On("Call", mock.Anything, "calculate_cart", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.CalculateCart(context.Background(), items)

	assert.NoError(t, err)
	assert.Equal(t, 5000, resp.TotalPrice)
	mockCaller.AssertExpectations(t)
}

func TestDecreaseStock(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 1}}
	expectedResp := &DecreaseStockOutput{Success: true}

	mockCaller.On("Call", mock.Anything, "decrease_stock", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.DecreaseStock(context.Background(), items)

	assert.NoError(t, err)
	assert.True(t, resp.Success)
	mockCaller.AssertExpectations(t)
}

// Test para NewProductClient
func TestNewProductClient(t *testing.T) {
	// NewProductClient espera *amqp.Connection, pero solo construye un ProductClient
	// No hace validación de nil, así que podemos pasar nil de forma segura
	client := NewProductClient(nil)
	
	// Verificar que el cliente no es nil
	assert.NotNil(t, client)
	
	// Verificar que es del tipo correcto
	_, ok := client.(ClientInterface)
	assert.True(t, ok, "NewProductClient debe devolver un ClientInterface")
}

// Test para NewProductClientWithCaller
func TestNewProductClientWithCaller(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	
	client := NewProductClientWithCaller(mockCaller)
	
	assert.NotNil(t, client)
	_, ok := client.(ClientInterface)
	assert.True(t, ok)
}

// Test de error para ValidateStock
func TestValidateStock_Error(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 1}}

	// Mock devuelve error
	mockCaller.On("Call", mock.Anything, "validate_stock", items, mock.Anything).
		Return(nil, assert.AnError)

	resp, err := client.ValidateStock(context.Background(), items)

	assert.Error(t, err)
	assert.Nil(t, resp)
	mockCaller.AssertExpectations(t)
}

// Test de error para CalculateCart
func TestCalculateCart_Error(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 2}}

	mockCaller.On("Call", mock.Anything, "calculate_cart", items, mock.Anything).
		Return(nil, assert.AnError)

	resp, err := client.CalculateCart(context.Background(), items)

	assert.Error(t, err)
	assert.Nil(t, resp)
	mockCaller.AssertExpectations(t)
}

// Test de error para DecreaseStock
func TestDecreaseStock_Error(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 1}}

	mockCaller.On("Call", mock.Anything, "decrease_stock", items, mock.Anything).
		Return(nil, assert.AnError)

	resp, err := client.DecreaseStock(context.Background(), items)

	assert.Error(t, err)
	assert.Nil(t, resp)
	mockCaller.AssertExpectations(t)
}

// Tests adicionales para mejorar cobertura masivamente

// Test con múltiples items en ValidateStock
func TestValidateStock_MultipleItems(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{
		{ProductID: "p1", Quantity: 1},
		{ProductID: "p2", Quantity: 2},
		{ProductID: "p3", Quantity: 3},
	}
	expectedResp := &StockValidationOutput{Valid: true, Message: "OK"}

	mockCaller.On("Call", mock.Anything, "validate_stock", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.ValidateStock(context.Background(), items)

	assert.NoError(t, err)
	assert.True(t, resp.Valid)
	mockCaller.AssertExpectations(t)
}

// Test con stock inválido en ValidateStock
func TestValidateStock_Invalid(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 100}}
	expectedResp := &StockValidationOutput{Valid: false, Message: "Stock insuficiente"}

	mockCaller.On("Call", mock.Anything, "validate_stock", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.ValidateStock(context.Background(), items)

	assert.NoError(t, err)
	assert.False(t, resp.Valid)
	assert.Equal(t, "Stock insuficiente", resp.Message)
	mockCaller.AssertExpectations(t)
}

// Test CalculateCart con múltiples items
func TestCalculateCart_MultipleItems(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{
		{ProductID: "p1", Quantity: 2},
		{ProductID: "p2", Quantity: 1},
	}
	expectedResp := &CartCalculationOutput{TotalPrice: 7500}

	mockCaller.On("Call", mock.Anything, "calculate_cart", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.CalculateCart(context.Background(), items)

	assert.NoError(t, err)
	assert.Equal(t, 7500, resp.TotalPrice)
	mockCaller.AssertExpectations(t)
}

// Test CalculateCart con carrito vacío
func TestCalculateCart_EmptyCart(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{}
	expectedResp := &CartCalculationOutput{TotalPrice: 0}

	mockCaller.On("Call", mock.Anything, "calculate_cart", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.CalculateCart(context.Background(), items)

	assert.NoError(t, err)
	assert.Equal(t, 0, resp.TotalPrice)
	mockCaller.AssertExpectations(t)
}

// Test DecreaseStock exitoso con múltiples items
func TestDecreaseStock_MultipleItems(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{
		{ProductID: "p1", Quantity: 1},
		{ProductID: "p2", Quantity: 2},
	}
	expectedResp := &DecreaseStockOutput{Success: true}

	mockCaller.On("Call", mock.Anything, "decrease_stock", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.DecreaseStock(context.Background(), items)

	assert.NoError(t, err)
	assert.True(t, resp.Success)
	mockCaller.AssertExpectations(t)
}

// Test DecreaseStock fallido
func TestDecreaseStock_Failed(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	items := []ProductInput{{ProductID: "p1", Quantity: 1}}
	expectedResp := &DecreaseStockOutput{Success: false}

	mockCaller.On("Call", mock.Anything, "decrease_stock", items, mock.Anything).
		Return(expectedResp, nil)

	resp, err := client.DecreaseStock(context.Background(), items)

	assert.NoError(t, err)
	assert.False(t, resp.Success)
	mockCaller.AssertExpectations(t)
}

// Test con contexto cancelado
func TestValidateStock_ContextCanceled(t *testing.T) {
	mockCaller := new(MockRPCCaller)
	client := &ProductClient{caller: mockCaller}

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // Cancelar inmediatamente

	items := []ProductInput{{ProductID: "p1", Quantity: 1}}

	mockCaller.On("Call", ctx, "validate_stock", items, mock.Anything).
		Return(nil, context.Canceled)

	resp, err := client.ValidateStock(ctx, items)

	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Equal(t, context.Canceled, err)
	mockCaller.AssertExpectations(t)
}