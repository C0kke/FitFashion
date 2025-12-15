import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useCart } from '../store/CartContext';
import { productService } from '../services/products.service';
import './styles/Home.css';

const Home = () => {
    const { addItem } = useCart();
    const navigate = useNavigate();
    
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const data = await productService.getAllProducts();
                setProductos(data || []);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const handleAddToCart = (producto) => {
        addItem(producto);
    }

    if (loading) return (
        <div className="main-container"><div className="content"><p>Cargando productos...</p></div></div>
    );

    if (error) return (
        <div className="main-container"><div className="content"><p>Error cargando productos: {error.message}</p></div></div>
    );

    return (
        <div className="main-container">
            <div className="content">
                <span>Nuevos productos</span>
                <div className="productsSection">
                    {productos.map((producto) => (
                        <div key={producto.id} className="productCard" onClick={() => navigate(`/productdetail/${producto.id}`)} >
                            <h3 className="productName">{producto.name}</h3>
                            <img src={producto.galleryImages[0]} alt={producto.name} className="productImage" />
                            <p className="productPrice"> $ {producto.price ? producto.price.toLocaleString('es-CL') : 'N/A'} </p>
                            <button className="add-to-cart-btn" onClick={(e) => { e.stopPropagation(); handleAddToCart(producto); }}>
                                Añadir al carrito
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;