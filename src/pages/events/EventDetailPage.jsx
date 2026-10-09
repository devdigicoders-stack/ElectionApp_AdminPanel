import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Compass,
  FileText,
  Users,
  User,
  ExternalLink,
} from 'lucide-react'
import { EventsAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const CATEGORY_COLORS = {
  'Jan Sabha': 'bg-blue-100 text-blue-800 border-blue-200',
  'Rally': 'bg-orange-100 text-orange-800 border-orange-200',
  'Public Meeting': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Membership Campaign': 'bg-purple-100 text-purple-800 border-purple-200',
  'Press Conference': 'bg-rose-100 text-rose-800 border-rose-200',
  'Special Event': 'bg-amber-100 text-amber-800 border-amber-200',
  'Social Program': 'bg-teal-100 text-teal-800 border-teal-200',
  'Other': 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function EventDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await EventsAPI.getOne(id)
      setEvent(res?.data ?? res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  const e = event || {}
  const banner = e.bannerUrl
    ? e.bannerUrl.startsWith('http') || e.bannerUrl.startsWith('data:')
      ? e.bannerUrl
      : `${BASE_URL}${e.bannerUrl}`
    : null

  const badgeColor =
    CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-800 border-gray-200'

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-8">
      <Toast />

      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-bold hover:underline"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </button>
      </div>

      {/* 1. Large Crisp Banner Image - Completely Clean, NO text on top */}
      {banner ? (
        <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
          <div className="w-full h-72 sm:h-96 md:h-[420px] bg-gray-100">
            <img
              src={banner}
              alt={e.title || 'Event banner'}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        <div className="w-full h-44 rounded-3xl bg-gray-50 flex flex-col items-center justify-center text-gray-400 border border-gray-100">
          <Calendar className="w-12 h-12 mb-2 text-gray-300" />
          <p className="text-xs font-semibold">No Banner Uploaded</p>
        </div>
      )}

      {/* 2. Main Event Details Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-gray-100 space-y-6">
        {/* Badges & Title (Shown below the image, not covering it) */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span
              className={`text-xs font-black px-3 py-1 rounded-full border shadow-2xs ${badgeColor}`}
            >
              {e.category || 'Jan Sabha'}
            </span>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full ${
                e.isPublished !== false
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {e.isPublished !== false ? 'Published Live' : 'Draft'}
            </span>

            {e.registrationRequired && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800">
                Pass / Registration Required
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug">
            {e.title || 'Untitled Event'}
          </h1>

          {e.area?.name && (
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5 font-medium">
              <Compass className="w-4 h-4 text-gray-400" />
              Target Area: <span className="font-bold text-gray-800">{e.area.name}</span>
            </p>
          )}
        </div>

        {/* Event Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            [
              Calendar,
              'Date',
              (e.startDate || e.date)
                ? new Date(e.startDate || e.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  }) + (e.endDate ? ` to ${new Date(e.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : '')
                : '—',
            ],
            [
              Clock,
              'Timing',
              [e.startTime || e.time, e.endTime].filter(Boolean).join(' - ') || 'Not specified',
            ],
            [MapPin, 'Venue / Location', e.location || e.venue || '—'],
            [
              Compass,
              'Area / Ward',
              e.area?.name ? `${e.area.name} ${e.area.levelName ? `(${e.area.levelName})` : ''}` : 'All Areas',
            ],
            [
              FileText,
              'Pass / Registration',
              e.registrationRequired ? 'Registration Required' : 'Open for All',
            ],
            [
              Users,
              'Seating Capacity',
              e.maximumParticipants ? `${e.maximumParticipants} people` : 'Unlimited / Open',
            ],
            [
              User,
              'Organizer / Sanyojak',
              [e.organizerName, e.organizerPhone].filter(Boolean).join(' · ') || 'Not specified',
            ],
          ].map(([Icon, l, v]) => (
            <div
              key={l}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{l}</p>
                <p className="text-sm font-bold text-gray-800 truncate">{v}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Description & Agenda */}
        {e.description && (
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
              Event Agenda & Description
            </p>
            <div className="text-sm text-gray-700 leading-relaxed bg-gray-50/80 rounded-2xl p-4.5 border border-gray-100 whitespace-pre-wrap font-medium">
              {e.description}
            </div>
          </div>
        )}

        {/* Google Maps Venue Link */}
        {(e.mapLink || e.locationUrl) && (
          <a
            href={e.mapLink || e.locationUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 p-3.5 rounded-2xl text-sm font-bold transition-all shadow-xs hover:opacity-90"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            <MapPin className="w-4 h-4" /> View Venue on Google Maps
            <ExternalLink className="w-4 h-4 ml-1" />
          </a>
        )}
      </div>
    </div>
  )
}
