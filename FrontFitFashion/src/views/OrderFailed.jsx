import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/OrderFailed.css';

const mockOrderDetails = {
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