import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { productService } from '../../services/products.service'; 
import './styles/AdminUsers.css';

const AdminProducts = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await productService.getAllProducts();
            setProducts(res || []); 
        } catch (err) {
            setError("Error al cargar productos.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    if (loading) return <div className="admin-container">Cargando catálogo...</div>;
    
    return (
        <div className="admin-container">
            <div className="admin-header">
                <h3>Listado de Productos</h3>
                <button 
                    className="btn-add-premium" 
                    onClick={() => navigate('/admin/create-product')}
                > 
                    <span className="plus-icon">+</span> Nuevo Producto
                </button>
                <span className="user-count">{products.length} Productos</span>
            </div>

            {error && <div className="error-text">{error}</div>}
            
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Producto</th>
                            <th>Precio</th>
                            <th>Stock</th>
                            <th>Categorías</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.length > 0 ? products.map((p) => (
                            <tr key={p.id || p._id}>
                                <td>#{p.id?.toString().slice(-4)}</td>
                                <td>
                                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                        {p.builderImage && <img src={p.builderImage} alt="mini" style={{width:'30px', height:'30px', borderRadius:'50%'}}/>}
                                        {p.name}
                                    </div>
                                </td>
                                <td>${p.price}</td>
                                <td>{p.stock} uds.</td>
                                <td>
                                    {p.categories?.map((c, i) => (
                                        <span key={i} className="role-tag gestor" style={{fontSize:'0.8em', marginRight:'4px'}}>
                                            {c}
                                        </span>
                                    ))}
                                </td>
                                <td>
                                    <button className="btn-edit" onClick={() => console.log("Editar producto", p.id)}>
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="6" style={{textAlign:'center', padding:'20px'}}>
                                    No hay productos registrados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminProducts;