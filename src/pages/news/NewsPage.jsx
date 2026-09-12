import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Newspaper,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Upload,
  Image as ImageIcon,
  Star,
  Eye,
  Calendar,
  Share2,
  Trash2,
  Edit3,
  CheckCircle2,
  Archive,
  FileEdit,
  Tag,
  Clock,
  User,
  Filter
} from 'lucide-react'
import { NewsAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog, successAlert, errorAlert } from '../../utils/sweetAlert'
import { Editor } from '@tinymce/tinymce-react'

const TINYMCE_API_KEY = import.meta.env.VITE_TINYMCE_API_KEY || ''

const CATEGORIES = [
  'Blog',
  'News',
  'Press Release',
  'Announcement',
  'Article',
  'Leader Message',
  'Achievement',
  'Event',
]

const EMPTY_FORM = {
  title: '',
  shortDescription: '',
  content: '',
  category: 'Blog',
  status: 'published',
  coverImageUrl: '',
  tags: '',
  authorName: '',
  isFeatured: false,
  allowSharing: true,
  scheduledPublishDate: '',
}

const statusColor = {
  published: 'bg-green-100 text-green-700 border-green-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  archived: 'bg-red-100 text-red-700 border-red-200',
}

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) return ''
  const trimmed = url.trim()
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }
  const cleanBase = (BASE_URL || 'http://localhost:3001').replace(/\/+$/, '')
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${cleanBase}${cleanPath}`
}

export default function NewsPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const fileInputRef = useRef(null)

  // List & Filter States
  const [tab, setTab] = useState('all') // 'all' | 'published' | 'draft' | 'scheduled' | 'archived'
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  // Form / Modal States
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageError, setImageError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editId, setEditId] = useState(null)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(search.trim())
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Load news list & stats from backend
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (tab !== 'all') params.status = tab
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (searchQuery) params.search = searchQuery

      const [res, st] = await Promise.all([
        NewsAPI.getAllAdmin(params),
        NewsAPI.getStats().catch(() => null),
      ])

      const data = res?.data ?? res
      const newsList = Array.isArray(data?.news)
        ? data.news
        : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : []

      setItems(newsList)
      setTotal(data?.total ?? data?.meta?.total ?? newsList.length)
      setStats(st?.data ?? st)
    } catch (e) {
      setError(e.message || 'Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [tab, categoryFilter, searchQuery, page])

  useEffect(() => {
    load()
  }, [load])

  // Open Edit Modal with all fields pre-filled
  const openEdit = (item) => {
    const img = item.coverImageUrl || item.featuredImage || ''
    setForm({
      title: item.title || '',
      shortDescription: item.shortDescription || item.summary || '',
      content: item.content || '',
      category: item.category || 'Blog',
      status: item.status || 'published',
      coverImageUrl: img,
      tags: Array.isArray(item.tags) ? item.tags.join(', ') : item.tags || '',
      authorName: item.author?.name || '',
      isFeatured: !!item.isFeatured,
      allowSharing: item.allowSharing !== false,
      scheduledPublishDate: item.scheduledPublishDate
        ? new Date(item.scheduledPublishDate).toISOString().slice(0, 16)
        : '',
    })
    setPreviewUrl(img ? resolveImageUrl(img) : '')
    setImageError(false)
    setEditId(item._id)
    setShowForm(true)
  }

  // Open Create Modal
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setPreviewUrl('')
    setImageError(false)
    setEditId(null)
    setShowForm(true)
  }

  // Image Upload Handler with Instant Local Preview
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 1. Instant local preview so user immediately sees their photo!
    const localBlob = URL.createObjectURL(file)
    setPreviewUrl(localBlob)
    setImageError(false)
    setUploadingImage(true)

    try {
      const res = await UploadAPI.uploadFiles('news', file)
      const uploadedUrl = res?.urls?.[0] || res?.url || ''
      if (uploadedUrl) {
        setForm((prev) => ({ ...prev, coverImageUrl: uploadedUrl }))
        setPreviewUrl(resolveImageUrl(uploadedUrl))
        show('Cover image uploaded successfully!')
      }
    } catch (err) {
      show(err.message || 'Image upload failed', 'error')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Save / Update Article
  const handleSave = async (e) => {
    e?.preventDefault()
    if (!form.title.trim()) {
      show('Article Title is required', 'error')
      return
    }
    if (!form.shortDescription.trim()) {
      show('Short Description / Summary is required', 'error')
      return
    }
    const strippedContent = (form.content || '').replace(/<[^>]*>/g, '').trim()
    if (!strippedContent && !form.content.includes('<img')) {
      show('Full Article Body / Content is required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim(),
        content: form.content,
        category: form.category,
        status: form.status,
        coverImageUrl: form.coverImageUrl.trim() || undefined,
        isFeatured: Boolean(form.isFeatured),
        allowSharing: Boolean(form.allowSharing),
      }

      if (form.tags.trim()) {
        payload.tags = form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      }

      if (form.authorName.trim()) {
        payload.author = {
          name: form.authorName.trim(),
          role: 'Admin',
        }
      }

      if (form.status === 'scheduled' && form.scheduledPublishDate) {
        payload.scheduledPublishDate = new Date(form.scheduledPublishDate).toISOString()
      }

      if (editId) {
        await NewsAPI.update(editId, payload)
        successAlert('Updated!', 'Blog / News article updated successfully.')
      } else {
        await NewsAPI.create(payload)
        successAlert('Created!', 'Blog / News article published successfully.')
      }

      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      setPreviewUrl('')
      setImageError(false)
      load()
    } catch (e) {
      errorAlert('Save Failed', e.message || 'Failed to save article')
    } finally {
      setSaving(false)
    }
  }

  // Quick Status Transition
  const handleStatusChange = async (id, status) => {
    try {
      await NewsAPI.updateStatus(id, status)
      show(`Status changed to ${status}!`)
      load()
    } catch (e) {
      show(e.message || 'Failed to update status', 'error')
    }
  }

  // Permanent Delete
  const handleDelete = async (id, title) => {
    const confirmed = await confirmDialog({
      title: 'Delete Article?',
      text: `Are you sure you want to permanently delete "${title || 'this article'}"? This action cannot be undone.`,
      confirmButtonText: 'Yes, Delete Permanently',
      icon: 'warning',
    })
    if (!confirmed) return

    try {
      await NewsAPI.remove(id)
      successAlert('Deleted!', 'Article has been permanently removed.')
      load()
    } catch (e) {
      errorAlert('Delete Failed', e.message || 'Failed to delete article')
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-16">
      <Toast />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900">Blog & News Management</h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              Tenant Admin
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Create, publish and manage articles, press releases, and campaign blogs
          </p>
        </div>

        <button
          onClick={openCreate}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create Blog / News
        </button>
      </div>

      {/* ── STATS CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">{stats?.total ?? total}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Articles</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-green-600">{stats?.published ?? 0}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Published Live</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-amber-600">{stats?.draft ?? 0}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">In Draft</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <p className="text-lg font-black text-blue-600">
              {(stats?.totalViews ?? stats?.views ?? 0).toLocaleString()}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Reads / Views</p>
          </div>
        </div>
      </div>

      {/* ── SEARCH & FILTER CONTROLS ── */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search title, description or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-8 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[var(--primary)]"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none pr-8 cursor-pointer h-9"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {(search || categoryFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('')
                setCategoryFilter('all')
                setPage(1)
              }}
              className="text-xs font-bold text-red-500 hover:text-red-700 shrink-0 px-2 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-gray-50">
          {[
            { id: 'all', label: 'All Articles' },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'scheduled', label: 'Scheduled' },
            { id: 'archived', label: 'Archived' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id)
                setPage(1)
              }}
              className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                tab === t.id
                  ? 'text-white border-transparent'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
              }`}
              style={tab === t.id ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CREATE / EDIT MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 md:p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-black text-gray-900">
                  {editId ? 'Edit Blog / News Article' : 'Create New Blog / News Article'}
                </h2>
                <p className="text-[11px] text-gray-400">All fields are saved directly to your tenant partition</p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 text-xs font-semibold">
              {/* Title */}
              <div>
                <label className="text-gray-700 mb-1 block">
                  Title / Headline <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mega Youth Rally & New Development Projects Inaugurated"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-[var(--primary)] font-bold text-gray-900"
                />
              </div>

              {/* Category & Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 mb-1 block">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs font-bold outline-none bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 mb-1 block">
                    Publication Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs font-bold outline-none bg-white"
                  >
                    <option value="published">🟢 Published Live (Immediately)</option>
                    <option value="draft">⚪ Save as Draft (Hidden)</option>
                    <option value="scheduled">🔵 Scheduled for Future</option>
                    <option value="archived">🔴 Archived</option>
                  </select>
                </div>
              </div>

              {/* If Scheduled: Pick Date & Time */}
              {form.status === 'scheduled' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 space-y-1">
                  <label className="text-blue-900 font-bold block flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    Scheduled Publish Date & Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={form.scheduledPublishDate}
                    onChange={(e) => setForm({ ...form, scheduledPublishDate: e.target.value })}
                    className="w-full border border-blue-200 bg-white rounded-xl px-3 h-9 text-xs outline-none font-bold"
                  />
                  <p className="text-[10px] text-blue-600">
                    The backend will automatically publish this article once this time arrives.
                  </p>
                </div>
              )}

              {/* Short Description */}
              <div>
                <label className="text-gray-700 mb-1 block">
                  Short Description / Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="A concise 1-2 sentence overview displayed in social cards and list previews..."
                  value={form.shortDescription}
                  onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs outline-none resize-none focus:border-[var(--primary)] text-gray-700 leading-relaxed"
                />
              </div>

              {/* Cover Image Upload & URL */}
              <div>
                <label className="text-gray-700 mb-1 block flex items-center justify-between">
                  <span>Cover / Featured Photo</span>
                  {uploadingImage && (
                    <span className="text-amber-600 text-[10px] font-bold flex items-center gap-1 animate-pulse">
                      <Upload className="w-3 h-3 animate-bounce" /> Uploading image to server...
                    </span>
                  )}
                </label>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Paste Image URL or click Upload Photo..."
                      value={form.coverImageUrl}
                      onChange={(e) => {
                        setForm({ ...form, coverImageUrl: e.target.value })
                        setPreviewUrl(e.target.value)
                        setImageError(false)
                      }}
                      className="flex-1 border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)] text-gray-700 font-normal"
                    />
                    <button
                      type="button"
                      disabled={uploadingImage}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center gap-1.5 text-xs transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {uploadingImage ? 'Uploading...' : 'Upload'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Thumbnail Preview Box */}
                  {(previewUrl || form.coverImageUrl) && (
                    <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center group shadow-xs">
                      {!imageError ? (
                        <img
                          key={previewUrl || form.coverImageUrl}
                          src={resolveImageUrl(previewUrl || form.coverImageUrl)}
                          alt="Preview"
                          className="w-full h-full object-cover"
                          onError={() => setImageError(true)}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400 p-4 text-center">
                          <ImageIcon className="w-8 h-8 text-gray-300 mb-1" />
                          <p className="text-[11px] font-semibold text-gray-500">Image could not be rendered</p>
                          <p className="text-[10px] text-gray-400 font-mono truncate max-w-xs mt-0.5">
                            {form.coverImageUrl}
                          </p>
                        </div>
                      )}

                      {/* Uploading progress overlay */}
                      {uploadingImage && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-1.5 z-10">
                          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-xs font-bold">Uploading image...</span>
                        </div>
                      )}

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, coverImageUrl: '' })
                          setPreviewUrl('')
                          setImageError(false)
                        }}
                        className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-black text-white p-1.5 rounded-full cursor-pointer shadow-md transition-all hover:scale-110 z-20"
                        title="Remove Image"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {/* Status Ready tag */}
                      {form.coverImageUrl && !uploadingImage && !imageError && (
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 z-10">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                          <span>Image Ready</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Full Content with TinyMCE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-gray-700 block">
                    Full Article Body / Content (Rich Text) <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-normal">
                    Powered by TinyMCE • Supports formatting, tables, code & images
                  </span>
                </div>
                <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-xs focus-within:border-[var(--primary)] transition-colors">
                  <Editor
                    key={editId || 'create-article-tinymce'}
                    {...(TINYMCE_API_KEY
                      ? { apiKey: TINYMCE_API_KEY }
                      : { tinymceScriptSrc: 'https://cdn.jsdelivr.net/npm/tinymce@6.8.3/tinymce.min.js' })}
                    value={form.content}
                    onEditorChange={(newContent) =>
                      setForm((prev) => ({ ...prev, content: newContent }))
                    }
                    init={{
                      height: 380,
                      menubar: 'file edit view insert format tools table help',
                      plugins: [
                        'advlist',
                        'autolink',
                        'lists',
                        'link',
                        'image',
                        'charmap',
                        'preview',
                        'anchor',
                        'searchreplace',
                        'visualblocks',
                        'code',
                        'fullscreen',
                        'insertdatetime',
                        'media',
                        'table',
                        'help',
                        'wordcount',
                        'directionality',
                      ],
                      toolbar:
                        'undo redo | blocks fontfamily fontsize | ' +
                        'bold italic underline forecolor backcolor | alignleft aligncenter ' +
                        'alignright alignjustify | bullist numlist outdent indent | ' +
                        'link image media table blockquote | removeformat code fullscreen',
                      branding: false,
                      promotion: false,
                      content_style:
                        'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; padding: 12px; }',
                      images_upload_handler: async (blobInfo) => {
                        try {
                          const file = blobInfo.blob()
                          const res = await UploadAPI.uploadFiles('news', file)
                          const uploadedUrl = res?.urls?.[0] || res?.url || ''
                          if (uploadedUrl) {
                            return resolveImageUrl(uploadedUrl)
                          }
                          throw new Error('Upload failed')
                        } catch (err) {
                          throw new Error(err.message || 'Image upload failed')
                        }
                      },
                    }}
                  />
                </div>
              </div>

              {/* Tags & Author */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 mb-1 block flex items-center gap-1">
                    <Tag className="w-3 h-3 text-gray-400" /> Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. rally, roads, youths, election"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-9 text-xs outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-gray-700 mb-1 block flex items-center gap-1">
                    <User className="w-3 h-3 text-gray-400" /> Author / Spokesperson
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Office of Leader / Media Cell"
                    value={form.authorName}
                    onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-9 text-xs outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* Feature & Share Toggles */}
              <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isFeatured}
                    onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="font-bold text-gray-800 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Feature this Article (Pin to Top & Highlight on PWA)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.allowSharing}
                    onChange={(e) => setForm({ ...form, allowSharing: e.target.checked })}
                    className="w-4 h-4 rounded text-[var(--primary)] accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="font-bold text-gray-800 flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    Allow WhatsApp & Social Sharing Buttons for Citizens
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 h-11 text-xs font-bold shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving Article...' : editId ? 'Update Article' : 'Publish Article'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 border border-gray-200 text-xs font-bold rounded-2xl text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ARTICLES LIST ── */}
      {loading ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <>
          <div className="space-y-3">
            {items.map((item) => {
              const cover = resolveImageUrl(item.coverImageUrl || item.featuredImage)
              const statusClass = statusColor[item.status?.toLowerCase()] || statusColor.draft
              const tagList = Array.isArray(item.tags) ? item.tags : []

              return (
                <div
                  key={item._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail Image */}
                    <div
                      onClick={() => navigate(`/news/${item._id}`)}
                      className="w-20 h-20 rounded-2xl bg-gray-100 shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center cursor-pointer relative"
                    >
                      {cover ? (
                        <img
                          src={cover}
                          alt={item.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              const fallback = parent.querySelector('.news-thumb-fallback')
                              if (fallback) fallback.style.display = 'flex'
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="news-thumb-fallback w-full h-full items-center justify-center text-gray-300"
                        style={{ display: cover ? 'none' : 'flex' }}
                      >
                        <Newspaper className="w-8 h-8" />
                      </div>
                      {item.isFeatured && (
                        <span className="absolute top-1 left-1 bg-amber-500 text-white p-0.5 rounded-md shadow-xs">
                          <Star className="w-3 h-3 fill-white" />
                        </span>
                      )}
                    </div>

                    {/* Meta & Title */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                          {item.category || 'Blog'}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${statusClass}`}>
                          {item.status}
                        </span>
                        {item.viewsCount > 0 && (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {item.viewsCount.toLocaleString()}
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => navigate(`/news/${item._id}`)}
                        className="text-sm font-black text-gray-900 leading-snug line-clamp-1 hover:text-[var(--primary)] cursor-pointer transition-colors"
                      >
                        {item.title}
                      </h3>

                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                        {item.shortDescription || item.summary || 'No summary provided.'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-2 flex-wrap font-semibold">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {item.publishDate
                            ? new Date(item.publishDate).toLocaleDateString('en-IN')
                            : item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString('en-IN')
                            : '—'}
                        </span>

                        {item.author?.name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {item.author.name}
                          </span>
                        )}

                        {tagList.slice(0, 3).map((tg) => (
                          <span key={tg} className="text-gray-500 bg-gray-50 px-1.5 py-0.2 rounded font-medium">
                            #{tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {item.status === 'draft' && (
                      <button
                        onClick={() => handleStatusChange(item._id, 'published')}
                        className="text-[11px] font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        title="Publish Live"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Publish
                      </button>
                    )}

                    {item.status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(item._id, 'archived')}
                        className="text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                        title="Archive"
                      >
                        <Archive className="w-3 h-3" />
                        Archive
                      </button>
                    )}

                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 rounded-xl transition-all cursor-pointer"
                      title="Edit Article"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item._id, item.title)}
                      className="p-1.5 text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xl transition-all cursor-pointer"
                      title="Delete Article"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {items.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <Newspaper className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-700">No blog or news articles found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Click the "+ Create Blog / News" button above to publish your first press release, news article or campaign update.
              </p>
              <button
                onClick={openCreate}
                className="btn-primary mt-4 text-xs font-bold px-4 py-2 cursor-pointer"
              >
                + Create First Article
              </button>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs font-bold disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--primary)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-gray-400 font-semibold">
                Page {page} of {Math.ceil(total / limit)} ({total} articles)
              </span>
              <button
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-bold disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--primary)' }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
