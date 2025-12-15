import { createContext, useState, useEffect, useContext } from "react";
import { authService } from "../services/auth.service";

export const UserContext = createContext();
export const useUser = () => useContext(UserContext);

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
                const userData = await authService.getCurrentUser();

                if (userData && userData.status === 200) {
                    setUser({
                        first_name: userData.first_name,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role,
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