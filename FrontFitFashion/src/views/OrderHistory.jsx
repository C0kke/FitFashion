import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../services/cart.service';
import './styles/OrderHistory.css'; 

const OrderHistory = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await cartService.getUserOrders();
                if (response.orders) {
                    const mappedOrders = response.orders.map(order => ({
                        id: order.id,
                        total: order.total,
                        estado: order.status,
                        shipping_address: order.shipping_address || '—',
                        items: order.order_items ? order.order_items.reduce((acc, item) => acc + item.quantity, 0) : 0,
                        detalle: order.order_items ? order.order_items.map(item => ({
                            nombre: item.nameSnapshot,
                            cantidad: item.quantity,
                            precio: item.unitPrice
                        })) : []
                    }));
                    setOrders(mappedOrders);
                }
            } catch (error) {
                console.error("Error al cargar el historial de órdenes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
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
                                        <strong>Dirección envío:</strong> <span>{order.shipping_address}</span>
                                    </div>
                                    <div className="order-info total-info">
                                        <strong>Total:</strong> <span>${order.total}</span>
                                    </div>
                                    <div className="order-info">
                                        <strong>Artículos:</strong> <span>{order.items}</span>
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