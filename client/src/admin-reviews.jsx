import { ChevronLeft, ChevronRight, Search, Star, Trash2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { api, getErrorMessage } from './api.js'
import { EmptyState, ErrorState, LoadingState } from './components/States.jsx'

function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      <Link to="/admin">Overview</Link>
      <Link to="/admin/products">Products</Link>
      <Link to="/admin/categories">Categories</Link>
      <Link to="/admin/orders">Orders</Link>
      <Link to="/admin/customers">Customers</Link>
      <Link className="active" to="/admin/reviews">Reviews</Link>
    </nav>
  )
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
        aria-label="Previous review page"
      >
        <ChevronLeft size={16} />
      </button>
      <span>Page {pagination.page} of {pagination.pages}</span>
      <button
        type="button"
        className="icon-button bordered"
        disabled={pagination.page >= pagination.pages}
        onClick={() => onPage(pagination.page + 1)}
        aria-label="Next review page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

export default function AdminReviewsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reviews, setReviews] = useState([])
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const queryString = searchParams.toString()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = searchParams.get('page') || '1'
      const searchParam = searchParams.get('search') || ''
      const query = new URLSearchParams({
        page,
        limit: '10',
        ...(searchParam ? { search: searchParam } : {}),
      })
      const { data } = await api.get(`/admin/reviews?${query}`)
      setReviews(data.reviews)
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

  async function removeReview(review) {
    if (!window.confirm(`Delete the review from ${review.user?.name || 'this customer'}?`)) return
    try {
      await api.delete(`/admin/reviews/${review._id}`)
      setMessage('Review deleted and product rating recalculated.')
      load()
    } catch (requestError) {
      setMessage(getErrorMessage(requestError, 'The review could not be deleted.'))
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
    <>
      <AdminNav />
      <main className="admin-page">
        <div className="admin-page-head">
          <div>
            <p className="eyebrow">Customer voice</p>
            <h1>Review moderation.</h1>
            <p>Remove inappropriate customer reviews while keeping product aggregates grounded in persisted data.</p>
          </div>
        </div>

        <section className="admin-toolbar">
          <form className="admin-search-form" onSubmit={handleSearch}>
            <div className="admin-search-box">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, product, or review text"
                aria-label="Search reviews"
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
        </section>

        {message && <p className="admin-message">{message}</p>}

        {error ? (
          <ErrorState message={error} retry={load} />
        ) : loading ? (
          <LoadingState label="Loading reviews..." />
        ) : reviews.length ? (
          <div className="admin-review-list">
            {reviews.map((review) => (
              <article className="admin-review" key={review._id}>
                <div className="admin-review-image">
                  {review.product?.image ? (
                    <img
                      src={review.product.image}
                      alt=""
                      onError={(event) => {
                        event.currentTarget.onerror = null
                        event.currentTarget.src = '/favicon.svg'
                      }}
                    />
                  ) : (
                    <Star size={20} />
                  )}
                </div>
                <div className="admin-review-copy">
                  <div className="review-top">
                    <Link
                      to={review.product?._id ? `/products/${review.product._id}` : '#'}
                      className="admin-product-link"
                    >
                      <strong>{review.product?.name || 'Unavailable product'}</strong>
                    </Link>
                    <span>
                      {[1, 2, 3, 4, 5].map((number) => (
                        <Star
                          key={number}
                          size={14}
                          fill={number <= review.rating ? 'currentColor' : 'none'}
                        />
                      ))}
                    </span>
                  </div>
                  <p>{review.comment}</p>
                  <small>
                    {review.user?.name || 'Unknown customer'} · {review.user?.email || 'No email'} · Verified purchase
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-button bordered"
                  onClick={() => removeReview(review)}
                  aria-label={`Delete review for ${review.product?.name || 'unavailable product'}`}
                >
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reviews found"
            message="Customer reviews will appear here after verified purchases."
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
