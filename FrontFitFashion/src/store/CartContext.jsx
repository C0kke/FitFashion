import React, { createContext, useContext, useState, useMemo } from 'react';

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

export const CartProvider = ({ children }) => {
    const [items, setItems] = useState([]);  
    const [isCartOpen, setIsCartOpen] = useState(false);

    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);

    const addItem = (product) => {
        setItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id);

            if (existingItem) {
                return prevItems.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
                );
            } else {
                return [...prevItems, { ...product, quantity: 1 }];
            }
        });
    };


    const removeItem = (productId) => {
        setItems(prevItems => prevItems.filter(item => item.id !== productId));
    };
    

    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);


    const contextValue = useMemo(() => ({
        items,
        addItem,
        removeItem,
        totalItems,
        isCartOpen,
        openCart,
        closeCart,
    }), [items, isCartOpen]);

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
};