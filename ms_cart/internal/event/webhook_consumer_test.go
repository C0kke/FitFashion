package event

import (
	"context"
	"errors"
	"strconv"
	"testing"

	"github.com/C0kke/FitFashion/ms_cart/internal/payments"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// --- MOCKS LOCALES ---

// 1. Mock OrderService
type MockOrderUpdater struct {
	mock.Mock
}

func (m *MockOrderUpdater) UpdateStatus(ctx context.Context, orderID uint, status string) error {
	args := m.Called(ctx, orderID, status)
	return args.Error(0)
}

// 2. Mock PaymentClient
type MockPaymentClient struct {
	mock.Mock
}

func (m *MockPaymentClient) GetPaymentStatus(ctx context.Context, id string) (*payments.PaymentStatusDetails, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*payments.PaymentStatusDetails), args.Error(1)
}
func (m *MockPaymentClient) StartTransaction(ctx context.Context, orderID uint, amount int64, items []models.OrderItem) (string, error) {
	return "", nil 
}

// --- TESTS ---

func TestProcessWebhook_Success(t *testing.T) {
	mockOrder := new(MockOrderUpdater)
	mockPay := new(MockPaymentClient)
	consumer := WebhookConsumer{
		OrderService:  mockOrder,
		PaymentClient: mockPay,
	}

	body := []byte(`{"data": {"id": "12345"}}`)
	
	// Mockear respuesta de MP
	details := &payments.PaymentStatusDetails{
		Status:            "approved",
		ExternalReference: "99",
	}
	mockPay.On("GetPaymentStatus", mock.Anything, "12345").Return(details, nil)

	// Mockear actualización de orden
	mockOrder.On("UpdateStatus", mock.Anything, uint(99), "PAGADO").Return(nil)

	err := consumer.ProcessWebhook(context.Background(), body)

	assert.NoError(t, err)
	mockPay.AssertExpectations(t)
	mockOrder.AssertExpectations(t)
}

func TestProcessWebhook_InvalidJSON(t *testing.T) {
	consumer := WebhookConsumer{}
	body := []byte(`{ json roto }`)

	err := consumer.ProcessWebhook(context.Background(), body)

	// Debe retornar nil para hacer Ack y descartar
	assert.NoError(t, err)
}

func TestProcessWebhook_APIError(t *testing.T) {
	mockPay := new(MockPaymentClient)
	consumer := WebhookConsumer{PaymentClient: mockPay}

	body := []byte(`{"data": {"id": "12345"}}`)

	// Simulamos fallo de red
	mockPay.On("GetPaymentStatus", mock.Anything, "12345").Return(nil, errors.New("timeout"))

	err := consumer.ProcessWebhook(context.Background(), body)

	// Debe retornar error para hacer Nack y reintentar
	assert.Error(t, err)
}

func TestProcessWebhook_InvalidReference(t *testing.T) {
	mockPay := new(MockPaymentClient)
	consumer := WebhookConsumer{PaymentClient: mockPay}

	body := []byte(`{"data": {"id": "12345"}}`)

	// Referencia que no es número
	details := &payments.PaymentStatusDetails{
		Status:            "approved",
		ExternalReference: "orden-abc", 
	}
	mockPay.On("GetPaymentStatus", mock.Anything, "12345").Return(details, nil)

	err := consumer.ProcessWebhook(context.Background(), body)

	// Debe retornar nil para descartar (error irrecuperable de lógica)
	assert.NoError(t, err)
}

func TestMapStatus(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"approved", "PAGADO"},
		{"rejected", "CANCELADO"},
		{"cancelled", "CANCELADO"},
		{"in_process", "PENDIENTE"},
		{"pending", "PENDIENTE"},
		{"other", "OTHER"},
	}

	for _, tt := range tests {
		result := MapStatus(tt.input)
		assert.Equal(t, tt.expected, result)
	}
}

// Test para NewWebhookConsumer
func TestNewWebhookConsumer(t *testing.T) {
	// NewWebhookConsumer simplemente construye un struct
	// No hace validación, así que podemos pasar nil
	consumer := NewWebhookConsumer(nil, nil, nil)
	
	assert.NotNil(t, consumer)
	assert.Nil(t, consumer.Channel)
	assert.Nil(t, consumer.OrderService)
	assert.Nil(t, consumer.PaymentClient)
}

// Test ProcessWebhook sin PaymentID
func TestProcessWebhook_NoPaymentID(t *testing.T) {
	consumer := WebhookConsumer{}
	body := []byte(`{"data": {}}`)

	err := consumer.ProcessWebhook(context.Background(), body)

	assert.NoError(t, err) // Debe retornar nil para descartar
}

