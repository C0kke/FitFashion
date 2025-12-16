import React, { useState, useEffect, useMemo } from 'react';
import { Rnd } from 'react-rnd';
import './styles/OutfitBuilder.css';
import MannequinBase from '../assets/mannequin_base.jpeg'; 

import client from '../services/graphql/client';    
import { GET_PRODUCTS_QUERY } from '../services/graphql/products.queries';

const OutfitBuilder = () => {
    // Estados
    const [catalogProducts, setCatalogProducts] = useState([]); 
    const [outfitItems, setOutfitItems] = useState([]);
    
    // Estado para saber cuál prenda está seleccionada
    const [selectedPieceId, setSelectedPieceId] = useState(null);

    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    // --- CARGA DE DATOS ---
    useEffect(() => {
        const fetchCatalog = async () => {
            try {
                const { data } = await client.query({
                    query: GET_PRODUCTS_QUERY,
                    fetchPolicy: 'network-only' 
                });
                setCatalogProducts(data.products || []);
            } catch (error) {
                console.error("Error cargando catálogo:", error);
            }
        };
        fetchCatalog();
    }, []); 

    // --- LÓGICA DE FILTROS ---
    const dynamicCategories = useMemo(() => {
        if (!catalogProducts.length) return ['Todos'];
        const allCats = catalogProducts.flatMap(p => p.categories || []);
        const uniqueCats = [...new Set(allCats)];
        return ['Todos', ...uniqueCats.sort()];
    }, [catalogProducts]);

    const filteredProducts = catalogProducts.filter(p => {
        const matchesCategory = selectedCategory === 'Todos' || (p.categories && p.categories.includes(selectedCategory));
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // --- LÓGICA DEL PROBADOR ---

    const handleDragStart = (e, product) => {
        e.dataTransfer.setData("product", JSON.stringify(product));
        const imgElement = e.currentTarget.querySelector('img');
        if (imgElement) e.dataTransfer.setDragImage(imgElement, 25, 25);
    };

    const handleSelectProduct = (product) => {
        if (!product.builderImage) {
            alert("Este producto no tiene imagen para el probador.");
            return;
        }
        const isAlreadyInOutfit = outfitItems.some(item => item.product.id === product.id);
        if (isAlreadyInOutfit) return; 

        const newItem = {
            uniqueId: Date.now(), 
            product: product, 
            x: 50, y: 50, width: 200, height: 200 
        };
        setOutfitItems(prev => [...prev, newItem]);
        setSelectedPieceId(newItem.uniqueId); // Auto-seleccionar
    };

    const updatePieceState = (uniqueId, data) => {
        setOutfitItems(prev => prev.map(item => 
            item.uniqueId === uniqueId ? { ...item, ...data } : item
        ));
    };

    const removeItem = (uniqueId) => {
        setOutfitItems(prev => prev.filter(item => item.uniqueId !== uniqueId));
        if (selectedPieceId === uniqueId) setSelectedPieceId(null);
    };

    const handlePieceClick = (uniqueId) => {
        setSelectedPieceId(uniqueId);
    };

    const handleStageClick = (e) => {
        if (e.target.className.includes('full-height-layers') || e.target.className.includes('stage-center')) {
            setSelectedPieceId(null);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        try {
            const productData = e.dataTransfer.getData("product");
            if (productData) handleSelectProduct(JSON.parse(productData));
        } catch (error) { console.error("Error drop:", error); }
    };

    // --- OBTENER INFO DE LA PRENDA SELECCIONADA ---
    const selectedItemData = outfitItems.find(item => item.uniqueId === selectedPieceId);

    if (!catalogProducts.length) return <div className="immersive-builder-page"><p>Cargando catálogo...</p></div>;

    return (
        <div className="immersive-builder-page">
            
            <div className="panel-left">
                <div className="panel-header"><h3>Categorías</h3></div>
                <ul className="category-menu">
                    {dynamicCategories.map(cat => (
                        <li key={cat} className={selectedCategory === cat ? 'active' : ''} onClick={() => setSelectedCategory(cat)}>{cat}</li>
                    ))}
                </ul>
            </div>

            {/* CENTRO: ESCENARIO */}
            <div className="stage-center" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={handleStageClick}>
                <div className="full-height-layers" style={{position: 'relative', width: '100%', height: '100%', overflow: 'hidden'}}>
                    <img src={MannequinBase} alt="Base" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                    
                    {outfitItems.map((item) => (
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
                            className={`rnd-item ${selectedPieceId === item.uniqueId ? 'selected-piece' : ''}`}
                            
                            onMouseDown={() => handlePieceClick(item.uniqueId)}
                            onTouchStart={() => handlePieceClick(item.uniqueId)}
                            onDoubleClick={() => removeItem(item.uniqueId)}
                        >
                            <img src={item.product.builderImage} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                        </Rnd>
                    ))}
                </div>

                {/* --- INFO FLOTANTE (Solo Nombre, Precio y Borrar) --- */}
                {selectedItemData && (
                    <div className="floating-info-card">
                        <div className="info-content">
                            <strong>{selectedItemData.product.name}</strong>
                            <span>${(selectedItemData.product.price || 0).toLocaleString('es-CL')}</span>
                        </div>
                        <div className="info-actions">
                            <button className="btn-delete" onClick={() => removeItem(selectedItemData.uniqueId)}>
                                Quitar del Maniquí 🗑️
                            </button>
                        </div>
                    </div>
                )}

                <div className="floating-controls">
                    <button className="btn-clean" onClick={() => { setOutfitItems([]); setSelectedPieceId(null); }}>Limpiar Todo</button>
                </div>
            </div>

            <div className="panel-right">
                <div className="panel-header">
                    <h3>Catálogo</h3>
                    <input 
                        type="text" 
                        placeholder="Buscar prenda..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{width: '90%', padding: '8px', marginTop: '10px', borderRadius: '5px', border: '1px solid #ccc'}}
                    />
                    <small style={{display:'block', marginTop:'5px'}}>{filteredProducts.length} resultados</small>
                </div>

                <div className="products-scroll-grid">
                    {filteredProducts.map((product) => (
                        <div 
                            key={product.id} className="mini-product-item" title={product.name}
                            onClick={() => handleSelectProduct(product)}
                            draggable onDragStart={(e) => handleDragStart(e, product)}
                        >
                            {product.builderImage ? (
                                <img src={product.builderImage} alt={product.name} style={{width: '80%', height: '80%', objectFit: 'contain'}} draggable="false" />
                            ) : <div className="mini-placeholder">{product.name?.substring(0, 10)}...</div>}
                            
                            <span style={{position: 'absolute', bottom: '5px', right: '5px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.9)', padding: '2px 5px', borderRadius: '4px'}}>
                                ${(product.price || 0).toLocaleString('es-CL')}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default OutfitBuilder;