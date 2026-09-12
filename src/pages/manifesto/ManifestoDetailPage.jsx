import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  FileDown,
  ExternalLink,
  Trash2,
  Calendar,
  Image as ImageIcon,
  CheckCircle2
} from 'lucide-react'
import { ManifestoAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

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

export default function ManifestoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await ManifestoAPI.getOne(id)
      setItem(res?.data ?? res)
    } catch (e) {
      setError(e.message || 'Failed to load manifesto')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete Manifesto?',
      text: 'Are you sure you want to delete this manifesto document?',
      confirmButtonText: 'Yes, Delete',
      icon: 'warning',
    })
    if (!confirmed) return
    try {
      await ManifestoAPI.remove(id)
      show('Deleted!')
      navigate('/manifesto', { replace: true })
    } catch (e) {
      show(e.message || 'Delete failed', 'error')
    }
  }

  const handleTogglePublish = async () => {
    try {
      const nextStatus = !item?.isPublished
      await ManifestoAPI.update(id, { isPublished: nextStatus })
      show(nextStatus ? 'Published to citizens!' : 'Moved to draft')
      load()
    } catch (e) {
      show(e.message || 'Status update failed', 'error')
    }
  }

  if (loading) return <Skeleton rows={4} />
  if (error) return <ApiError message={error} onRetry={load} />

  const m = item || {}
  const file = m.pdfUrl || m.fileUrl || m.coverImageUrl || m.images?.[0] || ''
  const itemIsPdf = m.fileType === 'pdf' || isPdf(file)
  const fullFileUrl = resolveFileUrl(file)

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-12">
      <Toast />

      <button
        onClick={() => navigate('/manifesto')}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Manifesto Documents
      </button>

      <div className="bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
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

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    m.isPublished
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                  }`}
                >
                  {m.isPublished ? '● Published Live' : '○ Draft'}
                </span>

                {m.createdAt && (
                  <span className="text-[11px] text-gray-400 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(m.createdAt).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>

              <h1 className="text-xl font-black text-gray-900 leading-snug">{m.title}</h1>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleTogglePublish}
                className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  m.isPublished
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                }`}
              >
                {m.isPublished ? 'Unpublish' : 'Publish Live'}
              </button>

              <button
                onClick={handleDelete}
                className="p-2 text-xs font-bold rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-colors cursor-pointer"
                title="Delete Manifesto"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* File Preview Body */}
        <div className="p-6 space-y-4">
          {file ? (
            itemIsPdf ? (
              <div className="bg-red-50/50 border border-red-100 rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 break-all">
                      {file.split('/').pop() || 'Manifesto Document.pdf'}
                    </h3>
                    <p className="text-xs text-red-500 font-semibold mt-0.5">
                      PDF Document Attached
                    </p>
                  </div>
                </div>

                <a
                  href={fullFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm hover:shadow"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Open / Download PDF</span>
                </a>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative rounded-3xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center max-h-[70vh]">
                  <img
                    src={fullFileUrl}
                    alt={m.title}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex justify-end">
                  <a
                    href={fullFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[var(--primary)] flex items-center gap-1 hover:underline pt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open full size image in new tab
                  </a>
                </div>
              </div>
            )
          ) : (
            <div className="p-8 text-center text-gray-400 text-xs font-semibold bg-gray-50 rounded-2xl border border-gray-100">
              No document file attached to this manifesto entry
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
