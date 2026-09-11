import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tag, Users, Download, ChevronRight, ChevronLeft } from 'lucide-react'
import { CitizensAPI, UsersAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const catColor = {
  member: 'bg-green-100 text-green-700',
  volunteer: 'bg-purple-100 text-purple-700',
  citizen: 'bg-blue-100 text-blue-700',
  supporter: 'bg-yellow-100 text-yellow-700',
}
const statusDot = { active: 'bg-green-500', blocked: 'bg-red-400', inactive: 'bg-gray-400' }

export default function UsersPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [areaStats, setAreaStats] = useState([])
  const [availTags, setAvailTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showBulkTag, setShowBulkTag] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [bulkTag, setBulkTag] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit }
      if (search) params.search = search
      if (filter !== 'All') params.category = filter.toLowerCase()
      const [res, an, tags, area] = await Promise.all([
        CitizensAPI.getAll(params),
        CitizensAPI.getAnalytics().catch(() => null),
        CitizensAPI.getAvailableTags().catch(() => null),
        UsersAPI.getAreaCount().catch(() => null),
      ])
      const raw = res?.data ?? res ?? {}
      const citizensList = Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw?.citizens)
        ? raw.citizens
        : Array.isArray(raw)
        ? raw
        : []

      const totalCount = raw?.pagination?.total ?? raw?.total ?? citizensList.length
      setUsers(citizensList)
      setTotal(totalCount)

      const anData = an?.data ?? an ?? {}
      const overview = anData?.overview ?? {}
      const cats = anData?.categories ?? {}

      setStats({
        totalCitizens: overview?.totalCitizens ?? totalCount,
        totalMembers: cats?.member ?? 0,
        totalVolunteers: cats?.volunteer ?? 0,
        activeUsers: overview?.active ?? totalCount,
      })

      setAvailTags(tags?.data?.tags ?? tags?.tags ?? [])
      setAreaStats(area?.data ?? area ?? [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, search, filter])

  useEffect(() => { load() }, [load])

  const handleExport = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem('admin_token')
      const tenantSlug = import.meta.env.VITE_TENANT_SLUG || ''
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (filter !== 'All') params.append('category', filter.toLowerCase())

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
      const res = await fetch(`${baseUrl}/citizens/export?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-slug': tenantSlug,
        },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Export failed')
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `citizens_${tenantSlug || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      show('Citizens CSV exported successfully!')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleBulkTag = async () => {
    if (!bulkTag.trim() || !selectedIds.length) { show('Select users & enter tag', 'error'); return }
    setBulkSaving(true)
    try {
      await CitizensAPI.bulkAddTags(selectedIds, [bulkTag.trim()])
      show(`Tag "${bulkTag}" added to ${selectedIds.length} users!`)
      setShowBulkTag(false); setSelectedIds([]); setBulkTag(''); load()
    } catch (e) { show(e.message, 'error') }
    finally { setBulkSaving(false) }
  }

  const handleBulkUntag = async () => {
    if (!bulkTag.trim()) { show('Enter a tag to remove', 'error'); return }
    setBulkSaving(true)
    try {
      await CitizensAPI.bulkRemoveTag(selectedIds, bulkTag.trim())
      show('Tags removed!')
      setShowBulkTag(false); setSelectedIds([]); setBulkTag(''); load()
    } catch (e) { show(e.message, 'error') }
    finally { setBulkSaving(false) }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="space-y-4">
      <Toast />

      {/* Bulk Tag Modal */}
      {showBulkTag && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-3">
            <h2 className="text-base font-bold">Bulk Tag — {selectedIds.length} users selected</h2>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Tag Name</label>
              <input value={bulkTag} onChange={e => setBulkTag(e.target.value)} list="tag-suggestions"
                placeholder="Enter tag..." className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              {availTags.length > 0 && (
                <datalist id="tag-suggestions">
                  {availTags.map(t => <option key={t} value={t} />)}
                </datalist>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={handleBulkTag} disabled={bulkSaving} className="btn-primary flex-1 h-10 text-sm disabled:opacity-70">Add Tag</button>
              <button onClick={handleBulkUntag} disabled={bulkSaving} className="flex-1 h-10 border border-red-200 text-red-500 text-sm font-bold rounded-2xl">Remove Tag</button>
              <button onClick={() => { setShowBulkTag(false); setSelectedIds([]) }} className="h-10 px-4 border border-gray-200 text-gray-500 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Citizens / Users</h1>
          <p className="text-xs text-gray-400">{total.toLocaleString()} registered</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={() => setShowBulkTag(true)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border"
              style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <Tag className="w-3.5 h-3.5" /> Tag ({selectedIds.length})
            </button>
          )}
          <button onClick={handleExport} disabled={exporting}
            className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs disabled:opacity-60">
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            ['All', stats?.totalCitizens ?? total, 'text-gray-800'],
            ['Members', stats?.totalMembers ?? 0, 'text-green-600'],
            ['Volunteers', stats?.totalVolunteers ?? 0, 'text-purple-600'],
            ['Active', stats?.activeUsers ?? 0, 'text-blue-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
              <p className={`text-base font-black ${c}`}>{typeof v === 'number' ? v.toLocaleString() : v}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, mobile, voter ID..."
          className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 h-11 text-sm outline-none focus:border-[var(--primary)] shadow-sm" />
        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['All', 'Member', 'Volunteer', 'Citizen', 'Supporter'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${filter === f ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{f}</button>
        ))}
      </div>

      {/* User list */}
      {loading ? <Skeleton rows={6} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u._id}
                onClick={() => navigate(`/users/${u._id}`)}
                className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-sm flex items-center gap-3 cursor-pointer hover:border-gray-200 transition-all">

                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-black text-sm text-gray-600">
                    {(u.name || 'U')[0]?.toUpperCase()}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${statusDot[u.status] || 'bg-gray-400'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">{u.name || 'Unnamed'}</p>
                    {u.category && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${catColor[u.category] || 'bg-gray-100 text-gray-600'}`}>
                        {u.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {u.mobile || '—'} · {u.areaId?.name || u.area?.name || 'No area'}
                    {u.voterId ? ` · VID: ${u.voterId}` : ''}
                  </p>
                  {u.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {u.tags.slice(0, 3).map(t => (
                        <span key={t} className="text-[8px] bg-gray-100 text-gray-500 font-semibold px-1.5 py-0.5 rounded-md">#{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <Users className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm font-semibold text-gray-400">No users found</p>
            </div>
          )}

          {total > limit && (
            <div className="flex items-center justify-between pt-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="text-xs font-bold disabled:opacity-30 flex items-center gap-1" style={{ color: 'var(--primary)' }}><ChevronLeft className="w-4 h-4" /> Prev</button>
              <span className="text-xs text-gray-400">Page {page} of {Math.ceil(total / limit)}</span>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}
                className="text-xs font-bold disabled:opacity-30 flex items-center gap-1" style={{ color: 'var(--primary)' }}>Next <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
