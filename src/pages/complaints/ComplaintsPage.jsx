import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ClipboardList, ChevronRight, ChevronLeft, X } from 'lucide-react'
import { ComplaintsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const statusConfig = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Assigned' },
  escalated: { bg: 'bg-red-100', text: 'text-red-600', label: 'Escalated' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Closed' },
}

export default function ComplaintsPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit }
      if (filter !== 'All') params.status = filter.toLowerCase().replace(' ', '_')
      if (search) params.search = search
      const [res, st] = await Promise.all([
        ComplaintsAPI.getAll(params),
        ComplaintsAPI.getStats(),
      ])
      const data = res?.data ?? res
      setItems(Array.isArray(data?.complaints ?? data) ? (data?.complaints ?? data) : [])
      setTotal(data?.total ?? 0)
      setStats(st?.data ?? st)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, filter, search])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <Toast />

      <div>
        <h1 className="text-xl font-black text-gray-900">Complaints</h1>
        <p className="text-xs text-gray-400">Track & resolve citizen complaints</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Total', stats?.total, 'text-gray-800'],
          ['Pending', stats?.pending, 'text-yellow-600'],
          ['Progress', stats?.inProgress ?? stats?.in_progress, 'text-blue-600'],
          ['Resolved', stats?.resolved, 'text-green-600'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
            <p className={`text-lg font-black ${c}`}>{v ?? 0}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 h-11 gap-2 shadow-sm">
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input placeholder="Search ID or title..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400" />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1) }} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['All', 'Pending', 'Assigned', 'In Progress', 'Resolved', 'Escalated', 'Closed'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${filter === f ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>
            {f}
          </button>
        ))}
      </div>

      {loading ? <Skeleton rows={6} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <>
          <div className="space-y-2.5">
            {items.map(c => {
              const sc = statusConfig[c.status?.toLowerCase()] || statusConfig.pending
              return (
                <div key={c._id} onClick={() => navigate(`/complaints/${c._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary-light)' }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black" style={{ color: 'var(--primary)' }}>{c.complaintNumber || '#' + c._id?.slice(-4)}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate mt-0.5">{c.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {c.area?.name || '—'} · {c.category || '—'} · {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                </div>
              )
            })}
          </div>
          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No complaints found</p>
            </div>
          )}
          {total > limit && (
            <div className="flex items-center justify-between">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs font-bold disabled:opacity-30 flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-gray-400">Page {page} of {Math.ceil(total / limit)}</span>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="text-xs font-bold disabled:opacity-30 flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
