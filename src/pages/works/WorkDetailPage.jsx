import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  HardHat,
  CheckCircle2,
  Clock,
  Hourglass,
  MapPin,
  Image
} from 'lucide-react'
import { WorksAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const statusConfig = {
  completed:   { bg:'bg-green-100',  text:'text-green-700',  label:'Completed',   Icon: CheckCircle2 },
  in_progress: { bg:'bg-blue-100',   text:'text-blue-700',   label:'In Progress', Icon: Clock },
  upcoming:    { bg:'bg-yellow-100', text:'text-yellow-700', label:'Upcoming',    Icon: Hourglass },
}

export default function WorkDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [work,    setWork]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await WorksAPI.getOne(id)
      setWork(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const w  = work || {}
  const sc = statusConfig[w.status?.toLowerCase()] || statusConfig.upcoming
  const StatusIcon = sc.Icon

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to Works
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-16 flex items-center px-5" style={{background:`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))`}}>
          <HardHat className="w-6 h-6 text-white mr-3 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-base truncate">{w.title || '—'}</p>
            <p className="text-white/70 text-xs">{w.category || '—'}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 ${sc.bg} ${sc.text}`}>
            <StatusIcon className="w-3 h-3" /> {sc.label}
          </span>
        </div>
        <div className="p-5 space-y-4">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Area',        w.area?.name || '—'],
              ['Category',    w.category   || '—'],
              ['Start Date',  w.startDate  ? new Date(w.startDate).toLocaleDateString('en-IN')      : '—'],
              ['End Date',    w.endDate    ? new Date(w.endDate).toLocaleDateString('en-IN')        : '—'],
              ['Status',      w.status     || '—'],
              ['Published',   w.isPublished ? 'Yes' : 'No'],
            ].map(([l,v]) => (
              <div key={l}>
                <p className="text-[10px] text-gray-400 font-semibold">{l}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {w.description && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl p-3">{w.description}</p>
            </div>
          )}

          {/* Location */}
          {w.location && (
            <div className="flex items-center gap-2 p-3 rounded-2xl" style={{background:'var(--primary-lighter)'}}>
              <MapPin className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
              <div>
                <p className="text-[10px] text-gray-400">Location</p>
                <p className="text-sm font-semibold text-gray-800">{w.location}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Before/After Images */}
      {((w.beforeImages?.length > 0) || (w.afterImages?.length > 0) || (w.images?.length > 0)) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Work Images</h3>

          {w.beforeImages?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Before</p>
              <div className="grid grid-cols-2 gap-2">
                {w.beforeImages.map((img, i) => (
                  <div key={i} className="h-28 rounded-2xl overflow-hidden bg-gray-100">
                    <img src={img} alt={`Before ${i+1}`} className="w-full h-full object-cover"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {w.afterImages?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">After</p>
              <div className="grid grid-cols-2 gap-2">
                {w.afterImages.map((img, i) => (
                  <div key={i} className="h-28 rounded-2xl overflow-hidden bg-gray-100">
                    <img src={img} alt={`After ${i+1}`} className="w-full h-full object-cover"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {w.images?.length > 0 && !w.beforeImages?.length && (
            <div className="grid grid-cols-2 gap-2">
              {w.images.map((img, i) => (
                <div key={i} className="h-28 rounded-2xl overflow-hidden bg-gray-100">
                  <img src={img} alt={`Image ${i+1}`} className="w-full h-full object-cover"/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No images placeholder */}
      {!w.beforeImages?.length && !w.afterImages?.length && !w.images?.length && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No images uploaded yet</p>
        </div>
      )}
    </div>
  )
}
