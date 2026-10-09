import { useState, useEffect, useCallback } from 'react'
import {
  LayoutTemplate,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Check,
  X,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  Building2,
  CheckCircle2,
  MessageSquare,
  Flag,
  Save,
  ExternalLink,
  Layers,
  Sparkles,
  Link2,
} from 'lucide-react'
import { BannersAPI, LeaderAPI, ConfigAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { confirmDialog } from '../../utils/sweetAlert'
import { toast } from 'react-toastify'

const EMPTY_BANNER = {
  title: '',
  subtitle: '',
  linkUrl: '',
  category: 'homepage',
  isActive: true,
  sortOrder: 0,
}

export default function HomepagePage() {
  // State
  const [banners, setBanners] = useState([])
  const [loadingBanners, setLoadingBanners] = useState(true)

  // Config & Branding
  const [config, setConfig] = useState(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Leader Message
  const [leaderData, setLeaderData] = useState(null)
  const [leaderMessage, setLeaderMessage] = useState('')
  const [savingMessage, setSavingMessage] = useState(false)
  const [loadingLeader, setLoadingLeader] = useState(true)

  // Modal State for Banner Add/Edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [savingBanner, setSavingBanner] = useState(false)

  // Reorder Loading State
  const [reordering, setReordering] = useState(false)

  // ── 1. Fetch All Data ─────────────────────────────────────
  const loadAll = useCallback(async () => {
    // 1. Load Banners
    setLoadingBanners(true)
    try {
      const res = await BannersAPI.getAll()
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      // Sort by sortOrder
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      setBanners(list)
    } catch (e) {
      console.error('Error loading banners:', e)
      toast.error(`Banners load nahi ho paye: ${e.message}`)
    } finally {
      setLoadingBanners(false)
    }

    // 2. Load Config & Branding
    setLoadingConfig(true)
    try {
      const cfg = await ConfigAPI.getConfig()
      setConfig(cfg?.data ?? cfg)
    } catch (e) {
      console.error('Error loading config:', e)
    } finally {
      setLoadingConfig(false)
    }

    // 3. Load Leader Message
    setLoadingLeader(true)
    try {
      const ldr = await LeaderAPI.get()
      const data = ldr?.data ?? ldr
      setLeaderData(data)
      setLeaderMessage(data?.message || '')
    } catch (e) {
      console.error('Error loading leader message:', e)
    } finally {
      setLoadingLeader(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // Helper to resolve full image URLs
  const getImageUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
  }

  // ── 2. Banner Modal Handlers ──────────────────────────────
  const openCreateModal = () => {
    setEditingBanner(null)
    setBannerForm({
      ...EMPTY_BANNER,
      sortOrder: banners.length,
    })
    setSelectedFile(null)
    setPreviewUrl('')
    setModalOpen(true)
  }

  const openEditModal = (banner) => {
    setEditingBanner(banner)
    setBannerForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      linkUrl: banner.linkUrl || '',
      category: banner.category || 'homepage',
      isActive: banner.isActive !== false,
      sortOrder: banner.sortOrder ?? 0,
    })
    setSelectedFile(null)
    setPreviewUrl(banner.imageUrl ? getImageUrl(banner.imageUrl) : '')
    setModalOpen(true)
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const handleSaveBanner = async (e) => {
    e.preventDefault()
    if (!bannerForm.title.trim()) {
      toast.warning('Banner title required hai')
      return
    }

    if (!editingBanner && !selectedFile) {
      toast.warning('Banner image upload karna zaroori hai')
      return
    }

    setSavingBanner(true)
    try {
      let imageUrl = editingBanner?.imageUrl || ''

      // If a new file is chosen, upload it first
      if (selectedFile) {
        const uploadRes = await UploadAPI.uploadFiles('banners', selectedFile)
        imageUrl = uploadRes?.urls?.[0] || uploadRes?.data?.urls?.[0] || ''
        if (!imageUrl) throw new Error('Image upload failed to return URL')
      }

      const payload = {
        title: bannerForm.title.trim(),
        subtitle: bannerForm.subtitle?.trim() || '',
        linkUrl: bannerForm.linkUrl?.trim() || '',
        category: bannerForm.category || 'homepage',
        isActive: Boolean(bannerForm.isActive),
        sortOrder: Number(bannerForm.sortOrder) || 0,
        imageUrl,
      }

      if (editingBanner) {
        await BannersAPI.update(editingBanner._id, payload)
        toast.success('Banner successfully update ho gaya!')
      } else {
        await BannersAPI.create(payload)
        toast.success('Naya banner successfully add ho gaya!')
      }

      setModalOpen(false)
      loadAll()
    } catch (e) {
      console.error('Save banner error:', e)
      toast.error(`Banner save nahi ho paya: ${e.message}`)
    } finally {
      setSavingBanner(false)
    }
  }

  // ── 3. Toggle Banner Status (Enable / Disable) ────────────
  const handleToggleBanner = async (banner) => {
    const nextStatus = !banner.isActive
    try {
      // Optimistic update
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? { ...b, isActive: nextStatus } : b))
      )
      await BannersAPI.toggleActive(banner._id, nextStatus)
      toast.success(nextStatus ? 'Banner Active ho gaya' : 'Banner Inactive ho gaya')
    } catch (e) {
      toast.error(`Status change error: ${e.message}`)
      loadAll() // revert
    }
  }

  // ── 4. Delete Banner ──────────────────────────────────────
  const handleDeleteBanner = async (banner) => {
    const ok = await confirmDialog({
      title: 'Banner Delete Karein?',
      text: `"${banner.title}" ko permanently delete karna chahte hain?`,
      confirmButtonText: 'Haan, Delete Karo',
    })
    if (!ok) return

    try {
      await BannersAPI.remove(banner._id)
      toast.success('Banner successfully delete ho gaya!')
      setBanners((prev) => prev.filter((b) => b._id !== banner._id))
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`)
    }
  }

  // ── 5. Reorder Banners (Move Up / Down) ───────────────────
  const moveBanner = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= banners.length) return

    const newBanners = [...banners]
    const temp = newBanners[index]
    newBanners[index] = newBanners[targetIndex]
    newBanners[targetIndex] = temp

    // Update sortOrder values
    const orders = newBanners.map((b, idx) => ({
      id: b._id,
      sortOrder: idx,
    }))

    // Optimistic state
    setBanners(newBanners.map((b, idx) => ({ ...b, sortOrder: idx })))
    setReordering(true)
    try {
      await BannersAPI.reorder(orders)
      toast.success('Banner order update ho gaya!', { autoClose: 1200 })
    } catch (e) {
      toast.error(`Reorder error: ${e.message}`)
      loadAll()
    } finally {
      setReordering(false)
    }
  }

  // ── 6. Save Leader Message ────────────────────────────────
  const handleSaveLeaderMessage = async () => {
    setSavingMessage(true)
    try {
      const payload = {
        ...(leaderData || {}),
        message: leaderMessage.trim(),
      }
      delete payload._id
      delete payload.__v
      delete payload.createdAt
      delete payload.updatedAt
      delete payload.tenantId

      await LeaderAPI.update(payload)
      toast.success('Leader Message successfully save ho gaya!')
    } catch (e) {
      toast.error(`Message save nahi ho paya: ${e.message}`)
    } finally {
      setSavingMessage(false)
    }
  }

  const branding = config?.branding || {}
  const tenant = config?.tenant || {}
  const enabledFeatures = config?.enabledFeatures || []

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <LayoutTemplate className="w-7 h-7 text-orange-500" />
          Homepage Management
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Citizen App ke homepage ke Banners, Leader Message aur Active Modules ko live configure karein
        </p>
      </div>

      {/* ── 1. Tenant Branding & Status Card ────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm relative overflow-hidden">
        {/* Subtle accent bar at the top with primary theme color */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{ background: branding.primaryColor || '#ea580c' }}
        />

        <div className="flex items-center justify-between gap-3">
          {/* Left: Avatar + Details */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 border border-orange-200/70 shadow-xs flex items-center justify-center shrink-0">
              {branding.logoUrl || branding.logo ? (
                <img
                  src={getImageUrl(branding.logoUrl || branding.logo)}
                  alt="Logo"
                  className="w-full h-full object-contain p-1"
                />
              ) : (
                <Building2 className="w-6 h-6 text-orange-500" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                  {branding.leaderName || branding.title || tenant.name || 'Demo Leader'}
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Active
                </span>
              </div>

              {branding.tagline && (
                <p className="text-xs text-gray-500 truncate mt-0.5 italic">
                  "{branding.tagline}"
                </p>
              )}

              <div className="flex items-center gap-2.5 mt-1 text-[11px] text-gray-400 flex-wrap">
                <span>
                  Slug: <code className="font-mono font-semibold text-gray-700">{tenant.slug || 'demo'}</code>
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1">
                  Theme:
                  <span
                    className="w-3 h-3 rounded-full inline-block border border-gray-200 shadow-xs"
                    style={{ background: branding.primaryColor || '#ea580c' }}
                  />
                </span>
              </div>
            </div>
          </div>

          {/* Right: Compact Badge for Total Banners */}
          <div className="shrink-0 text-right bg-orange-50/80 border border-orange-100 px-3 py-2 rounded-xl">
            <span className="text-[10px] font-semibold text-orange-700/80 uppercase tracking-wider block">
              Banners
            </span>
            <div className="flex items-baseline gap-1 justify-end mt-0.5">
              <span className="text-base font-black text-orange-600">
                {banners.filter((b) => b.isActive).length}
              </span>
              <span className="text-xs font-bold text-gray-400">
                / {banners.length}
              </span>
              <span className="text-[10px] font-bold text-emerald-600 ml-0.5">
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Hero & Promotional Banners Section ───────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-500" />
              Hero & Promotional Banners
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Citizen app ke main carousel me yahi banners dikhte hain. Inka order drag ya up/down se change karein.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Banner
          </button>
        </div>

        {/* Loading State */}
        {loadingBanners && (
          <div className="py-12 flex flex-col items-center justify-center text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mb-2" />
            <p className="text-sm">Banners load ho rahe hain...</p>
          </div>
        )}

        {/* Empty State */}
        {!loadingBanners && banners.length === 0 && (
          <div className="py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-gray-50/50">
            <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-3">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-800">Koi Banner Upload Nahi Hai</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm">
              Citizen App ke homepage par dikhane ke liye image upload karein aur naya banner banayein.
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Pehla Banner Add Karein
            </button>
          </div>
        )}

        {/* Banner List Grid */}
        {!loadingBanners && banners.length > 0 && (
          <div className="space-y-3">
            {banners.map((banner, index) => (
              <div
                key={banner._id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all ${
                  banner.isActive
                    ? 'bg-white border-gray-200 hover:border-orange-200 hover:shadow-xs'
                    : 'bg-gray-50/70 border-gray-200/60 opacity-75'
                }`}
              >
                {/* Left: Thumbnail + Details */}
                <div className="flex items-center gap-3.5">
                  {/* Sort Order Index Badge */}
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                    #{index + 1}
                  </div>

                  {/* Image Preview */}
                  <div className="w-24 h-14 sm:w-28 sm:h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shrink-0 relative group">
                    <img
                      src={getImageUrl(banner.imageUrl)}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://placehold.co/400x200?text=Banner'
                      }}
                    />
                    <a
                      href={getImageUrl(banner.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{banner.title}</h4>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          banner.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {banner.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {banner.subtitle && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{banner.subtitle}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
                      <span className="capitalize font-medium text-gray-600">
                        Category: {banner.category || 'Homepage'}
                      </span>
                      {banner.linkUrl && (
                        <span className="flex items-center gap-0.5 text-blue-500 truncate max-w-[150px]">
                          <Link2 className="w-3 h-3" /> {banner.linkUrl}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center justify-end gap-2 mt-3 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  {/* Move Up / Down Buttons */}
                  <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 mr-1">
                    <button
                      onClick={() => moveBanner(index, 'up')}
                      disabled={index === 0 || reordering}
                      title="Move Up"
                      className="p-1 rounded text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => moveBanner(index, 'down')}
                      disabled={index === banners.length - 1 || reordering}
                      title="Move Down"
                      className="p-1 rounded text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Toggle Active Switch */}
                  <button
                    onClick={() => handleToggleBanner(banner)}
                    title={banner.isActive ? 'Disable Banner' : 'Enable Banner'}
                    className={`relative w-10 h-6 rounded-full transition-all flex items-center ${
                      banner.isActive ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                        banner.isActive ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(banner)}
                    title="Edit Banner"
                    className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteBanner(banner)}
                    title="Delete Banner"
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. Leader Message Section ───────────────────────── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              Leader Message
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Citizen App ke homepage par "Leader's Message to Citizens" card me yahi sandesh dikhta hai.
            </p>
          </div>
          {leaderData?.fullName && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700">
              Leader: {leaderData.fullName}
            </span>
          )}
        </div>

        {loadingLeader ? (
          <div className="py-6 text-center text-gray-400 text-xs">Leader details load ho rahi hain...</div>
        ) : (
          <div className="space-y-3">
            <textarea
              rows={4}
              value={leaderMessage}
              onChange={(e) => setLeaderMessage(e.target.value)}
              placeholder="Pyare Nagrik bhaiyon aur behno, hum milkar apne kshetra ka vikas karenge..."
              className="w-full border border-gray-200 rounded-xl p-3.5 text-sm outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-y text-gray-800"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">
                {leaderMessage.length} characters • Database me real time save hoga
              </span>
              <button
                onClick={handleSaveLeaderMessage}
                disabled={savingMessage}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {savingMessage ? 'Saving...' : 'Save Leader Message'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Citizen App Homepage Modules (Config / Features) ── */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-orange-500" />
              Citizen App Homepage Modules
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              {enabledFeatures.length} Modules Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Backend tenant configuration ke hisab se citizen app me yeh features/sections enable hain.
          </p>
        </div>

        {loadingConfig ? (
          <div className="py-6 text-center text-gray-400 text-xs">Features list load ho rahi hai...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {enabledFeatures.map((feat) => {
              const formattedName = feat.key
                .split('_')
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(' ')
              return (
                <div
                  key={feat.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-gray-800">{formattedName}</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                    ON
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2 mt-2">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            <strong>Note:</strong> Homepage par modules ka access Tenant Subscription aur Super Admin Plan dwara
            governed hota hai. Naye modules enable karne ke liye Super Admin Portal se connect karein.
          </span>
        </div>
      </div>

      {/* ── 5. Add / Edit Banner Modal ──────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-500" />
                {editingBanner ? 'Edit Banner' : 'Add New Banner'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveBanner} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Banner Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="e.g. Vikas Yatra 2026 / Yuva Sammelan"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Subtitle (Optional)</label>
                <input
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="Short tagline or date information"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={bannerForm.category}
                    onChange={(e) => setBannerForm({ ...bannerForm, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="homepage">Homepage Hero</option>
                    <option value="campaign">Campaign</option>
                    <option value="popup">Popup / Alert</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                  <select
                    value={bannerForm.isActive ? 'true' : 'false'}
                    onChange={(e) =>
                      setBannerForm({ ...bannerForm, isActive: e.target.value === 'true' })
                    }
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white"
                  >
                    <option value="true">Active (Visible)</option>
                    <option value="false">Disabled (Hidden)</option>
                  </select>
                </div>
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Click Action Link URL (Optional)
                </label>
                <input
                  type="text"
                  value={bannerForm.linkUrl}
                  onChange={(e) => setBannerForm({ ...bannerForm, linkUrl: e.target.value })}
                  placeholder="e.g. /events ya https://yoursite.com/campaign"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* Image Upload / Preview */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Banner Image {editingBanner ? '(Change karne ke liye select karein)' : '*'}
                </label>

                {previewUrl ? (
                  <div className="space-y-2">
                    <div className="w-full h-40 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative group">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white font-bold text-xs cursor-pointer">
                        <Upload className="w-4 h-4 mr-1.5" /> Doosri Image Choose Karein
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {selectedFile && (
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </p>
                    )}
                  </div>
                ) : (
                  <label className="w-full h-36 border-2 border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50/50 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-7 h-7 text-gray-400 mb-1.5" />
                    <span className="text-xs font-bold text-gray-700">Click to upload banner photo</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP (Max 25MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBanner}
                  className="flex items-center gap-1.5 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-60"
                >
                  {savingBanner ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" /> Save Banner
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
