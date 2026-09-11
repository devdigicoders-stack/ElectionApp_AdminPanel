import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  ArrowLeft,
  HardHat,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Image,
  Edit
} from 'lucide-react'
import { WorksAPI, AreasAPI } from '../../api/adminApis'
import { Skeleton, ApiError } from '../../hooks/useFetch.jsx'

const statusConfig = {
  completed:   { bg:'bg-green-100',  text:'text-green-700',  label:'Completed',   Icon: CheckCircle2 },
  in_progress: { bg:'bg-blue-100',   text:'text-blue-700',   label:'In Progress', Icon: Clock },
  upcoming:    { bg:'bg-yellow-100', text:'text-yellow-700', label:'Upcoming',    Icon: Hourglass },
}

const SVG_FALLBACK = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Ctext x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-size='44'%3E🏗️%3C/text%3E%3Ctext x='50%25' y='65%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='13' font-weight='700' fill='%2364748b'%3EWork Project Photo%3C/text%3E%3C/svg%3E"

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return SVG_FALLBACK
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function WorkDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [work,    setWork]    = useState(null)
  const [areas,   setAreas]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    areaId: '',
    budget: '',
    location: '',
    description: '',
    status: 'upcoming',
    isPublished: true,
    images: [],
    beforeAfter: { before: [], after: [] },
  })
  const [saving, setSaving] = useState(false)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newBeforeUrl, setNewBeforeUrl] = useState('')
  const [newAfterUrl, setNewAfterUrl] = useState('')

  const flattenAreas = (nodes, result = []) => {
    if (!Array.isArray(nodes)) return result
    for (const node of nodes) {
      result.push({ _id: node._id, name: node.name, levelName: node.levelId?.name || node.levelName || '' })
      if (node.children?.length) flattenAreas(node.children, result)
    }
    return result
  }

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [res, arRes] = await Promise.all([
        WorksAPI.getOne(id),
        AreasAPI.getTree().catch(() => null),
      ])
      const data = res?.data ?? res
      setWork(data)
      const treeData = arRes?.data?.tree ?? arRes?.tree ?? (Array.isArray(arRes?.data) ? arRes.data : [])
      setAreas(flattenAreas(treeData))
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const openEdit = () => {
    setEditForm({
      title: work?.title || '',
      category: work?.category || '',
      areaId: work?.areaId?._id || work?.areaId || work?.area?._id || '',
      budget: work?.budget || '',
      location: work?.location || '',
      description: work?.description || '',
      status: work?.status || 'upcoming',
      isPublished: work?.isPublished !== false,
      images: Array.isArray(work?.images) ? work.images : [],
      beforeAfter: {
        before: Array.isArray(work?.beforeAfter?.before) ? work.beforeAfter.before : (Array.isArray(work?.beforeImages) ? work.beforeImages : []),
        after: Array.isArray(work?.beforeAfter?.after) ? work.beforeAfter.after : (Array.isArray(work?.afterImages) ? work.afterImages : []),
      },
    })
    setShowEdit(true)
  }

  // Automatically compress uploaded image files to max 1000px and 70% quality (reduces 8MB to ~50KB)
  const compressImageFile = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            } else {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', quality)
          resolve(compressed)
        }
        img.onerror = () => resolve(e.target.result)
        img.src = e.target.result
      }
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
  }

  const handleFileUpload = async (files, target, field = null) => {
    if (!files || !files.length) return
    for (const file of Array.from(files)) {
      try {
        const url = await compressImageFile(file)
        if (!url) continue
        if (target === 'images') {
          setEditForm(prev => ({ ...prev, images: [...(prev.images || []), url] }))
        } else if (target === 'beforeAfter' && field) {
          setEditForm(prev => ({
            ...prev,
            beforeAfter: {
              ...prev.beforeAfter,
              [field]: [...(prev.beforeAfter?.[field] || []), url],
            },
          }))
        }
      } catch (err) {
        console.error('Image compression error:', err)
      }
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) { toast.warning('⚠️ Title required'); return }
    if (!editForm.category.trim()) { toast.warning('⚠️ Category required'); return }
    setSaving(true)
    try {
      const payload = {
        title: editForm.title.trim(),
        category: editForm.category.trim(),
        description: editForm.description?.trim() || null,
        status: editForm.status || 'upcoming',
        budget: editForm.budget?.trim() || null,
        location: editForm.location?.trim() || null,
        isPublished: editForm.isPublished !== false,
        images: editForm.images || [],
        beforeAfter: editForm.beforeAfter || { before: [], after: [] },
      }
      if (editForm.areaId) {
        payload.areaId = editForm.areaId
      }
      await WorksAPI.update(id, payload)
      toast.success('✨ Work updated successfully!')
      setShowEdit(false)
      load()
    } catch (e) {
      toast.error(`❌ Update failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const w  = work || {}
  const sc = statusConfig[w.status?.toLowerCase()] || statusConfig.upcoming
  const StatusIcon = sc.Icon

  const beforePhotos = w.beforeAfter?.before?.length ? w.beforeAfter.before : (w.beforeImages?.length ? w.beforeImages : [])
  const afterPhotos = w.beforeAfter?.after?.length ? w.beforeAfter.after : (w.afterImages?.length ? w.afterImages : [])
  const projectPhotos = Array.isArray(w.images) ? w.images : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/works')} className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer" style={{color:'var(--primary)'}}>
          <ArrowLeft className="w-4 h-4" />
          Back to Works
        </button>
        <button onClick={openEdit} className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl text-white shadow-sm cursor-pointer" style={{background: 'var(--primary)'}}>
          <Edit className="w-3.5 h-3.5" />
          Edit Work
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 flex items-center gap-3.5" style={{background:`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000))`}}>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <HardHat className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-lg leading-tight truncate">{w.title || '—'}</p>
            <p className="text-white/80 text-xs mt-0.5">{w.category || '—'}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm ${sc.bg} ${sc.text}`}>
            <StatusIcon className="w-3 h-3" /> {sc.label}
          </span>
        </div>
        <div className="p-5 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              ['Area / Ward',  w.areaId?.name || w.area?.name || 'All Area'],
              ['Category',     w.category   || '—'],
              ['Budget',       w.budget     || '—'],
              ['Status',       w.status     || '—'],
              ['Location',     w.location   || '—'],
              ['Created On',   w.createdAt  ? new Date(w.createdAt).toLocaleDateString('en-IN') : '—'],
              ['Published',    w.isPublished !== false ? '✅ Public (Visible to Citizens)' : '🔒 Draft (Hidden)'],
            ].map(([l,v]) => (
              <div key={l} className="bg-gray-50/60 p-3 rounded-2xl border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{l}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {w.description && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1.5">Description (Vivaran)</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl p-3.5 border border-gray-100">{w.description}</p>
            </div>
          )}

          {/* Location Landmark */}
          {w.location && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-2xl border border-blue-100" style={{background:'var(--primary-light)'}}>
              <MapPin className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
              <div>
                <p className="text-[10px] text-gray-500 font-bold">Exact Location / Landmark</p>
                <p className="text-sm font-bold text-gray-800">{w.location}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Before / After Comparison */}
      {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">🔄 Before & After Progress Photos</h3>
            <span className="text-[10px] text-gray-400 font-medium">{beforePhotos.length + afterPhotos.length} photos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before */}
            <div className="bg-orange-50/40 rounded-2xl p-3.5 border border-orange-100 space-y-2">
              <p className="text-xs font-bold text-orange-800">⏳ Kaam Se Pehle (Before)</p>
              {beforePhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {beforePhotos.map((img, i) => (
                    <div key={i} className="h-32 rounded-xl overflow-hidden bg-gray-100 border border-orange-200">
                      <img
                        src={resolveImageUrl(img)}
                        alt={`Before ${i+1}`}
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.target.onerror = null; e.target.src = SVG_FALLBACK }}
                        className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">No before photos added</p>
              )}
            </div>

            {/* After */}
            <div className="bg-emerald-50/40 rounded-2xl p-3.5 border border-emerald-100 space-y-2">
              <p className="text-xs font-bold text-emerald-800">✅ Kaam Ke Baad (After)</p>
              {afterPhotos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {afterPhotos.map((img, i) => (
                    <div key={i} className="h-32 rounded-xl overflow-hidden bg-gray-100 border border-emerald-200">
                      <img
                        src={resolveImageUrl(img)}
                        alt={`After ${i+1}`}
                        referrerPolicy="no-referrer"
                        onError={(e) => { e.target.onerror = null; e.target.src = SVG_FALLBACK }}
                        className="w-full h-full object-cover hover:scale-105 transition-transform" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic py-4 text-center">No after photos added yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* General Work Images Gallery */}
      {projectPhotos.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">📸 Project Gallery Images</h3>
            <span className="text-[10px] text-gray-400 font-medium">{projectPhotos.length} photos</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {projectPhotos.map((img, i) => (
              <div key={i} className="h-28 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                <img
                  src={resolveImageUrl(img)}
                  alt={`Work ${i+1}`}
                  referrerPolicy="no-referrer"
                  onError={(e) => { e.target.onerror = null; e.target.src = SVG_FALLBACK }}
                  className="w-full h-full object-cover hover:scale-105 transition-transform" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No images at all */}
      {beforePhotos.length === 0 && afterPhotos.length === 0 && projectPhotos.length === 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
          <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-500">No photos uploaded for this work</p>
          <p className="text-xs text-gray-400 mt-0.5">Edit Work par click karke photos add kar sakte hain</p>
        </div>
      )}

      {/* Complete Edit Modal with ALL Fields */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">Edit Work Details</h2>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer p-1">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Title *</label>
                <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Category *</label>
                <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>

              {/* Area & Budget */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Area / Ward</label>
                  <select value={editForm.areaId} onChange={e => setEditForm({ ...editForm, areaId: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-3 h-11 text-xs outline-none focus:border-[var(--primary)] bg-white">
                    <option value="">All Area</option>
                    {areas.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.name} {a.levelName ? `(${a.levelName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Budget</label>
                  <input value={editForm.budget} onChange={e => setEditForm({ ...editForm, budget: e.target.value })}
                    placeholder="e.g. ₹ 20 Lakhs"
                    className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
              </div>

              {/* Location & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Location</label>
                  <input value={editForm.location} onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="e.g. Near Gandhi Chowk"
                    className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-3 h-11 text-xs outline-none bg-white">
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Description</label>
                <textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]" />
              </div>

              {/* Published toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">Publish on Public App</p>
                  <p className="text-[10px] text-gray-400">Citizen app par dikhana hai</p>
                </div>
                <input type="checkbox" checked={editForm.isPublished !== false}
                  onChange={e => setEditForm({ ...editForm, isPublished: e.target.checked })}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer" />
              </div>

              {/* Work Images */}
              <div className="border border-gray-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">📸 Photos ({editForm.images?.length || 0})</span>
                  <label className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white cursor-pointer" style={{ background: 'var(--primary)' }}>
                    + Upload
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={e => handleFileUpload(e.target.files, 'images')} />
                  </label>
                </div>
                <div className="flex gap-2">
                  <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Image URL..." className="flex-1 border border-gray-200 rounded-xl px-3 h-8 text-xs outline-none" />
                  <button type="button" onClick={() => {
                    if (newImageUrl.trim()) {
                      setEditForm(prev => ({ ...prev, images: [...(prev.images || []), newImageUrl.trim()] }))
                      setNewImageUrl('')
                    }
                  }} className="text-xs font-bold px-2.5 h-8 bg-gray-100 rounded-xl cursor-pointer">Add</button>
                </div>
                {editForm.images?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {editForm.images.map((img, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden h-14 border border-gray-200">
                        <img src={img} alt={`Work ${idx}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => {
                          setEditForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
                        }} className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Before & After in Edit */}
              <div className="border border-blue-100 bg-blue-50/30 rounded-2xl p-3.5 space-y-3">
                <p className="text-xs font-bold text-blue-900">🔄 Before & After Photos</p>
                {/* Before */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">Before Photos</span>
                    <label className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 cursor-pointer">
                      + Upload
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e => handleFileUpload(e.target.files, 'beforeAfter', 'before')} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input value={newBeforeUrl} onChange={e => setNewBeforeUrl(e.target.value)}
                      placeholder="Before URL..." className="flex-1 border border-gray-200 rounded-xl px-3 h-8 text-xs outline-none bg-white" />
                    <button type="button" onClick={() => {
                      if (newBeforeUrl.trim()) {
                        setEditForm(prev => ({
                          ...prev,
                          beforeAfter: { ...prev.beforeAfter, before: [...(prev.beforeAfter?.before || []), newBeforeUrl.trim()] }
                        }))
                        setNewBeforeUrl('')
                      }
                    }} className="text-xs font-bold px-2.5 h-8 bg-gray-100 rounded-xl cursor-pointer">Add</button>
                  </div>
                  {editForm.beforeAfter?.before?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {editForm.beforeAfter.before.map((img, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden h-14 border border-gray-200">
                          <img src={img} alt={`Before ${idx}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              beforeAfter: { ...prev.beforeAfter, before: prev.beforeAfter.before.filter((_, i) => i !== idx) }
                            }))
                          }} className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* After */}
                <div className="space-y-1.5 pt-2 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">After Photos</span>
                    <label className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-100 text-green-700 cursor-pointer">
                      + Upload
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e => handleFileUpload(e.target.files, 'beforeAfter', 'after')} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input value={newAfterUrl} onChange={e => setNewAfterUrl(e.target.value)}
                      placeholder="After URL..." className="flex-1 border border-gray-200 rounded-xl px-3 h-8 text-xs outline-none bg-white" />
                    <button type="button" onClick={() => {
                      if (newAfterUrl.trim()) {
                        setEditForm(prev => ({
                          ...prev,
                          beforeAfter: { ...prev.beforeAfter, after: [...(prev.beforeAfter?.after || []), newAfterUrl.trim()] }
                        }))
                        setNewAfterUrl('')
                      }
                    }} className="text-xs font-bold px-2.5 h-8 bg-gray-100 rounded-xl cursor-pointer">Add</button>
                  </div>
                  {editForm.beforeAfter?.after?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {editForm.beforeAfter.after.map((img, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden h-14 border border-gray-200">
                          <img src={img} alt={`After ${idx}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            setEditForm(prev => ({
                              ...prev,
                              beforeAfter: { ...prev.beforeAfter, after: prev.beforeAfter.after.filter((_, i) => i !== idx) }
                            }))
                          }} className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-3xl">
              <button onClick={handleSaveEdit} disabled={saving} className="btn-primary flex-1 h-11 text-sm font-bold disabled:opacity-70 cursor-pointer shadow-md">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setShowEdit(false)} className="flex-1 h-11 border border-gray-300 text-sm font-bold rounded-2xl bg-white hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
