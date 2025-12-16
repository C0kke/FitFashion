import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { productService } from '../services/products.service';
import './styles/ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const { addItem } = useCart();

    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Usamos índice en lugar de URL directa para facilitar la navegación con flechas
    const [currentIndex, setCurrentIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const data = await productService.getProductById(id);
                setProducto(data);
                // Reseteamos el índice al cargar nuevo producto
                setCurrentIndex(0);
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProduct();
        }
    }, [id]);

    const handleAddToCart = () => {
        if (producto) {
            addItem({ ...producto, quantity });
        }
    }

    // Funciones para el carrusel
    const nextImage = () => {
        if (!displayImages.length) return;
        setCurrentIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = () => {
        if (!displayImages.length) return;
        setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    if (loading) return <div className="detail-loading">Cargando...</div>;
    if (error) return <div className="detail-error">Error: {error.message}</div>;
    if (!producto) return <div className="detail-error">Producto no encontrado</div>;

    // Si hay galleryImages, úsalas. Si no, usa builderImage como respaldo.
    const displayImages = (producto.galleryImages && producto.galleryImages.length > 0)
        ? producto.galleryImages
        : [producto.builderImage || "https://placehold.co/300x400?text=No+Image"].filter(Boolean);

    const currentImageSrc = displayImages[currentIndex];
    const stockMsg = producto.stock > 0 ? `Disponible: ${producto.stock}` : 'Agotado';

    return (
        <div className="product-detail-page">
            <div className="detail-card">
                {/* COLUMNA IZQUIERDA: IMÁGENES */}
                <div className="image-section">
                    
                    {/* Imagen Principal con Flechas */}
                    <div className="main-image-container">
                        {displayImages.length > 1 && (
                            <button className="nav-btn prev" onClick={prevImage}>❮</button>
                        )}
                        
                        <img 
                            src={currentImageSrc} 
                            alt={producto.name} 
                            className="main-image" 
                        />

                        {displayImages.length > 1 && (
                            <button className="nav-btn next" onClick={nextImage}>❯</button>
                        )}
                    </div>

                    {/* Miniaturas (Thumbnails) */}
                    {displayImages.length > 1 && (
                        <div className="thumbnails-row">
                            {displayImages.map((imgUrl, index) => (
                                <img 
                                    key={index} 
                                    src={imgUrl} 
                                    alt={`vista ${index}`} 
                                    className={`thumbnail ${index === currentIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentIndex(index)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: INFORMACIÓN */}
                <div className="info-section">
                    <h1 className="detail-title">{producto.name}</h1>
                    <div className="price-tag">${producto.price.toLocaleString('es-CL')}</div>
                    
                    <div className="divider"></div>

                    <div className="product-specs">
                        {producto.categories && producto.categories.length > 0 && (
                            <div className="spec-row">
                                <span className="spec-label">Categoría:</span>
                                <span className="spec-value">
                                    {producto.categories.join(", ")}
                                </span>
                            </div>
                        )}

                        {producto.styles && producto.styles.length > 0 && (
                            <div className="spec-row">
                                <span className="spec-label">Estilo:</span>
                                <span className="spec-value">
                                    {producto.styles.join(", ")}
                                </span>
                            </div>
                        )}
                    </div>

                    <p className="detail-description">{producto.description}</p>

                    <div className="purchase-actions">
                        <div className="stock-status">
                            <span className={`status-dot ${producto.stock > 0 ? 'green' : 'red'}`}></span>
                            {stockMsg}
                        </div>

                        {producto.stock > 0 && (
                            <div className="control-group">
                                <div className="qty-selector">
                                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                                    <span>{quantity}</span>
                                    <button onClick={() => setQuantity(Math.min(producto.stock, quantity + 1))}>+</button>
                                </div>
                                
                                <button 
                                    className="add-cart-large" 
                                    onClick={handleAddToCart}
                                >
                                    Añadir al Carrito
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;