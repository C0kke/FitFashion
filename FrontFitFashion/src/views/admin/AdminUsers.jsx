import { useEffect, useState } from "react";
import axios from "axios";

const BackURL = import.meta.env.VITE_GATEWAY_URL;

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            const token = localStorage.getItem("user");
            try {
                const res = await axios.get(`${BackURL}/auth/users`, {
                    headers: { Authorization: `Token ${token}` }
                });
                setUsers(res.data.results || []); 
            } catch (err) {
                setError("No tienes permisos o hubo un error.", err);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    if (loading) return <div className="p-4">Cargando usuarios...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div className="p-4" style={{ padding: "20px" }}>
            <h2>Panel de Administración - Usuarios</h2>
            <table border="1" style={{ width: "100%", textAlign: "left", marginTop: "10px" }}>
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Rol</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id}>
                            <td>{u.username}</td>
                            <td>{u.email}</td>
                            <td>{u.role}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminUsers;