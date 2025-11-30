import Navbar from "../components/Navbar";
import './styles/Home.css';

import camisa1 from '../assets/camisa-1.jpg';
import camisa2 from '../assets/camisa-2.jpg';
import jeans1 from '../assets/jeans-1.jpg';
import jeans2 from '../assets/jeans-2.jpg';
import zapatillas1 from '../assets/zapatillas-1.jpg';
import zapatillas2 from '../assets/zapatillas-2.jpg';

const productos = [
    {
        id: 1,
        nombre: "Camisa Casual",
        imagen1: camisa1,
        imagen2: camisa2,
    },
    {
        id: 2,
        nombre: "Pantalones Jeans",
        imagen1: jeans1,
        imagen2: jeans2,
    },
    {
        id: 3,
        nombre: "Zapatillas",
        imagen1: zapatillas1,
        imagen2: zapatillas2,
    },
]

const Home = () => {
    return (
        <div className="main-container">
            <Navbar />
            <div className="content">
                <span>Nuevos productos</span>
                <div className="productsSection">
                    {productos.map((producto) => (
                        <div key={producto.id} className="productCard" onClick={() => window.location.href = `/product/${producto.id}`}>
                            <h3 className="productName">{producto.nombre}</h3>
                            <img src={producto.imagen1} alt={producto.nombre} className="productImage" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Home;