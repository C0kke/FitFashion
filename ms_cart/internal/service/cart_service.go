package service

import (
	"context"
	"errors"
	"fmt"

	"log"
	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
	"github.com/C0kke/FitFashion/ms_cart/internal/repository"
)

type CartService struct {
	Repo repository.CartRepository 
	ProductClient product.ClientInterface
}

func NewCartService(repo repository.CartRepository, productClient product.ClientInterface) *CartService {
	return &CartService{
		Repo:          repo,
		ProductClient: productClient,
	}
}

func (s *CartService) UpdateItemQuantity(ctx context.Context, userID string, productID string, quantityChange int) (*models.Cart, error) {
	
	cart, err := s.Repo.FindByUserID(ctx, userID)
	log.Printf("[DEBUG-SVC] Carrito encontrado para %s. Items: %d", userID, len(cart.Items))
	if err != nil {
		return nil, fmt.Errorf("error al buscar carrito para actualización: %w", err)
	}

	var newItems []models.CartItem
	var currentQuantity = 0
	var itemExists = false

	for _, item := range cart.Items {
		if item.ProductID == productID {
            currentQuantity = item.Quantity
			itemExists = true
			break
		}
	}
    log.Printf("[DEBUG-SVC] currentQuantity: %d, quantityChange: %d", currentQuantity, quantityChange)
	targetQuantity := currentQuantity + quantityChange
	
	if !itemExists && quantityChange > 0 {
		targetQuantity = quantityChange
	}
	log.Printf("[DEBUG-SVC] targetQuantity: %d, itemExists: %t", targetQuantity, itemExists)
	if targetQuantity <= 0 && itemExists == false {
		return cart, fmt.Errorf("el producto %s no existe en el carrito para esta operación", productID)
	}

	if targetQuantity > 0 {
		itemsToValidate := []product.ProductInput{
			{
				ProductID: productID,
				Quantity:  targetQuantity,
			},
		}

		log.Printf("[DEBUG-SVC] Llamando a ms_products.ValidateStock para Producto: %s, Cantidad: %d", productID, targetQuantity)
		validationResult, rpcErr := s.ProductClient.ValidateStock(ctx, itemsToValidate)
		if rpcErr != nil {
			log.Printf("[ERROR-CRITICO] FALLO RPC (ms_products): %v", rpcErr)
			return nil, fmt.Errorf("fallo RPC al validar stock con ms_products: %w", rpcErr)
		}

		if !validationResult.Valid {
			return nil, errors.New(validationResult.Message) 
		}
	}
    
    var updated = false
	newItems = []models.CartItem{} 
	
	for _, item := range cart.Items {
		if item.ProductID == productID {
			if targetQuantity > 0 {
				item.Quantity = targetQuantity
				newItems = append(newItems, item)
				updated = true
			} else {
				updated = true
			}
		} else {
			newItems = append(newItems, item)
		}
	}
    if !updated && targetQuantity > 0 {
		newItems = append(newItems, models.CartItem{
			ProductID: productID,
			Quantity:  targetQuantity,
		})
	}
	
	cart.Items = newItems

	if len(cart.Items) == 0 {
		err = s.Repo.DeleteByUserID(ctx, userID)
	} else {
		err = s.Repo.Save(ctx, cart)
	}

	if err != nil {
		return nil, fmt.Errorf("error al guardar carrito después de actualización de cantidad: %w", err)
	}

	log.Printf("[DEBUG-SVC] Operación completada. Guardando Carrito con ID: %s", userID) // Confirma que cart.ID tiene valor
	return cart, nil
}

func (s *CartService) GetCartByUserID(ctx context.Context, userID string) (*models.Cart, error) {
	return s.Repo.FindByUserID(ctx, userID)
}

func (s *CartService) GetCartWithPrices(ctx context.Context, userID string) (*product.CartCalculationOutput, error) {
	cart, err := s.Repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("error al buscar carrito: %w", err)
	}
	
	if len(cart.Items) == 0 {
		return &product.CartCalculationOutput{TotalPrice: 0, Items: []product.CartItemSnapshot{}}, nil
	}

	productInputs := make([]product.ProductInput, len(cart.Items))
	for i, item := range cart.Items {
		productInputs[i] = product.ProductInput{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
		}
	}

	calculation, err := s.ProductClient.CalculateCart(ctx, productInputs)
	if err != nil {
		return nil, fmt.Errorf("fallo RPC al calcular carrito con ms_products: %w", err)
	}

	return calculation, nil
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