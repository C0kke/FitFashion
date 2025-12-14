package models

type WebhookNotification struct {
	ID        int64  `json:"id"`
	LiveMode  bool   `json:"live_mode"`
	Type      string `json:"type"` 
	DateCreated string `json:"date_created"`
	UserID    string  `json:"user_id"`
	APIVersion string `json:"api_version"`
	Data struct {
		ID string `json:"id"`
	} `json:"data"`
}