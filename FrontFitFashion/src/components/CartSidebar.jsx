import { useCart } from '../store/CartContext';
import './styles/CartSidebar.css'; 
import { useNavigate } from 'react-router-dom';

function CartSidebar({ isOpen, onClose }) {
    const { items, removeItem } = useCart();

    const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const sidebarClass = `cart-sidebar ${isOpen ? 'open' : 'closed'}`;

    const navigate = useNavigate();

    return (
        <>
        {isOpen && <div className="cart-overlay" onClick={onClose}></div>}

        <div className={sidebarClass}>
            <div className="sidebar-header">
            <h2>Carrito</h2>
            <button className="close-button" onClick={onClose}>&times;</button>
            </div>

            <div className="sidebar-content">
            {items.length === 0 ? (
                <p className="empty-message">Tu carrito está vacío.</p>
            ) : (
                <ul className="cart-list">
                {items.map(item => (
                    <li key={item.id} className="cart-item">
                    <span>{item.name} ({item.quantity} uds)</span>
                    <div className="item-actions">
                        <span className="item-price">${(item.price * item.quantity).toFixed(2)}</span>
                        <button onClick={() => removeItem(item.id)} className="remove-item">Eliminar</button>
                    </div>
                    </li>
                ))}
                </ul>
            )}
            </div>

            <div className="sidebar-footer">
            <div className="cart-summary">
                <strong>Total:</strong> 
                <strong>${total.toFixed(2)}</strong>
            </div>
            <button onClick={() => navigate('/checkout')} className="checkout-button" disabled={items.length === 0}>
                Proceder al Pago
            </button>
            </div>
        </div>
        </>
    );
}

export default CartSidebar;