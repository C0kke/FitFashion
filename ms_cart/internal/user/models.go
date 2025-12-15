package user

import "github.com/C0kke/FitFashion/ms_cart/internal/models"

type GetUserDetailsRequest struct {
	UserID string `json:"user_id"`
}

type GetUserDetailsResponse struct {
	User *models.User
	Error string `json:"error,omitempty"`
}