import { useEffect, useState } from 'react'
import { api, getErrorMessage } from '../api.js'
import { AuthContext } from './contextObjects.js'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        api.get('/auth/me').then(({ data }) => setUser(data.user)).catch(() => setUser(null)).finally(() => setLoading(false))
    }, [])

    async function login(credentials) {
        setError('')
        try { const { data } = await api.post('/auth/login', credentials); setUser(data.user); return data.user } catch (requestError) { const message = getErrorMessage(requestError, 'Unable to sign in.'); setError(message); throw new Error(message) }
    }

    async function register(details) {
        setError('')
        try { const { data } = await api.post('/auth/register', details); setUser(data.user); return data.user } catch (requestError) { const message = getErrorMessage(requestError, 'Unable to create your account.'); setError(message); throw new Error(message) }
    }

    async function logout() { await api.post('/auth/logout'); setUser(null) }

    async function updateProfile(details) { const { data } = await api.patch('/auth/me', details); setUser(data.user); return data.user }

    return <AuthContext.Provider value={{ user, loading, error, login, register, logout, updateProfile }}>{children}</AuthContext.Provider>
}

