import React, { useState, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import { useCart } from '../store/CartContext'; // <--- USAMOS EL CONTEXTO
import './styles/OutfitBuilder.css';
import MannequinBase from '../assets/mannequin_base.jpeg'; 

const OutfitBuilder = () => {
    // 1. Obtenemos los items directamente del carrito
    const { items: cartItems } = useCart(); 

    // --- ESTADOS ---
    const [outfit, setOutfit] = useState({ top: null, bottom: null, shoes: null, fullbody: null });
    // Usaremos 'products' como estado local para manejar el filtrado, pero su fuente es el carrito
    const [products, setProducts] = useState([]); 
    const [selectedCategory, setSelectedCategory] = useState('Todos');

    // --- 2. SINCRONIZACIÓN (CARRITO -> PROBADOR) ---
    useEffect(() => {
        // En cuanto cargue el componente o cambie el carrito, actualizamos la lista
        if (cartItems) {
            console.log("Cargando prendas del carrito al probador:", cartItems);
            setProducts(cartItems);
        }
    }, [cartItems]);

    // --- 3. CATEGORÍAS DINÁMICAS (Basadas SOLO en lo que hay en el carrito) ---
    const dynamicCategories = useMemo(() => {
        if (!products.length) return ['Todos'];
        const allCats = products.flatMap(p => p.categories || []);
        const uniqueCats = [...new Set(allCats)];
        return ['Todos', ...uniqueCats.sort()];
    }, [products]);

    // --- 4. LÓGICA DE VESTIR (REGLAS DE SLOT) ---
    const handleSelectProduct = (product) => {
        const SLOT_RULES = {
            fullbody: ['vestid', 'enterito', 'traje', 'conjunto'],
            top:      ['top', 'poler', 'camis', 'blus', 'sweater', 'polerón', 'chaqueta', 'chaleco'],
            bottom:   ['pantal', 'jean', 'fald', 'short', 'bermuda', 'calza', 'leg'],
            shoes:    ['zapat', 'bot', 'sandali', 'taco', 'calzado', 'sneaker']
        };

        let foundSlot = null;
        const productCats = (product.categories || []).map(c => c.toLowerCase());

        for (const [slot, keywords] of Object.entries(SLOT_RULES)) {
            const match = productCats.some(cat => keywords.some(keyword => cat.includes(keyword)));
            if (match) { foundSlot = slot; break; }
        }

        if (!foundSlot) {
            console.warn("No se pudo determinar el slot para:", product.categories);
            return;
        }

        setOutfit(prevOutfit => {
            // Si ya está puesto este mismo ID, lo quitamos
            if (prevOutfit[foundSlot] && prevOutfit[foundSlot].product.id === product.id) {
                return { ...prevOutfit, [foundSlot]: null };
            }
            // Si no, lo ponemos con posición inicial
            return { 
                ...prevOutfit, 
                [foundSlot]: {
                    product: product,
                    x: 20, y: 50, width: 250, height: 300 
                } 
            };
        });
    };

    // --- 5. ACTUALIZAR POSICIÓN (DRAG & RESIZE) ---
    const updatePieceState = (slot, data) => {
        setOutfit(prev => ({
            ...prev,
            [slot]: { ...prev[slot], ...data }
        }));
    };

    // --- 6. DROP HANDLER ---
    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const productData = e.dataTransfer.getData("product");
            if (productData) handleSelectProduct(JSON.parse(productData));
        } catch (error) { console.error("Error drop:", error); }
    };

    // --- 7. RENDERIZADO ---
    const filteredProducts = products.filter(p => selectedCategory === 'Todos' || (p.categories && p.categories.includes(selectedCategory)));
    
    // Calculamos el total solo de lo que tienes PUESTO (para saber cuánto vale el outfit armado)
    const outfitPrice = Object.values(outfit).reduce((total, item) => item ? total + (item.product.price || 0) : total, 0);

    // Mensaje si el carrito está vacío
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
                    
                    {Object.entries(outfit).map(([slot, item]) => {
                        if (!item) return null;
                        const zIndexes = { shoes: 10, bottom: 20, top: 30, fullbody: 40 };
                        return (
                            <Rnd
                                key={slot}
                                size={{ width: item.width, height: item.height }}
                                position={{ x: item.x, y: item.y }}
                                onDragStop={(e, d) => updatePieceState(slot, { x: d.x, y: d.y })}
                                onResizeStop={(e, direction, ref, delta, position) => {
                                    updatePieceState(slot, { width: ref.style.width, height: ref.style.height, ...position });
                                }}
                                bounds="parent"
                                lockAspectRatio={true}
                                style={{ zIndex: zIndexes[slot] }}
                                className="rnd-item"
                            >
                                <img src={item.product.builderImage} alt={slot} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                            </Rnd>
                        );
                    })}
                </div>

                <div className="floating-controls">
                    <button className="btn-clean" onClick={() => setOutfit({})}>Limpiar</button>
                    {/* Botón de agregar eliminado como solicitaste */}
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