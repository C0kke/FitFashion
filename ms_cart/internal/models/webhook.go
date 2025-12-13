package models

type WebhookNotification struct {
	ID        int64  `json:"id"`
	LiveMode  bool   `json:"live_mode"`
	Type      string `json:"type"`      // Debe ser "payment"
	DateCreated string `json:"date_created"`
	UserID    int64  `json:"user_id"`
	APIVersion string `json:"api_version"`
	Data struct {
		ID string `json:"id"` // ID del Pago (Payment ID)
	} `json:"data"`
}