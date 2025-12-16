import React, { useEffect, useState } from 'react';
import { useUser } from '../../store/UserContext.jsx';
import AdminUsers from './AdminUsers';
import AdminProducts from './AdminProducts.jsx';
import './styles/AdminDashboard.css';

const AdminDashboard = () => {
    const { user, loading } = useUser();
    const [activeTab, setActiveTab] = useState('products');
    const isAdmin = user?.role === 'ADMIN';
    
    useEffect(() => {
        if (user) {
            if (user.role === 'GESTOR') {
                setActiveTab('products');
            } else if (user.role === 'ADMIN') {
                setActiveTab('users');
            }
        }
    }, [user]);

    if (loading) {
        return <div className="admin-dashboard-container"><p>Cargando panel...</p></div>;
    }

    return (
        <div className="admin-dashboard-container">
            <div className="admin-dashboard-header">
                <h1>Panel de Administración</h1>
                <p style={{fontSize: '0.9em', color: '#666'}}>
                    {isAdmin 
                        ? "Gestiona usuarios y el catálogo de productos" 
                        : "Gestión del catálogo de productos"}
                </p>
            </div>

            <div className="admin-tabs">
                {isAdmin && (
                    <button 
                        className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        Administración de Usuarios
                    </button>
                )}
                <button 
                    className={`tab-button ${activeTab === 'products' ? 'active' : ''}`}
                    onClick={() => setActiveTab('products')}
                >
                    Administración de Productos
                </button>
            </div>

            <div className="admin-content-area">
                {activeTab === 'users' && <AdminUsers />}
                {activeTab === 'products' && <AdminProducts />}
            </div>
        </div>
    );
};

export default AdminDashboard;