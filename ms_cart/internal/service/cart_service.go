package service

import (
	"context"
	"fmt"
	
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
)

type CartService struct {
	Repo repository.CartRepository 
}

func NewCartService(repo repository.CartRepository) *CartService {
	return &CartService{
		Repo: repo,
	}
}

func (s *CartService) AddItemToCart(ctx context.Context, userID string, productID string, quantity int) (*models.Carrito, error) {
	
	cart, err := s.Repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error al buscar carrito: %w", err)
	}

	var updated = false 
	
	for i := range cart.Items {
		if cart.Items[i].ProductID == productID {
			cart.Items[i].Quantity += quantity 
			updated = true
			break
		}
	}

	if !updated {
		cart.Items = append(cart.Items, models.CartItem{
			ProductID: productID,
			Quantity:   quantity,
		})
	}
    
	err = s.Repo.Save(ctx, cart)
	if err != nil {
		return nil, fmt.Errorf("error al guardar carrito: %w", err)
	}

	return cart, nil
}

func (s *CartService) GetCartByUserID(ctx context.Context, userID string) (*models.Cart, error) {
	return s.Repo.FindByUserID(ctx, userID)
}

func (s *CartService) RemoveItemFromCart(ctx context.Context, userID string, productID string) (*models.Cart, error) {
	cart, err := s.Repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error al buscar carrito para remover item: %w", err)
	}

	newItems := []models.CartItem{}
	for _, item := range cart.Items {
		if item.ProductID != productID {
			newItems = append(newItems, item)
		}
	}
	cart.Items = newItems

    if len(cart.Items) == 0 {
        err = s.Repo.DeleteByUserID(ctx, userID)
    } else {
        err = s.Repo.Save(ctx, cart)
    }

	if err != nil {
		return nil, fmt.Errorf("error al guardar/eliminar carrito después de modificar: %w", err)
	}

	return cart, nil
}