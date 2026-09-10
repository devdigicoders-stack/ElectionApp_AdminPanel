import { useState, useEffect, useCallback } from 'react'
import { Newspaper, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { NewsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const EMPTY = { title:'', content:'', category:'Announcement', status:'draft', summary:'' }
const CATEGORIES = ['Announcement','Article','Press Release','Blog','Event','Achievement']

const statusColor = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-gray-100 text-gray-500',
  archived:  'bg-red-100 text-red-500',
  scheduled: 'bg-blue-100 text-blue-600',
}

export default function NewsPage() {
  const { show, Toast } = useToast()
  const [tab,      setTab]      = useState('all')
  const [items,    setItems]    = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [page,     setPage]     = useState(1)
  const [total,    setTotal]    = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState(null)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit }
      if (tab !== 'all') params.status = tab
      const [res, st] = await Promise.all([
        NewsAPI.getAllAdmin(params),
        NewsAPI.getStats(),
      ])
      const data = res?.data ?? res
      setItems(Array.isArray(data?.news ?? data?.articles ?? data) ? (data?.news ?? data?.articles ?? data) : [])
      setTotal(data?.total ?? 0)
      setStats(st?.data ?? st)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [tab, page])

  useEffect(() => { load() }, [load])

  const openEdit = (item) => {
    setForm({ title: item.title, content: item.content||'', category: item.category||'Announcement', status: item.status||'draft', summary: item.summary||'' })
    setEditId(item._id); setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { show('Title required','error'); return }
    setSaving(true)
    try {
      if (editId) await NewsAPI.update(editId, form)
      else        await NewsAPI.create(form)
      show(editId?'Updated!':'Created!'); setShowForm(false); setEditId(null); setForm(EMPTY); load()
    } catch(e) { show(e.message,'error') }
    finally { setSaving(false) }
  }

  const handleStatusChange = async (id, status) => {
    try { await NewsAPI.updateStatus(id, status); show('Status updated!'); load() } catch(e) { show(e.message,'error') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this article?')) return
    try { await NewsAPI.remove(id); show('Deleted!'); load() } catch(e) { show(e.message,'error') }
  }

  return (
    <div className="space-y-4">
      <Toast/>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Blog / News</h1>
          <p className="text-xs text-gray-400">{total} articles</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />
          Create
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[['Total',stats?.total,'text-gray-800'],['Published',stats?.published,'text-green-600'],['Draft',stats?.draft,'text-gray-500'],['Archived',stats?.archived,'text-red-500']].map(([l,v,c]) => (
          <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
            <p className={`text-base font-black ${c}`}>{v??0}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Tab filters */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['all','draft','published','archived'].map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1) }}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${tab===t?'text-white border-transparent':'bg-white text-gray-500 border-gray-200'}`}
            style={tab===t?{background:'var(--primary)',borderColor:'var(--primary)'}:{}}>
            {t}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId?'Edit Article':'Create Article'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Title</label>
                <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Summary</label>
                <textarea rows={2} value={form.summary} onChange={e=>setForm({...form,summary:e.target.value})} className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]"/>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Content</label>
                <textarea rows={5} value={form.content} onChange={e=>setForm({...form,content:e.target.value})} className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Category</label>
                  <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                  <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving?'Saving...':'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5}/> : error ? <ApiError message={error} onRetry={load}/> : (
        <>
          <div className="space-y-2.5">
            {items.map(item => (
              <div key={item._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{background:'var(--primary-light)'}}><Newspaper className="w-5 h-5 text-[var(--primary)]" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">{item.category||'—'}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${statusColor[item.status]||'bg-gray-100 text-gray-500'}`}>{item.status}</span>
                        </div>
                        <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'draft' && (
                      <button onClick={() => handleStatusChange(item._id,'published')} className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Publish</button>
                    )}
                    {item.status === 'published' && (
                      <button onClick={() => handleStatusChange(item._id,'archived')} className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Archive</button>
                    )}
                    <button onClick={() => openEdit(item)} className="text-[10px] font-bold text-blue-500">Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="text-[10px] font-bold text-red-400">Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {items.length===0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <Newspaper className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No articles found</p>
            </div>
          )}
          {total > limit && (
            <div className="flex items-center justify-between pt-1">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="text-xs font-bold disabled:opacity-30 flex items-center gap-1" style={{color:'var(--primary)'}}><ChevronLeft className="w-4 h-4" /> Prev</button>
              <span className="text-xs text-gray-400">Page {page} of {Math.ceil(total/limit)}</span>
              <button disabled={page>=Math.ceil(total/limit)} onClick={()=>setPage(p=>p+1)} className="text-xs font-bold disabled:opacity-30 flex items-center gap-1" style={{color:'var(--primary)'}}>Next <ChevronRight className="w-4 h-4" /></button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

