import { useState, useEffect, useCallback } from 'react'
import { HardHat, HeartPulse, GraduationCap, Sprout, Users, Zap, FileText, Plus, X } from 'lucide-react'
import { ManifestoAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const CATS = ['Infrastructure', 'Healthcare', 'Education', 'Agriculture', 'Women Empowerment', 'Youth']
const EMPTY = { title: '', description: '', category: 'Infrastructure', isPublished: true }

const catIcons = {
  Infrastructure: HardHat,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  Agriculture: Sprout,
  'Women Empowerment': Users,
  Youth: Zap
}

export default function ManifestoPage() {
  const { show, Toast } = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selCat, setSelCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = selCat !== 'All' ? { category: selCat, limit: 50 } : { limit: 50 }
      const res = await ManifestoAPI.getAll(params)
      const data = res?.data ?? res
      setItems(Array.isArray(data?.items ?? data?.manifesto ?? data) ? (data?.items ?? data?.manifesto ?? data) : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [selCat])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim()) { show('Title required', 'error'); return }
    setSaving(true)
    try {
      if (editId) await ManifestoAPI.update(editId, form)
      else await ManifestoAPI.create(form)
      show(editId ? 'Updated!' : 'Added!'); setShowForm(false); setEditId(null); setForm(EMPTY); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Manifesto Point?',
      text: 'Are you sure you want to delete this manifesto point?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await ManifestoAPI.remove(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-12">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Manifesto</h1>
          <p className="text-xs text-gray-400">Party promises & vision</p>
        </div>
        <button onClick={() => { setForm({ ...EMPTY, category: selCat === 'All' ? 'Infrastructure' : selCat }); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />Add Point
        </button>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['All', ...CATS].map(c => (
          <button key={c} onClick={() => setSelCat(c)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${selCat === c ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={selCat === c ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{c}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId ? 'Edit Point' : 'Add Point'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  {CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Published</span>
                <button onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                  className="relative w-10 h-5 rounded-full transition-all" style={{ background: form.isPublished ? 'var(--primary)' : '#d1d5db' }}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isPublished ? 'left-5' : 'left-0.5'}`} />
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

      {loading ? <Skeleton rows={4} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <div className="space-y-2.5">
          {items.map(item => {
            const IconComponent = catIcons[item.category] || FileText
            return (
              <div key={item._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: 'var(--primary-light)' }}>
                  <IconComponent className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold mb-0.5" style={{ color: 'var(--primary)' }}>{item.category || '—'}</p>
                  <p className="text-sm font-bold text-gray-800">{item.title}</p>
                  {item.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${item.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.isPublished ? 'Published' : 'Draft'}
                  </span>
                  <button onClick={() => { setForm({ title: item.title, description: item.description || '', category: item.category || 'Infrastructure', isPublished: item.isPublished }); setEditId(item._id); setShowForm(true) }}
                    className="text-xs font-bold text-blue-500">Edit</button>
                  <button onClick={() => handleDelete(item._id)} className="text-xs font-bold text-red-400">Del</button>
                </div>
              </div>
            )
          })}
          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <FileText className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No manifesto points</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

