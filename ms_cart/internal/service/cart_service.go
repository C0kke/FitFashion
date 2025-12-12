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

func (s *CartService) UpdateItemQuantity(ctx context.Context, userID string, productID string, quantityChange int) (*models.Cart, error) {
	
	cart, err := s.Repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error al buscar carrito para actualización: %w", err)
	}

	var updated = false
	var newItems []models.CartItem
	
	for _, item := range cart.Items {
		if item.ProductID == productID {
            
			newQuantity := item.Quantity + quantityChange
            
            if newQuantity > 0 {
                item.Quantity = newQuantity
                newItems = append(newItems, item)
                updated = true
            } else {
                updated = true
            }
		} else {
            newItems = append(newItems, item)
        }
	}
    
	if !updated && quantityChange > 0 {
		newItems = append(newItems, models.CartItem{
			ProductID: productID,
			Quantity:   quantityChange,
		})
	}

    if !updated && quantityChange <= 0 {
        return cart, fmt.Errorf("el producto %s no existe en el carrito para esta operación", productID)
    }

	cart.Items = newItems
    
    // Aquí iría la llamada al Microservicio de Productos para validar stock (si aplica)

    if len(cart.Items) == 0 {
        err = s.Repo.DeleteByUserID(ctx, userID)
    } else {
	    err = s.Repo.Save(ctx, cart)
    }

	if err != nil {
		return nil, fmt.Errorf("error al guardar carrito después de actualización de cantidad: %w", err)
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

func (s *CartService) ClearCartByUserID(ctx context.Context, userID string) error {
	err := s.Repo.DeleteByUserID(ctx, userID)
	if err != nil {
		return fmt.Errorf("error al eliminar completamente el carrito: %w", err)
	}
	return nil
}