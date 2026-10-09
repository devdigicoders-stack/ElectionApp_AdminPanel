import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText,
  FileDown,
  Upload,
  Image as ImageIcon,
  Plus,
  X,
  ExternalLink,
  Trash2,
  Edit3,
  CheckCircle2,
  Calendar,
  Search,
  Eye,
  FileCheck
} from 'lucide-react'
import { ManifestoAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY_FORM = {
  title: '',
  fileUrl: '',
  pdfUrl: '',
  coverImageUrl: '',
  fileType: '', // 'pdf' | 'image'
  isPublished: true,
}

const resolveFileUrl = (url) => {
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

const isPdf = (url, fileType) => {
  if (fileType === 'pdf') return true
  if (!url || typeof url !== 'string') return false
  return url.toLowerCase().includes('.pdf') || url.toLowerCase().startsWith('data:application/pdf')
}

export default function ManifestoPage() {
  const { show, Toast } = useToast()
  const fileInputRef = useRef(null)

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')

  // Form / Modal States
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [localFilePreview, setLocalFilePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  // Fetch Manifestos
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await ManifestoAPI.getAll({ limit: 50 })
      const data = res?.data ?? res
      const list = Array.isArray(data?.items ?? data?.manifesto ?? data)
        ? data?.items ?? data?.manifesto ?? data
        : []
      setItems(list)
    } catch (e) {
      setError(e.message || 'Failed to load manifestos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Open Create Modal
  const openCreate = () => {
    setForm(EMPTY_FORM)
    setLocalFilePreview('')
    setEditId(null)
    setShowForm(true)
  }

  // Open Edit Modal
  const openEdit = (item) => {
    const mainFile = item.pdfUrl || item.fileUrl || item.coverImageUrl || item.images?.[0] || ''
    const type = item.fileType || (isPdf(mainFile) ? 'pdf' : 'image')
    setForm({
      title: item.title || '',
      fileUrl: mainFile,
      pdfUrl: isPdf(mainFile, type) ? mainFile : '',
      coverImageUrl: !isPdf(mainFile, type) ? mainFile : '',
      fileType: type,
      isPublished: item.isPublished !== false,
    })
    setLocalFilePreview(mainFile ? resolveFileUrl(mainFile) : '')
    setEditId(item._id)
    setShowForm(true)
  }

  // File Upload Handler (Image or PDF)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isPdfType = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const detectedType = isPdfType ? 'pdf' : 'image'

    // Instant local blob preview
    const localBlob = URL.createObjectURL(file)
    setLocalFilePreview(localBlob)
    setForm((prev) => ({
      ...prev,
      fileType: detectedType,
    }))
    setUploading(true)

    try {
      const res = await UploadAPI.uploadFiles('manifesto', file)
      const uploadedUrl = res?.urls?.[0] || res?.url || ''
      if (uploadedUrl) {
        setForm((prev) => ({
          ...prev,
          fileUrl: uploadedUrl,
          pdfUrl: isPdfType ? uploadedUrl : '',
          coverImageUrl: !isPdfType ? uploadedUrl : '',
          fileType: detectedType,
        }))
        show(`${isPdfType ? 'PDF' : 'Image'} uploaded successfully!`)
      }
    } catch (err) {
      show(err.message || 'File upload failed', 'error')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Save / Update Manifesto
  const handleSave = async (e) => {
    e?.preventDefault()
    if (!form.title.trim()) {
      show('Manifesto Title is required', 'error')
      return
    }

    setSaving(true)
    try {
      const isPdfSelected = form.fileType === 'pdf' || isPdf(form.fileUrl)
      const payload = {
        title: form.title.trim(),
        fileUrl: form.fileUrl || undefined,
        pdfUrl: isPdfSelected ? form.fileUrl : undefined,
        coverImageUrl: !isPdfSelected ? form.fileUrl : undefined,
        fileType: isPdfSelected ? 'pdf' : 'image',
        images: !isPdfSelected && form.fileUrl ? [form.fileUrl] : [],
        isPublished: Boolean(form.isPublished),
      }

      if (editId) {
        await ManifestoAPI.update(editId, payload)
        show('Manifesto updated successfully!')
      } else {
        await ManifestoAPI.create(payload)
        show('Manifesto uploaded successfully!')
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY_FORM)
      setLocalFilePreview('')
      load()
    } catch (e) {
      show(e.message || 'Failed to save manifesto', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Manifesto
  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Manifesto?',
      text: 'Are you sure you want to delete this manifesto document?',
      confirmButtonText: 'Yes, Delete',
      icon: 'warning',
    })
    if (!confirmed) return
    try {
      await ManifestoAPI.remove(id)
      show('Manifesto deleted!')
      load()
    } catch (e) {
      show(e.message || 'Delete failed', 'error')
    }
  }

  // Quick Toggle Published
  const handleTogglePublish = async (item) => {
    try {
      const nextStatus = !item.isPublished
      await ManifestoAPI.update(item._id, { isPublished: nextStatus })
      show(nextStatus ? 'Published to citizens!' : 'Changed to draft')
      load()
    } catch (e) {
      show(e.message || 'Status update failed', 'error')
    }
  }

  // Filter items by search
  const filteredItems = items.filter((item) =>
    item.title?.toLowerCase().includes(search.toLowerCase().trim())
  )

  return (
    <div className="space-y-5 pb-28 sm:pb-12 max-w-6xl mx-auto">
      <Toast />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary-light)' }}
            >
              <FileText className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Manifesto / Sankalp Patra</h1>
              <p className="text-xs text-gray-400 font-medium">
                Upload your election manifesto as a PDF document or image poster
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={openCreate}
          className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-2xl shadow-sm hover:shadow transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Manifesto</span>
        </button>
      </div>

      {/* Search Bar */}
      {items.length > 0 && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search manifesto documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 h-10 text-xs font-medium outline-none focus:border-[var(--primary)] text-gray-700 shadow-xs"
          />
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs flex flex-col items-center justify-center max-w-lg mx-auto space-y-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center"
            style={{ background: 'var(--primary-light)' }}
          >
            <FileText className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <h3 className="text-base font-bold text-gray-800">No Manifesto Documents Yet</h3>
          <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
            Upload your party's election manifesto in PDF or Image format so citizens can read and download it on the PWA app.
          </p>
          <button
            onClick={openCreate}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl mt-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Upload Manifesto Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const file = item.pdfUrl || item.fileUrl || item.coverImageUrl || item.images?.[0] || ''
            const itemIsPdf = item.fileType === 'pdf' || isPdf(file)
            const fullFileUrl = resolveFileUrl(file)

            return (
              <div
                key={item._id}
                className="bg-white rounded-3xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all group"
              >
                <div>
                  {/* Card Header: Type Badge & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                        itemIsPdf
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}
                    >
                      {itemIsPdf ? (
                        <>
                          <FileText className="w-3.5 h-3.5 text-red-600" />
                          <span>PDF Document</span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Image Poster</span>
                        </>
                      )}
                    </span>

                    <button
                      onClick={() => handleTogglePublish(item)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all ${
                        item.isPublished
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      }`}
                      title="Click to toggle publish"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.isPublished ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      <span>{item.isPublished ? 'Published' : 'Draft'}</span>
                    </button>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-black text-gray-900 line-clamp-2 leading-snug mb-3">
                    {item.title}
                  </h3>

                  {/* File Preview Area */}
                  {file ? (
                    itemIsPdf ? (
                      <div className="bg-red-50/60 border border-red-100 rounded-2xl p-4 flex items-center justify-between gap-3 mb-4 group-hover:border-red-200 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-800 truncate">
                              {file.split('/').pop() || 'Manifesto Document.pdf'}
                            </p>
                            <p className="text-[10px] text-red-500 font-semibold">
                              Portable Document Format
                            </p>
                          </div>
                        </div>

                        <a
                          href={fullFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-2 rounded-xl bg-white border border-red-100 hover:bg-red-50 text-red-600 transition-colors"
                          title="Open / Download PDF"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    ) : (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 mb-4 group/img">
                        <img
                          src={fullFileUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                        />
                        <a
                          href={fullFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
                          title="View Full Image"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-4 text-center border border-gray-100 text-gray-400 text-xs font-medium mb-4">
                      No document file attached
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleDateString('en-IN')
                        : '—'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {file && (
                      <a
                        href={fullFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>
                    )}

                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(item._id)}
                      className="p-1.5 rounded-xl hover:bg-red-50 text-red-500 transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── UPLOAD / EDIT MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-black text-gray-900">
                  {editId ? 'Edit Manifesto' : 'Upload Manifesto'}
                </h2>
                <p className="text-[11px] text-gray-400 font-medium">
                  Provide title and upload your PDF document or Image
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="overflow-y-auto p-6 space-y-4 text-xs font-semibold">
              {/* Manifesto Title */}
              <div>
                <label className="text-gray-700 mb-1.5 block">
                  Manifesto Title / Heading <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Election Manifesto 2026 / Chunav Sankalp Patra"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-xs outline-none focus:border-[var(--primary)] font-bold text-gray-900"
                />
              </div>

              {/* Upload File Box (Image or PDF) */}
              <div>
                <label className="text-gray-700 mb-1.5 block flex items-center justify-between">
                  <span>
                    Upload File (PDF Document or Image) <span className="text-red-500">*</span>
                  </span>
                  {uploading && (
                    <span className="text-[11px] text-[var(--primary)] flex items-center gap-1 font-bold">
                      <Upload className="w-3 h-3 animate-bounce" /> Uploading...
                    </span>
                  )}
                </label>

                {/* Upload Button & Hidden Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {!form.fileUrl && !localFilePreview ? (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-[var(--primary)] rounded-2xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 hover:bg-gray-50 flex flex-col items-center justify-center gap-2 group"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-transform"
                      style={{ background: 'var(--primary-light)' }}
                    >
                      <Upload className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">
                        Click to browse or drop your file here
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Supports PDF documents or JPG, PNG, WEBP images (Up to 50MB)
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-gray-50 p-4">
                    {/* If PDF preview */}
                    {form.fileType === 'pdf' || isPdf(form.fileUrl || localFilePreview) ? (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0 pr-8">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {form.fileUrl ? form.fileUrl.split('/').pop() : 'Selected PDF Document'}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-green-500" /> PDF Ready
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* If Image preview */
                      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-gray-200 bg-white">
                        <img
                          src={localFilePreview || resolveFileUrl(form.fileUrl)}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" /> Image Ready
                        </div>
                      </div>
                    )}

                    {/* Change / Remove Button */}
                    <div className="mt-3 pt-3 border-t border-gray-200/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer"
                      >
                        Change File
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, fileUrl: '', pdfUrl: '', coverImageUrl: '', fileType: '' })
                          setLocalFilePreview('')
                        }}
                        className="text-xs font-bold text-red-500 hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Publication Status Toggle */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">Publish Live</p>
                  <p className="text-[10px] text-gray-400 font-normal">
                    When active, citizens can view and download this manifesto on the app
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                  className="relative w-11 h-6 rounded-full transition-colors cursor-pointer shrink-0"
                  style={{ background: form.isPublished ? 'var(--primary)' : '#d1d5db' }}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      form.isPublished ? 'left-5.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-11 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="btn-primary flex-1 h-11 rounded-xl text-white font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <span>Saving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{editId ? 'Update Manifesto' : 'Save Manifesto'}</span>
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

