import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import CartSidebar from './components/CartSidebar'
import Home from './views/Home'
import Login from './views/Login'
import Profile from './views/Profile'

function App() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const openCart = () => setIsCartOpen(true)
  const closeCart = () => setIsCartOpen(false)

  return (
    <>
      <Navbar onCartClick={openCart} />
      <CartSidebar isOpen={isCartOpen} onClose={closeCart} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </>
  )
}

export default App
