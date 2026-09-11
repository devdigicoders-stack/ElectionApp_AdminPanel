import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HardHat,
  HeartPulse,
  GraduationCap,
  Sprout,
  Users,
  Zap,
  FileText
} from 'lucide-react'
import { ManifestoAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const catIcons = {
  Infrastructure: HardHat,
  Healthcare: HeartPulse,
  Education: GraduationCap,
  Agriculture: Sprout,
  'Women Empowerment': Users,
  Youth: Zap
}

export default function ManifestoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [item,    setItem]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await ManifestoAPI.getOne(id)
      setItem(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete Manifesto Point?',
      text: 'Are you sure you want to delete this manifesto point?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await ManifestoAPI.remove(id); show('Deleted!'); navigate(-1) }
    catch(e) { show(e.message,'error') }
  }

  const handleTogglePublish = async () => {
    try {
      await ManifestoAPI.update(id, { isPublished: !item?.isPublished })
      show(item?.isPublished ? 'Unpublished!' : 'Published!'); load()
    } catch(e) { show(e.message,'error') }
  }

  if (loading) return <Skeleton rows={3}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const m = item || {}
  const CatIcon = catIcons[m.category] || FileText

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to Manifesto
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-50">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{background:'var(--primary-light)'}}>
              <CatIcon className="w-7 h-7" style={{ color: 'var(--primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:'var(--primary-light)',color:'var(--primary)'}}>
                {m.category || '—'}
              </span>
              <h2 className="text-base font-black text-gray-800 mt-1.5">{m.title || '—'}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.isPublished?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                  {m.isPublished ? 'Published' : 'Draft'}
                </span>
                {m.createdAt && <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleDateString('en-IN')}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="p-5 space-y-4">
          {m.description ? (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl p-4">{m.description}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">No description added</p>
          )}

          {/* Images */}
          {m.images?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Images</p>
              <div className="grid grid-cols-2 gap-2">
                {m.images.map((img, i) => (
                  <div key={i} className="h-28 rounded-2xl overflow-hidden bg-gray-100">
                    <img src={img} alt={`img ${i}`} className="w-full h-full object-cover"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {m.documents?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Documents</p>
              <div className="space-y-2">
                {m.documents.map((doc, i) => (
                  <a key={i} href={doc.url || doc} target="_blank" rel="noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-blue-50">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                    <span className="text-sm font-semibold text-blue-700 truncate">{doc.name || `Document ${i+1}`}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleTogglePublish}
              className={`flex-1 h-10 text-sm font-bold rounded-2xl ${m.isPublished?'bg-yellow-50 text-yellow-600':'bg-green-50 text-green-600'}`}>
              {m.isPublished ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => navigate(`/manifesto`)} className="h-10 px-4 border border-gray-200 text-sm font-bold rounded-2xl text-gray-500">
              Edit
            </button>
            <button onClick={handleDelete} className="h-10 px-4 bg-red-50 text-red-500 text-sm font-bold rounded-2xl">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
