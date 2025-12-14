import React, { useState } from 'react';
import Navbar from "../components/Navbar";
import CartSidebar from "../components/CartSidebar";
import { useCart } from '../store/CartContext';
import './styles/Home.css';

import camisa1 from '../assets/camisa-1.jpg';
import camisa2 from '../assets/camisa-2.jpg';
import jeans1 from '../assets/jeans-1.jpg';
import jeans2 from '../assets/jeans-2.jpg';
import zapatillas1 from '../assets/zapatillas-1.jpg';
import zapatillas2 from '../assets/zapatillas-2.jpg';

const productos = [
    {
        id: 1,
        nombre: "Camisa Casual",
        imagen1: camisa1,
        imagen2: camisa2,
    },
    {
        id: 2,
        nombre: "Pantalones Jeans",
        imagen1: jeans1,
        imagen2: jeans2,
    },
    {
        id: 3,
        nombre: "Zapatillas",
        imagen1: zapatillas1,
        imagen2: zapatillas2,
    },
]

const Home = () => {
    const [isCartOpen, setIsCartOpen] = useState(false);
    const openCart = () => setIsCartOpen(true);
    const closeCart = () => setIsCartOpen(false);
    const { addItem } = useCart();

    const handleAddToCart = (producto) => {
        addItem(producto);
        openCart();
    }

    return (
        <div className="main-container">
            <Navbar onOpenCart={openCart} />
            <div className="content">
                <span>Nuevos productos</span>
                <div className="productsSection">
                    {productos.map((producto) => (
                        <div key={producto.id} className="productCard" onClick={() => window.location.href = `/product/${producto.id}`}>
                            <h3 className="productName">{producto.nombre}</h3>
                            <img src={producto.imagen1} alt={producto.nombre} className="productImage" />
                            <button className="add-to-cart-btn" onClick={(e) => { e.stopPropagation(); handleAddToCart(producto) }}>
                                Añadir al carrito
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
        </div>
    );
};

export default Home;