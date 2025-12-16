import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { useUser } from '../store/UserContext';
import { cartService } from '../services/cart.service';
import './styles/Checkout.css'; 

const Checkout = () => {
    const { items, totalItems, removeItem } = useCart();
    const { user } = useUser();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [selectedAddress, setSelectedAddress] = useState("");

    useEffect(() => {
        if (user?.addresses && user.addresses.length > 0) {
            setSelectedAddress(user.addresses[0]);
        }
    }, [user]);

    const subtotal = Math.round(items.reduce((acc, item) => acc + (item.price * item.quantity), 0));
    const ivaRate = 0.19; 
    const ivaAmount = Math.round(subtotal * ivaRate); 
    const finalTotal = subtotal + ivaAmount;

    const handlePlaceOrder = async () => {
        if (finalTotal === 0) return alert("Carrito vacío");

        if (!selectedAddress) {
            alert("Por favor selecciona una dirección de envío.");
            return;
        }

        setLoading(true);
        try {
            const response = await cartService.checkout(selectedAddress);

            if (response?.order?.payment_url) {
                window.location.href = response.order.payment_url;
            } else {
                alert("Error: No se recibió link de pago.");
            }
        } catch (error) {
            console.error(error);
            alert("Error procesando la orden.");
        } finally {
            setLoading(false);
        }
    };

    if (totalItems === 0) return <div className="checkout-empty-container"><h2>Carrito Vacío</h2></div>;

    return (
        <div className="checkout-container">
            <div className="checkout-content">
                
                <div className="order-summary-section">
                    <h2>Resumen de la Orden ({totalItems} {totalItems === 1 ? 'Artículo' : 'Artículos'})</h2>
                    <ul className="checkout-item-list">
                        {items.map(item => (
                            <li key={item.id} className="checkout-item">
                                <span className="item-name-qty">{item.name || "Producto"} ({item.quantity} uds)</span>
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
                    <h2>Selecciona Dirección de Envío</h2>

                    <div className="addresses-list">
                        {user?.addresses && user.addresses.length > 0 ? (
                            user.addresses.map((addr, index) => (
                                <label key={index} className={`address-option ${selectedAddress === addr ? 'selected' : ''}`}>
                                    <input 
                                        type="radio" 
                                        name="shippingAddress" 
                                        value={addr}
                                        checked={selectedAddress === addr}
                                        onChange={(e) => setSelectedAddress(e.target.value)}
                                    />
                                    <div className="address-details">
                                        <span className="addr-text">{addr}</span>
                                        {index === 0 && <span className="badge">Principal</span>}
                                    </div>
                                </label>
                            ))
                        ) : (
                            <div className="no-address-warning">
                                <p>⚠️ No tienes direcciones guardadas.</p>
                                <button onClick={() => navigate('/profile')}>Ir a mi Perfil para agregar</button>
                            </div>
                        )}
                    </div>

                    <div className="final-checkout-total">
                        <strong>Total a Pagar:</strong>
                        <strong className="final-amount">${finalTotal}</strong> 
                    </div>

                    <button 
                        className="place-order-button mp-button" 
                        onClick={handlePlaceOrder}
                        disabled={loading || !selectedAddress}
                    >
                        {loading ? 'Redirigiendo...' : 'Ir a Pagar con Mercado Pago'} 
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Checkout;