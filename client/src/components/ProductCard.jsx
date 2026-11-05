import { Heart, ShoppingBag } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { useCart } from '../hooks/useCart.js'
import { useWishlist } from '../hooks/useWishlist.js'
import { getErrorMessage } from '../api.js'
import { useState } from 'react'

export default function ProductCard({ product }) {
    const { user } = useAuth(); const { setQuantity } = useCart(); const { add, remove, has } = useWishlist(); const navigate = useNavigate(); const [message, setMessage] = useState('')
    async function addToCart() { if (!user) { navigate('/login'); return } try { await setQuantity(product._id, 1); setMessage('Added to bag') } catch (error) { setMessage(getErrorMessage(error, 'Could not add this item')) } }
    async function toggleWishlist() { if (!user) { navigate('/login'); return } try { const saved = has(product._id); if (saved) await remove(product._id); else await add(product._id); setMessage(saved ? 'Removed from wishlist' : 'Saved to wishlist') } catch (error) { setMessage(getErrorMessage(error, 'Could not update wishlist')) } }
    return <article className="product-card"><Link to={`/products/${product._id}`} className="product-image-wrap"><img src={product.image} alt={product.name} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/favicon.svg' }} /><span className="image-label">{product.category?.name || 'Fieldnote'}</span></Link><div className="product-card-body"><div><Link to={`/products/${product._id}`} className="product-name">{product.name}</Link><p className="product-description">{product.description}</p></div><div className="product-meta"><strong>${product.price.toFixed(2)}</strong><span>{product.rating > 0 ? `${product.rating.toFixed(1)} / 5` : 'Not yet rated'}</span></div><div className="product-actions"><button className="small-button" onClick={addToCart} disabled={product.stock < 1}><ShoppingBag size={15} />{product.stock ? 'Add to bag' : 'Out of stock'}</button><button className={`icon-button bordered ${has(product._id) ? 'is-saved' : ''}`} onClick={toggleWishlist} aria-label={has(product._id) ? 'Remove from wishlist' : 'Save to wishlist'}><Heart size={17} fill={has(product._id) ? 'currentColor' : 'none'} /></button></div>{message && <small className="action-message">{message}</small>}</div></article>
}