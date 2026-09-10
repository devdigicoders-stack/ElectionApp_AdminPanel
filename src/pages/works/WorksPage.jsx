import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { WorksAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const EMPTY = { title: '', description: '', category: '', status: 'upcoming', areaId: '' }
const statusConfig = {
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed', emoji: '✅' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', emoji: '🔵' },
  upcoming: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Upcoming', emoji: '⏳' },
}

export default function WorksPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit }
      if (filter !== 'all') params.status = filter
      const [res, st] = await Promise.all([
        WorksAPI.getAll(params),
        WorksAPI.getStats().catch(() => null),
      ])
      const data = res?.data ?? res
      setItems(Array.isArray(data?.works ?? data) ? (data?.works ?? data) : [])
      setTotal(data?.total ?? 0)
      setStats(st?.data ?? st)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim()) { show('Title required', 'error'); return }
    setSaving(true)
    try {
      if (editId) await WorksAPI.update(editId, form)
      else await WorksAPI.create(form)
      show(editId ? 'Updated!' : 'Created!'); setShowForm(false); setEditId(null); setForm(EMPTY); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this work?')) return
    try { await WorksAPI.remove(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Development Works</h1>
          <p className="text-xs text-gray-400">{total} works</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Work
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[['Completed', stats?.completed, 'text-green-600'], ['In Progress', stats?.inProgress || stats?.in_progress, 'text-blue-600'], ['Upcoming', stats?.upcoming, 'text-yellow-600']].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
              <p className={`text-lg font-black ${c}`}>{v ?? 0}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['all', 'upcoming', 'in_progress', 'completed'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${filter === f ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{f.replace('_', ' ')}</button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId ? 'Edit Work' : 'Add Work'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {[['title', 'Title'], ['description', 'Description'], ['category', 'Category']].map(([k, label]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                  {k === 'description'
                    ? <textarea rows={2} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]" />
                    : <input value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />}
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  <option value="upcoming">Upcoming</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <>
          <div className="space-y-3">
            {items.map(w => {
              const sc = statusConfig[w.status?.toLowerCase()] || statusConfig.upcoming
              return (
                <div key={w._id} onClick={() => navigate(`/works/${w._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-xl"
                    style={{ background: 'var(--primary-light)' }}>🏗️</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{w.title}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{w.category || '—'} · {w.area?.name || '—'}</p>
                    <span className={`text-[9px] font-bold ${sc.text}`}>{sc.emoji} {sc.label}</span>
                  </div>
                  <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={e => { e.stopPropagation(); setForm({ title: w.title, description: w.description || '', category: w.category || '', status: w.status || 'upcoming', areaId: w.area?._id || '' }); setEditId(w._id); setShowForm(true) }}
                      className="text-xs font-bold text-blue-500">Edit</button>
                    <button onClick={e => handleDelete(w._id, e)} className="text-xs font-bold text-red-400">Del</button>
                  </div>
                </div>
              )
            })}
          </div>
          {items.length === 0 && <div className="bg-white rounded-2xl p-10 text-center border border-gray-100"><p className="text-2xl mb-2">🏗️</p><p className="text-sm text-gray-400">No works found</p></div>}
          {total > limit && (
            <div className="flex items-center justify-between">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs font-bold disabled:opacity-30" style={{ color: 'var(--primary)' }}>← Prev</button>
              <span className="text-xs text-gray-400">Page {page}</span>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="text-xs font-bold disabled:opacity-30" style={{ color: 'var(--primary)' }}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
