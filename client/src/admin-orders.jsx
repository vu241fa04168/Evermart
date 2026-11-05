import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from './api.js'
import { EmptyState, ErrorState, LoadingState } from './components/States.jsx'

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`
}

function Pager({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) return null
  return (
    <div className="pagination">
      <button
        type="button"
        className="icon-button bordered"
        disabled={pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
        aria-label="Previous order page"
      >
        <ChevronLeft size={16} />
      </button>
      <span>Page {pagination.page} of {pagination.pages}</span>
      <button
        type="button"
        className="icon-button bordered"
        disabled={pagination.page >= pagination.pages}
        onClick={() => onPage(pagination.page + 1)}
        aria-label="Next order page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      <Link to="/admin">Overview</Link>
      <Link to="/admin/products">Products</Link>
      <Link to="/admin/categories">Categories</Link>
      <Link className="active" to="/admin/orders">Orders</Link>
      <Link to="/admin/customers">Customers</Link>
      <Link to="/admin/reviews">Reviews</Link>
    </nav>
  )
}

export default function AdminOrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1 })
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || '')
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const queryString = searchParams.toString()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = searchParams.get('page') || '1'
      const searchParam = searchParams.get('search') || ''
      const statusParam = searchParams.get('status') || ''
      const paymentParam = searchParams.get('paymentStatus') || ''
      const query = new URLSearchParams({
        page,
        limit: '10',
        ...(searchParam ? { search: searchParam } : {}),
        ...(statusParam ? { status: statusParam } : {}),
        ...(paymentParam ? { paymentStatus: paymentParam } : {}),
      })
      const { data } = await api.get(`/admin/orders?${query}`)
      setOrders(data.orders)
      setPagination(data.pagination)
      setError('')
    } catch (requestError) {
      setError(getErrorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    load()
  }, [load, queryString])

  async function changeStatus(order, nextStatus) {
    try {
      if (nextStatus === 'Cancelled') {
        await api.post(`/orders/${order._id}/cancel`, { reason: 'Cancelled by administrator' })
      } else {
        await api.patch(`/orders/${order._id}/status`, { orderStatus: nextStatus })
      }
      setMessage('Order status updated.')
      load()
    } catch (requestError) {
      setMessage(getErrorMessage(requestError, 'That transition is not available.'))
    }
  }

  async function markPaid(order) {
    try {
      await api.patch(`/orders/${order._id}/payment`, { paymentStatus: 'Paid' })
      setMessage('COD payment marked as paid.')
      load()
    } catch (requestError) {
      setMessage(getErrorMessage(requestError, 'Payment could not be updated.'))
    }
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const next = new URLSearchParams()
    if (search.trim()) next.set('search', search.trim())
    if (status) next.set('status', status)
    if (paymentStatus) next.set('paymentStatus', paymentStatus)
    setSearchParams(next)
  }

  function handleClearSearch() {
    setSearch('')
    const next = new URLSearchParams()
    if (status) next.set('status', status)
    if (paymentStatus) next.set('paymentStatus', paymentStatus)
    setSearchParams(next)
  }

  function updateFilter(newStatus, newPaymentStatus) {
    const next = new URLSearchParams()
    if (search.trim()) next.set('search', search.trim())
    if (newStatus) next.set('status', newStatus)
    if (newPaymentStatus) next.set('paymentStatus', newPaymentStatus)
    setSearchParams(next)
  }

  return (
    <>
      <AdminNav />
      <main className="admin-page">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Fulfillment</p>
            <h1>Orders.</h1>
            <p>Search by order ID, customer, email, or product while keeping delivery and COD payment status separate.</p>
          </div>
        </div>

        <section className="admin-toolbar">
          <form className="admin-search-form" onSubmit={handleSearchSubmit}>
            <div className="admin-search-box">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search order ID, customer, email, or product"
                aria-label="Search orders"
              />
              {search && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                >
                  &times;
                </button>
              )}
            </div>
            <button type="submit" className="secondary-button search-btn">
              Search
            </button>
          </form>

          <div className="admin-filters">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value)
                updateFilter(event.target.value, paymentStatus)
              }}
              aria-label="Filter by order status"
            >
              <option value="">All order statuses</option>
              <option value="Processing">Processing</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(event) => {
                setPaymentStatus(event.target.value)
                updateFilter(status, event.target.value)
              }}
              aria-label="Filter by payment status"
            >
              <option value="">All payment statuses</option>
              <option value="Pending">COD pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </section>

        {message && <p className="admin-message">{message}</p>}

        {error ? (
          <ErrorState message={error} retry={load} />
        ) : loading ? (
          <LoadingState label="Loading orders..." />
        ) : orders.length ? (
          <div className="admin-orders">
            {orders.map((order) => (
              <details
                className="admin-order"
                open={searchParams.get('selected') === order._id}
                key={order._id}
              >
                <summary>
                  <span>
                    <strong>{order.user?.name || 'Customer'}</strong>
                    <small>{order._id}</small>
                  </span>
                  <span>
                    <b>{money(order.totalAmount)}</b>
                    <small>
                      {order.orderStatus} · COD {order.paymentStatus}
                    </small>
                  </span>
                </summary>
                <div className="admin-order-detail">
                  <div>
                    <h3>Items</h3>
                    {order.products.map((item, index) => {
                      const productId = item.product?._id || item.product
                      return (
                        <p key={`${order._id}-${item.name}-${index}`}>
                          {productId ? (
                            <Link
                              to={`/products/${productId}`}
                              className="admin-product-link"
                              title={`View ${item.name}`}
                            >
                              {item.name}
                            </Link>
                          ) : (
                            <span>{item.name} (unavailable)</span>
                          )}{' '}
                          × {item.quantity}{' '}
                          <span>{money(item.price * item.quantity)}</span>
                        </p>
                      )
                    })}
                  </div>

                  <div>
                    <h3>Shipping</h3>
                    <p>
                      {order.shippingAddress?.line1}
                      <br />
                      {order.shippingAddress?.city}, {order.shippingAddress?.state}
                      <br />
                      {order.shippingAddress?.postalCode}, {order.shippingAddress?.country}
                    </p>
                  </div>

                  <div className="order-management">
                    <h3>Manage</h3>
                    <select
                      value={order.orderStatus}
                      onChange={(event) => changeStatus(order, event.target.value)}
                      disabled={order.orderStatus === 'Delivered' || order.orderStatus === 'Cancelled'}
                      aria-label="Change order status"
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>

                    {order.paymentMethod === 'cod' && order.paymentStatus === 'Pending' && order.orderStatus !== 'Cancelled' && (
                      <button
                        type="button"
                        className="secondary-button mark-paid-btn"
                        onClick={() => markPaid(order)}
                      >
                        Mark as paid
                      </button>
                    )}
                    <small className="payment-note-line">
                      Payment ({order.paymentMethod?.toUpperCase()}):{' '}
                      <strong className={order.paymentStatus === 'Paid' ? 'paid-tag' : 'pending-tag'}>
                        {order.paymentStatus}
                      </strong>
                    </small>
                  </div>
                </div>
              </details>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No orders found"
            message="Try another filter or wait for the next order."
          />
        )}

        <Pager
          pagination={pagination}
          onPage={(page) => {
            const next = new URLSearchParams(searchParams)
            next.set('page', page)
            setSearchParams(next)
          }}
        />
      </main>
    </>
  )
}
