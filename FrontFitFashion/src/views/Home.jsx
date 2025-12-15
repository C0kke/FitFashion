import React, { useState } from 'react';
import { useCart } from '../store/CartContext';
import { useQuery, gql } from '@apollo/client'; 
import './styles/Home.css';

const GET_PRODUCTS_QUERY = gql`
  query Products {
    products {
      id
      name
      price
      builderImage
      description
    }
  }
`;

const Home = () => {
    const { addItem, openCart } = useCart();
    const { loading, error, data } = useQuery(GET_PRODUCTS_QUERY);

    const handleAddToCart = (producto) => {
        addItem(producto);
        /* openCart(); */
    }

    if (loading) return (
        <div className="main-container">
            <div className="content">
                <p>Cargando productos...</p>
            </div>
        </div>
    );

    const productosGateway = data?.products || [];

    return (
        <div className="main-container">
            <div className="content">
                <span>Nuevos productos</span>
                <div className="productsSection">
                    {productosGateway.map((producto) => (
                        <div key={producto.id} className="productCard" onClick={() => window.location.href = `/product/${producto.id}`} >
                            <h3 className="productName">{producto.name}</h3>
                            <img src={producto.builderImage} alt={producto.name} className="productImage" />
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