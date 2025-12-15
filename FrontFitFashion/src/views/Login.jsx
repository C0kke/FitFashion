import { useEffect, useState } from 'react';
import './styles/Login.css';
import { authService } from '../services/auth.service';

const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [isloading, setIsLoading] = useState(false);
    const [passwordsMatch, setPasswordsMatch] = useState(true);

    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [checkpassword, setCheckPassword] = useState("");

    useEffect(() => {
        if (checkpassword !== password) {
            setPasswordsMatch(false);
        } else {
            setPasswordsMatch(true);
        }
    }, [checkpassword]);

     useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'Enter') {
                if (isRegister) {
                    handleRegister();
                } else {
                    handleLogin();
                }
            }
        }
        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        }
    }, [isRegister, username, password, name, email, checkpassword]);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const response = await authService.login(username, password);
            if (response?.token) { 
                localStorage.setItem("user", response.token);
                window.location.href = "/";
            } else {
                const msg = response?.message || "Credenciales incorrectas o error de conexión";
                alert(msg);
            }
        } catch(error) {
            console.log("Error crítico al iniciar sesión", error);
            alert("Error de conexión con el servidor");
        } finally {
            setIsLoading(false);
        }
    }

    const handleRegister = async () => {
        setIsLoading(true);
        try {
            const res = await authService.register({ username, password, email, name });
            if (res.status === 201) {
                setName("");
                setUsername("");
                setEmail("");
                setPassword("");
                setCheckPassword("");
                setIsRegister(false);
            }
        } catch(error) {
            console.error("Error al registrarse", error);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="login-container">
            {!isRegister ? (
                <div className='formSection'>
                    <h1>Inicia Sesión</h1>
                    <div className="inputSection">
                        <label htmlFor="username">Nombre de usuario:</label>
                        <input type="text" name="username" id="username" value={username} onChange={e => setUsername(e.target.value)}/>
                        <label htmlFor="password">Contraseña:</label>
                        <input type="password" name="password" id="password" value={password} onChange={e => setPassword(e.target.value)}/>
                        <button onClick={handleLogin}>Iniciar Sesión</button>
                    </div>
                </div>
            ) : (
                <div className='formSection'>
                    <h1>Regístrate</h1>
                    <div className="inputSection">
                        <label htmlFor="name">Nombre:</label>
                        <input type="text" name="name" id="name" value={name} onChange={e => setName(e.target.value)}/>
                        <label htmlFor="username">Nombre de usuario:</label>
                        <input type="text" name="username" id="username" value={username} onChange={e => setUsername(e.target.value)}/>
                        <label htmlFor="email">Correo electrónico:</label>
                        <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)}/>
                        <label htmlFor="password">Contraseña:</label>
                        <input type="password" name="password" id="password" value={password} onChange={e => setPassword(e.target.value)}/>
                        <label htmlFor="password">Confirmar contraseña:</label>
                        <input type="password" name="confirm-password" id="confirm-password" value={checkpassword} onChange={e => setCheckPassword(e.target.value)}/>
                        {!passwordsMatch && <span className="errorText">Las contraseñas no coinciden</span>}
                    </div>
                    <button onClick={handleRegister}>Registrarse</button>
                </div>
            )}
            <div className="toggleSection">
                {!isRegister ? (
                    <p>¿No tienes una cuenta? <span className="toggleLink" onClick={() => setIsRegister(true)}>Regístrate</span></p>
                ) : (
                    <p>¿Ya tienes una cuenta? <span className="toggleLink" onClick={() => setIsRegister(false)}>Inicia Sesión</span></p>
                )}
            </div>
        </div>
    );
};

export default Login;