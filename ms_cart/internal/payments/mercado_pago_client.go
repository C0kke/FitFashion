package payments

import (
    "context"
    "fmt"
    "os"
    "bytes"
    "encoding/json"
    "net/http"
    "io"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
)
type PaymentStatusDetails struct {
    Status            string
    ExternalReference string
}

type PaymentClient interface {
    StartTransaction(ctx context.Context, orderID uint, total int64, items []models.OrderItem) (string, error)
    GetPaymentStatus(ctx context.Context, paymentID string) (*PaymentStatusDetails, error)
}

type MercadoPagoClient struct {
    accessToken string
    baseURL     string
}

func NewMercadoPagoClient(accessToken string) (PaymentClient, error) {
    if accessToken == "" {
        return nil, fmt.Errorf("access token no puede estar vacío")
    }

    return &MercadoPagoClient{
        accessToken: accessToken,
        baseURL:     "https://api.mercadopago.com",
    }, nil
}

type MPItem struct {
    Title      string  `json:"title"`
    Quantity   int     `json:"quantity"`
    UnitPrice  int64 `json:"unit_price"`
}

type MPBackURLs struct {
    Success string `json:"success"`
    Failure string `json:"failure"`
}

type MPPreferenceRequest struct {
    Items             []MPItem    `json:"items"`
    ExternalReference string      `json:"external_reference"`
    BackURLs          *MPBackURLs `json:"back_urls,omitempty"`
    NotificationURL   string      `json:"notification_url,omitempty"`
    AutoReturn        string      `json:"auto_return,omitempty"`
}

type MPPreferenceResponse struct {
    ID         string `json:"id"`
    InitPoint  string `json:"init_point"`
}

type MPPaymentResponse struct {
    Status            string `json:"status"`
    ExternalReference string `json:"external_reference"`
}

func (m *MercadoPagoClient) StartTransaction(ctx context.Context, orderID uint, total int64, items []models.OrderItem) (string, error) {

	mpItems := make([]MPItem, 0, len(items))
    for _, item := range items {

        mpItems = append(mpItems, MPItem{
            Title:     item.NameSnapshot,
            Quantity:  item.Quantity,
            UnitPrice: int64(item.UnitPrice),
        })
    }

    request := MPPreferenceRequest{
        Items:             mpItems,
        ExternalReference: fmt.Sprintf("%d", orderID),
    }
    
    if frontendURL := os.Getenv("FRONTEND_URL"); frontendURL != "" {
        request.BackURLs = &MPBackURLs{
            Success: frontendURL + "/success",
            Failure: frontendURL + "/failed",
        }
    }
    
    if webhookURL := os.Getenv("WEBHOOK_BASE_URL"); webhookURL != "" {
        request.NotificationURL = webhookURL + "/pagos/webhook"
    }
    
    request.AutoReturn = "approved"

    jsonData, err := json.Marshal(request)
    if err != nil {
        return "", fmt.Errorf("error al serializar la preferencia: %w", err)
    }

    req, err := http.NewRequestWithContext(ctx, "POST", m.baseURL+"/checkout/preferences", bytes.NewBuffer(jsonData))
    if err != nil {
        return "", fmt.Errorf("error al crear la petición HTTP: %w", err)
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+m.accessToken)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return "", fmt.Errorf("error al hacer la petición a Mercado Pago: %w", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", fmt.Errorf("error al leer la respuesta: %w", err)
    }

    if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
        return "", fmt.Errorf("error en Mercado Pago (status %d): %s", resp.StatusCode, string(body))
    }

    var result MPPreferenceResponse
    if err := json.Unmarshal(body, &result); err != nil {
        return "", fmt.Errorf("error al deserializar la respuesta: %w", err)
    }

    return result.InitPoint, nil
}

func (m *MercadoPagoClient) GetPaymentStatus(ctx context.Context, paymentID string) (*PaymentStatusDetails, error) {
    
    req, err := http.NewRequestWithContext(ctx, "GET", m.baseURL+"/v1/payments/"+paymentID, nil)
    if err != nil {
        return nil, fmt.Errorf("error al crear la petición HTTP: %w", err)
    }

    req.Header.Set("Authorization", "Bearer "+m.accessToken)

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        return nil, fmt.Errorf("error al hacer la petición a Mercado Pago: %w", err)
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, fmt.Errorf("error al leer la respuesta: %w", err)
    }

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("error en Mercado Pago (status %d): %s", resp.StatusCode, string(body))
    }

    var payment MPPaymentResponse
    if err := json.Unmarshal(body, &payment); err != nil {
        return nil, fmt.Errorf("error al deserializar la respuesta: %w", err)
    }
    
    details := &PaymentStatusDetails{
        Status:            payment.Status, 
        ExternalReference: payment.ExternalReference,
    }

    return details, nil
}
