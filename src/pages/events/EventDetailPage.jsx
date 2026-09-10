import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Compass,
  FileText,
  CheckCircle2,
  Star,
  ClipboardList
} from 'lucide-react'
import { EventsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [event,   setEvent]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await EventsAPI.getOne(id)
      setEvent(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const e = event || {}

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </button>

      {/* Banner */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="h-40 relative" style={{background:`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))`}}>
          {e.bannerUrl && <img src={e.bannerUrl} alt={e.title} className="absolute inset-0 w-full h-full object-cover opacity-50"/>}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Calendar className="w-12 h-12 text-white/90 mb-2" />
            <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${e.isPublished?'bg-green-400 text-white':'bg-white/80 text-gray-700'}`}>
              {e.isPublished ? 'Published' : 'Draft'}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <h2 className="text-lg font-black text-gray-800">{e.title || '—'}</h2>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Going',       e.goingCount     || 0, 'text-green-600',  'bg-green-50',  CheckCircle2],
              ['Interested',  e.interestedCount || 0, 'text-blue-600',   'bg-blue-50',   Star],
              ['Registered',  e.registeredCount || 0, 'text-purple-600', 'bg-purple-50', ClipboardList],
            ].map(([l,v,tc,bg,Icon]) => (
              <div key={l} className={`${bg} rounded-2xl p-3 text-center`}>
                <div className={`w-8 h-8 mx-auto mb-1 rounded-xl flex items-center justify-center ${tc}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-xl font-black ${tc}`}>{v}</p>
                <p className="text-[9px] text-gray-500">{l}</p>
              </div>
            ))}
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            {[
              [Calendar, 'Date', e.date ? new Date(e.date).toLocaleDateString('en-IN') : '—'],
              [Clock, 'Time', e.time || '—'],
              [MapPin, 'Venue', e.venue || '—'],
              [Compass, 'Area', e.area?.name || '—'],
              [FileText, 'Registration', e.registrationRequired ? 'Required' : 'Not Required'],
            ].map(([Icon, l, v]) => (
              <div key={l} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-gray-400 font-semibold">{l}</p>
                  <p className="text-sm font-semibold text-gray-800">{v}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Description */}
          {e.description && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1.5">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-2xl p-4">{e.description}</p>
            </div>
          )}

          {/* Location map link */}
          {e.locationUrl && (
            <a href={e.locationUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 p-3 rounded-2xl text-sm font-bold"
              style={{background:'var(--primary-light)',color:'var(--primary)'}}>
              <MapPin className="w-4 h-4" /> View on Map
            </a>
          )}
        </div>
      </div>

      {/* Attendees */}
      {(e.attendees?.length > 0) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-3">Attendees ({e.attendees?.length || 0})</h3>
          <div className="space-y-2">
            {e.attendees.slice(0, 10).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{background:'var(--primary)'}}>
                  {(a.user?.name || a.name || 'U')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.user?.name || a.name || '—'}</p>
                  <p className="text-[10px] text-gray-400">{a.user?.mobile || '—'}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.status==='going'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>
                  {a.status || 'interested'}
                </span>
              </div>
            ))}
            {e.attendees?.length > 10 && (
              <p className="text-xs text-center text-gray-400 pt-2">+{e.attendees.length - 10} more attendees</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
