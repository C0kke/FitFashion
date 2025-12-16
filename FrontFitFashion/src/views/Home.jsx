import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

    const [searchParams] = useSearchParams();

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

    const searchTerm = searchParams.get("q")?.toLowerCase() || "";

    const filteredProducts = productos.filter((producto) => {
        if (!searchTerm) return true; 

        const nameMatch = producto.name.toLowerCase().includes(searchTerm);
        const priceMatch = producto.price?.toString().includes(searchTerm);
        const categoryMatch = producto.categories?.some(cat => cat.toLowerCase().includes(searchTerm));
        const styleMatch = producto.styles?.some(style => style.toLowerCase().includes(searchTerm));

        return nameMatch || priceMatch || categoryMatch || styleMatch;
    });

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
                <span> {searchTerm ? `Resultados de la búsqueda` : "Nuevos productos"} </span>

                {filteredProducts.length === 0 && searchTerm && (
                    <div style={{ textAlign: 'center', margin: '2rem', color: '#666' }}>
                        <h3>No encontramos productos</h3>
                        <p>Intenta con otra búsqueda</p>
                    </div>
                )}

                <div className="productsSection">
                    {filteredProducts.map((producto) => (
                        <div key={producto.id} className="productCard" onClick={() => navigate(`/productdetail/${producto.id}`)} >
                            <h3 className="productName">{producto.name}</h3>
                            <img src={producto.galleryImages && producto.galleryImages.length > 0 ? producto.galleryImages[0] : producto.builderImage} alt={producto.name} className="productImage" />
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