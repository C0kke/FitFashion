package eventhandler

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- MOCK LOCAL ---
type MockOrderService struct {
	mock.Mock
}

func (m *MockOrderService) ApproveOrder(ctx context.Context, paymentID string) error {
	args := m.Called(ctx, paymentID)
	return args.Error(0)
}

// --- TESTS ---

func TestProcessEvent_NestedFormat(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	// Caso: JSON con data.id
	body := []byte(`{"data": {"id": "PAY-123"}}`)

	mockSvc.On("ApproveOrder", mock.Anything, "PAY-123").Return(nil)

	err := listener.ProcessEvent(body)

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestProcessEvent_FlatFormat(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	// Caso: JSON plano id
	body := []byte(`{"id": "PAY-456"}`)

	mockSvc.On("ApproveOrder", mock.Anything, "PAY-456").Return(nil)

	err := listener.ProcessEvent(body)

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestProcessEvent_InvalidJSON(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	body := []byte(`{ json invalido }`)

	err := listener.ProcessEvent(body)

	assert.NoError(t, err)
	mockSvc.AssertNotCalled(t, "ApproveOrder")
}

func TestProcessEvent_NoID(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	// JSON válido pero sin campo ID
	body := []byte(`{"data": {"name": "juan"}}`)

	err := listener.ProcessEvent(body)

	assert.NoError(t, err)
	mockSvc.AssertNotCalled(t, "ApproveOrder")
}

// Test para NewPaymentListenerForTesting
func TestNewPaymentListenerForTesting(t *testing.T) {
	mockSvc := new(MockOrderService)
	
	listener := NewPaymentListenerForTesting(mockSvc)
	
	assert.NotNil(t, listener)
	assert.Equal(t, mockSvc, listener.orderService)
	assert.Nil(t, listener.channel)
}

// Test con error en ApproveOrder
func TestProcessEvent_ApproveOrderError(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	body := []byte(`{"data": {"id": "PAY-789"}}`)

	mockSvc.On("ApproveOrder", mock.Anything, "PAY-789").Return(assert.AnError)

	err := listener.ProcessEvent(body)

	// Debe retornar el error
	assert.Error(t, err)
	mockSvc.AssertExpectations(t)
}

// Test con ID flat vacío
func TestProcessEvent_EmptyFlatID(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	body := []byte(`{"id": ""}`)

	err := listener.ProcessEvent(body)

	assert.NoError(t, err)
	mockSvc.AssertNotCalled(t, "ApproveOrder")
}

// Test con estructura vacía
func TestProcessEvent_EmptyPayload(t *testing.T) {
	mockSvc := new(MockOrderService)
	listener := PaymentListener{orderService: mockSvc}

	body := []byte(`{}`)

	err := listener.ProcessEvent(body)

	assert.NoError(t, err)
	mockSvc.AssertNotCalled(t, "ApproveOrder")
}