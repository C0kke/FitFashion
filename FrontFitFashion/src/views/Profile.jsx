import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import axios from "axios";

const BackURL = import.meta.env.VITE_BACK_URL;

const Profile = () => {
    const [user, setUser] = useState(null);
    
    useEffect( () => {
        const fetchUser = async () => {
            try {
                const storedUser = localStorage.getItem("user");
                const res = await axios.get(`${BackURL}/auth/users/me/`, {
                    headers: {
                        Authorization: `Token ${storedUser}`
                }
            });
            setUser(res.data);
            console.log(res.data);
        } catch (error) {
            console.log("Error al obtener el perfil del usuario", error);
        }
        };
        fetchUser();
    }, []);

    return (
        <div className="profile-container">
            <Navbar />
            <div className="content">
                <h1>Perfil de Usuario</h1>
                <p>Nombre: {user ? user.first_name : 'No encontrado'}</p>
                <p>Nombre de usuario: {user ? user.username : 'No encontrado'}</p>
                <p>Email: {user ? user.email : 'No encontrado'}</p>
            </div>
        </div>
    )
};

export default Profile;