import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Newspaper,
  Check,
  FileEdit,
  Archive,
  Edit3,
  Trash2
} from 'lucide-react'
import { NewsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const statusColor = {
  published: 'bg-green-100 text-green-700',
  draft:     'bg-gray-100 text-gray-500',
  archived:  'bg-red-100 text-red-500',
  scheduled: 'bg-blue-100 text-blue-600',
}

export default function NewsDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await NewsAPI.getOne(id)
      setArticle(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleStatusChange = async (status) => {
    try { await NewsAPI.updateStatus(id, status); show('Status updated!'); load() }
    catch(e) { show(e.message,'error') }
  }

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete Article?',
      text: 'Are you sure you want to delete this article?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await NewsAPI.remove(id); show('Deleted!'); navigate('/news') }
    catch(e) { show(e.message,'error') }
  }

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const a = article || {}

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to News
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Featured image */}
        {a.featuredImage ? (
          <div className="h-44 bg-gray-100">
            <img src={a.featuredImage} alt={a.title} className="w-full h-full object-cover"/>
          </div>
        ) : (
          <div className="h-28 flex items-center justify-center text-5xl"
            style={{background:`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))`}}>
            <Newspaper className="w-12 h-12 text-white/80" />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{a.category || '—'}</span>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[a.status] || 'bg-gray-100 text-gray-500'}`}>{a.status || '—'}</span>
            <span className="text-[10px] text-gray-400">{a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : '—'}</span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-black text-gray-800 leading-snug">{a.title || '—'}</h2>

          {/* Summary */}
          {a.summary && (
            <p className="text-sm text-gray-600 font-medium leading-relaxed border-l-4 pl-3" style={{borderColor:'var(--primary)'}}>
              {a.summary}
            </p>
          )}

          {/* Content */}
          {a.content && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Full Content</p>
              <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl p-4 max-h-60 overflow-y-auto">
                {a.content}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Views',  a.views || 0,  'text-blue-600',   'bg-blue-50'],
              ['Shares', a.shares || 0, 'text-green-600',  'bg-green-50'],
              ['Likes',  a.likes  || 0, 'text-red-500',    'bg-red-50'],
            ].map(([l,v,tc,bg]) => (
              <div key={l} className={`${bg} rounded-2xl p-3 text-center`}>
                <p className={`text-xl font-black ${tc}`}>{v.toLocaleString()}</p>
                <p className="text-[9px] text-gray-500">{l}</p>
              </div>
            ))}
          </div>

          {/* Author */}
          {a.author && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2xl">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shrink-0"
                style={{background:'var(--primary)'}}>
                {(a.author?.name || 'A')[0]}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">{a.author?.name || '—'}</p>
                <p className="text-[10px] text-gray-400">Author</p>
              </div>
            </div>
          )}

          {/* Status Actions */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500">Change Status</p>
            <div className="flex gap-2 flex-wrap">
              {a.status !== 'published' && (
                <button onClick={() => handleStatusChange('published')} className="text-xs font-bold px-3 py-2 rounded-xl bg-green-50 text-green-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Publish
                </button>
              )}
              {a.status !== 'draft' && (
                <button onClick={() => handleStatusChange('draft')} className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-100 text-gray-600 flex items-center gap-1">
                  <FileEdit className="w-3.5 h-3.5" /> Draft
                </button>
              )}
              {a.status !== 'archived' && (
                <button onClick={() => handleStatusChange('archived')} className="text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-500 flex items-center gap-1">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate('/news')} className="flex-1 h-10 border border-gray-200 text-sm font-bold rounded-2xl text-gray-500 flex items-center justify-center gap-1.5">
              <Edit3 className="w-4 h-4" /> Edit Article
            </button>
            <button onClick={handleDelete} className="h-10 px-4 bg-red-50 text-red-500 text-sm font-bold rounded-2xl flex items-center justify-center gap-1.5">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
