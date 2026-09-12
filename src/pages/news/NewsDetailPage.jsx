import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Newspaper,
  CheckCircle2,
  Archive,
  FileEdit,
  Trash2,
  Eye,
  Calendar,
  User,
  Tag,
  Share2,
  Clock
} from 'lucide-react'
import { NewsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog, successAlert, errorAlert } from '../../utils/sweetAlert'

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
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  return `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`
}

export default function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await NewsAPI.getOne(id)
      setArticle(res?.data ?? res)
    } catch (e) {
      setError(e.message || 'Failed to load article')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleStatusChange = async (status) => {
    setUpdating(true)
    try {
      await NewsAPI.updateStatus(id, status)
      show(`Status updated to ${status}!`)
      load()
    } catch (e) {
      show(e.message || 'Failed to update status', 'error')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete Article?',
      text: 'Are you sure you want to permanently delete this article?',
      confirmButtonText: 'Yes, Delete Permanently',
      icon: 'warning',
    })
    if (!confirmed) return
    try {
      await NewsAPI.remove(id)
      successAlert('Deleted!', 'Article has been removed.')
      navigate('/news', { replace: true })
    } catch (e) {
      errorAlert('Delete Failed', e.message || 'Failed to delete article')
    }
  }

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  const a = article || {}
  const cover = resolveImageUrl(a.coverImageUrl || a.featuredImage)
  const tagList = Array.isArray(a.tags) ? a.tags : []

  return (
    <div className="space-y-4 max-w-3xl mx-auto pb-16">
      <Toast />

      {/* Top Back Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/news')}
          className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog & News
        </button>

        <span className="text-[11px] text-gray-400 font-semibold">
          Created {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'}
        </span>
      </div>

      <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
        {/* Cover Photo */}
        {cover ? (
          <div className="w-full h-56 bg-gray-100 overflow-hidden relative">
            <img src={cover} alt={a.title} className="w-full h-full object-cover" />
            {a.isFeatured && (
              <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
                ⭐ Featured Article
              </span>
            )}
          </div>
        ) : (
          <div
            className="h-28 flex items-center justify-center relative"
            style={{
              background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))`,
            }}
          >
            <Newspaper className="w-10 h-10 text-white/80" />
            {a.isFeatured && (
              <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md">
                ⭐ Featured Article
              </span>
            )}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Metadata Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
              {a.category || 'Blog'}
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md border ${
                statusColor[a.status] || 'bg-gray-100 text-gray-600'
              }`}
            >
              {a.status || 'draft'}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1 font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              {a.publishDate
                ? new Date(a.publishDate).toLocaleDateString('en-IN')
                : a.createdAt
                ? new Date(a.createdAt).toLocaleDateString('en-IN')
                : '—'}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-xl font-black text-gray-900 leading-snug">{a.title}</h1>

          {/* Short Summary */}
          {(a.shortDescription || a.summary) && (
            <p
              className="text-xs text-gray-600 font-semibold leading-relaxed border-l-4 pl-3.5 py-0.5 bg-gray-50/50 rounded-r-xl"
              style={{ borderColor: 'var(--primary)' }}
            >
              {a.shortDescription || a.summary}
            </p>
          )}

          {/* Full Content */}
          {a.content && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Full Content Body</p>
              <div
                className="text-xs text-gray-800 leading-relaxed bg-gray-50 rounded-2xl p-5 font-sans border border-gray-100 prose max-w-none [&_p]:mb-3 [&_h1]:text-lg [&_h1]:font-black [&_h2]:text-base [&_h2]:font-bold [&_h3]:text-sm [&_h3]:font-bold [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:my-2 [&_li]:mb-1 [&_img]:rounded-xl [&_img]:my-3 [&_img]:max-w-full [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--primary)] [&_blockquote]:pl-3.5 [&_blockquote]:py-1 [&_blockquote]:italic [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-gray-300 [&_th]:p-2 [&_td]:border [&_td]:border-gray-200 [&_td]:p-2"
                dangerouslySetInnerHTML={{ __html: a.content }}
              />
            </div>
          )}

          {/* Tags */}
          {tagList.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-2">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags:
              </span>
              {tagList.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2 py-0.5 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Performance & Views */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-blue-700">{(a.viewsCount ?? a.views ?? 0).toLocaleString()}</p>
              <p className="text-[10px] font-bold text-blue-500 uppercase flex items-center justify-center gap-1">
                <Eye className="w-3 h-3" /> Reads / Views
              </p>
            </div>

            <div className="bg-green-50/70 border border-green-100 rounded-2xl p-3 text-center">
              <p className="text-lg font-black text-green-700">{a.allowSharing !== false ? 'Enabled' : 'Disabled'}</p>
              <p className="text-[10px] font-bold text-green-600 uppercase flex items-center justify-center gap-1">
                <Share2 className="w-3 h-3" /> Social Sharing
              </p>
            </div>

            <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
              <p className="text-sm font-black text-amber-700 truncate">{a.author?.name || 'Office of Leader'}</p>
              <p className="text-[10px] font-bold text-amber-600 uppercase flex items-center justify-center gap-1">
                <User className="w-3 h-3" /> Author / Source
              </p>
            </div>
          </div>

          {/* Quick Status Transitions */}
          <div className="pt-4 border-t border-gray-100 space-y-2">
            <p className="text-[11px] font-black text-gray-700 uppercase">Change Status</p>
            <div className="flex gap-2 flex-wrap">
              {a.status !== 'published' && (
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange('published')}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Publish Live
                </button>
              )}
              {a.status !== 'draft' && (
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange('draft')}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <FileEdit className="w-3.5 h-3.5" />
                  Move to Draft
                </button>
              )}
              {a.status !== 'archived' && (
                <button
                  disabled={updating}
                  onClick={() => handleStatusChange('archived')}
                  className="text-xs font-bold px-3.5 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive Article
                </button>
              )}
            </div>
          </div>

          {/* Delete Action */}
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Article Permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
