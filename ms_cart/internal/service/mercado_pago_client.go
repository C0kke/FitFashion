package service

import (
    "context"
    "fmt"
	"time"
    "github.com/mercadopago/mercadopago-sdk-go/pkg/config"
    "github.com/mercadopago/mercadopago-sdk-go/pkg/mercadopago" 
	"github.com/mercadopago/mercadopago-sdk-go/pkg/preference"
	"github.com/mercadopago/mercadopago-sdk-go/pkg/payment"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
)

type MercadoPagoClient struct {
    client *mercadopago.Client
}

func NewMercadoPagoClient(accessToken string) (PaymentClient, error) {
    cfg, err := config.New(accessToken)
    if err != nil {
        return nil, fmt.Errorf("fallo al configurar el cliente de Mercado Pago: %w", err)
    }

    client, err := mercadopago.NewClient(cfg)
    if err != nil {
        return nil, fmt.Errorf("fallo al crear el cliente de Mercado Pago: %w", err)
    }

    return &MercadoPagoClient{
        client: client,
    }, nil
}

func (m *MercadoPagoClient) StartTransaction(ctx context.Context, orderID uint, total float64, items []models.OrderItem) (string, error) {
    client := preference.NewClient(m.client) 
    
	mpItems := make([]preference.ItemRequest, 0, len(items))
    for _, item := range items {
        mpItems = append(mpItems, preference.ItemRequest{
            Title: item.NombreSnapshot,
            Quantity: int32(item.Cantidad),
            UnitPrice: item.PrecioUnitario,
        })
    }

    request := preference.Request{
        Items: mpItems,
        ExternalReference: fmt.Sprintf("%d", orderID), 
        BackUrls: preference.BackUrls{
            Success: "http://tu-dominio.com/checkout/success", 
            Failure: "http://tu-dominio.com/checkout/failure",
        },
        NotificationURL: "http://tu-dominio.com/api/v1/pagos/webhook", 
    }

    resource, err := client.Create(ctx, request)
    if err != nil {
        return "", fmt.Errorf("error al crear preferencia en MP: %w", err)
    }

    // 5. Devolver la URL de Pago (init_point)
    // El 'init_point' es la URL a la que el Front-end debe redirigir al usuario.
    return resource.InitPoint, nil
}

func (m *MercadoPagoClient) GetPaymentStatus(ctx context.Context, paymentID string) (*PaymentStatusDetails, error) {
    
    client := payment.NewClient(m.client)
    
    resource, err := client.Get(ctx, paymentID)
    if err != nil {
        return nil, fmt.Errorf("error al obtener detalles del pago #%s: %w", paymentID, err)
    }
    
    details := &PaymentStatusDetails{
        Status: resource.Status, 
        ExternalReference: resource.ExternalReference,
    }

    return details, nil
}