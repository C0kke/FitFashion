import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { cartService } from '../services/cart.service';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const refreshCart = async () => {
        try {
            const data = await cartService.getCart();
            setCart(data); 
        } catch (error) {
            console.error("Error cargando carrito:", error);
        }
    };

    useEffect(() => {
        setLoading(true);
        refreshCart().finally(() => setLoading(false));
    }, []);

    const addItem = async (product, quantity = 1) => {
        try {
            const productId = product.id || product; 
            await cartService.addToCart(productId, quantity);
            await refreshCart();
        } catch (error) {
            console.error("Error al agregar item:", error);
        }
    };

    const removeItem = async (itemId) => {
        try {
            await cartService.removeItem(itemId);
            await refreshCart();
            
        } catch (error) {
            console.error("Error al eliminar item:", error);
        }
    };

    const items = useMemo(() => cart?.items || [], [cart]);
    
    const totalItems = useMemo(() => {
        return items.reduce((acc, item) => acc + item.quantity, 0);
    }, [items]);

    const contextValue = useMemo(() => ({
        cart,     
        items,      
        loading,       
        totalItems,
        isCartOpen,
        openCart,
        closeCart,
        addItem,
        removeItem,
        refreshCart     
    }), [cart, items, loading, totalItems, isCartOpen]);

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};