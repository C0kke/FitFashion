import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import './styles/AdminCreateProduct.css';

const ROLES = {
    ADMIN: 'ADMIN',
    GESTOR: 'GESTOR',
    CLIENTE: 'CLIENTE'
};

const AdminCreateUser = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statusMsg, setStatusMsg] = useState("");

    const [formData, setFormData] = useState({
        username: '',
        first_name: '',
        email: '',
        password: '',
        role: ROLES.CLIENTE,
        addresses: []
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleAddAddress = () => {
        setFormData({ ...formData, addresses: [...formData.addresses, ""] });
    };

    const handleAddressChange = (index, value) => {
        const newAddresses = [...formData.addresses];
        newAddresses[index] = value;
        setFormData({ ...formData, addresses: newAddresses });
    };

    const handleRemoveAddress = (index) => {
        const newAddresses = formData.addresses.filter((_, i) => i !== index);
        setFormData({ ...formData, addresses: newAddresses });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setStatusMsg("Registrando usuario...");

        try {
            if (formData.password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
            if (!formData.username.trim()) throw new Error("El nombre de usuario es obligatorio.");
            if (!formData.email.includes('@')) throw new Error("Email inválido.");

            const cleanAddresses = formData.addresses.filter(addr => addr.trim() !== "");
            const payload = { ...formData, addresses: cleanAddresses };

            await authService.register(payload); 

            setStatusMsg("¡Usuario creado exitosamente!");
            setTimeout(() => {
                navigate('/admin/dashboard');
            }, 1500);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Error al crear usuario");
            setStatusMsg("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-create-container">
            <div className="create-card">
                <h2>Registrar Nuevo Usuario</h2>
                
                {error && <div className="error-banner">{error}</div>}
                {statusMsg && <div className="status-banner">{statusMsg}</div>}

                <form onSubmit={handleSubmit} className="create-form">
                    <div className="form-section">
                        <h3>Credenciales de Acceso</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Usuario (Username)</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={handleInputChange} 
                                    required 
                                    placeholder="Ej: jdoe123"
                                />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input 
                                    type="email" 
                                    name="email" 
                                    value={formData.email} 
                                    onChange={handleInputChange} 
                                    required 
                                    placeholder="ejemplo@correo.com"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Contraseña</label>
                            <input 
                                type="password" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleInputChange} 
                                required 
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Información Personal</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Nombre Completo</label>
                                <input 
                                    type="text" 
                                    name="first_name" 
                                    value={formData.first_name} 
                                    onChange={handleInputChange} 
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            <div className="form-group short">
                                <label>Rol</label>
                                <select 
                                    name="role" 
                                    value={formData.role} 
                                    onChange={handleInputChange}
                                    style={{padding: '10px', width: '100%'}}
                                >
                                    {Object.values(ROLES).map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Direcciones</h3>
                        {formData.addresses.map((addr, index) => (
                            <div key={index} style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                <input 
                                    type="text" 
                                    value={addr} 
                                    onChange={(e) => handleAddressChange(index, e.target.value)}
                                    placeholder={`Dirección #${index + 1}`}
                                    style={{flex:1}}
                                />
                                <button 
                                    type="button" 
                                    className="btn-remove-img" 
                                    onClick={() => handleRemoveAddress(index)}
                                    style={{position:'static', width:'40px', height:'40px', borderRadius:'4px', background:'#ff4d4d', color:'white'}}
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddAddress} className="btn-secondary" style={{marginTop:'10px'}}>
                            + Añadir Dirección
                        </button>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-cancel" onClick={() => navigate('/admin/dashboard')}>Cancelar</button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminCreateUser;