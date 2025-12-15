import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/OrderFailed.css';

const mockOrderDetails = {
    total: 180,
    productos: [
        { id: 1, nombre: 'Camisa Casual', cantidad: 1, precio: 35.00 },
        { id: 2, nombre: 'Pantalones Jeans', cantidad: 1, precio: 65.50 },
        { id: 3, nombre: 'Zapatillas', cantidad: 1, precio: 79.99 },
    ],
    razonFallo: 'Fondos insuficientes o tarjeta rechazada.', 
};

const OrderFailed = () => {
    const navigate = useNavigate();
    const order = mockOrderDetails;
    
    const handleRetryPayment = () => {
        navigate('/checkout'); 
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="failed-container">
            <div className="failed-card">
                
                <div className="failed-header">
                    <h2>¡Pago Fallido!</h2>
                    <p>No pudimos procesar tu pago. Por favor, revisa tu información o intenta con otro método.</p>
                </div>

                <div className="failure-reason">
                    <h3>Motivo:</h3>
                    <p>{order.razonFallo}</p>
                </div>

                <div className="cart-summary-section">
                    <h4>Total Pendiente</h4>
                    <div className="pending-total">
                        <span>Productos:</span>
                        <span className="total-amount">${order.total.toFixed(2)}</span>
                    </div>
                </div>

                <div className="failed-actions">
                    <button className="retry-payment-button" onClick={handleRetryPayment}> 
                        Reintentar Pago
                    </button>
                    <button className="go-home-button-secondary" onClick={handleGoHome}>
                        Volver a la Tienda
                    </button>
                </div>

            </div>
        </div>
    );
};

export default OrderFailed;