import { useState, useEffect, useCallback } from 'react'
import { Image, Film, Play, Plus, X } from 'lucide-react'
import { GalleryAPI, UploadAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function GalleryPage() {
  const { show, Toast } = useToast()
  const [tab, setTab] = useState('photos')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', category: '', youtubeUrl: '', description: '' })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await GalleryAPI.getAll({ type: tab === 'photos' ? 'photo' : 'video', limit: 50 })
      const data = res?.data ?? res
      setItems(Array.isArray(data?.gallery ?? data?.items ?? data) ? (data?.gallery ?? data?.items ?? data) : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    try {
      let imageUrls = []
      if (files.length > 0) {
        const up = await UploadAPI.uploadFiles('gallery', files)
        imageUrls = up?.urls || []
      }
      await GalleryAPI.create({ ...form, type: tab === 'photos' ? 'photo' : 'video', images: imageUrls })
      show('Added!'); setShowForm(false); setFiles([]); setForm({ title: '', category: '', youtubeUrl: '', description: '' }); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete?')) return
    try { await GalleryAPI.remove(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Gallery</h1>
          <p className="text-xs text-gray-400">{items.length} items</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />
          {tab === 'photos' ? 'Add Photos' : 'Add Video'}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {['photos', 'videos'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-bold rounded-xl capitalize transition-all ${tab === t ? 'text-white shadow-sm' : 'text-gray-500'}`}
            style={tab === t ? { background: 'var(--primary)' } : {}}>{t}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{tab === 'photos' ? 'Add Photos' : 'Add Video'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>
              {tab === 'videos' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">YouTube URL</label>
                  <input value={form.youtubeUrl} onChange={e => setForm({ ...form, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/..." className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
              )}
              {tab === 'photos' && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Upload Photos</label>
                  <input type="file" multiple accept="image/*" onChange={e => setFiles(Array.from(e.target.files))}
                    className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-2.5" />
                  {files.length > 0 && <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--primary)' }}>{files.length} file(s) selected</p>}
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
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
        <>
          {tab === 'photos' ? (
            <div className="grid grid-cols-2 gap-3">
              {items.map(item => (
                <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="h-28 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                    {item.images?.[0]
                      ? <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: 'var(--primary-light)' }}><Image className="w-8 h-8 text-[var(--primary)] opacity-40" /></div>}
                    <button onClick={() => handleDelete(item._id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-gray-800 truncate">{item.title || '—'}</p>
                    <p className="text-[9px] text-gray-400">{item.category || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => (
                <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
                  <div className="w-14 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-red-600 fill-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{item.title || '—'}</p>
                    <p className="text-[10px] text-gray-400">{item.category || '—'}</p>
                  </div>
                  <button onClick={() => handleDelete(item._id)} className="text-xs font-bold text-red-400 shrink-0">Del</button>
                </div>
              ))}
            </div>
          )}
          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              {tab === 'photos' ? <Image className="w-10 h-10 text-gray-300 mb-2" /> : <Film className="w-10 h-10 text-gray-300 mb-2" />}
              <p className="text-sm text-gray-400">No {tab} found</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

