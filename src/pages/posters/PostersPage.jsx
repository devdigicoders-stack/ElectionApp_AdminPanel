import { useState, useEffect, useCallback } from 'react'
import { Palette, Plus, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PosterAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY = { name: '', category: 'Birthday', description: '', fields: [], isActive: true }
const DEFAULT_CATS = ['Birthday', 'Political Campaign', 'Festival', 'National Day', 'Congratulations', 'Event Promotion', 'General']

const FIELD_CONFIG = [
  { key: 'photo', label: 'Photo Zone', editable: true },
  { key: 'name', label: 'Name', editable: true },
  { key: 'designation', label: 'Designation', editable: true },
  { key: 'text', label: 'Custom Text', editable: true },
  { key: 'logo', label: 'Logo', editable: false },
  { key: 'background', label: 'Background', editable: false },
]

export default function PostersPage() {
  const { show, Toast } = useToast()
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selCat, setSelCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${BASE_URL}${url}`
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [res, catRes] = await Promise.all([
        PosterAPI.getAdminTemplates(selCat !== 'All' ? { category: selCat } : {}),
        PosterAPI.getCategories(),
      ])
      const data = res?.data ?? res
      const catData = catRes?.data ?? catRes
      setTemplates(Array.isArray(data?.templates ?? data) ? (data?.templates ?? data) : [])
      const fetchedCats = Array.isArray(catData?.categories ?? catData) ? (catData?.categories ?? catData) : []
      if (fetchedCats.length > 0) {
        setCats(Array.from(new Set([...fetchedCats, ...DEFAULT_CATS])))
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [selCat])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    const templateTitle = (form.name || form.title || '').trim()
    if (!templateTitle) { show('Template name required', 'error'); return }
    setSaving(true)
    try {
      let imageUrl = form.imageUrl || form.templateImageUrl || ''
      if (files.length > 0) {
        const up = await UploadAPI.uploadFiles('posters', files)
        imageUrl = up?.urls?.[0] || ''
      }
      const payload = {
        ...form,
        title: templateTitle,
        name: templateTitle,
        templateImageUrl: imageUrl,
        imageUrl,
      }
      if (editId) await PosterAPI.updateTemplate(editId, payload)
      else await PosterAPI.createTemplate(payload)
      show(editId ? 'Updated!' : 'Template created!')
      setShowForm(false); setEditId(null); setForm(EMPTY); setFiles([]); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Poster Template?',
      text: 'Are you sure you want to delete this poster template?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await PosterAPI.removeTemplate(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  const openEdit = async (id) => {
    try {
      const res = await PosterAPI.getOneTemplate(id)
      const data = res?.data ?? res
      setForm({
        name: data.title || data.name || '',
        category: data.category || 'Birthday',
        description: data.description || '',
        fields: Array.isArray(data.fields) ? data.fields.map(f => typeof f === 'string' ? f : f.key) : [],
        isActive: data.isActive ?? true,
        imageUrl: data.templateImageUrl || data.imageUrl || '',
      })
      setEditId(id); setShowForm(true)
    } catch (e) { show(e.message, 'error') }
  }

  const handleToggle = async (id, current) => {
    try { await PosterAPI.updateTemplate(id, { isActive: !current }); show('Updated!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Poster Templates</h1>
          <p className="text-xs text-gray-400">{templates.length} templates</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />
          Upload Template
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['All', ...cats].map(c => (
          <button key={c} onClick={() => setSelCat(c)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${selCat === c ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={selCat === c ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{c}</button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId ? 'Edit Template' : 'Upload Template'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Template Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Birthday Wish Template"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  {cats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Template Image</label>
                <input type="file" accept="image/*" onChange={e => setFiles(Array.from(e.target.files))}
                  className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-2.5" />
                {files[0] && <p className="text-xs mt-1 text-green-600 font-semibold">{files[0].name}</p>}
                {(form.imageUrl || form.templateImageUrl) && !files[0] && <p className="text-xs mt-1 text-gray-400">Current image uploaded</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Editable Zones</label>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_CONFIG.map(f => {
                    const active = (form.fields || []).includes(f.key)
                    return (
                      <button key={f.key} type="button"
                        onClick={() => {
                          const cur = form.fields || []
                          setForm({ ...form, fields: active ? cur.filter(k => k !== f.key) : [...cur, f.key] })
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${active ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                        style={active ? { background: 'var(--primary)' } : {}}>
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]" />
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Active</span>
                <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="relative w-10 h-5 rounded-full transition-all" style={{ background: form.isActive ? 'var(--primary)' : '#d1d5db' }}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving ? 'Saving...' : 'Save Template'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={4} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <div className="grid grid-cols-2 gap-3">
          {templates.map(t => {
            const displayTitle = t.title || t.name || 'Untitled Template'
            const displayImg = resolveUrl(t.templateImageUrl || t.imageUrl)
            return (
              <div key={t._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between">
                {/* Clickable Image Area */}
                <div
                  className="h-36 relative flex items-center justify-center bg-gray-900 overflow-hidden cursor-pointer group"
                  onClick={() => navigate(`/posters/${t._id}`)}
                >
                  {displayImg ? (
                    <img src={displayImg} alt={displayTitle} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Palette className="w-10 h-10 text-[var(--primary)] opacity-40" />
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[11px] font-bold bg-black/60 px-3 py-1.5 rounded-full transition-opacity duration-200">
                      View Details
                    </span>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/90 text-gray-800 shadow-xs">{t.category}</span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs ${t.isActive ? 'bg-emerald-500 text-white' : 'bg-gray-400 text-white'}`}>
                      {t.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  <p
                    className="text-xs font-bold text-gray-800 line-clamp-1 cursor-pointer hover:underline"
                    title={displayTitle}
                    onClick={() => navigate(`/posters/${t._id}`)}
                  >
                    {displayTitle}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(t._id)} className="flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-colors" style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>Edit</button>
                    <button onClick={() => handleToggle(t._id, t.isActive)}
                      className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-colors ${t.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                      {t.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(t._id)} className="flex-1 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 py-1.5 rounded-lg cursor-pointer transition-colors">Del</button>
                  </div>
                </div>
              </div>
            )
          })}
          {templates.length === 0 && (
            <div className="col-span-2 bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <Palette className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No templates found. Upload one!</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
