import { Archive, ChevronLeft, ChevronRight, Edit3, ExternalLink, Package, Plus, Search, Trash2, X } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { api, getErrorMessage } from './api.js'
import { EmptyState, ErrorState, LoadingState } from './components/States.jsx'
import { useAuth } from './hooks/useAuth.js'

function AdminFrame({ eyebrow, title, copy, children, actions }) { return <main className="admin-page"><div className="admin-page-head"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{copy && <p>{copy}</p>}</div>{actions}</div>{children}</main> }
function AdminNav() { return <nav className="admin-nav" aria-label="Admin navigation"><Link to="/admin">Overview</Link><Link to="/admin/products">Products</Link><Link to="/admin/categories">Categories</Link><Link to="/admin/orders">Orders</Link><Link to="/admin/customers">Customers</Link><Link to="/admin/reviews">Reviews</Link></nav> }
function AdminShell({ children }) { return <><AdminNav />{children}</> }
function Pager({ pagination, onPage }) { if (!pagination || pagination.pages <= 1) return null; return <div className="pagination"><button className="icon-button bordered" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button><span>Page {pagination.page} of {pagination.pages}</span><button className="icon-button bordered" disabled={pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)} aria-label="Next page"><ChevronRight size={16} /></button></div> }
function StatCard({ label, value, note }) { return <article className="admin-stat"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article> }
function orderMoney(value) { return `$${Number(value || 0).toFixed(2)}` }

