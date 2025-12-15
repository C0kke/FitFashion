import React from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/OrderSuccess.css';

const mockOrder = {
    id: 'FF-890123',
    fecha: new Date().toLocaleDateString('es-ES'),
    total: 180,
    metodo: 'Tarjeta de Crédito',
    direccion: 'Av. Libertador #1234, Santiago, Chile',
    productos: [
        { id: 1, nombre: 'Camisa Casual', cantidad: 1, precio: 35, subtotal: 35.00 },
        { id: 2, nombre: 'Pantalones Jeans', cantidad: 1, precio: 65, subtotal: 65.50 },
        { id: 3, nombre: 'Zapatillas', cantidad: 1, precio: 79, subtotal: 79.99 },
    ],
};

const OrderSuccess = () => {
    const navigate = useNavigate();
    const order = mockOrder; 
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
                    <p>Tu pedido ha sido confirmado. Recibirás un correo electrónico con los detalles.</p>
                </div>

                <div className="order-summary-details">
                    <h3>Detalles de la Orden</h3>
                    <p><strong>Número de Orden:</strong> {order.id}</p>
                    <p><strong>Fecha:</strong> {order.fecha}</p>
                    <p><strong>Método de Pago:</strong> {order.metodo}</p>
                    <p><strong>Dirección de Envío:</strong> {order.direccion}</p>
                </div>

                <div className="product-details-section">
                    <h4>Productos Adquiridos</h4>
                    <ul className="product-list">
                        {order.productos.map(item => (
                            <li key={item.id} className="product-item">
                                <span>{item.nombre}</span>
                                <span>{item.cantidad} x ${item.precio.toFixed(2)}</span>
                                <span className="item-subtotal">Total: ${item.subtotal.toFixed(2)}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="final-total">
                    <span>Total Pagado:</span>
                    <span className="total-amount">${order.total.toFixed(2)}</span>
                </div>

                <button className="go-home-button" onClick={handleGoHome}>
                    Volver al Inicio
                </button>

            </div>
        </div>
    );
};

export default OrderSuccess;