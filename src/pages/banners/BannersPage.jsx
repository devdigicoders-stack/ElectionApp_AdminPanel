import { useState, useEffect, useCallback } from 'react'
import { Flag, Plus, X } from 'lucide-react'
import { BannersAPI, UploadAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY = { title:'', subtitle:'', type:'homepage', link:'', isActive:true }
const TYPES  = ['homepage','campaign','popup','notification']

export default function BannersPage() {
  const { show, Toast } = useToast()
  const [banners,  setBanners]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState(EMPTY)
  const [files,    setFiles]    = useState([])
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [activeTab, setActiveTab] = useState('all')

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res  = activeTab === 'active' ? await BannersAPI.getActive() : await BannersAPI.getAll({ type: activeTab === 'all' ? undefined : activeTab })
      const data = res?.data ?? res
      setBanners(Array.isArray(data?.banners ?? data) ? (data?.banners ?? data) : [])
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }, [activeTab])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.title.trim()) { show('Title required','error'); return }
    setSaving(true)
    try {
      let imageUrl = form.imageUrl || ''
      if (files.length > 0) {
        const up = await UploadAPI.uploadFiles('banners', files)
        imageUrl = up?.urls?.[0] || ''
      }
      const payload = { ...form, imageUrl }
      if (editId) await BannersAPI.update(editId, payload)
      else        await BannersAPI.create(payload)
      show(editId?'Updated!':'Created!'); setShowForm(false); setEditId(null); setForm(EMPTY); setFiles([]); load()
    } catch(e) { show(e.message,'error') }
    finally { setSaving(false) }
  }

  const handleToggle = async (id, current) => {
    try { await BannersAPI.toggleActive(id, !current); show('Status updated!'); load() } catch(e) { show(e.message,'error') }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Banner?',
      text: 'Are you sure you want to delete this banner?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await BannersAPI.remove(id); show('Deleted!'); load() } catch(e) { show(e.message,'error') }
  }

  const typeColors = {
    homepage: 'bg-blue-100 text-blue-700', campaign: 'bg-purple-100 text-purple-700',
    popup: 'bg-orange-100 text-orange-700', notification: 'bg-green-100 text-green-700',
  }

  return (
    <div className="space-y-4">
      <Toast/>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Banner Management</h1>
          <p className="text-xs text-gray-400">{banners.length} banners</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />
          Add Banner
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['all','active','homepage','campaign','popup'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${activeTab===t?'text-white border-transparent':'bg-white text-gray-500 border-gray-200'}`}
            style={activeTab===t?{background:'var(--primary)',borderColor:'var(--primary)'}:{}}>
            {t}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId?'Edit Banner':'Add Banner'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              {[['title','Title'],['subtitle','Subtitle'],['link','Link URL']].map(([k,label]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
                  <input value={form[k]||''} onChange={e=>setForm({...form,[k]:e.target.value})}
                    className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"/>
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Type</label>
                <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  {TYPES.map(t => <option key={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Banner Image</label>
                <input type="file" accept="image/*" onChange={e=>setFiles(Array.from(e.target.files))}
                  className="w-full text-sm border border-gray-200 rounded-2xl px-4 py-2.5"/>
                {files.length > 0 && <p className="text-xs mt-1 font-semibold" style={{color:'var(--primary)'}}>{files[0].name}</p>}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Active</span>
                <button onClick={()=>setForm({...form,isActive:!form.isActive})}
                  className="relative w-10 h-5 rounded-full transition-all" style={{background:form.isActive?'var(--primary)':'#d1d5db'}}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive?'left-5':'left-0.5'}`}/>
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving?'Saving...':'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={4}/> : error ? <ApiError message={error} onRetry={load}/> : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {b.imageUrl && (
                <div className="h-28 bg-gray-100 overflow-hidden">
                  <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover"/>
                </div>
              )}
              {!b.imageUrl && (
                <div className="h-20 flex items-center justify-center" style={{background:'var(--primary-light)'}}>
                  <Flag className="w-8 h-8 text-[var(--primary)] opacity-40" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${typeColors[b.type]||'bg-gray-100 text-gray-600'}`}>{b.type}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${b.isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{b.isActive?'Active':'Inactive'}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800 truncate">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-gray-500 truncate">{b.subtitle}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggle(b._id, b.isActive)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg ${b.isActive?'bg-yellow-50 text-yellow-600':'bg-green-50 text-green-600'}`}>
                      {b.isActive?'Disable':'Enable'}
                    </button>
                    <button onClick={() => { setForm({title:b.title,subtitle:b.subtitle||'',type:b.type,link:b.link||'',isActive:b.isActive,imageUrl:b.imageUrl}); setEditId(b._id); setShowForm(true) }}
                      className="text-[10px] font-bold text-blue-500">Edit</button>
                    <button onClick={() => handleDelete(b._id)} className="text-[10px] font-bold text-red-400">Del</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <Flag className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No banners found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
