import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, gql } from '@apollo/client';
import { useCart } from '../store/CartContext';
import './styles/ProductDetail.css';


const GET_PRODUCT_DETAIL_QUERY = gql`
  query Product($id: ID!) {
    product(id: $id) {
      id
      name
      price
      description
      stock
      builderImage
      galleryImages
    }
  }
`;

const ProductDetail = () => {
    const { id } = useParams();
    const { addItem, openCart } = useCart();
    const [currentImage, setCurrentImage] = useState(null);
    const [quantity, setQuantity] = useState(1);


    const { loading, error, data } = useQuery(GET_PRODUCT_DETAIL_QUERY, {
        variables: { id },
        onCompleted: (data) => {
            if (data?.product?.builderImage) {
                setCurrentImage(data.product.builderImage);
            }
        }
    });

    const producto = data?.product;

    const handleAddToCart = (producto) => {
        addItem(producto);
        /* openCart(); */
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
                    {/* Sección de Imágenes */}
                    <div className="image-gallery-section">
                        {/* Previsualizaciones (Galería de miniaturas) */}
                        <div className="thumbnails">
                            {allImages.map((imgUrl, index) => (
                                <img key={index} src={imgUrl} alt={`Vista ${index + 1}`} className={`thumbnail-image ${currentImage === imgUrl ? 'active' : ''}`} onClick={() => setCurrentImage(imgUrl)} />
                            ))}
                        </div>
                        {/* Imagen Principal */}
                        <div className="main-image-container">
                            <img src={currentImage || producto.builderImage} alt={producto.name} className="main-product-image" />
                        </div>
                    </div>
                    
                    {/* Sección de Información y Compra */}
                    <div className="product-info-section">
                        <h1 className="product-title">{producto.name}</h1>
                        <p className="product-price">${producto.price.toLocaleString('es-CL')}</p>
                        <p className="product-description">{producto.description}</p>
                        
                        <div className="stock-info">
                            <span className={producto.stock > 0 ? 'in-stock' : 'out-of-stock'}>{stockMsg}</span>
                        </div>
                        
                        {/* Controles de Cantidad */}
                        <div className="quantity-control">
                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1} className="qty-btn">-</button>
                            <input type="number" value={quantity} onChange={(e) => setQuantity(Math.min(producto.stock, Math.max(1, parseInt(e.target.value) || 1)))} min="1" max={producto.stock} className="qty-input" disabled={producto.stock === 0} />
                            <button onClick={() => setQuantity(Math.min(producto.stock, quantity + 1))} disabled={quantity >= producto.stock || producto.stock === 0} className="qty-btn">+</button>
                        </div>

                        {/* Botón de Añadir al Carrito (Llama a la función de la amiga con el producto) */}
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