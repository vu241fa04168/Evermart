import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useAuth } from '../hooks/useAuth.js'
import { CartContext } from './contextObjects.js'

export function CartProvider({ children }) {
    const { user } = useAuth()
    const [cart, setCart] = useState({ items: [] })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!user) { setCart({ items: [] }); return }
        setLoading(true); api.get('/cart').then(({ data }) => setCart(data.cart)).finally(() => setLoading(false))
    }, [user])

    async function setQuantity(productId, quantity) { const { data } = await api.put(`/cart/items/${productId}`, { quantity }); setCart(data.cart); return data.cart }
    async function removeItem(productId) { const { data } = await api.delete(`/cart/items/${productId}`); setCart(data.cart); return data.cart }
    async function clearCart() { const { data } = await api.delete('/cart'); setCart(data.cart); return data.cart }
    const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = cart.items.reduce((sum, item) => sum + item.quantity * (item.product?.price || 0), 0)

    return <CartContext.Provider value={{ cart, loading, setQuantity, removeItem, clearCart, itemCount, subtotal }}>{children}</CartContext.Provider>
}

