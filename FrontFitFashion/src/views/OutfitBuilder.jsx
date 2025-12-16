import React, { useState, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { useCart } from '../store/CartContext';
import './styles/OutfitBuilder.css';
import MannequinBase from '../assets/mannequin_base.jpeg'; 

const OutfitBuilder = () => {
    const { items: cartItems } = useCart(); 

    // --- 1. CAMBIO PRINCIPAL: Array en lugar de Objeto con Slots ---
    // Esto permite capas infinitas ordenadas por llegada
    const [outfitItems, setOutfitItems] = useState([]);
    
    // Lista de productos disponibles (del carrito)
    const [products, setProducts] = useState([]); 
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // Sincronización Carrito -> Probador
    useEffect(() => {
        if (cartItems) {
            setProducts(cartItems);
        }
    }, [cartItems]);

    // Categorías dinámicas
    const dynamicCategories = useMemo(() => {
        if (!products.length) return ['Todos'];
        const allCats = products.flatMap(p => p.categories || []);
        const uniqueCats = [...new Set(allCats)];
        return ['Todos', ...uniqueCats.sort()];
    }, [products]);

    // --- 2. LOGICA DE AGREGAR (Push al final del array) ---
    const handleSelectProduct = (product) => {
        const newItem = {
            uniqueId: Date.now(), // ID único para que React distinga capas (incluso si repites prenda)
            product: product,
            x: 50, // Posición inicial genérica
            y: 50,
            width: 200, 
            height: 200 
        };

        // Agregamos al final del array -> Queda en la capa superior
        setOutfitItems(prev => [...prev, newItem]);
    };

    // Actualizar posición/tamaño de un item específico
    const updatePieceState = (uniqueId, data) => {
        setOutfitItems(prev => prev.map(item => 
            item.uniqueId === uniqueId ? { ...item, ...data } : item
        ));
    };

    // Eliminar un item específico (Doble click)
    const removeItem = (uniqueId) => {
        setOutfitItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
    };

    // Drop Handler
    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const productData = e.dataTransfer.getData("product");
            if (productData) handleSelectProduct(JSON.parse(productData));
        } catch (error) { console.error("Error drop:", error); }
    };

    const filteredProducts = products.filter(p => selectedCategory === 'Todos' || (p.categories && p.categories.includes(selectedCategory)));
    
    // Calculamos total sumando todo lo que hay en el canvas
    const outfitPrice = outfitItems.reduce((total, item) => total + (item.product.price || 0), 0);

    if (!cartItems || cartItems.length === 0) {
        return (
            <div className="immersive-builder-page">
                <div style={{margin: 'auto', textAlign: 'center'}}>
                    <h2>Tu probador está vacío</h2>
                    <p>Agrega productos al carrito para probarlos aquí.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="immersive-builder-page">
            
            {/* PANEL IZQUIERDO */}
            <div className="panel-left">
                <div className="panel-header"><h3>Tus Prendas</h3></div>
                <ul className="category-menu">
                    {dynamicCategories.map(cat => (
                        <li key={cat} className={selectedCategory === cat ? 'active' : ''} onClick={() => setSelectedCategory(cat)}>{cat}</li>
                    ))}
                </ul>
                <div className="price-total-section">
                    <span>Outfit:</span>
                    <span className="price-amount">${outfitPrice.toLocaleString('es-CL')}</span>
                </div>
            </div>

            {/* CENTRO: ESCENARIO */}
            <div className="stage-center" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                <div className="full-height-layers" style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}>
                    <img src={MannequinBase} alt="Base" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                    
                    {/* --- 3. RENDERIZADO POR MAPA DE ARRAY (Sin zIndex manual) --- */}
                    {outfitItems.map((item, index) => (
                        <Rnd
                            key={item.uniqueId}
                            size={{ width: item.width, height: item.height }}
                            position={{ x: item.x, y: item.y }}
                            onDragStop={(e, d) => updatePieceState(item.uniqueId, { x: d.x, y: d.y })}
                            onResizeStop={(e, direction, ref, delta, position) => {
                                updatePieceState(item.uniqueId, { width: ref.style.width, height: ref.style.height, ...position });
                            }}
                            bounds="parent"
                            lockAspectRatio={true}
                            // Eliminamos style={{ zIndex... }}. El orden del array dicta la capa.
                            className="rnd-item"
                            onDoubleClick={() => removeItem(item.uniqueId)} // Atajo para borrar
                        >
                            <img src={item.product.builderImage} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                        </Rnd>
                    ))}
                </div>

                <div className="floating-controls">
                    <button className="btn-clean" onClick={() => setOutfitItems([])}>Limpiar Todo</button>
                </div>
            </div>

            {/* PANEL DERECHO */}
            <div className="panel-right">
                <div className="panel-header">
                    <h3>En tu Carrito</h3>
                    <small>{filteredProducts.length} prendas</small>
                </div>
                <div className="products-scroll-grid">
                    {filteredProducts.map((product) => (
                        <div 
                            key={product.id} className="mini-product-item" title={product.name}
                            onClick={() => handleSelectProduct(product)}
                            draggable onDragStart={(e) => e.dataTransfer.setData("product", JSON.stringify(product))}
                        >
                            {product.builderImage ? (
                                <img src={product.builderImage} alt={product.name} style={{width: '80%', height: '80%', objectFit: 'contain'}} draggable="false" />
                            ) : <div className="mini-placeholder">{product.name.substring(0, 10)}...</div>}
                            <span style={{position: 'absolute', bottom: '5px', right: '5px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.9)', padding: '2px 5px', borderRadius: '4px'}}>
                                ${product.price.toLocaleString('es-CL')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OutfitBuilder;