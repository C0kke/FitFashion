import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { productService } from '../services/products.service';
import './styles/ProductDetail.css';

const ProductDetail = () => {
    const { id } = useParams();
    const { addItem, openCart } = useCart();

    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [currentImage, setCurrentImage] = useState(null);
    const [quantity, setQuantity] = useState(1);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const data = await productService.getProductById(id);
                setProducto(data);
                
                if (data?.builderImage) {
                    setCurrentImage(data.builderImage);
                }
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

    const handleAddToCart = (producto) => {
        addItem(producto);
    }
    
    if (loading) return (
        <div className="detail-container"><div className="detail-content"><p>Cargando detalles del producto...</p></div></div>
    );
    
    if (error) return (
        <div className="detail-container"><div className="detail-content"><p>Error al cargar el producto: {error.message}</p></div></div>
    );

    if (!producto) return (
        <div className="detail-container"><div className="detail-content"><p>Producto no encontrado.</p></div></div>
    );
    
    const allImages = [producto.builderImage, ...(producto.galleryImages || [])].filter(Boolean);
    const stockMsg = producto.stock > 0 ? `En Stock: ${producto.stock}` : 'Agotado';

    return (
        <div className="detail-container">
            <div className="content">
                <div className="product-layout">
                    <div className="image-gallery-section">
                        <div className="thumbnails">
                            {allImages.map((imgUrl, index) => (
                                <img key={index} src={imgUrl} alt={`Vista ${index + 1}`} className={`thumbnail-image ${currentImage === imgUrl ? 'active' : ''}`} onClick={() => setCurrentImage(imgUrl)} />
                            ))}
                        </div>
                        <div className="main-image-container">
                            <img src={currentImage || producto.builderImage} alt={producto.name} className="main-product-image" />
                        </div>
                    </div>
                    
                    <div className="product-info-section">
                        <h1 className="product-title">{producto.name}</h1>
                        <p className="product-price">${producto.price.toLocaleString('es-CL')}</p>
                        <p className="product-description">{producto.description}</p>
                        
                        <div className="stock-info">
                            <span className={producto.stock > 0 ? 'in-stock' : 'out-of-stock'}>{stockMsg}</span>
                        </div>
                        
                        <div className="quantity-control">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="qty-btn">-</button>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(Math.min(producto.stock, Math.max(1, parseInt(e.target.value) || 1)))} min="1" max={producto.stock} className="qty-input" disabled={producto.stock === 0} />
                            <button onClick={() => setQuantity(Math.min(producto.stock, quantity + 1))} disabled={quantity >= producto.stock || producto.stock === 0} className="qty-btn">+</button>
                        </div>

                        <button onClick={() => handleAddToCart(producto)} disabled={producto.stock === 0 || quantity > producto.stock} className="add-to-cart-lg-btn">
                            {producto.stock > 0 ? `Añadir ${quantity} al Carrito` : 'Producto Agotado'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;