export function AdminDashboardPage() { const [data, setData] = useState(null); const [error, setError] = useState(''); async function load() { try { const response = await api.get('/admin/dashboard'); setData(response.data); setError('') } catch (requestError) { setError(getErrorMessage(requestError)) } } useEffect(() => { load() }, []); return <AdminShell><AdminFrame eyebrow="Operations" title="A clear view of the store." copy="Actual catalog, customer, order, and delivered revenue data from MongoDB."><Link className="secondary-button" to="/admin/products"><Package size={16} /> Manage products</Link></AdminFrame>{error ? <ErrorState message={error} retry={load} /> : !data ? <LoadingState label="Preparing your dashboard..." /> : <div className="admin-content"><section className="admin-stat-grid"><StatCard label="Active products" value={data.stats.products} /><StatCard label="Customers" value={data.stats.customers} /><StatCard label="Orders" value={data.stats.orders} /><StatCard label="Delivered revenue" value={orderMoney(data.stats.revenue)} note="Delivered orders only" /></section><div className="admin-two-col"><section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent orders</h2></div><Link className="text-link" to="/admin/orders">View all</Link></div>{data.recentOrders.length ? <div className="admin-list">{data.recentOrders.map((order) => <Link className="admin-list-row" to={`/admin/orders?selected=${order._id}`} key={order._id}><span><strong>{order.user?.name || 'Customer'}</strong><small>{order._id}</small></span><span><b>{order.orderStatus}</b><small>{orderMoney(order.totalAmount)}</small></span></Link>)}</div> : <EmptyState title="No orders yet" message="Recent orders will appear here." />}</section><section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">Inventory watch</p><h2>Low stock</h2></div><Link className="text-link" to="/admin/products">Manage</Link></div>{data.lowStockProducts.length ? <div className="admin-list">{data.lowStockProducts.map((product) => <Link className="admin-list-row" to={`/admin/products?edit=${product._id}`} key={product._id}><span><strong>{product.name}</strong><small>{product.category?.name}</small></span><span><b className="stock-warning">{product.stock} left</b></span></Link>)}</div> : <EmptyState title="Inventory is in good shape" message="No products are at the low-stock threshold." />}</section></div></div>}</AdminShell> }

const emptyProduct = { name: '', description: '', price: '', category: '', image: '', stock: '', lowStockThreshold: 5 }
export function AdminProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [form, setForm] = useState(emptyProduct)
  const [editing, setEditing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState('active')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    setLoading(true)
    try {
      const searchParam = searchParams.get('search') || ''
      const [productResponse, categoryResponse] = await Promise.all([
        api.get(`/admin/products?${new URLSearchParams({ page: searchParams.get('page') || '1', limit: '10', ...(searchParam ? { search: searchParam } : {}), status })}`),
        api.get('/categories'),
      ])
      setProducts(productResponse.data.products)
      setPagination(productResponse.data.pagination)
      setCategories(categoryResponse.data.categories)
      setError('')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  function openEdit(product) {
    setForm({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category?._id || product.category,
      image: product.image,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold ?? 5,
      isActive: product.isActive,
    })
    setEditing(product._id)
    setShowForm(true)
  }

  useEffect(() => { load() }, [searchParams.toString(), status])
  useEffect(() => {
    const id = searchParams.get('edit')
    const product = products.find((item) => item._id === id)
    if (product) openEdit(product)
  }, [products, searchParams])

  function openCreate() {
    setForm({ ...emptyProduct, category: categories[0]?._id || '', lowStockThreshold: 5 })
    setEditing(false)
    setShowForm(true)
  }

  function change(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function submit(event) {
    event.preventDefault()
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        lowStockThreshold: Number(form.lowStockThreshold ?? 5),
      }
      if (editing) await api.patch(`/products/${editing}`, payload)
      else await api.post('/products', payload)
      setMessage(editing ? 'Product updated.' : 'Product created.')
      setShowForm(false)
      load()
    } catch (requestError) {
      setMessage(getErrorMessage(requestError))
    }
  }

  async function archive(product) {
    try {
      await api.patch(`/products/${product._id}`, { isActive: !product.isActive })
      setMessage(product.isActive ? 'Product archived.' : 'Product restored.')
      load()
    } catch (requestError) {
      setMessage(getErrorMessage(requestError))
    }
  }

  function handleSearch(event) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (search.trim()) next.set('search', search.trim())
    setSearchParams(next)
  }

  function handleClearSearch() {
    setSearch('')
    setSearchParams({})
  }

  return (
    <AdminShell>
      <AdminFrame eyebrow="Catalog" title="Product management." copy="Keep the catalog accurate, useful, and ready to ship." actions={<button className="primary-button" onClick={openCreate}><Plus size={16} /> Add product</button>} />
      {message && <p className="admin-message">{message}</p>}
      <section className="admin-toolbar">
        <form className="admin-search-form" onSubmit={handleSearch}>
          <div className="admin-search-box">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, product ID, or category" aria-label="Search products" />
            {search && <button type="button" className="search-clear-btn" onClick={handleClearSearch} aria-label="Clear search">&times;</button>}
          </div>
          <button type="submit" className="secondary-button search-btn">Search</button>
        </form>
        <div className="admin-filters">
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter products by status">
            <option value="active">Active products</option>
            <option value="archived">Archived products</option>
            <option value="all">All products</option>
          </select>
        </div>
      </section>
      {showForm && <ProductForm form={form} categories={categories} editing={editing} onChange={change} onSubmit={submit} onClose={() => setShowForm(false)} />}
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState label="Loading products..." /> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock / alert</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product._id}>
                  <td>
                    <div className="table-product">
                      <img src={product.image} alt="" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/favicon.svg' }} />
                      <span>
                        <Link to={`/products/${product._id}`} className="admin-product-link">
                          <strong>{product.name}</strong>
                        </Link>
                        <small>{product.description}</small>
                      </span>
                    </div>
                  </td>
                  <td>{product.category?.name}</td>
                  <td>{orderMoney(product.price)}</td>
                  <td className={product.stock <= (product.lowStockThreshold ?? 5) ? 'stock-warning' : ''}>
                    {product.stock} / {product.lowStockThreshold ?? 5}
                  </td>
                  <td>{product.isActive ? 'Active' : 'Archived'}</td>
                  <td>
                    <div className="table-actions">
                      <button className="icon-button bordered" onClick={() => openEdit(product)} aria-label={`Edit ${product.name}`}><Edit3 size={15} /></button>
                      <button className="icon-button bordered" onClick={() => archive(product)} aria-label={product.isActive ? `Archive ${product.name}` : `Restore ${product.name}`}><Archive size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <EmptyState title="No products match" message="Try another search or add a new product." />}
        </div>
      )}
      <Pager pagination={pagination} onPage={(page) => setSearchParams({ page, ...(search ? { search } : {}) })} />
    </AdminShell>
  )
}

