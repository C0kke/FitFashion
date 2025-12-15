import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/CartContext'; 
import './styles/Checkout.css'; 

const Checkout = () => {
    const { items, totalItems, removeItem } = useCart();
    const navigate = useNavigate();
    
    const subtotal = Math.round(items.reduce((acc, item) => acc + (item.price * item.quantity), 0));
    
    const ivaRate = 0.19; 
    
    const ivaAmount = Math.round(subtotal * ivaRate); 

    const finalTotal = subtotal + ivaAmount;
    
    const handlePlaceOrder = () => {
        if (finalTotal === 0) {
            alert("Tu carrito está vacío.");
            return;
        }
        
        // Simulación: Redirige a éxito o fallo
        const success = Math.random() > 0.2; 

        if (success) {
            navigate('/success');
        } else {
            navigate('/failed');
        }
    };

    if (totalItems === 0) {
        return (
            <div className="checkout-empty-container">
                <div className="empty-message-card">
                    <h2>Tu carrito está vacío.</h2>
                    <button onClick={() => navigate('/')} className="go-home-button">
                        Volver a la Tienda
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-container">
            
            <div className="checkout-content">
                
                <div className="order-summary-section">
                    <h2>Resumen de la Orden ({totalItems} {totalItems === 1 ? 'Artículo' : 'Artículos'})</h2>
                    <ul className="checkout-item-list">
                        {items.map(item => (
                            <li key={item.id} className="checkout-item">
                                <span className="item-name-qty">{item.nombre} ({item.quantity} uds)</span>
                                <span className="item-price">${Math.round(item.price * item.quantity)}</span>
                                <button onClick={() => removeItem(item.id)} className="remove-item-checkout">
                                    &times;
                                </button>
                            </li>
                        ))}
                    </ul>

                    <div className="totals-breakdown">
                        <div className="total-row">
                            <span>Subtotal (Neto):</span>
                            <span>${subtotal}</span> 
                        </div>
                        
                        <div className="total-row tax-row">
                            <span>IVA ({ivaRate * 100}%):</span>
                            <span>${ivaAmount}</span> 
                        </div>
                    </div>
                </div>

                <div className="payment-section">
                    <h2>Información de Envío y Pago</h2>
                    
                    <div className="form-placeholder">
                        <p>Aquí va el Formulario Real de Dirección y Datos de Pago.</p>
                        <p>Total calculado, listo para llamar al Backend.</p>
                    </div>

                    <div className="final-checkout-total">
                        <strong>Total a Pagar (IVA Incluido):</strong>
                        <strong className="final-amount">${finalTotal}</strong> 
                    </div>

                    <button 
                        className="place-order-button" 
                        onClick={handlePlaceOrder}
                        disabled={!items.length}
                    >
                        Pagar ahora (${finalTotal}) 
                    </button>
                </div>

            </div>
        </div>
    );
};

export default Checkout;