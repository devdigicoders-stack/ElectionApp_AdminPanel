import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Image, Film, Camera, Trash2, Calendar, Tag, ExternalLink } from 'lucide-react'
import { GalleryAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

export default function GalleryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${BASE_URL}${url}`
  }

  const getEmbedUrl = (url) => {
    if (!url) return ''
    if (url.includes('embed/')) return url
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}`
    }
    return url.replace('watch?v=', 'embed/')
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await GalleryAPI.getOne(id)
      const data = res?.data ?? res
      setItem(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete Gallery Item?',
      text: 'Are you sure you want to delete this item from the gallery?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await GalleryAPI.remove(id)
      show('Deleted!')
      navigate(-1)
    } catch (e) {
      show(e.message, 'error')
    }
  }

  if (loading) return <Skeleton rows={5} />
  if (error) return <ApiError message={error} onRetry={load} />

  const g = item || {}
  const isVideo = g.type === 'video'
  const mediaUrl = g.url || g.videoUrl || g.youtubeUrl || g.images?.[0]
  const resolvedMedia = resolveUrl(mediaUrl)

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <Toast />

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-bold hover:underline cursor-pointer"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gallery
        </button>

        <button
          onClick={handleDelete}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors shadow-2xs cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>

      {/* Main Media Showcase */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {isVideo ? (
          <div className="aspect-video bg-black flex items-center justify-center">
            {mediaUrl ? (
              <iframe
                src={getEmbedUrl(mediaUrl)}
                className="w-full h-full"
                allowFullScreen
                title={g.title || 'Gallery Video'}
              />
            ) : (
              <div className="text-center text-white p-8">
                <Play className="w-12 h-12 mb-3 mx-auto opacity-70" />
                <p className="text-sm opacity-70">Video URL not available</p>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full min-h-[300px] max-h-[550px] bg-gray-900 flex items-center justify-center overflow-hidden">
            {resolvedMedia ? (
              <img
                src={resolvedMedia}
                alt={g.title}
                className="w-full h-auto max-h-[550px] object-contain"
              />
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-gray-400">
                <Image className="w-12 h-12 mb-2 opacity-40 text-[var(--primary)]" />
                <p className="text-xs font-semibold">No Image Available</p>
              </div>
            )}
          </div>
        )}

        {/* Media Details */}
        <div className="p-6 sm:p-7 space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
                <Tag className="w-3 h-3 text-gray-400" />
                {g.category || 'General'}
              </span>

              <span
                className="text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                {isVideo ? <Film className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                {isVideo ? 'Video' : 'Photo'}
              </span>

              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  g.isPublished !== false
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {g.isPublished !== false ? 'Published Live' : 'Draft'}
              </span>
            </div>

            <h1 className="text-2xl font-black text-gray-900 leading-snug">
              {g.title || 'Untitled'}
            </h1>
          </div>

          {/* Details Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Added Date
              </p>
              <p className="text-sm font-bold text-gray-800 mt-1">
                {g.createdAt
                  ? new Date(g.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>

            {isVideo && mediaUrl && (
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Video Source
                  </p>
                  <p className="text-sm font-bold text-gray-800 mt-1 truncate max-w-[200px]">
                    YouTube Link
                  </p>
                </div>
                <a
                  href={mediaUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  Open <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Description */}
          {g.description && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">
                Description
              </p>
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50/80 rounded-2xl p-4 border border-gray-100 whitespace-pre-wrap font-medium">
                {g.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
