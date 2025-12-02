import UserIcon from "../assets/user.svg";
import "./styles/Navbar.css";
import axios from 'axios';

const BackURL = import.meta.env.VITE_BACK_URL;

const Navbar = () => {
    const user = localStorage.getItem("user");
    console.log("Navbar user:", user);
    const navigateToSimulate = () => {
        window.location.href = "#";
    };

    const navigateToProfile = () => {
        if (!user) {
            window.location.href = "/login";
            return;
        }
        window.location.href = "/profile";
    };

    const navigateToHome = () => {
        window.location.href = "/";
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("user");
        if (token) {
            try {
                await axios.post(`${BackURL}/auth/token/logout/`, {}, {
                    headers: {
                        Authorization: `Token ${token}`
                    }
                });
            } catch (error) {
                console.error("Logout failed", error);
            }
            localStorage.removeItem("user");
            window.location.reload();
        }
    };

    return (
        <div className="navbar">
            <h1 onClick={navigateToHome}>FitFashion</h1>
            <div className="rightSection">
                <button onClick={navigateToSimulate}>Simular outfit</button>
                <button onClick={navigateToProfile}>
                    <img src={UserIcon} alt="User Icon" className="userIcon" />
                </button>
                {user && <button onClick={handleLogout}>Logout</button>}
            </div>
        </div>
    );
};

export default Navbar;