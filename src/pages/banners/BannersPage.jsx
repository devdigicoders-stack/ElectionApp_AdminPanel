import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Flag,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  Upload,
  CheckCircle2,
  Sparkles,
  Link2,
  Layers,
  Info
} from 'lucide-react'
import { BannersAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY = {
  title: '',
  subtitle: '',
  type: 'homepage',
  link: '',
  isActive: true,
}

const TYPES = [
  { id: 'homepage', label: 'Homepage Slider', desc: 'Main carousel on citizen app home screen' },
  { id: 'campaign', label: 'Campaign Promo', desc: 'Featured banner in campaigns & events' },
  { id: 'popup', label: 'Popup Dialog', desc: 'Modal popup when citizen opens app' },
]

export default function BannersPage() {
  const { show, Toast } = useToast()
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [files, setFiles] = useState([])
  const [filePreview, setFilePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [activeTab, setActiveTab] = useState('all')
  const [reordering, setReordering] = useState(false)

  // Helper to resolve full image URL safely
  const resolveBannerImg = (b) => {
    const url = b?.fullImageUrl || b?.imageUrl
    if (!url) return ''
    if (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) {
      return url
    }
    const cleanBase = (BASE_URL || '').replace(/\/+$/, '')
    const cleanPath = url.startsWith('/') ? url : `/${url}`
    return `${cleanBase}${cleanPath}`
  }

  // Handle local file preview cleanup
  useEffect(() => {
    if (files.length > 0) {
      const url = URL.createObjectURL(files[0])
      setFilePreview(url)
      return () => URL.revokeObjectURL(url)
    } else {
      setFilePreview(null)
    }
  }, [files])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res =
        activeTab === 'active'
          ? await BannersAPI.getActive()
          : await BannersAPI.getAll()

      const data = res?.data ?? res
      let list = Array.isArray(data?.banners ?? data) ? (data?.banners ?? data) : []

      // Client-side category filtering for tabs if selected
      if (activeTab !== 'all' && activeTab !== 'active') {
        list = list.filter(b => (b.category || b.type || 'homepage') === activeTab)
      }

      // Sort by sortOrder
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setBanners(list)
    } catch (e) {
      setError(e.message || 'Failed to load banners')
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    load()
  }, [load])

  // Counts for tabs
  const tabCounts = useMemo(() => {
    return {
      all: banners.length,
      active: banners.filter(b => b.isActive).length,
      homepage: banners.filter(b => (b.category || b.type || 'homepage') === 'homepage').length,
      campaign: banners.filter(b => (b.category || b.type) === 'campaign').length,
      popup: banners.filter(b => (b.category || b.type) === 'popup').length,
    }
  }, [banners])

  const handleSave = async () => {
    if (!form.title.trim()) {
      show('Banner title is required', 'error')
      return
    }

    if (!editId && files.length === 0 && !form.imageUrl) {
      show('Banner image is required', 'error')
      return
    }

    setSaving(true)
    try {
      let imageUrl = form.imageUrl || ''
      if (files.length > 0) {
        const up = await UploadAPI.uploadFiles('banners', files[0])
        imageUrl = up?.urls?.[0] || ''
      }

      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || '',
        category: form.type || 'homepage',
        linkUrl: form.link?.trim() || null,
        isActive: form.isActive !== false,
        imageUrl,
      }

      if (editId) {
        await BannersAPI.update(editId, payload)
        show('Banner updated successfully!')
      } else {
        payload.sortOrder = banners.length + 1
        await BannersAPI.create(payload)
        show('Banner created successfully!')
      }

      setShowForm(false)
      setEditId(null)
      setForm(EMPTY)
      setFiles([])
      await load()
    } catch (e) {
      show(e.message || 'Failed to save banner', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id, current) => {
    try {
      await BannersAPI.toggleActive(id, !current)
      show(`Banner ${!current ? 'enabled' : 'disabled'}!`)
      await load()
    } catch (e) {
      show(e.message || 'Failed to update status', 'error')
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Banner?',
      text: 'Are you sure you want to delete this banner? It will no longer appear on citizen mobile app.',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await BannersAPI.remove(id)
      show('Banner deleted successfully!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to delete banner', 'error')
    }
  }

  // Move banner order up/down
  const handleMoveOrder = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const newBanners = [...banners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[targetIndex]
    newBanners[targetIndex] = temp

    const orders = newBanners.map((b, i) => ({ id: b._id, sortOrder: i + 1 }))
    setBanners(newBanners)
    setReordering(true)
    try {
      await BannersAPI.reorder(orders)
      show('Banner order updated!')
    } catch (e) {
      show('Failed to reorder banners', 'error')
      await load()
    } finally {
      setReordering(false)
    }
  }

  const openEdit = (b) => {
    setForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      type: b.category || b.type || 'homepage',
      link: b.linkUrl || b.link || '',
      isActive: b.isActive !== false,
      imageUrl: b.imageUrl || '',
    })
    setEditId(b._id)
    setFiles([])
    setShowForm(true)
  }

  const typeConfig = {
    homepage: { label: 'Homepage', bg: 'bg-blue-500/90', text: 'text-white' },
    campaign: { label: 'Campaign', bg: 'bg-purple-500/90', text: 'text-white' },
    popup: { label: 'Popup', bg: 'bg-amber-500/90', text: 'text-white' },
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-12 max-w-2xl mx-auto">
      <Toast />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">Banner Management</h1>
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
              {banners.length} Total
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">
            {banners.filter(b => b.isActive).length} active on citizen app
          </p>
        </div>

        <button
          onClick={() => {
            setForm(EMPTY)
            setEditId(null)
            setFiles([])
            setShowForm(true)
          }}
          className="btn-primary flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm shrink-0 shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Banner</span>
        </button>
      </div>

      {/* ── FILTER TABS (Mobile Horizontal Scroll) ── */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
        {[
          { id: 'all', label: 'All' },
          { id: 'active', label: 'Active' },
          { id: 'homepage', label: 'Homepage' },
          { id: 'campaign', label: 'Campaign' },
          { id: 'popup', label: 'Popup' },
        ].map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl sm:rounded-2xl transition-all border ${
                isActive
                  ? 'text-white border-transparent shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200/80 hover:bg-gray-50'
              }`}
              style={isActive ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
            >
              <span>{tab.label}</span>
              {activeTab === 'all' && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tabCounts[tab.id] ?? 0}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── BANNERS LIST ── */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton rows={3} />
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <div className="space-y-4">
          {banners.map((b, index) => {
            const currentType = typeConfig[b.category || b.type] || typeConfig.homepage
            const bannerImg = resolveBannerImg(b)

            return (
              <div
                key={b._id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100/90 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-200 hover:shadow-md group"
              >
                {/* Responsive Banner Image Frame */}
                <div className="relative w-full aspect-[16/8] sm:aspect-[21/9] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
                  {bannerImg ? (
                    <>
                      <img
                        src={bannerImg}
                        alt={b.title}
                        className="w-full h-full object-cover sm:object-contain transition-transform duration-500 group-hover:scale-102"
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                          if (e.currentTarget.nextElementSibling) {
                            e.currentTarget.nextElementSibling.style.display = 'flex'
                          }
                        }}
                      />
                      <div className="hidden absolute inset-0 items-center justify-center bg-gray-800 text-gray-400 flex-col gap-2">
                        <ImageIcon className="w-8 h-8 opacity-40" />
                        <span className="text-xs">Image unavailable</span>
                      </div>
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center"
                      style={{ background: 'var(--primary-light)' }}
                    >
                      <Flag className="w-10 h-10 opacity-30" style={{ color: 'var(--primary)' }} />
                      <span className="text-xs font-semibold mt-1" style={{ color: 'var(--primary)' }}>
                        No Image Uploaded
                      </span>
                    </div>
                  )}

                  {/* Gradient shade for bottom readability */}
                  <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                  {/* Top Floating Badges (Category + Order + Status) */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                    {/* Left: Category & Order */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/10 shadow-xs">
                        #{index + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${currentType.bg} ${currentType.text}`}
                      >
                        {currentType.label}
                      </span>
                    </div>

                    {/* Right: Active Status Pill */}
                    <div className="shrink-0">
                      {b.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/90 text-white backdrop-blur-md shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/60 text-gray-300 backdrop-blur-md border border-white/10">
                          Disabled
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banner Content Body */}
                <div className="p-3.5 sm:p-4">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug line-clamp-1">
                    {b.title}
                  </h3>

                  {b.subtitle && (
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {b.subtitle}
                    </p>
                  )}

                  {b.linkUrl && (
                    <a
                      href={b.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 bg-blue-50/70 hover:bg-blue-100/70 px-2.5 py-1 rounded-xl transition-colors max-w-full truncate"
                      title={b.linkUrl}
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{b.linkUrl}</span>
                    </a>
                  )}
                </div>

                {/* Mobile-Optimized Action Footer */}
                <div className="px-3.5 py-2.5 bg-gray-50/75 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                  {/* Left: Reorder Arrows */}
                  <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-xl border border-gray-200/80 shadow-2xs">
                    <button
                      title="Move Up"
                      disabled={index === 0 || reordering}
                      onClick={() => handleMoveOrder(index, 'up')}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-[1px] h-3.5 bg-gray-200" />
                    <button
                      title="Move Down"
                      disabled={index === banners.length - 1 || reordering}
                      onClick={() => handleMoveOrder(index, 'down')}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-25 disabled:cursor-not-allowed active:scale-95 transition-all"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Right: Quick Action Controls */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Toggle Status */}
                    <button
                      onClick={() => handleToggle(b._id, b.isActive)}
                      className={`h-7 sm:h-8 px-2.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-all active:scale-95 border ${
                        b.isActive
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200/60'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/60'
                      }`}
                    >
                      {b.isActive ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          <span>Enable</span>
                        </>
                      )}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => openEdit(b)}
                      className="h-7 sm:h-8 px-2.5 text-xs font-bold rounded-xl text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 flex items-center gap-1 transition-all active:scale-95"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(b._id)}
                      className="h-7 sm:h-8 w-7 sm:w-8 rounded-xl text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 flex items-center justify-center transition-all active:scale-95"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Empty State */}
          {banners.length === 0 && (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center border border-gray-100 flex flex-col items-center shadow-xs">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--primary-light)' }}
              >
                <Flag className="w-7 h-7" style={{ color: 'var(--primary)' }} />
              </div>
              <h3 className="text-base font-bold text-gray-800">No banners found</h3>
              <p className="text-xs text-gray-500 max-w-xs mt-1">
                {activeTab !== 'all'
                  ? `No banners in "${activeTab}" category. Try selecting "All" or create a new banner.`
                  : 'Add promotional banners and slides to engage citizens on the mobile app.'}
              </p>
              <button
                onClick={() => {
                  setForm(EMPTY)
                  setEditId(null)
                  setFiles([])
                  setShowForm(true)
                }}
                className="btn-primary mt-4 text-xs px-4 py-2.5 flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Banner</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT BANNER MODAL (Mobile Bottom Sheet) ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Mobile Sheet Drag Pill */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editId ? 'Edit Banner' : 'Create New Banner'}
                </h2>
                <p className="text-[11px] text-gray-400">
                  Displays across the citizen mobile PWA app
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <div className="overflow-y-auto p-5 space-y-4 no-scrollbar">
              {/* Image Upload Box with Live Preview */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  Banner Image {editId ? '(Select new image to replace)' : '*'}
                </label>

                {/* Image Preview if available */}
                {(filePreview || form.imageUrl) && (
                  <div className="mb-2.5 relative w-full aspect-[16/8] bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 shadow-xs group">
                    <img
                      src={filePreview || resolveBannerImg({ imageUrl: form.imageUrl })}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <span className="text-xs text-white font-bold bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-xs">
                        {filePreview ? 'New Photo Selected' : 'Current Active Image'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Upload Tap Target */}
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 hover:border-gray-300 rounded-2xl cursor-pointer bg-gray-50/60 hover:bg-gray-50 transition-colors text-center">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs font-bold text-gray-700">
                    {files.length > 0
                      ? files[0].name
                      : form.imageUrl
                      ? 'Tap to replace current image'
                      : 'Tap to choose banner image'}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-0.5">
                    Recommended ratio: 16:9 or 2:1 (JPG, PNG, WebP)
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/jpg"
                    onChange={e => setFiles(Array.from(e.target.files))}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Banner Title *
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Vikas Yatra 2026 Announcement"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Subtitle / Tagline (Optional)
                </label>
                <input
                  value={form.subtitle}
                  onChange={e => setForm({ ...form, subtitle: e.target.value })}
                  placeholder="e.g. Join our rally this Sunday in Ward 12"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Category / Display Location */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  Display Location / Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPES.map(t => {
                    const isSelected = (form.type || 'homepage') === t.id
                    return (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setForm({ ...form, type: t.id })}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-transparent text-white shadow-xs'
                            : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700'
                        }`}
                        style={isSelected ? { background: 'var(--primary)' } : {}}
                      >
                        <p className="text-xs font-bold">{t.label}</p>
                        <p className={`text-[9px] mt-0.5 line-clamp-2 leading-tight ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                          {t.desc}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Click Action URL (Link)</span>
                  <span className="text-[10px] font-normal text-gray-400">Optional</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-gray-400">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    value={form.link}
                    onChange={e => setForm({ ...form, link: e.target.value })}
                    placeholder="e.g. /events or https://example.com/join"
                    className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs font-bold text-gray-800 block">Publish Status</span>
                  <span className="text-[11px] text-gray-500">Make visible on citizen mobile app</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="relative w-12 h-6 rounded-full transition-all focus:outline-none"
                  style={{ background: form.isActive ? 'var(--primary)' : '#d1d5db' }}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                      form.isActive ? 'left-6.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Sticky Bottom Action Buttons */}
            <div className="flex gap-2.5 p-4 border-t border-gray-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 border border-gray-200 text-xs sm:text-sm font-bold rounded-2xl text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 h-11 text-xs sm:text-sm font-bold rounded-2xl disabled:opacity-70 shadow-sm transition-all"
              >
                {saving ? 'Saving...' : editId ? 'Update Banner' : 'Create Banner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
