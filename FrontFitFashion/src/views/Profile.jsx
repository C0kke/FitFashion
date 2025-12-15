import { useState, useEffect } from "react";
import { useUser } from "../store/UserContext";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth.service";
import './styles/Profile.css';

const Profile = () => {
    const { user, setUser, loading } = useUser();
    const navigate = useNavigate();

    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [msg, setMsg] = useState({ type: "", text: "" });

    const [formData, setFormData] = useState({
        username: "",
        first_name: "",
        email: "",
        current_password: "",
        new_password: "",
        addresses: []
    });

    useEffect(() => {
        if (user) {
            setFormData({
                username: user.username || "",
                first_name: user.first_name || "",
                email: user.email || "",
                new_password: "",
                current_password: "",
                addresses: Array.isArray(user.addresses) ? user.addresses : []
            });
        }
    }, [user]);

    const handleGoToUsers = () => {
        navigate("/admin/users");
    }

    const getInitials = (name) => {
        if (!name) return "U";
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const toggleEdit = () => {
        if (isEditing) {
            setFormData({
                username: user.username || "",
                first_name: user.first_name || "",
                email: user.email || "",
                new_password: "",
                current_password: "",
                addresses: Array.isArray(user.addresses) ? user.addresses : []
            });
            setMsg({ type: "", text: "" });
        }
        setIsEditing(!isEditing);
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

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        setMsg({ type: "", text: "" });
        setIsSubmitting(true);

        try {
            const profilePayload = {
                username: formData.username,
                first_name: formData.first_name,
                email: formData.email,
                addresses: formData.addresses
            };

            const resProfile = await authService.updateProfile(profilePayload);

            if (formData.new_password) {
                if (!formData.current_password) {
                    throw new Error("Para cambiar la contraseña, debes ingresar tu contraseña actual.");
                }

                await authService.changePassword(
                    formData.current_password,
                    formData.new_password
                );
            }

            setMsg({ type: "success", text: "Perfil actualizado correctamente." });
            
            setUser(prevUser => ({ 
                ...prevUser, 
                ...resProfile.data
            }));
            
            setIsEditing(false);
            setFormData(prev => ({ ...prev, new_password: "", current_password: "" }));

        } catch (error) {
            console.error(error);
            let errorText = error.message || "Error al guardar cambios.";

            if (errorText.toLowerCase().includes("credentials") || errorText.toLowerCase().includes("password")) {
                errorText = "Contraseña actual incorrecta o credenciales inválidas.";
            } else if (errorText.includes("unique")) {
                errorText = "Ese nombre de usuario o email ya está en uso.";
            }
            
            setMsg({ type: "error", text: errorText });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="profile-loading">Cargando perfil...</div>;
    if (!user) return <div className="profile-loading">No hay sesión activa.</div>;

    const displayName = formData.username || 'Usuario';

    return (
        <div className="profile-container">
            <div className={`profile-card ${isEditing ? 'editing-mode' : ''}`}>
                
                <div className="profile-header">
                    <div className="avatar-circle">
                        {user.profileImage ? (
                            <img src={user.profileImage} alt="Avatar" className="avatar-image" />
                        ):(
                            getInitials(displayName)
                        )}
                    </div>
                    <h1 className="user-name">{displayName}</h1>
                    {user.role === 'ADMIN' && (
                        <span className="role-badge">{user.role}</span>
                    )}
                </div>

                <form className="profile-details" onSubmit={handleSaveChanges}>
                    <div className="detail-item">
                        <label>Nombre Completo</label>
                        <input 
                            type="text" 
                            name="first_name"
                            className="profile-input"
                            value={formData.first_name}
                            onChange={handleInputChange}
                            disabled={!isEditing} 
                            placeholder="Tu nombre"
                        />
                    </div>

                    <div className="detail-item">
                        <label>Nombre de Usuario</label>
                        <input 
                            type="text" 
                            name="username"
                            className="profile-input"
                            value={formData.username}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="detail-item">
                        <label>Correo Electrónico</label>
                        <input 
                            type="email" 
                            name="email"
                            className="profile-input"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="detail-item">
                        <label>Direcciones</label>
                        {isEditing ? (
                            <div className="address-list-edit">
                                {formData.addresses.map((addr, idx) => (
                                    <div key={idx} className="address-input-row">
                                        <input
                                            type="text"
                                            name={`address-${idx}`}
                                            value={addr}
                                            onChange={handleInputChange}
                                            placeholder={`Dirección #${idx + 1}`}
                                            className="profile-input editing"
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
                        ) : (
                            (formData.addresses && formData.addresses.length > 0)
                                ? <ul className="address-list-view">{formData.addresses.map((d, i) => <li key={i}>{d}</li>)}</ul>
                                : <span className="no-addresses">Sin direcciones</span>
                        )}
                    </div>
                    {isEditing && (
                        <div className="password-section">
                            <div className="detail-item">
                                <label>Nueva Contraseña</label>
                                <input 
                                    type="password" 
                                    name="new_password"
                                    className="profile-input editing"
                                    value={formData.new_password}
                                    onChange={handleInputChange}
                                    placeholder="Nueva contraseña (opcional)"
                                />
                            </div>

                            {formData.new_password && (
                                <div className="detail-item highlight-required">
                                    <label>Contraseña Actual (Requerido para guardar)</label>
                                    <input 
                                        type="password" 
                                        name="current_password"
                                        className="profile-input editing"
                                        value={formData.current_password}
                                        onChange={handleInputChange}
                                        placeholder="Ingresa tu clave actual"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {msg.text && <div className={`msg-box ${msg.type}`}>{msg.text}</div>}

                    <div className="profile-actions">
                        {!isEditing ? (
                            <button type="button" onClick={toggleEdit} className="btn-secondary">
                                Editar Perfil
                            </button>
                        ) : (
                            <div className="edit-buttons">
                                <button type="button" onClick={toggleEdit} className="btn-cancel">
                                    Cancelar
                                </button>
                                <button type="submit" className="btn-save" disabled={isSubmitting}>
                                    {isSubmitting ? "Guardando..." : "Guardar Cambios"}
                                </button>
                            </div>
                        )}
                    </div>
                </form>
                
                {user.role === 'ADMIN' && !isEditing && (
                    <div className="admin-section">
                        <div className="admin-header">
                            <h3>Panel de Administrador</h3>
                        </div>
                        <p>Gestión de usuarios de la plataforma.</p>
                        <button onClick={handleGoToUsers} className="btn-admin">
                            Administrar Usuarios
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
};

export default Profile;