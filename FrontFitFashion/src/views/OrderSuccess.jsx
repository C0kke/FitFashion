import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/OrderSuccess.css';

const OrderSuccess = () => {
    const navigate = useNavigate();
    const handleGoHome = () => {
        navigate('/');
    };
    /*useEffect(() => {
        // Aquí se envía PATCH del estado de la orden al backend
        const updateOrderStatus = async () => {
            try {
                const response = await fetch(`https://api.fittfashion.com/orders/${order.id}`, {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ status: 'COMPLETED' }),
                });
                if (!response.ok) {
                    throw new Error('Error al actualizar el estado de la orden');
                }
                console.log('Estado de la orden actualizado a COMPLETED');
            } catch (error) {
                console.error('Error al actualizar el estado de la orden:', error);
            }
        };
        updateOrderStatus();
    }, []);*/

    return (
        <div className="success-container">
            <div className="success-card">
                <div className="success-header">
                    <h2>¡Pago Exitoso!</h2>
                    <p>Tu pedido ha sido confirmado.</p>
                </div>

                <button className="go-home-button" onClick={handleGoHome}>
                    Volver al Inicio
                </button>

            </div>
        </div>
    );
};

export default OrderSuccess;