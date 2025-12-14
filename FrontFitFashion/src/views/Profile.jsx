import { useUser } from "../store/UserContext";
import './styles/Profile.css';

const Profile = () => {
    const { user, loading } = useUser();

    const handleGoToUsers = () => {
        window.location.href = "/admin/users";
    }

    if (loading) return <div className="profile-container">Cargando perfil...</div>;
    if (!user) return <div className="profile-container">No hay sesión activa.</div>;

    return (
        <div className="profile-container">
            <div className="content">
                <h1>Perfil de Usuario</h1>
                <p>Nombre: {user.first_name || user.username || 'Sin nombre'}</p>
                <p>Nombre de usuario: {user.username}</p>
                <p>Email: {user.email}</p>
                
                {user.role === 'ADMIN' && (
                    <div className="admin-section" style={{marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px'}}>
                        <h2>Sección de Administrador</h2>
                        <p>Tienes acceso a funciones administrativas.</p>
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