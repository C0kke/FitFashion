import { useEffect, useState } from "react";
import { authService } from "../../services/auth.service";
import './styles/AdminUsers.css';
import { useNavigate } from "react-router-dom";

const ROLES = {
    ADMIN: 'ADMIN',
    GESTOR: 'GESTOR',
    CLIENTE: 'CLIENTE'
};

const AdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        username: "",
        first_name: "",
        email: "",
        password: "",
        role: ROLES.CLIENTE,
        addresses: []
    });
    const [saving, setSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await authService.getAllUsers();
            setUsers(res.data.results || []); 
        } catch (err) {
            setError("Error al cargar usuarios.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            first_name: user.first_name || "",
            email: user.email,
            password: "",
            role: user.role || ROLES.CLIENTE,
            addresses: Array.isArray(user.addresses) ? user.addresses : []
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("address-")) {
            const idx = parseInt(name.split("-")[1], 10);
            const newAddresses = [...formData.addresses];
            newAddresses[idx] = value;
            setFormData({ ...formData, addresses: newAddresses });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleAddAddress = () => {
        setFormData({ ...formData, addresses: [...formData.addresses, ""] });
    };

    const handleRemoveAddress = (idx) => {
        setFormData({
            ...formData,
            addresses: formData.addresses.filter((_, i) => i !== idx)
        });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        
        try {
            await authService.updateUserAdmin(editingUser.id, formData);

            await fetchUsers();
            handleCloseModal();
            alert("Usuario actualizado correctamente");
        } catch (err) {
            console.error("Error al guardar:", err);
            alert("Error al actualizar usuario. Revisa los datos.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="admin-container">Cargando usuarios...</div>;
    if (error) return <div className="admin-container error-text">{error}</div>;

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h2>Administración de Usuarios</h2>
                <button className="btn-add-premium"  onClick={() => navigate('/admin/create-product')}> <span className="plus-icon">+</span>Nuevo Producto</button>
                <span className="user-count">{users.length} Registrados</span>
            </div>
            
            <div className="table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>addresses</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id}>
                                {console.log(u)}
                                <td>#{u.id}</td>
                                <td>{u.username}</td>
                                <td>{u.first_name || "-"}</td>
                                <td>{u.email}</td>
                                <td>
                                    <span className={`role-tag ${u.role ? u.role.toLowerCase() : 'cliente'}`}>
                                        {u.role || ROLES.CLIENTE}
                                    </span>
                                </td>
                                <td>
                                    {(u.addresses && u.addresses.length > 0)
                                        ? `${u.addresses[0]}${u.addresses.length > 1 ? ', ...' : ''}`
                                        : <span style={{color:'#aaa'}}>Sin direcciones</span>}
                                </td>
                                <td>
                                    <button className="btn-edit" onClick={() => handleEditClick(u)}>
                                        Editar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Editar Usuario #{editingUser?.id}</h2>
                        <form onSubmit={handleSaveUser}>
                             <div className="form-group">
                                <label>Nombre Completo</label>
                                <input 
                                    type="text" 
                                    name="first_name" 
                                    value={formData.first_name} 
                                    onChange={handleInputChange} 
                                />
                            </div>

                            <div className="form-group">
                                <label>Usuario</label>
                                <input 
                                    type="text" 
                                    name="username" 
                                    value={formData.username} 
                                    onChange={handleInputChange} 
                                    required 
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
                                />
                            </div>

                            <div className="form-group">
                                <label>Contraseña</label>
                                <input 
                                    type="password" 
                                    name="password" 
                                    value={formData.password} 
                                    onChange={handleInputChange} 
                                    placeholder="••••••••" 
                                />
                            </div>

                            <div className="form-group">
                                <label>Rol de Usuario</label>
                                <select 
                                    name="role" 
                                    value={formData.role} 
                                    onChange={handleInputChange}
                                    className="role-select"
                                >
                                    {Object.values(ROLES).map((role) => (
                                        <option key={role} value={role}>
                                            {role}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Direcciones</label>
                                <div className="admin-address-list-edit">
                                    {formData.addresses.map((addr, idx) => (
                                        <div key={idx} className="admin-address-input-row">
                                            <input
                                                type="text"
                                                name={`address-${idx}`}
                                                value={addr}
                                                onChange={handleInputChange}
                                                placeholder={`Dirección #${idx + 1}`}
                                                className="admin-address-input"
                                            />
                                            <button type="button" onClick={() => handleRemoveAddress(idx)} className="btn-remove-address" disabled={formData.addresses.length === 1}>
                                                X
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={handleAddAddress} className="btn-secondary btn-add-address">
                                        + Añadir dirección
                                    </button>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={handleCloseModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-save" disabled={saving}>
                                    {saving ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;