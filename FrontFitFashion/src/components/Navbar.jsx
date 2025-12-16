import UserIcon from "../assets/user.svg";
import CartIcon from "../assets/cart.svg";
import "./styles/Navbar.css";
import axios from 'axios';
import { useCart } from '../store/CartContext'; 
import { useNavigate } from 'react-router-dom';
import { UserContext } from "../store/UserContext";

const BackURL = import.meta.env.VITE_GATEWAY_URL;

const Navbar = () => {
    const { totalItems, openCart } = useCart(); 
    const { user: userData } = useUser();
    
    const navigate = useNavigate();

    const user = localStorage.getItem("user");
    
    const navigateToSimulate = () => {
        navigate("/simulate");
    };

    const navigateToProfile = () => {
        if (!user) {
            navigate("/login");
            return;
        }
        navigate("/profile");
    };

    const navigateToHome = () => {
        navigate("/");
    };

    const navigateToAdmin = () => {
        navigate("/admin/users");
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
            navigate("/");
            window.location.reload(); 
        }
    };

    return (
        <div className="navbar">
            <h1 onClick={navigateToHome} style={{cursor: 'pointer'}}>FitFashion</h1>
            
            <div className="rightSection">

                {userData?.role === 'ADMIN' && (
                    <button onClick={navigateToAdmin} style={{backgroundColor: '#444', color: 'white'}}>
                        Panel Admin
                    </button>
                )}

                <button onClick={navigateToSimulate}>Simular outfit</button>

                <button onClick={openCart} className="cart-button">
                    <img src={CartIcon} alt="Cart Icon" className="cartIcon" />
                    {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
                </button>

                <button onClick={navigateToProfile}>
                    <img src={UserIcon} alt="User Icon" className="userIcon" />
                </button>
                {user && <button onClick={handleLogout}>Logout</button>}
            </div>
        </div>
    );
};

export default Navbar;