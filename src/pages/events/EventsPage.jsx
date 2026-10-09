import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  Users,
  Star,
  Plus,
  X,
  Upload,
  Clock,
  Compass,
  Phone,
  User,
  Globe,
  Tag,
  ImageIcon,
  Trash2,
  Edit2,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react'
import { EventsAPI, AreasAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const CATEGORIES = [
  'Jan Sabha',
  'Rally',
  'Public Meeting',
  'Membership Campaign',
  'Press Conference',
  'Special Event',
  'Social Program',
  'Other',
]

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

const EMPTY = {
  title: '',
  description: '',
  category: 'Jan Sabha',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  location: '',
  mapLink: '',
  areaId: '',
  maximumParticipants: '',
  organizerName: '',
  organizerPhone: '',
  bannerUrl: '',
  registrationRequired: false,
  isPublished: true,
}

export default function EventsPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [items, setItems] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // Form modal state
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const limit = 20

  const flattenAreas = (nodes, result = []) => {
    if (!Array.isArray(nodes)) return result
    for (const node of nodes) {
      result.push({
        _id: node._id,
        name: node.name,
        levelName: node.levelId?.name || node.levelName || '',
      })
      if (node.children?.length) {
        flattenAreas(node.children, result)
      }
    }
    return result
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (filter === 'upcoming') params.upcoming = 'true'

      const [res, arRes] = await Promise.all([
        EventsAPI.getAll(params),
        AreasAPI.getTree().catch(() => null),
      ])

      const data = res?.data ?? res
      const eventList = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.events)
        ? data.events
        : Array.isArray(data)
        ? data
        : []
      setItems(eventList)
      setTotal(data?.total ?? eventList.length)

      // Areas list
      const treeData = arRes?.data?.tree ?? arRes?.tree ?? (Array.isArray(arRes?.data) ? arRes.data : [])
      setAreas(flattenAreas(treeData))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filter])

  useEffect(() => {
    load()
  }, [load])

  const resolveBannerUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${BASE_URL}${url}`
  }

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingBanner(true)
    try {
      const up = await UploadAPI.uploadFiles('events', [file])
      const uploadedPath = up?.urls?.[0]
      if (uploadedPath) {
        setForm((prev) => ({ ...prev, bannerUrl: uploadedPath }))
        show('Banner uploaded!')
      } else {
        // Fallback file reader
        const reader = new FileReader()
        reader.onload = (ev) => {
          setForm((prev) => ({ ...prev, bannerUrl: ev.target.result }))
          show('Banner image loaded!')
        }
        reader.readAsDataURL(file)
      }
    } catch (err) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, bannerUrl: ev.target.result }))
        show('Banner image preview loaded!')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingBanner(false)
    }
  }

  const handleEdit = (e) => {
    setEditId(e._id)
    setForm({
      title: e.title || '',
      description: e.description || '',
      category: e.category || 'Jan Sabha',
      startDate: (e.startDate || e.date)?.slice(0, 10) || '',
      endDate: e.endDate?.slice(0, 10) || '',
      startTime: e.startTime || e.time || '',
      endTime: e.endTime || '',
      location: e.location || e.venue || '',
      mapLink: e.mapLink || '',
      areaId: e.areaId?._id || e.areaId || e.area?._id || '',
      maximumParticipants: e.maximumParticipants || '',
      organizerName: e.organizerName || '',
      organizerPhone: e.organizerPhone || '',
      bannerUrl: e.bannerUrl || '',
      registrationRequired: Boolean(e.registrationRequired),
      isPublished: e.isPublished !== undefined ? Boolean(e.isPublished) : true,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      show('Event title is required', 'error')
      return
    }
    if (!form.startDate) {
      show('Event date is required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description?.trim() || '',
        category: form.category || 'Jan Sabha',
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        startTime: form.startTime?.trim() || '',
        endTime: form.endTime?.trim() || '',
        location: form.location?.trim() || '',
        mapLink: form.mapLink?.trim() || undefined,
        areaId: form.areaId || undefined,
        maximumParticipants: form.maximumParticipants ? Number(form.maximumParticipants) : undefined,
        organizerName: form.organizerName?.trim() || '',
        organizerPhone: form.organizerPhone?.trim() || '',
        bannerUrl: form.bannerUrl?.trim() || undefined,
        registrationRequired: Boolean(form.registrationRequired),
        isPublished: form.isPublished !== undefined ? Boolean(form.isPublished) : true,
      }

      if (editId) {
        await EventsAPI.update(editId, payload)
        show('Event updated successfully!')
      } else {
        await EventsAPI.create(payload)
        show('Event created successfully!')
      }

      setShowForm(false)
      setEditId(null)
      setForm(EMPTY)
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Event?',
      text: 'Are you sure you want to delete this event?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await EventsAPI.remove(id)
      show('Deleted!')
      load()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Toast />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Events</h1>
          <p className="text-xs text-gray-400">{total} events listed</p>
        </div>
        <button
          onClick={() => {
            setForm(EMPTY)
            setEditId(null)
            setShowForm(true)
          }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm shadow-md active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Event
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {['all', 'upcoming', 'past'].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f)
              setPage(1)
            }}
            className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${
              filter === f
                ? 'text-white border-transparent'
                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
            style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Complete Event Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
              <div>
                <h2 className="text-base font-black text-gray-900">
                  {editId ? 'Edit Event Details' : 'Create New Event'}
                </h2>
                <p className="text-[11px] text-gray-400">
                  Enter details for citizens, volunteers, and ground teams
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-6 space-y-4">
              {/* 1. Basic Info */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    Event Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Jan Sabha & Voter Abhaar Sammelan"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all font-medium"
                  />
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-gray-400" /> Event Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm outline-none bg-white focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 font-medium"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Date & Timing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" /> Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" /> End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Start Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> End Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 02:00 PM"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* 3. Venue & Google Map */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> Venue / Location Sthal
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shivaji Sports Stadium, Gate No. 2"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm outline-none focus:border-[var(--primary)] font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-gray-400" /> Google Map Link
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/?q=..."
                      value={form.mapLink}
                      onChange={(e) => setForm({ ...form, mapLink: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm outline-none focus:border-[var(--primary)]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-gray-400" /> Target Area / Ward
                    </label>
                    <select
                      value={form.areaId}
                      onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm outline-none bg-white focus:border-[var(--primary)]"
                    >
                      <option value="">All Areas (Entire Constituency)</option>
                      {areas.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name} {a.levelName ? `(${a.levelName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4. Banner Poster Upload */}
              <div className="pt-1">
                <label className="text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-gray-400" /> Event Banner / Poster
                  </span>
                  {form.bannerUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, bannerUrl: '' })}
                      className="text-[10px] text-red-500 font-bold hover:underline"
                    >
                      Remove Photo
                    </button>
                  )}
                </label>

                {form.bannerUrl ? (
                  <div className="relative h-28 rounded-2xl overflow-hidden border border-gray-200 group">
                    <img
                      src={resolveBannerUrl(form.bannerUrl)}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer bg-white text-gray-900 text-xs font-bold px-3 py-1.5 rounded-xl shadow">
                        Change Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerUpload}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-200 hover:border-[var(--primary)] hover:bg-gray-50/50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all">
                    <Upload className="w-6 h-6 text-gray-400 mb-1.5" />
                    <p className="text-xs font-bold text-gray-700">
                      {uploadingBanner ? 'Uploading Banner...' : 'Click to Upload Event Banner'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WEBP up to 10MB</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleBannerUpload}
                      disabled={uploadingBanner}
                    />
                  </label>
                )}
              </div>

              {/* 5. Capacity & Organizer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" /> Max Capacity
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    min="1"
                    value={form.maximumParticipants}
                    onChange={(e) => setForm({ ...form, maximumParticipants: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" /> Organizer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Kumar"
                    value={form.organizerName}
                    onChange={(e) => setForm({ ...form, organizerName: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> Organizer Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={form.organizerPhone}
                    onChange={(e) => setForm({ ...form, organizerPhone: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  />
                </div>
              </div>

              {/* 6. Description */}
              <div className="pt-1">
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Description & Agenda
                </label>
                <textarea
                  rows={3}
                  placeholder="Key topics, schedule, chief guest, or special instructions..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm outline-none resize-none focus:border-[var(--primary)] font-medium leading-relaxed"
                />
              </div>

              {/* 7. Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Registration Required</p>
                    <p className="text-[10px] text-gray-400">Generate Digital Passes / QR</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({ ...form, registrationRequired: !form.registrationRequired })
                    }
                    className="relative w-11 h-6 rounded-full transition-all shrink-0 cursor-pointer"
                    style={{
                      background: form.registrationRequired ? 'var(--primary)' : '#d1d5db',
                    }}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        form.registrationRequired ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-800">Live Status</p>
                    <p className="text-[10px] text-gray-400">
                      {form.isPublished ? 'Published on Public App' : 'Save as Draft'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, isPublished: !form.isPublished })}
                    className="relative w-11 h-6 rounded-full transition-all shrink-0 cursor-pointer"
                    style={{ background: form.isPublished ? '#10b981' : '#d1d5db' }}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        form.isPublished ? 'left-5.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 px-6 border-t border-gray-100 shrink-0 bg-gray-50/50">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploadingBanner}
                className="btn-primary flex-1 h-11 text-sm font-bold disabled:opacity-60 shadow"
              >
                {saving ? 'Saving...' : editId ? 'Save Changes' : 'Publish Event'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 border border-gray-200 hover:bg-gray-100 text-sm font-bold rounded-2xl text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Events List Cards */}
      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((e) => {
              const banner = resolveBannerUrl(e.bannerUrl)
              const badgeColor =
                CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-800 border-gray-200'

              return (
                <div
                  key={e._id}
                  onClick={() => navigate(`/events/${e._id}`)}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between group"
                >
                  <div>
                    {/* Event Banner */}
                    <div
                      className="h-32 relative flex items-center justify-center overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))`,
                      }}
                    >
                      {banner ? (
                        <img
                          src={banner}
                          alt={e.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <Calendar className="w-10 h-10 text-white/40" />
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border shadow-xs ${badgeColor}`}
                        >
                          {e.category || 'Jan Sabha'}
                        </span>
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                            e.isPublished !== false
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-400 text-gray-900 font-bold'
                          }`}
                        >
                          {e.isPublished !== false ? 'Live' : 'Draft'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <p className="text-base font-black text-gray-900 leading-snug line-clamp-2">
                        {e.title}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {(e.startDate || e.date)
                            ? new Date(e.startDate || e.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>

                        {(e.startTime || e.time) && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            {e.startTime || e.time}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {e.location || e.venue || 'TBD'}
                          </span>
                        </span>
                      </div>

                      {e.description && (
                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {e.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom Meta & Actions */}
                  <div className="p-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {e.area?.name ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                          <Compass className="w-3 h-3 text-gray-400" />
                          {e.area.name}
                        </span>
                      ) : e.registrationRequired ? (
                        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                          Pass Required
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-400">Open for all</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(ev) => ev.stopPropagation()}>
                      {e.mapLink && (
                        <a
                          href={e.mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="View Map"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation()
                          handleEdit(e)
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation()
                          handleDelete(e._id)
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Del
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {items.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                <Calendar className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-base font-bold text-gray-700">No events found</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">
                Click "Create Event" to schedule rallies, public meetings, and jan sabhas.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
