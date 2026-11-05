import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../hooks/useAuth.js'
import { WishlistContext } from './contextObjects.js'

export function WishlistProvider({ children }) {
    const { user } = useAuth()
    const [wishlist, setWishlist] = useState({ products: [] })
    const [loading, setLoading] = useState(false)
    useEffect(() => { if (!user) { setWishlist({ products: [] }); return } setLoading(true); api.get('/wishlist').then(({ data }) => setWishlist(data.wishlist)).finally(() => setLoading(false)) }, [user])
    async function add(productId) { const { data } = await api.put(`/wishlist/${productId}`); setWishlist(data.wishlist) }
    async function remove(productId) { const { data } = await api.delete(`/wishlist/${productId}`); setWishlist(data.wishlist) }
    const has = (productId) => wishlist.products.some((product) => product._id === productId)
    return <WishlistContext.Provider value={{ wishlist, loading, add, remove, has }}>{children}</WishlistContext.Provider>
}

