package payments

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/stretchr/testify/assert"
)

// --- MOCK DE CLIENTES HTTP ---

// Redefinimos el tipo de cliente HTTP que usaremos
// Esto nos permite inyectar el cliente mockeado, aunque en este caso usaremos httptest directamente
// para simplificar, ya que MercadoPagoClient usa &http.Client{}.

// --- TESTS ---

func TestNewMercadoPagoClient(t *testing.T) {
	// Caso éxito
	client, err := NewMercadoPagoClient("TEST_TOKEN")
	assert.NoError(t, err)
	assert.NotNil(t, client)

	// Caso error: Token vacío
	client, err = NewMercadoPagoClient("")
	assert.Error(t, err)
	assert.Nil(t, client)
}

func TestStartTransaction_Success(t *testing.T) {
	// 1. Configurar MOCK SERVER
	expectedInitPoint := "https://mock.mercadopago.com/checkout"
	
	// El mock server responde con un 201 Created y el JSON de InitPoint
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/checkout/preferences", r.URL.Path)
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer TEST_TOKEN")
		
		// Simular el JSON de respuesta exitosa
		response := MPPreferenceResponse{
			ID: "mock_id_123",
			InitPoint: expectedInitPoint,
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(response)
	}))
	defer ts.Close()

	// 2. Preparar Cliente e Items
	client := &MercadoPagoClient{accessToken: "TEST_TOKEN", baseURL: ts.URL}
	
	items := []models.OrderItem{
		{NameSnapshot: "T-Shirt", Quantity: 2, UnitPrice: 1000},
	}

	// 3. Ejecutar
	initPoint, err := client.StartTransaction(context.Background(), 10, 2000, items)

	// 4. Aserciones
	assert.NoError(t, err)
	assert.Equal(t, expectedInitPoint, initPoint)
}

func TestStartTransaction_BackendURLs(t *testing.T) {
	// 1. Configurar MOCK SERVER
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		
		// Leer el cuerpo de la petición para verificar las URLs
		var reqBody MPPreferenceRequest
		json.NewDecoder(r.Body).Decode(&reqBody)
		
		assert.Equal(t, "http://frontend.test/success", reqBody.BackURLs.Success)
		assert.Equal(t, "http://webhook.test/pagos/webhook", reqBody.NotificationURL)

		// Respuesta mock
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(MPPreferenceResponse{ID: "mock_id"})
	}))
	defer ts.Close()
    
    // Configurar variables de entorno (¡MUY IMPORTANTE!)
    os.Setenv("FRONTEND_URL", "http://frontend.test")
    os.Setenv("WEBHOOK_BASE_URL", "http://webhook.test")

	client := &MercadoPagoClient{accessToken: "TEST_TOKEN", baseURL: ts.URL}
	items := []models.OrderItem{{NameSnapshot: "Polo", Quantity: 1, UnitPrice: 500}}

	// Ejecutar
	_, err := client.StartTransaction(context.Background(), 11, 500, items)

    // Limpiar variables de entorno
    os.Unsetenv("FRONTEND_URL")
    os.Unsetenv("WEBHOOK_BASE_URL")

	assert.NoError(t, err)
}

func TestStartTransaction_APIError(t *testing.T) {
	// 1. Configurar MOCK SERVER para devolver un error 400
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`{"message": "Invalid access token"}`))
	}))
	defer ts.Close()

	client := &MercadoPagoClient{accessToken: "TEST_TOKEN", baseURL: ts.URL}
	items := []models.OrderItem{}

	// Ejecutar
	_, err := client.StartTransaction(context.Background(), 12, 0, items)

	// Aserciones
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error en Mercado Pago (status 400)")
}

func TestGetPaymentStatus_Success(t *testing.T) {
	// 1. Configurar MOCK SERVER
	expectedStatus := "approved"
	expectedRef := "123"
	
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Contains(t, r.URL.Path, "/v1/payments/PAY_ID_1")
		assert.Equal(t, "GET", r.Method)
		
		response := MPPaymentResponse{
			Status: expectedStatus,
			ExternalReference: expectedRef,
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(response)
	}))
	defer ts.Close()

	// 2. Preparar Cliente
	client := &MercadoPagoClient{accessToken: "TEST_TOKEN", baseURL: ts.URL}

	// 3. Ejecutar
	details, err := client.GetPaymentStatus(context.Background(), "PAY_ID_1")

	// 4. Aserciones
	assert.NoError(t, err)
	assert.Equal(t, expectedStatus, details.Status)
	assert.Equal(t, expectedRef, details.ExternalReference)
}

func TestGetPaymentStatus_APIError(t *testing.T) {
	// 1. Configurar MOCK SERVER para devolver un error 404
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"message": "Payment not found"}`))
	}))
	defer ts.Close()

	client := &MercadoPagoClient{accessToken: "TEST_TOKEN", baseURL: ts.URL}

	// Ejecutar
	details, err := client.GetPaymentStatus(context.Background(), "NON_EXISTENT_ID")

	// Aserciones
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error en Mercado Pago (status 404)")
	assert.Nil(t, details)
}