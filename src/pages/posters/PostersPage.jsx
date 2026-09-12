import { useState, useEffect, useCallback } from 'react'
import {
  Palette,
  Plus,
  X,
  Trash2,
  Edit2,
  Eye,
  Download,
  Search,
  RefreshCw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  User,
  Phone,
  Calendar,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PosterAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY = {
  name: '',
  category: 'Festival',
  description: '',
  dimensionPreset: '1080x1080',
  fields: ['photo', 'name', 'designation', 'area'],
  includeTenantBranding: true,
  isActive: true,
  imageUrl: '',
}

const DEFAULT_CATS = [
  'Festival',
  'Political Campaign',
  'National Day',
  'Birthday',
  'Congratulations',
  'Event Promotion',
  'General',
]

const FIELD_CONFIG = [
  { key: 'photo', label: 'Photo Zone (फोटो)' },
  { key: 'name', label: 'Name (नाम)' },
  { key: 'designation', label: 'Designation (पद)' },
  { key: 'area', label: 'Area / Ward (क्षेत्र)' },
  { key: 'custom_text', label: 'Custom Slogan (नारा)' },
]

const DIMENSION_PRESETS = [
  { id: '1080x1080', label: '1:1 Square (Instagram / WhatsApp)' },
  { id: '1080x1350', label: '4:5 Portrait (Social Feed Poster)' },
  { id: '1080x1920', label: '9:16 Vertical (Status / Story)' },
]

export default function PostersPage() {
  const { show, Toast } = useToast()
  const navigate = useNavigate()

  // Tabs: 'templates' | 'gallery'
  const [activeTab, setActiveTab] = useState('templates')

  // Templates state
  const [templates, setTemplates] = useState([])
  const [cats, setCats] = useState(DEFAULT_CATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selCat, setSelCat] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Create / Edit modal state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [files, setFiles] = useState([])
  const [previewUrl, setPreviewUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  // Generated Posters (Citizen Gallery & Moderation)
  const [genPosters, setGenPosters] = useState([])
  const [genLoading, setGenLoading] = useState(false)
  const [genTotal, setGenTotal] = useState(0)
  const [genSearch, setGenSearch] = useState('')

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
  }

  // ── LOAD TEMPLATES ──────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
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
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selCat])

  // ── LOAD GENERATED POSTERS (CITIZEN GALLERY) ────────────────
  const loadGeneratedPosters = useCallback(async () => {
    setGenLoading(true)
    try {
      const res = await PosterAPI.getAdminPosters({ search: genSearch.trim() })
      const data = res?.data ?? res
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []
      setGenPosters(list)
      setGenTotal(data?.total ?? list.length)
    } catch (e) {
      console.warn('Failed to load generated posters:', e)
    } finally {
      setGenLoading(false)
    }
  }, [genSearch])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (activeTab === 'gallery') {
      loadGeneratedPosters()
    }
  }, [activeTab, loadGeneratedPosters])

  // ── SAVE TEMPLATE (CREATE OR UPDATE) ────────────────────────
  const handleSave = async () => {
    const templateTitle = (form.name || form.title || '').trim()
    if (!templateTitle) {
      show('Template title is required', 'error')
      return
    }

    setSaving(true)
    try {
      let imageUrl = form.imageUrl || form.templateImageUrl || ''

      // Upload new template image if selected
      if (files.length > 0) {
        const up = await UploadAPI.uploadFiles('poster-templates', files)
        if (up?.urls?.[0]) {
          imageUrl = up.urls[0]
        }
      }

      if (!imageUrl && !editId) {
        show('Please upload a template background frame image', 'error')
        setSaving(false)
        return
      }

      const payload = {
        title: templateTitle,
        name: templateTitle,
        category: form.category,
        description: form.description?.trim() || '',
        dimensionPreset: form.dimensionPreset || '1080x1080',
        templateImageUrl: imageUrl,
        imageUrl,
        fields: form.fields,
        includeTenantBranding: form.includeTenantBranding !== false,
        isActive: form.isActive !== false,
      }

      if (editId) {
        await PosterAPI.updateTemplate(editId, payload)
        show('Poster template updated successfully!')
      } else {
        await PosterAPI.createTemplate(payload)
        show('New poster template created successfully!')
      }

      setShowForm(false)
      setEditId(null)
      setForm(EMPTY)
      setFiles([])
      setPreviewUrl('')
      loadTemplates()
    } catch (e) {
      show(e.message || 'Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── DELETE TEMPLATE ─────────────────────────────────────────
  const handleDeleteTemplate = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Poster Template?',
      text: 'Are you sure you want to delete this template? Citizens will no longer be able to use it.',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return

    try {
      setTemplates((prev) => prev.filter((t) => t._id !== id))
      await PosterAPI.removeTemplate(id)
      show('Template deleted successfully!')
      loadTemplates()
    } catch (e) {
      show(e.message, 'error')
      loadTemplates()
    }
  }

  // ── OPEN EDIT MODAL ─────────────────────────────────────────
  const openEdit = async (id) => {
    try {
      const res = await PosterAPI.getOneTemplate(id)
      const data = res?.data ?? res
      setForm({
        name: data.title || data.name || '',
        category: data.category || 'Festival',
        description: data.description || '',
        dimensionPreset: data.dimensionPreset || '1080x1080',
        fields: Array.isArray(data.fields) ? data.fields.map((f) => (typeof f === 'string' ? f : f.key)) : ['photo', 'name'],
        includeTenantBranding: data.includeTenantBranding !== false,
        isActive: data.isActive ?? true,
        imageUrl: data.templateImageUrl || data.imageUrl || '',
      })
      setPreviewUrl(data.templateImageUrl || data.imageUrl || '')
      setEditId(id)
      setFiles([])
      setShowForm(true)
    } catch (e) {
      show(e.message, 'error')
    }
  }

  // ── TOGGLE TEMPLATE ACTIVE STATUS ───────────────────────────
  const handleToggle = async (id, current) => {
    try {
      setTemplates((prev) =>
        prev.map((t) => (t._id === id ? { ...t, isActive: !current } : t))
      )
      await PosterAPI.updateTemplate(id, { isActive: !current })
      show(!current ? 'Template Activated!' : 'Template Deactivated!')
      loadTemplates()
    } catch (e) {
      show(e.message, 'error')
      loadTemplates()
    }
  }

  // ── DELETE GENERATED POSTER (MODERATION) ───────────────────
  const handleDeleteGeneratedPoster = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Generated Poster?',
      text: 'This will remove the generated poster from the platform gallery.',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return

    try {
      setGenPosters((prev) => prev.filter((p) => p._id !== id))
      await PosterAPI.deleteAdminPoster(id)
      show('Poster removed!')
      loadGeneratedPosters()
    } catch (e) {
      show(e.message, 'error')
      loadGeneratedPosters()
    }
  }

  // Filter templates by search query
  const filteredTemplates = templates.filter((t) => {
    const title = (t.title || t.name || '').toLowerCase()
    const cat = (t.category || '').toLowerCase()
    const q = searchQuery.toLowerCase()
    return title.includes(q) || cat.includes(q)
  })

  return (
    <div className="space-y-4 pb-12">
      <Toast />

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            <Palette className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">Poster Studio</h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Manage election frames, festival templates &amp; citizen generated posters
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (activeTab === 'templates') loadTemplates()
              else loadGeneratedPosters()
            }}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => {
              setForm(EMPTY)
              setEditId(null)
              setFiles([])
              setPreviewUrl('')
              setShowForm(true)
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white rounded-xl shadow-sm transition-all"
            style={{ background: 'var(--primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Upload Template</span>
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 leading-tight">{templates.length}</p>
            <p className="text-[11px] font-bold text-gray-400">Total Templates</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 leading-tight">
              {templates.filter((t) => t.isActive).length}
            </p>
            <p className="text-[11px] font-bold text-gray-400">Active Templates</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 leading-tight">{cats.length}</p>
            <p className="text-[11px] font-bold text-gray-400">Categories</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900 leading-tight">{genTotal}</p>
            <p className="text-[11px] font-bold text-gray-400">Citizen Posters</p>
          </div>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex gap-2 bg-gray-100/80 p-1.5 rounded-2xl">
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'templates' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Poster Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'gallery' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Citizen Posters Gallery ({genTotal})</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: POSTER TEMPLATES                                   */}
      {/* ========================================================= */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {/* Search & Categories Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by title or category..."
                className="w-full pl-9 pr-4 h-10 rounded-2xl border border-gray-200 bg-white text-xs outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div className="flex gap-1.5 no-scrollbar overflow-x-auto pb-1">
              {['All', ...cats].map((c) => (
                <button
                  key={c}
                  onClick={() => setSelCat(c)}
                  className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all ${
                    selCat === c
                      ? 'text-white shadow-xs'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                  style={selCat === c ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <Skeleton rows={4} />
          ) : error ? (
            <ApiError message={error} onRetry={loadTemplates} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((t) => {
                const displayTitle = t.title || t.name || 'Untitled Template'
                const displayImg = resolveUrl(t.templateImageUrl || t.imageUrl)

                return (
                  <div
                    key={t._id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    {/* Image Preview */}
                    <div
                      className="h-48 relative flex items-center justify-center bg-gray-950 overflow-hidden cursor-pointer group"
                      onClick={() => navigate(`/posters/${t._id}`)}
                    >
                      {displayImg ? (
                        <img
                          src={displayImg}
                          alt={displayTitle}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <Palette className="w-12 h-12 text-white/30" />
                      )}

                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold bg-black/60 px-3 py-1.5 rounded-xl transition-opacity">
                          View Details
                        </span>
                      </div>

                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/90 text-gray-800 shadow-xs backdrop-blur-xs">
                          {t.category}
                        </span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        {t.dimensionPreset && (
                          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/70 text-white">
                            {t.dimensionPreset}
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-bold px-2.5 py-1 rounded-lg text-white shadow-xs ${
                            t.isActive ? 'bg-emerald-500' : 'bg-gray-500'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    {/* Content & Actions */}
                    <div className="p-4 space-y-3">
                      <div>
                        <h3
                          className="text-sm font-bold text-gray-800 line-clamp-1 cursor-pointer hover:underline"
                          title={displayTitle}
                          onClick={() => navigate(`/posters/${t._id}`)}
                        >
                          {displayTitle}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                          {t.description || 'No description provided'}
                        </p>
                      </div>

                      {/* Fields badge overview */}
                      <div className="flex flex-wrap gap-1">
                        {(t.fields || []).slice(0, 4).map((f) => (
                          <span
                            key={typeof f === 'string' ? f : f.key}
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                          >
                            {typeof f === 'string' ? f : f.label || f.key}
                          </span>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => openEdit(t._id)}
                          className="flex-1 text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleToggle(t._id, t.isActive)}
                          className={`flex-1 text-xs font-bold py-2 rounded-xl transition-colors cursor-pointer ${
                            t.isActive
                              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                        >
                          {t.isActive ? 'Disable' : 'Enable'}
                        </button>

                        <button
                          onClick={() => handleDeleteTemplate(t._id)}
                          className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                          title="Delete Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filteredTemplates.length === 0 && (
                <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center justify-center">
                  <Palette className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-base font-bold text-gray-700">No poster templates found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    Click "Upload Template" to upload a new festival or election banner frame.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: CITIZEN GENERATED POSTERS (GALLERY & MODERATION)   */}
      {/* ========================================================= */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={genSearch}
                onChange={(e) => setGenSearch(e.target.value)}
                placeholder="Search generated posters by citizen name or mobile..."
                className="w-full pl-9 pr-4 h-10 rounded-2xl border border-gray-200 bg-white text-xs outline-none focus:border-[var(--primary)]"
              />
            </div>
          </div>

          {genLoading ? (
            <Skeleton rows={4} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {genPosters.map((p) => {
                const img = resolveUrl(p.outputUrl)
                const userName = p.userId?.name || p.fieldValues?.name || 'Citizen'
                const userPhone = p.userId?.mobile || p.userId?.phone || ''
                const tTitle = p.templateId?.title || p.templateId?.name || 'Poster'

                return (
                  <div
                    key={p._id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                  >
                    <div className="h-56 relative bg-gray-950 flex items-center justify-center overflow-hidden">
                      {img ? (
                        <img src={img} alt={tTitle} className="w-full h-full object-contain p-2" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-white/30" />
                      )}

                      <div className="absolute top-3 left-3">
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white backdrop-blur-xs">
                          {tTitle}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span>{userName}</span>
                        </div>
                        {userPhone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                            <Phone className="w-3 h-3 text-gray-400" />
                            <span>{userPhone}</span>
                          </div>
                        )}
                        {p.createdAt && (
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                        {img && (
                          <a
                            href={img}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-gray-600" />
                            <span>Download</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleDeleteGeneratedPoster(p._id)}
                          className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors cursor-pointer"
                          title="Delete Generated Poster"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {genPosters.length === 0 && (
                <div className="col-span-full bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-base font-bold text-gray-700">No generated posters found</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    When citizens or workers generate personalized posters from the PWA, they will appear here.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT TEMPLATE MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">
                {editId ? 'Edit Poster Template' : 'Upload New Poster Frame'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-4">
              {/* Template Title */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Template Title / Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. महाशिवरात्रि शुभकामना पोस्टर"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Category & Dimension */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-3.5 h-11 text-xs outline-none bg-white"
                  >
                    {cats.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1.5 block">Dimension Preset</label>
                  <select
                    value={form.dimensionPreset}
                    onChange={(e) => setForm({ ...form, dimensionPreset: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-3.5 h-11 text-xs outline-none bg-white"
                  >
                    {DIMENSION_PRESETS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Image Upload */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  Template Frame Image (PNG / JPG / WEBP)
                </label>
                <div className="border border-dashed border-gray-300 rounded-2xl p-4 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = Array.from(e.target.files)
                      setFiles(f)
                      if (f[0]) {
                        setPreviewUrl(URL.createObjectURL(f[0]))
                      }
                    }}
                    className="hidden"
                    id="template-file-upload"
                  />
                  <label htmlFor="template-file-upload" className="cursor-pointer block">
                    {previewUrl ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={resolveUrl(previewUrl)}
                          alt="Preview"
                          className="w-32 h-32 object-contain rounded-xl border border-gray-200 mb-2 bg-white"
                        />
                        <span className="text-xs font-bold text-blue-600 hover:underline">Change image</span>
                      </div>
                    ) : (
                      <div className="py-4">
                        <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-xs font-bold text-gray-700">Click to choose template image file</span>
                        <p className="text-[11px] text-gray-400 mt-1">Recommended: 1080x1080px or 1080x1350px</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Editable Zones */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                  Editable Zones (नागरिक क्या-क्या बदल सकेंगे)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {FIELD_CONFIG.map((f) => {
                    const active = (form.fields || []).includes(f.key)
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => {
                          const cur = form.fields || []
                          setForm({
                            ...form,
                            fields: active ? cur.filter((k) => k !== f.key) : [...cur, f.key],
                          })
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          active
                            ? 'text-white border-transparent'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                        style={active ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Description / Note (Optional)</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. सभी कार्यकर्ताओं के लिए सोशल मीडिया पर बधाई संदेश साझा करने हेतु"
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-xs outline-none focus:border-[var(--primary)]"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Include Tenant Party Branding</p>
                    <p className="text-[10px] text-gray-400">Add party logo &amp; leader photo badge automatically</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.includeTenantBranding}
                    onChange={(e) => setForm({ ...form, includeTenantBranding: e.target.checked })}
                    className="w-4 h-4 text-primary rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Active Status</p>
                    <p className="text-[10px] text-gray-400">Show this template to citizens on the PWA</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 text-xs font-bold text-white rounded-2xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                style={{ background: 'var(--primary)' }}
              >
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Create Template'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 border border-gray-200 text-xs font-bold text-gray-700 rounded-2xl hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