// Test ProcessWebhook con error de actualización de estado
func TestProcessWebhook_UpdateStatusError(t *testing.T) {
	mockOrder := new(MockOrderUpdater)
	mockPay := new(MockPaymentClient)
	consumer := WebhookConsumer{
		OrderService:  mockOrder,
		PaymentClient: mockPay,
	}

	body := []byte(`{"data": {"id": "12345"}}`)
	
	details := &payments.PaymentStatusDetails{
		Status:            "approved",
		ExternalReference: "99",
	}
	mockPay.On("GetPaymentStatus", mock.Anything, "12345").Return(details, nil)

	// Mock falla actualización
	mockOrder.On("UpdateStatus", mock.Anything, uint(99), "PAGADO").Return(assert.AnError)

	err := consumer.ProcessWebhook(context.Background(), body)

	// Debe retornar error para reintentar
	assert.Error(t, err)
	mockPay.AssertExpectations(t)
	mockOrder.AssertExpectations(t)
}

// Tests adicionales para mejorar cobertura

// Test MapStatus con todos los casos
func TestMapStatus_AllCases(t *testing.T) {
	assert.Equal(t, "PAGADO", MapStatus("approved"))
	assert.Equal(t, "CANCELADO", MapStatus("rejected"))
	assert.Equal(t, "CANCELADO", MapStatus("cancelled"))
	assert.Equal(t, "PENDIENTE", MapStatus("in_process"))
	assert.Equal(t, "PENDIENTE", MapStatus("pending"))
	assert.Equal(t, "AUTHORIZED", MapStatus("authorized"))
	assert.Equal(t, "REFUNDED", MapStatus("refunded"))
	assert.Equal(t, "CHARGED_BACK", MapStatus("charged_back"))
	assert.Equal(t, "UNKNOWN", MapStatus("unknown"))
}

// Test con diferentes estructuras de datos
func TestProcessWebhook_DifferentPaymentStatuses(t *testing.T) {
	testCases := []struct {
		name           string
		status         string
		expectedStatus string
	}{
		{"approved payment", "approved", "PAGADO"},
		{"rejected payment", "rejected", "CANCELADO"},
		{"pending payment", "pending", "PENDIENTE"},
		{"in_process payment", "in_process", "PENDIENTE"},
		{"cancelled payment", "cancelled", "CANCELADO"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockOrder := new(MockOrderUpdater)
			mockPay := new(MockPaymentClient)
			consumer := WebhookConsumer{
				OrderService:  mockOrder,
				PaymentClient: mockPay,
			}

			body := []byte(`{"data": {"id": "12345"}}`)
			
			details := &payments.PaymentStatusDetails{
				Status:            tc.status,
				ExternalReference: "99",
			}
			mockPay.On("GetPaymentStatus", mock.Anything, "12345").Return(details, nil)
			mockOrder.On("UpdateStatus", mock.Anything, uint(99), tc.expectedStatus).Return(nil)

			err := consumer.ProcessWebhook(context.Background(), body)

			assert.NoError(t, err)
			mockPay.AssertExpectations(t)
			mockOrder.AssertExpectations(t)
		})
	}
}

// Test con ExternalReference en diferentes formatos
func TestProcessWebhook_DifferentExternalReferenceFormats(t *testing.T) {
	testCases := []struct {
		name        string
		reference   string
		shouldError bool
	}{
		{"numeric reference", "12345", false},
		{"zero reference", "0", false},
		{"large number", "999999999", false},
		{"empty reference", "", true},
		{"negative number", "-123", true},
		{"float number", "12.34", true},
		{"text reference", "order-123", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			mockOrder := new(MockOrderUpdater)
			mockPay := new(MockPaymentClient)
			consumer := WebhookConsumer{
				OrderService:  mockOrder,
				PaymentClient: mockPay,
			}

			body := []byte(`{"data": {"id": "PAY-123"}}`)
			
			details := &payments.PaymentStatusDetails{
				Status:            "approved",
				ExternalReference: tc.reference,
			}
			mockPay.On("GetPaymentStatus", mock.Anything, "PAY-123").Return(details, nil)
			
			if !tc.shouldError && tc.reference != "" {
				orderID, _ := strconv.ParseUint(tc.reference, 10, 64)
				mockOrder.On("UpdateStatus", mock.Anything, uint(orderID), "PAGADO").Return(nil)
			}

			err := consumer.ProcessWebhook(context.Background(), body)

			if tc.shouldError {
				assert.NoError(t, err) // Debe hacer Ack y descartar
			} else if tc.reference != "" {
				assert.NoError(t, err)
			}
			
			mockPay.AssertExpectations(t)
		})
	}
}