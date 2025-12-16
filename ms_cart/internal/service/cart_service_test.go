package service

import (
	"context"
	"testing"

	"github.com/C0kke/FitFashion/ms_cart/internal/models"
	"github.com/C0kke/FitFashion/ms_cart/internal/product"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestUpdateItemQuantity_AddNewItem_Success(t *testing.T) {
	// A. Setup
	mockRepo := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewCartService(mockRepo, mockProduct)

	ctx := context.Background()
	userID := "user123"
	productID := "prod_abc"
	qty := 5

	// Carrito inicial vacío
	initialCart := &models.Cart{UserID: 123, Items: []models.CartItem{}}

	// B. Comportamiento Esperado
	mockRepo.On("FindByUserID", ctx, userID).Return(initialCart, nil)

	// Esperamos validación de stock para 5 items
	mockProduct.On("ValidateStock", ctx, mock.MatchedBy(func(items []product.ProductInput) bool {
		return len(items) == 1 && items[0].Quantity == 5 && items[0].ProductID == productID
	})).Return(&product.StockValidationOutput{Valid: true}, nil)

	// Esperamos que guarde el carrito con el nuevo item
	mockRepo.On("Save", ctx, mock.MatchedBy(func(c *models.Cart) bool {
		return len(c.Items) == 1 && c.Items[0].Quantity == 5
	})).Return(nil)

	// C. Ejecución
	cart, err := svc.UpdateItemQuantity(ctx, userID, productID, qty)

	// D. Aserciones
	assert.NoError(t, err)
	assert.NotNil(t, cart)
	assert.Equal(t, 5, cart.Items[0].Quantity)
	
	mockRepo.AssertExpectations(t)
	mockProduct.AssertExpectations(t)
}

func TestUpdateItemQuantity_StockInsuficiente(t *testing.T) {
	mockRepo := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewCartService(mockRepo, mockProduct)

	ctx := context.Background()
	
	initialCart := &models.Cart{UserID: 123, Items: []models.CartItem{}}

	mockRepo.On("FindByUserID", ctx, "user123").Return(initialCart, nil)

	// Simulamos que ms_products dice que NO hay stock
	mockProduct.On("ValidateStock", ctx, mock.Anything).Return(&product.StockValidationOutput{
        Valid:   false,
        Message: "Stock insuficiente",
    }, nil)

	// NO debe llamar a Save
	cart, err := svc.UpdateItemQuantity(ctx, "user123", "prod_1", 10)

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Stock insuficiente")
	assert.Nil(t, cart)

	mockRepo.AssertNotCalled(t, "Save")
}

func TestUpdateItemQuantity_RemoveLastItem_DeletesCart(t *testing.T) {
	// Este test verifica que si la cantidad llega a 0, se llama a DeleteByUserID en vez de Save
	mockRepo := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewCartService(mockRepo, mockProduct)

	ctx := context.Background()
	productID := "prod_1"

	// Carrito tiene 1 item con cantidad 1
	initialCart := &models.Cart{
		UserID: 123,
		Items: []models.CartItem{
			{ProductID: productID, Quantity: 1},
		},
	}

	mockRepo.On("FindByUserID", ctx, "user123").Return(initialCart, nil)

	// Restamos 1 (1 - 1 = 0). NO debe llamar a ValidateStock
	// Debe llamar a DeleteByUserID porque el array de Items queda vacío
	mockRepo.On("DeleteByUserID", ctx, "user123").Return(nil)

	_, err := svc.UpdateItemQuantity(ctx, "user123", productID, -1)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
	mockRepo.AssertNotCalled(t, "Save")       // Importante: No debe guardar carrito vacío
	mockProduct.AssertNotCalled(t, "ValidateStock") // Importante: No validar stock si estamos borrando
}

func TestGetCartWithPrices_CalculatesCorrectly(t *testing.T) {
	mockRepo := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewCartService(mockRepo, mockProduct)

	ctx := context.Background()
	userID := "user123"

	// Carrito con 2 items
	cart := &models.Cart{
		UserID: 123,
		Items: []models.CartItem{
			{ProductID: "p1", Quantity: 2},
			{ProductID: "p2", Quantity: 1},
		},
	}

	// Respuesta simulada del microservicio de productos
	rpcResponse := &product.CartCalculationOutput{
		TotalPrice: 5000,
		Items: []product.CartItemSnapshot{
			{ProductID: "p1", UnitPrice: 2000, Quantity: 2, NameSnapshot: "Zapatillas"},
			{ProductID: "p2", UnitPrice: 1000, Quantity: 1, NameSnapshot: "Calcetines"},
		},
	}

	mockRepo.On("FindByUserID", ctx, userID).Return(cart, nil)
	
	// Verificamos que se envíen los inputs correctos a ms_products
	mockProduct.On("CalculateCart", ctx, mock.MatchedBy(func(inputs []product.ProductInput) bool {
		return len(inputs) == 2
	})).Return(rpcResponse, nil)

	result, err := svc.GetCartWithPrices(ctx, userID)

	assert.NoError(t, err)
	assert.Equal(t, 5000, result.TotalPrice)
	assert.Equal(t, 2, len(result.Items))
	
	mockRepo.AssertExpectations(t)
	mockProduct.AssertExpectations(t)
}

func TestGetCartWithPrices_EmptyCart_ReturnsZero(t *testing.T) {
	mockRepo := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewCartService(mockRepo, mockProduct)

	ctx := context.Background()

	// Carrito vacío
	cart := &models.Cart{UserID: 123, Items: []models.CartItem{}}

	mockRepo.On("FindByUserID", ctx, "user123").Return(cart, nil)
	
	// NO debe llamar a CalculateCart si está vacío (ahorro de recursos)
	
	result, err := svc.GetCartWithPrices(ctx, "user123")

	assert.NoError(t, err)
	assert.Equal(t, 0, result.TotalPrice)
	assert.Empty(t, result.Items)

	mockProduct.AssertNotCalled(t, "CalculateCart")
}

func TestRemoveItemFromCart_SpecificItem(t *testing.T) {
	mockRepo := new(MockCartRepo)
	mockProduct := new(MockProductClient)
	svc := NewCartService(mockRepo, mockProduct)

	ctx := context.Background()

	// Carrito con A y B
	cart := &models.Cart{
		UserID: 123,
		Items: []models.CartItem{
			{ProductID: "A", Quantity: 1},
			{ProductID: "B", Quantity: 1},
		},
	}

	mockRepo.On("FindByUserID", ctx, "user123").Return(cart, nil)

	// Esperamos que guarde el carrito solo con B
	mockRepo.On("Save", ctx, mock.MatchedBy(func(c *models.Cart) bool {
		return len(c.Items) == 1 && c.Items[0].ProductID == "B"
	})).Return(nil)

	// Removemos A
	_, err := svc.RemoveItemFromCart(ctx, "user123", "A")

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestClearCartByUserID(t *testing.T) {
	mockRepo := new(MockCartRepo)
	svc := NewCartService(mockRepo, nil)

	mockRepo.On("DeleteByUserID", context.Background(), "user1").Return(nil)

	err := svc.ClearCartByUserID(context.Background(), "user1")
	assert.NoError(t, err)
}

func TestGetCartByUserID(t *testing.T) {
	mockRepo := new(MockCartRepo)
	svc := NewCartService(mockRepo, nil)

	ctx := context.Background()
	expectedCart := &models.Cart{UserID: 123}

	mockRepo.On("FindByUserID", ctx, "user123").Return(expectedCart, nil)

	cart, err := svc.GetCartByUserID(ctx, "user123")

	assert.NoError(t, err)
	assert.Equal(t, 123, cart.UserID)
	mockRepo.AssertExpectations(t)
}

func TestRemoveItemFromCart_ErrorFinding(t *testing.T) {
	mockRepo := new(MockCartRepo)
	svc := NewCartService(mockRepo, nil)

	ctx := context.Background()
	mockRepo.On("FindByUserID", ctx, "user123").Return(nil, assert.AnError)

	_, err := svc.RemoveItemFromCart(ctx, "user123", "A")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error al buscar carrito")
	mockRepo.AssertExpectations(t)
}

func TestRemoveItemFromCart_ErrorSaving(t *testing.T) {
	mockRepo := new(MockCartRepo)
	svc := NewCartService(mockRepo, nil)

	ctx := context.Background()
	cart := &models.Cart{
		UserID: 123,
		Items: []models.CartItem{
			{ProductID: "A", Quantity: 1},
			{ProductID: "B", Quantity: 1},
		},
	}

	mockRepo.On("FindByUserID", ctx, "user123").Return(cart, nil)
	mockRepo.On("Save", ctx, mock.Anything).Return(assert.AnError)

	_, err := svc.RemoveItemFromCart(ctx, "user123", "A")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error al guardar")
	mockRepo.AssertExpectations(t)
}

func TestRemoveItemFromCart_LastItem_ErrorDeleting(t *testing.T) {
	mockRepo := new(MockCartRepo)
	svc := NewCartService(mockRepo, nil)

	ctx := context.Background()
	cart := &models.Cart{
		UserID: 123,
		Items: []models.CartItem{{ProductID: "A", Quantity: 1}},
	}

	mockRepo.On("FindByUserID", ctx, "user123").Return(cart, nil)
	mockRepo.On("DeleteByUserID", ctx, "user123").Return(assert.AnError)

	_, err := svc.RemoveItemFromCart(ctx, "user123", "A")

	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error al guardar/eliminar carrito")
	mockRepo.AssertExpectations(t)
}

func TestClearCartByUserID_Error(t *testing.T) {
	mockRepo := new(MockCartRepo)
	svc := NewCartService(mockRepo, nil)

	mockRepo.On("DeleteByUserID", context.Background(), "user1").Return(assert.AnError)

	err := svc.ClearCartByUserID(context.Background(), "user1")
	
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "error al eliminar completamente")
	mockRepo.AssertExpectations(t)
}