function ProductForm({ form, categories, editing, onChange, onSubmit, onClose }) {
  return (
    <form className="admin-form" onSubmit={onSubmit}>
      <div className="panel-heading">
        <h2>{editing ? 'Edit product' : 'Add product'}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close product form"><X size={18} /></button>
      </div>
      <div className="form-grid">
        <label className="form-field">
          <span>Name</span>
          <input name="name" value={form.name} onChange={onChange} required />
        </label>
        <label className="form-field">
          <span>Category</span>
          <select name="category" value={form.category} onChange={onChange} required>
            <option value="">Select a category</option>
            {categories.map((category) => <option value={category._id} key={category._id}>{category.name}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span>Price ($)</span>
          <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={onChange} required />
        </label>
        <label className="form-field">
          <span>Available stock</span>
          <input name="stock" type="number" min="0" step="1" value={form.stock} onChange={onChange} required />
        </label>
        <label className="form-field">
          <span>Low-stock threshold</span>
          <input name="lowStockThreshold" type="number" min="0" step="1" value={form.lowStockThreshold} onChange={onChange} required />
          <small>Flag the product when stock is at or below this value.</small>
        </label>
      </div>
      <label className="form-field">
        <span>Image URL</span>
        <input name="image" type="url" value={form.image} onChange={onChange} required />
      </label>
      <label className="form-field">
        <span>Description</span>
        <textarea name="description" value={form.description} onChange={onChange} minLength="10" rows="4" required />
      </label>
      <button className="primary-button" type="submit">{editing ? 'Save product' : 'Create product'}</button>
    </form>
  )
}

export function AdminCategoriesPage() { const [categories, setCategories] = useState([]); const [form, setForm] = useState({ name: '', description: '' }); const [editing, setEditing] = useState(null); const [message, setMessage] = useState(''); async function load() { const { data } = await api.get('/admin/categories?limit=100'); setCategories(data.categories) } useEffect(() => { load() }, []); function edit(category) { setEditing(category._id); setForm({ name: category.name, description: category.description || '' }) } async function submit(event) { event.preventDefault(); try { if (editing) await api.patch(`/categories/${editing}`, form); else await api.post('/categories', form); setMessage('Category saved.'); setEditing(null); setForm({ name: '', description: '' }); load() } catch (error) { setMessage(getErrorMessage(error)) } } async function remove(category) { try { await api.delete(`/categories/${category._id}`); setMessage('Category deleted.'); load() } catch (error) { setMessage(getErrorMessage(error, 'Categories assigned to products must be archived instead.')) } } return <AdminShell><AdminFrame eyebrow="Catalog structure" title="Categories." copy="Keep product discovery clear and safe to change." /><div className="admin-two-col category-admin"><form className="admin-form" onSubmit={submit}><h2>{editing ? 'Edit category' : 'New category'}</h2><label className="form-field"><span>Name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label className="form-field"><span>Description</span><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows="4" /></label><button className="primary-button">{editing ? 'Save category' : 'Create category'}</button>{editing && <button type="button" className="text-button" onClick={() => { setEditing(null); setForm({ name: '', description: '' }) }}>Cancel edit</button>}{message && <p className="admin-message">{message}</p>}</form><section className="admin-panel"><div className="panel-heading"><h2>All categories</h2><span>{categories.length} total</span></div>{categories.length ? <div className="admin-list">{categories.map((category) => <div className="admin-list-row" key={category._id}><span><strong>{category.name}</strong><small>{category.description}</small></span><span className="table-actions"><button className="icon-button bordered" onClick={() => edit(category)} aria-label={`Edit ${category.name}`}><Edit3 size={15} /></button><button className="icon-button bordered" onClick={() => remove(category)} aria-label={`Delete ${category.name}`}><Trash2 size={15} /></button></span></div>)}</div> : <EmptyState title="No categories" message="Create the first category." />}</section></div></AdminShell> }

export { default as AdminOrdersPage } from './admin-orders.jsx'

export function AdminCustomersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null)
  const [pagination, setPagination] = useState({ page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  async function load() {
    setLoading(true)
    try {
      const searchParam = searchParams.get('search') || ''
      const { data } = await api.get(`/admin/users?${new URLSearchParams({ page: searchParams.get('page') || '1', limit: '10', ...(searchParam ? { search: searchParam } : {}) })}`)
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [searchParams.toString()])

  async function select(user) {
    const { data } = await api.get(`/admin/users/${user._id}`)
    setSelected(data)
  }

  function handleSearch(event) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (search.trim()) next.set('search', search.trim())
    setSearchParams(next)
  }

  function handleClearSearch() {
    setSearch('')
    setSearchParams({})
  }

  return (
    <AdminShell>
      <AdminFrame eyebrow="Customers" title="Customer accounts." copy="Account details and order history, without authentication data." />
      <section className="admin-toolbar">
        <form className="admin-search-form" onSubmit={handleSearch}>
          <div className="admin-search-box">
            <Search size={16} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or email" aria-label="Search customers" />
            {search && <button type="button" className="search-clear-btn" onClick={handleClearSearch} aria-label="Clear search">&times;</button>}
          </div>
          <button type="submit" className="secondary-button search-btn">Search</button>
        </form>
      </section>
      {error ? <ErrorState message={error} retry={load} /> : loading ? <LoadingState label="Loading customers..." /> : (
        <div className="admin-two-col customer-admin">
          <section className="admin-panel">
            <div className="admin-list">
              {users.map((user) => (
                <button className={`admin-list-row customer-row ${selected?.user?._id === user._id ? 'selected' : ''}`} onClick={() => select(user)} key={user._id}>
                  <span><strong>{user.name}</strong><small>{user.email}</small></span>
                  <ExternalLink size={15} />
                </button>
              ))}
            </div>
            {!users.length && <EmptyState title="No customers found" message="Try a different search." />}
            <Pager pagination={pagination} onPage={(page) => setSearchParams({ page, ...(search ? { search } : {}) })} />
          </section>
          {selected ? (
            <section className="admin-panel customer-detail">
              <button className="icon-button" onClick={() => setSelected(null)} aria-label="Close customer details"><X size={17} /></button>
              <div className="customer-heading">
                <div className="avatar">{selected.user.name.slice(0, 1)}</div>
                <div>
                  <h2>{selected.user.name}</h2>
                  <p>{selected.user.email}</p>
                </div>
              </div>
              <h3>Order history</h3>
              {selected.orders.length ? selected.orders.map((order) => (
                <div className="customer-order" key={order._id}>
                  <span>
                    {order.orderStatus}
                    <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                  </span>
                  <strong>{orderMoney(order.totalAmount)}</strong>
                </div>
              )) : <p className="muted-copy">No orders yet.</p>}
            </section>
          ) : (
            <EmptyState title="Select a customer" message="Choose an account to see its order history." />
          )}
        </div>
      )}
    </AdminShell>
  )
}

export function AdminRouteGuard({ children }) { const { user, loading } = useAuth(); if (loading) return <LoadingState label="Checking admin access..." />; return user?.role === 'admin' ? children : <ErrorState message="This area is restricted to administrators." /> }
