import { Heart, Leaf, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import { useCart } from '../hooks/useCart.js'

export default function Layout() {
    const { user, logout } = useAuth(); const { itemCount } = useCart(); const navigate = useNavigate(); const [query, setQuery] = useState(''); const [menuOpen, setMenuOpen] = useState(false)
    function submit(event) { event.preventDefault(); navigate(`/shop${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`); setMenuOpen(false) }
    return <div className="app-shell">
        <header className="site-header">
            <button className="mobile-menu icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
            <Link className="brand" to="/" onClick={() => setMenuOpen(false)}><span className="brand-mark"><Leaf size={18} /></span><span>Fieldnote</span></Link>
            <nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation"><NavLink to="/shop" onClick={() => setMenuOpen(false)}>Shop</NavLink><NavLink to="/privacy" onClick={() => setMenuOpen(false)}>Our standards</NavLink>{user && <NavLink to="/orders" onClick={() => setMenuOpen(false)}>Orders</NavLink>}{user?.role === 'admin' && <NavLink to="/admin" onClick={() => setMenuOpen(false)}>Admin</NavLink>}</nav>
            <form className="header-search" onSubmit={submit}><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search products" /></form>
            <div className="header-actions"><Link className="icon-button" to={user ? '/profile' : '/login'} aria-label={user ? 'Your profile' : 'Sign in'}><UserRound size={19} /></Link><Link className="icon-button" to={user ? '/wishlist' : '/login'} aria-label="Wishlist"><Heart size={19} /></Link><Link className="bag-button" to="/cart" aria-label="Shopping bag"><ShoppingBag size={19} /><span>{itemCount}</span></Link>{user && <button className="sign-out" onClick={() => { logout(); navigate('/') }}>Sign out</button>}</div>
        </header>
        <Outlet />
        <footer><Link to="/">Fieldnote</Link><span>Useful, well-made, quietly distinctive.</span><span><Link to="/privacy">Privacy</Link> · <Link to="/terms">Terms</Link></span></footer>
    </div>
}