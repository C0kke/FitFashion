import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './styles/OrderHistory.css'; 

const mockOrderHistory = [
    {
        id: 'FF-890123',
        fecha: '2025-11-20',
        total: 35000,
        estado: 'PAGADO',
        items: 3,
        detalle: [
            { nombre: 'Camisa Casual', cantidad: 1, precio: 35000 },
        ],
    }
];

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setTimeout(() => {
            setOrders(mockOrderHistory);
            setLoading(false);
        }, 800);
    }, []);

    const handleViewDetails = (orderId) => {
        alert(`Ver detalles de la Orden: ${orderId}`);
        // navigate(`/orders/${orderId}`); 
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="history-container">
            <div className="history-content">
                <div className="history-header">
                    <h1>Historial de Órdenes</h1>
                    <button onClick={handleGoHome} className="back-home-button">
                        ← Volver a la Tienda
                    </button>
                </div>

                {loading ? (
                    <div className="loading-message">Cargando historial...</div>
                ) : orders.length === 0 ? (
                    <div className="empty-history">
                        <p>Aún no tienes órdenes registradas.</p>
                        <button onClick={handleGoHome} className="go-home-button">
                            Explorar Productos
                        </button>
                    </div>
                ) : (
                    <div className="order-list">
                        {orders.map(order => (
                            <div key={order.id} className="order-card">
                                <div className="order-summary">
                                    <div className="order-info">
                                        <strong>Orden ID:</strong> <span>{order.id}</span>
                                    </div>
                                    <div className="order-info">
                                        <strong>Fecha:</strong> <span>{order.fecha}</span>
                                    </div>
                                    <div className="order-info total-info">
                                        <strong>Total:</strong> <span>${order.total}</span>
                                    </div>
                                    <div className={`order-info status-info status-${order.estado.toLowerCase().replace(/\s/g, '-')}`}>
                                        <strong>Estado:</strong> <span>{order.estado}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderHistory;