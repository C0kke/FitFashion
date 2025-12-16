package product

type ProductInput struct {
    ProductID string `json:"productId"`
    Quantity  int    `json:"quantity"`
}

type StockValidationOutput struct {
    Valid   bool   `json:"valid"`
    Message string `json:"message"`
}

type CartItemSnapshot struct {
    ProductID    string  `json:"productId"`
    NameSnapshot string `json:"nameSnapshot"`
    UnitPrice    int     `json:"unitPrice"`
    Quantity     int    `json:"quantity"`
    Subtotal     int    `json:"subtotal"`
}

type CartCalculationOutput struct {
    UserID     string             `json:"user_id"`
    TotalPrice int                `json:"total"`
    Items      []CartItemSnapshot `json:"items"`
}

type DecreaseStockOutput struct {
    Success bool   `json:"success"`
    Message string `json:"message"`
}