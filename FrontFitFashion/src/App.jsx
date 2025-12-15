import { Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import CartSidebar from './components/CartSidebar'
import Home from './views/Home'
import Login from './views/Login'
import Profile from './views/Profile'
import AdminUsers from './views/admin/AdminUsers'
import { useCart } from './store/CartContext.jsx'
import { useUser } from './store/UserContext.jsx'
import OrderSuccess from './views/OrderSuccess.jsx'
import OrderFailed from './views/OrderFailed.jsx'
import Checkout from './views/Checkout.jsx'
import OrderHistory from './views/OrderHistory.jsx'
import ProductDetail from './views/ProductDetail.jsx'
import OutfitBuilder from './views/OutfitBuilder.jsx'

function App() {
  const { user, loading } = useUser()
  const { isCartOpen, closeCart } = useCart()

  if (loading) return <div>Cargando...</div>;

  return (
    <>
      <Navbar />
      <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        {user?.role === 'ADMIN' && (
          <Route path="/admin/users" element={<AdminUsers />} />
        )}
        <Route path="*" element={<h2>Página no encontrada</h2>} />
        <Route path="/success" element={<OrderSuccess />} />
        <Route path="/failed" element={<OrderFailed />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orderhistory" element={<OrderHistory />} />
        <Route path="/productdetail/:id" element={<ProductDetail />} />
        <Route path="/simulate" element={<OutfitBuilder />} />
      </Routes>
    </>
  )
}

export default App