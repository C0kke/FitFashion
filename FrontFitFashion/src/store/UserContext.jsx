import { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";

export const UserContext = createContext();
export const useUser = () => useContext(UserContext);
export const BackURL = import.meta.env.VITE_GATEWAY_URL;

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkUserSession();
    }, []);

    const checkUserSession = async () => {
        const token = localStorage.getItem("user");

        if (token) {
            try {
                const res = await axios.get(`${BackURL}/auth/users/me`, {
                    headers: {
                        Authorization: `Token ${token}`
                    }
                });

                if (res.data.status === 200) {
                    setUser({
                        first_name: res.data.first_name,
                        username: res.data.username,
                        email: res.data.email,
                        role: res.data.role,
                        token: token
                    });
                } else {
                    logout();
                }
            } catch (error) {
                console.error("Error verificando sesión:", error);
                logout();
            }
        }
        setLoading(false);
    };

    const login = (userData, token) => {
        localStorage.setItem("user", token);
        setUser({ ...userData, token });
    };

    const logout = () => {
        localStorage.removeItem("user");
        setUser(null);
        window.location.href = "/login"; 
    };

    return (
        <UserContext.Provider value={{ user, setUser, login, logout, loading }}>
            {children}
        </UserContext.Provider>
    );
};