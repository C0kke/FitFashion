import UserIcon from "../assets/user.svg";
import "./styles/Navbar.css";

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

    return (
        <div className="navbar">
            <h1 onClick={navigateToHome}>FitFashion</h1>
            <div className="rightSection">
                <button onClick={navigateToSimulate}>Simular outfit</button>
                <button onClick={navigateToProfile}>
                    <img src={UserIcon} alt="User Icon" className="userIcon" />
                </button>
            </div>
        </div>
    );
};

export default Navbar;