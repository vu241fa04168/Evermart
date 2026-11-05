import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { useAuth } from './hooks/useAuth.js'
import { HomePage, CatalogPage, ProductPage, LoginPage, RegisterPage, CartPage, WishlistPage, CheckoutPage, ConfirmationPage, OrdersPage, ProfilePage, PrivacyPage, TermsPage, NotFoundPage } from './pages.jsx'
import { AdminRouteGuard, AdminDashboardPage, AdminProductsPage, AdminCategoriesPage, AdminOrdersPage, AdminCustomersPage } from './admin-pages.jsx'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<CatalogPage />} />
          <Route path="/products/:id" element={<ProductPage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
          <Route path="/confirmation/:id" element={<ProtectedRoute><ConfirmationPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/admin" element={<AdminRouteGuard><AdminDashboardPage /></AdminRouteGuard>} />
          <Route path="/admin/products" element={<AdminRouteGuard><AdminProductsPage /></AdminRouteGuard>} />
          <Route path="/admin/categories" element={<AdminRouteGuard><AdminCategoriesPage /></AdminRouteGuard>} />
          <Route path="/admin/orders" element={<AdminRouteGuard><AdminOrdersPage /></AdminRouteGuard>} />
          <Route path="/admin/customers" element={<AdminRouteGuard><AdminCustomersPage /></AdminRouteGuard>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-state">Loading your account...</div>
  return user ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="page-state">Loading...</div>
  return user ? <Navigate to="/profile" replace /> : children
}

export default App
