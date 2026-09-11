import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Image, Film, Play, Plus, X, ExternalLink, Trash2 } from 'lucide-react'
import { GalleryAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

export default function GalleryPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [tab, setTab] = useState('photos')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', category: '', youtubeUrl: '', description: '' })
  const [files, setFiles] = useState([])
  const [saving, setSaving] = useState(false)

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${BASE_URL}${url}`
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await GalleryAPI.getAll({ type: tab === 'photos' ? 'photo' : 'video', limit: 50, all: 'true' })
      const rawData = res?.data ?? res
      const galleryList = Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.gallery)
        ? rawData.gallery
        : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData)
        ? rawData
        : []
      setItems(galleryList)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    load()
  }, [load])

  const handleSave = async () => {
    if (!form.title.trim()) {
      show('Title is required', 'error')
      return
    }

    setSaving(true)
    try {
      if (tab === 'photos') {
        if (files.length === 0) {
          show('Please select at least one photo', 'error')
          setSaving(false)
          return
        }
        const up = await UploadAPI.uploadFiles('gallery', files)
        const uploadedUrls = up?.urls || up?.data?.urls || []
        if (uploadedUrls.length === 0) {
          throw new Error('Photo upload failed')
        }

        // Create gallery item for each uploaded photo
        for (const photoUrl of uploadedUrls) {
          await GalleryAPI.create({
            title: form.title.trim(),
            category: form.category?.trim() || undefined,
            description: form.description?.trim() || undefined,
            type: 'photo',
            url: photoUrl,
            isPublished: true,
          })
        }
      } else {
        const videoUrl = form.youtubeUrl?.trim()
        if (!videoUrl) {
          show('YouTube or video URL is required', 'error')
          setSaving(false)
          return
        }
        await GalleryAPI.create({
          title: form.title.trim(),
          category: form.category?.trim() || undefined,
          description: form.description?.trim() || undefined,
          type: 'video',
          url: videoUrl,
          isPublished: true,
        })
      }

      show('Added to gallery successfully!')
      setShowForm(false)
      setFiles([])
      setForm({ title: '', category: '', youtubeUrl: '', description: '' })
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Item?',
      text: 'Are you sure you want to delete this gallery item?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await GalleryAPI.remove(id)
      show('Deleted!')
      load()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Gallery</h1>
          <p className="text-xs text-gray-400">{items.length} items</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          {tab === 'photos' ? 'Add Photos' : 'Add Video'}
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {['photos', 'videos'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-bold rounded-xl capitalize transition-all cursor-pointer ${
              tab === t ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
            style={tab === t ? { background: 'var(--primary)' } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <h2 className="text-base font-bold text-gray-900">
                {tab === 'photos' ? 'Upload Gallery Photos' : 'Add Video Link'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Title *</label>
                <input
                  placeholder="e.g. Rally in Ward 12 or Press Conference"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] font-medium"
                />
              </div>

              {tab === 'videos' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    YouTube or Video URL *
                  </label>
                  <input
                    value={form.youtubeUrl}
                    onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=... or https://youtu.be/..."
                    className="w-full border border-gray-200 rounded-xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] font-medium"
                  />
                </div>
              )}

              {tab === 'photos' && (
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Upload Photos *</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2.5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[var(--primary-light)] file:text-[var(--primary)] cursor-pointer"
                  />
                  {files.length > 0 && (
                    <p className="text-xs mt-1.5 font-bold" style={{ color: 'var(--primary)' }}>
                      {files.length} photo(s) selected
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Category (Optional)
                </label>
                <input
                  placeholder="e.g. Campaign, Jan Sabha, Social Work"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 px-5 border-t border-gray-100 shrink-0 bg-gray-50/50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 h-11 text-sm font-bold disabled:opacity-70 shadow"
              >
                {saving ? 'Saving...' : 'Save to Gallery'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 border border-gray-200 hover:bg-gray-100 text-sm font-bold rounded-2xl text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Skeleton rows={4} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <>
          {tab === 'photos' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item) => {
                const imgUrl = resolveUrl(item.url || item.images?.[0])

                return (
                  <div
                    key={item._id}
                    onClick={() => navigate(`/gallery/${item._id}`)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between cursor-pointer active:scale-[0.99]"
                  >
                    <div className="h-36 bg-gray-100 relative overflow-hidden flex items-center justify-center">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: 'var(--primary-light)' }}
                        >
                          <Image className="w-8 h-8 text-[var(--primary)] opacity-40" />
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(item._id)
                        }}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center font-bold shadow transition-transform active:scale-95"
                        title="Delete Photo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3">
                      <p className="text-xs font-bold text-gray-800 truncate">{item.title || '—'}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        {item.category || 'General'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  onClick={() => navigate(`/gallery/${item._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-xs p-4 flex items-center justify-between gap-3 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center shrink-0 border border-red-100">
                      <Play className="w-5 h-5 text-red-600 fill-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.title || '—'}</p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.category || 'Video'}</p>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-semibold text-blue-600 flex items-center gap-1 mt-1 hover:underline truncate"
                        >
                          Watch Video <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(item._id)
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                    title="Delete Video"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {items.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                {tab === 'photos' ? (
                  <Image className="w-7 h-7 text-gray-300" />
                ) : (
                  <Film className="w-7 h-7 text-gray-300" />
                )}
              </div>
              <p className="text-base font-bold text-gray-700">No {tab} found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Click "+ Add {tab === 'photos' ? 'Photos' : 'Video'}" to upload media to your constituency gallery.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
