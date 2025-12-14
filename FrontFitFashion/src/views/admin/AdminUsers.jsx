import { useEffect, useState } from "react";
import axios from "axios";
import './styles/AdminUsers.css';

const BackURL = import.meta.env.VITE_GATEWAY_URL;

const ROLES = {
    ADMIN: 'ADMIN',
    GESTOR: 'GESTOR',
    CLIENTE: 'CLIENTE'
};

const AdminUsers = () => {
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
        role: ROLES.CLIENTE
    });
    const [saving, setSaving] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        const token = localStorage.getItem("user");
        try {
            const res = await axios.get(`${BackURL}/auth/users`, {
                headers: { Authorization: `Token ${token}` }
            });
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
            role: user.role || ROLES.CLIENTE
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSaveUser = async (e) => {
        e.preventDefault();
        setSaving(true);
        const token = localStorage.getItem("user");

        try {
            await axios.patch(`${BackURL}/auth/users/${editingUser.id}`, formData, {
                headers: { Authorization: `Token ${token}` }
            });

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
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id}>
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