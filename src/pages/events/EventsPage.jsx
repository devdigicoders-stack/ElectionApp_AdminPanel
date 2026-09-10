import { useState, useEffect, useCallback } from 'react'
import { Calendar, MapPin, Users, Star, Plus, X } from 'lucide-react'
import { EventsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const EMPTY = { title: '', description: '', date: '', time: '', venue: '', areaId: '', registrationRequired: false }

export default function EventsPage() {
  const { show, Toast } = useToast()
  const [items, setItems] = useState([])
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
      if (filter === 'upcoming') params.upcoming = 'true'
      const res = await EventsAPI.getAll(params)
      const data = res?.data ?? res
      setItems(Array.isArray(data?.events ?? data) ? (data?.events ?? data) : [])
      setTotal(data?.total ?? 0)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, filter])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim()) { show('Title required', 'error'); return }
    setSaving(true)
    try {
      if (editId) await EventsAPI.update(editId, form)
      else await EventsAPI.create(form)
      show(editId ? 'Updated!' : 'Created!'); setShowForm(false); setEditId(null); setForm(EMPTY); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete event?')) return
    try { await EventsAPI.remove(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Events</h1>
          <p className="text-xs text-gray-400">{total} events</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />Create
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['all', 'upcoming', 'past'].map(f => (
          <button key={f} onClick={() => { setFilter(f); setPage(1) }}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${filter === f ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{f}</button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId ? 'Edit Event' : 'Create Event'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {[['title', 'Event Name', 'text'], ['description', 'Description', 'textarea'], ['date', 'Date', 'date'], ['time', 'Time', 'time'], ['venue', 'Venue', 'text']].map(([k, label, type]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                  {type === 'textarea'
                    ? <textarea rows={2} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]" />
                    : <input type={type} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />}
                </div>
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Registration Required</span>
                <button onClick={() => setForm({ ...form, registrationRequired: !form.registrationRequired })}
                  className="relative w-10 h-5 rounded-full transition-all" style={{ background: form.registrationRequired ? 'var(--primary)' : '#d1d5db' }}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.registrationRequired ? 'left-5' : 'left-0.5'}`} />
                </button>
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
            {items.map(e => (
              <div key={e._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="h-20 relative flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))` }}>
                  {e.bannerUrl && <img src={e.bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
                  <Calendar className="w-8 h-8 text-white relative" />
                  <span className={`absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ${e.isPublished ? 'bg-green-400 text-white' : 'bg-white/80 text-gray-600'}`}>
                    {e.isPublished ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-sm font-bold text-gray-800">{e.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 shrink-0" /> {e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—'}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {e.venue || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <span className="flex items-center gap-2 text-[10px] text-gray-400">
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {e.goingCount || 0} going</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-500" /> {e.interestedCount || 0} interested</span>
                    </span>
                    <div className="flex gap-2">
                      <button onClick={() => { setForm({ title: e.title, description: e.description || '', date: e.date?.slice(0, 10) || '', time: e.time || '', venue: e.venue || '', areaId: e.area?._id || '', registrationRequired: e.registrationRequired || false }); setEditId(e._id); setShowForm(true) }}
                        className="text-xs font-bold text-blue-500">Edit</button>
                      <button onClick={() => handleDelete(e._id)} className="text-xs font-bold text-red-400">Del</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <Calendar className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No events found</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

