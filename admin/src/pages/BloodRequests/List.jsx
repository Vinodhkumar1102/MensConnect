import React, { useEffect, useState } from 'react'
import api from '../../api'

export default function List() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)

    api
      .get('/api/blood-requests')
      .then((res) => {
        if (mounted) setItems(res?.data?.data || [])
      })
      .catch((err) => {
        if (mounted)
          setError(
            err?.response?.data?.message ||
              err?.message ||
              'Failed to load requests'
          )
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const resolveLocation = async (id) => {
    try {
      setResolvingIds((prev) => Array.from(new Set([...prev, id])))
      const resp = await api.get(`/api/blood-requests/${id}/reverse`)
      if (resp?.data?.data) {
        const updated = resp.data.data
        setItems((prev) =>
          prev.map((it) => (it._id === updated._id ? updated : it))
        )
      }
    } catch (e) {
      console.error(e)
      setError('Failed to resolve location')
    } finally {
      setResolvingIds((prev) => prev.filter((x) => x !== id))
    }
  }

  const [resolvingIds, setResolvingIds] = useState([])

  const [showPendingOnly, setShowPendingOnly] = useState(false)

  const handleLogout = () => {
    try {
      // remove any stored tokens from both storage mechanisms
      localStorage.removeItem('token')
      localStorage.removeItem('admin_token')
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('admin_token')
    } catch (e) {}
    // navigate to login page
    window.location.href = '/login'
  }

  const displayNameFor = (it) =>
    it.postedBy?.name ||
    it.postedBy?.fullName ||
    it.user?.name ||
    it.user?.fullName ||
    it.name ||
    '—'

  const getStatus = (it) => {
    if (!it?.createdAt) return { text: 'OPEN', cls: 'bg-gray-100 text-gray-800' }
    const createdAt = new Date(it.createdAt)
    const now = new Date()
    const hours = (now - createdAt) / (1000 * 60 * 60)
    if (hours < 24) return { text: 'URGENT', cls: 'bg-red-100 text-red-800' }
    if (hours < 72) return { text: 'PENDING', cls: 'bg-yellow-100 text-yellow-800' }
    return { text: 'OPEN', cls: 'bg-gray-100 text-gray-800' }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Page Title + actions */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-800">🩸 Blood Requests</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleLogout}
            className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-12 text-center text-gray-600">
          Loading requests...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded bg-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !items.length && (
        <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow">
          No blood requests found.
        </div>
      )}

      {/* Table */}
      {!loading && items.length > 0 && (
        <div className="overflow-hidden rounded-xl bg-white shadow pl-6">
          {/* Header */}
          <div className="sticky top-0 z-10 grid grid-cols-12 gap-0 px-2 py-2 text-sm font-semibold text-white uppercase tracking-wide" style={{ background: 'linear-gradient(90deg,#ef4444,#7c3aed)', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div className="col-span-1 text-center">S.No</div>
            <div className="col-span-2 text-center">Date</div>
            <div className="col-span-2 text-center pr-0">Patient Name</div>
            <div className="col-span-1 text-center pr-4">Blood Groups</div>
            <div className="col-span-2 text-center">Hospital</div>
            <div className="col-span-1 pl-8">Contact</div>
            <div className="col-span-2 text-center">Location</div>
            <div className="col-span-1 text-center">Action</div>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {(() => {
              const visibleItems = showPendingOnly
                ? items.filter((it) => getStatus(it).text === 'PENDING')
                : items
              return visibleItems.map((it, idx) => (
              <div
                key={it._id}
                  className="grid grid-cols-12 gap-0 px-2 py-2 items-center hover:bg-gray-50 transition"
              >
                <div className="col-span-1 text-sm text-gray-600 text-center">
                  {idx + 1}
                </div>

                <div className="col-span-2 text-xs text-gray-500 text-center">
                  {it.createdAt
                    ? new Date(it.createdAt).toLocaleString()
                    : '—'}
                </div>

                <div className="col-span-2 text-center pr-0">
                  <div className="font-medium text-gray-800 truncate inline-block" title={displayNameFor(it)}>{displayNameFor(it)}</div>
                </div>

                <div className="col-span-1 flex flex-col items-center justify-center space-y-1 pr-4">
                  {(() => {
                    const raw = it.bloodGroup || ''
                    const parts = String(raw)
                      .split(/[,;|]/)
                      .map((p) => p.trim())
                      .filter(Boolean)
                    if (!parts.length) return <span className="text-xs text-gray-500">-</span>
                    return parts.map((g, i) => (
                      <span key={i} className="rounded-full bg-red-100 px-1 py-0.5 text-xs font-semibold text-red-700">{g}</span>
                    ))
                  })()}
                </div>

                <div className="col-span-2 text-center">
                  <div className="text-xs text-gray-500 truncate inline-block" title={it.hospital || it.postedBy?.hospital || ''}>{it.hospital || it.postedBy?.hospital || it.postedBy?.hospitalName || '—'}</div>
                </div>

                <div className="col-span-1 text-sm text-gray-700 pl-8">
                  {it.contact || '—'}
                </div>

                <div
                  className={`col-span-2 text-xs text-gray-600 text-center break-words whitespace-normal ${String(
                    it.location || ''
                  ).toLowerCase().startsWith('coordinates:') ? 'cursor-pointer text-blue-600 hover:underline' : ''}`}
                  title={it.location || ''}
                  onClick={() =>
                    String(it.location || '').toLowerCase().startsWith('coordinates:') && !resolvingIds.includes(it._id)
                      ? resolveLocation(it._id)
                      : null
                  }
                >
                  {resolvingIds.includes(it._id)
                    ? 'Resolving address...'
                    : it.location || 'Not provided'}
                </div>

                

                <div className="col-span-1 flex justify-center">
                  {String(it.location || '')
                    .toLowerCase()
                    .startsWith('coordinates:') ? (
                    <button
                      onClick={() => resolveLocation(it._id)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        try {
                          navigator.clipboard.writeText(JSON.stringify(it))
                          alert('Copied')
                        } catch {}
                      }}
                      className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>
            ))
          })()}
          </div>
        </div>
      )}
    </div>
  )
}
