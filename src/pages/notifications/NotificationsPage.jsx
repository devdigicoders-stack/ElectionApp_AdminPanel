import { useState, useEffect, useCallback } from 'react'
import {
  Bell,
  BellRing,
  Send,
  Trash2,
  Plus,
  X,
  Users,
  Star,
  CreditCard,
  MapPin,
  CheckCircle2,
  Smartphone,
  Inbox,
  Radio,
  Clock,
  Search,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { NotificationsAPI, AreasAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'
import { requestNotificationPermission } from '../../firebase'
import { useBranding, resolveBrandingUrl } from '../../context/BrandingContext'

export default function NotificationsPage() {
  const { branding } = useBranding()
  const { show, Toast } = useToast()
  const [history, setHistory] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all') // 'all' | 'push' | 'in_app' | 'sent'
  const [search, setSearch] = useState('')

  // Modal State
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [targetAreaId, setTargetAreaId] = useState('')
  const [channel, setChannel] = useState('push')
  const [sending, setSending] = useState(false)

  // Load notifications and area tree
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res, areaRes] = await Promise.all([
        NotificationsAPI.getAllAdmin({ page: 1, limit: 50 }),
        AreasAPI.getTree().catch(() => null),
      ])

      // Parse notifications list
      const rawData = res?.data ?? res
      const notifList = Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.notifications)
        ? rawData.notifications
        : Array.isArray(rawData)
        ? rawData
        : []
      setHistory(notifList)

      // Parse areas flat list
      const trData = areaRes?.data ?? areaRes
      const treeList = Array.isArray(trData?.tree)
        ? trData.tree
        : Array.isArray(trData)
        ? trData
        : []

      const flat = []
      const flatten = (nodes) => {
        if (!Array.isArray(nodes)) return
        for (const n of nodes) {
          flat.push({ _id: n._id, name: n.name, level: n.levelId?.name || '' })
          if (n.children?.length) flatten(n.children)
        }
      }
      flatten(treeList)
      setAreas(flat)
    } catch (e) {
      setError(e.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Handle Send Notification
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!title.trim() || !message.trim()) {
      show('Title and message are required', 'error')
      return
    }

    setSending(true)
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        body: message.trim(),
        target,
        targetAudience: target,
        channel,
        targetAreaId: target === 'area' && targetAreaId ? targetAreaId : undefined,
      }

      const res = await NotificationsAPI.create(payload)
      const notifId = res?._id || res?.data?._id || res?.id
      if (notifId) {
        await NotificationsAPI.send(notifId)
      }

      show('Notification sent successfully!')
      setTitle('')
      setMessage('')
      setTarget('all')
      setTargetAreaId('')
      setChannel('push')
      setShowForm(false)
      await load()
    } catch (e) {
      show(e.message || 'Failed to send notification', 'error')
    } finally {
      setSending(false)
    }
  }

  // Web Push FCM status state
  const [fcmStatus, setFcmStatus] = useState(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    return Notification.permission // 'default' | 'granted' | 'denied'
  })
  const [fcmLoading, setFcmLoading] = useState(false)
  const [testPushing, setTestPushing] = useState(false)

  // Request & register FCM token
  const handleEnablePush = async () => {
    setFcmLoading(true)
    try {
      const res = await requestNotificationPermission()
      if (res?.success) {
        setFcmStatus('granted')
        show('Web Push Notifications active! This device will receive push alerts.')
      } else if (res?.reason === 'denied') {
        setFcmStatus('denied')
        show('Notification permission was blocked in browser settings.', 'error')
      } else {
        show('Could not enable push: ' + (res?.reason || 'Unknown error'), 'error')
      }
    } catch (err) {
      show(err.message || 'Failed to enable push notifications', 'error')
    } finally {
      setFcmLoading(false)
    }
  }

  // Auto-sync token on load if permission is already granted
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      requestNotificationPermission()
        .then((res) => {
          if (res?.success) setFcmStatus('granted')
        })
        .catch(() => {})
    }
  }, [])

  // Send a quick test push to verify FCM delivery
  const handleTestSelfPush = async () => {
    setTestPushing(true)
    try {
      // 1. Ensure token is generated and registered
      let token = localStorage.getItem('fcm_token')
      if (!token) {
        const permRes = await requestNotificationPermission()
        if (permRes?.token) token = permRes.token
      }

      // 2. Dispatch FCM Push via backend
      const testRes = await NotificationsAPI.testPush(token).catch(() => null)

      // 3. Pop native browser / OS notification for instant feedback with real logo
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const appLogo = resolveBrandingUrl(branding?.logoUrl || branding?.logo) || '/logo.png'
          new Notification('🔔 Test Web Push Alert', {
            body: 'FCM Push notification system is working 100% live on your Admin Panel!',
            icon: appLogo,
            badge: appLogo,
          })
        } catch (e) {
          console.warn('Native notification alert:', e)
        }
      }

      if (testRes?.success || testRes?.data?.success) {
        show('Test push dispatched via FCM! Alert triggered on your device.')
      } else {
        show('Test push triggered! Check your desktop/browser notification.')
      }
      await load()
    } catch (err) {
      show(err.message || 'Failed to send test push', 'error')
    } finally {
      setTestPushing(false)
    }
  }

  // Handle Delete Notification
  const handleDelete = async (id, notifTitle) => {
    const confirmed = await confirmDialog({
      title: 'Delete Notification?',
      text: `Are you sure you want to delete "${notifTitle || 'this notification'}" from history?`,
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return

    try {
      setHistory((prev) => prev.filter((n) => n._id !== id))
      await NotificationsAPI.remove(id)
      show('Notification deleted!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to delete notification', 'error')
      await load()
    }
  }

  // Filtered List
  const filteredHistory = history.filter((n) => {
    const channelMatch =
      filter === 'all'
        ? true
        : filter === 'sent'
        ? n.isSent !== false
        : filter === 'push'
        ? n.channel === 'push' || n.channel === 'both'
        : n.channel === 'in_app' || n.channel === 'both'

    const searchLower = search.toLowerCase()
    const searchMatch =
      !search ||
      n.title?.toLowerCase().includes(searchLower) ||
      n.body?.toLowerCase().includes(searchLower) ||
      n.message?.toLowerCase().includes(searchLower)

    return channelMatch && searchMatch
  })

  return (
    <div className="space-y-4 pb-28">
      <Toast />

      {/* ── HEADER WITH TITLE & + SEND NOTIFICATION BUTTON ── */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">Notifications</h1>
          <p className="text-xs text-gray-400 font-medium mt-0.5">
            {history.length} broadcast{history.length === 1 ? '' : 's'} listed
          </p>
        </div>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-bold text-white rounded-2xl shadow-lg shadow-red-900/10 active:scale-95 transition-all cursor-pointer shrink-0"
          style={{ background: 'var(--primary)' }}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Send Notification</span>
        </button>
      </div>

      {/* ── FCM PUSH NOTIFICATION STATUS BANNER ── */}
      {fcmStatus === 'granted' ? (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50/70 border border-emerald-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-emerald-950">
                  Web Push Alerts Active
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live FCM Connected
                </span>
              </div>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                This browser will receive real-time push alerts even when the tab is in the background.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            <button
              onClick={handleTestSelfPush}
              disabled={testPushing}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {testPushing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin" />
                  <span>Sending Test...</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Send Test Push</span>
                </>
              )}
            </button>
            <button
              onClick={handleEnablePush}
              title="Re-sync device token"
              className="p-1.5 rounded-xl bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-700 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${fcmLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      ) : fcmStatus === 'denied' ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-amber-950">
              Push Notifications Blocked in Browser
            </p>
            <p className="text-[11px] text-amber-700 font-medium mt-0.5">
              Notifications were denied in your browser settings. To receive live alerts, click the lock icon 🔒 next to the URL address bar and set Notifications to &ldquo;Allow&rdquo;.
            </p>
          </div>
        </div>
      ) : fcmStatus !== 'unsupported' ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 border border-blue-200 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/20">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-gray-900">
                Enable Web Push Alerts on this Device
              </p>
              <p className="text-[11px] text-gray-600 font-medium mt-0.5">
                Receive instant push notifications when broadcasts are sent or citizens submit complaints.
              </p>
            </div>
          </div>
          <button
            onClick={handleEnablePush}
            disabled={fcmLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-60 shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            {fcmLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Enabling...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Enable Push Alerts</span>
              </>
            )}
          </button>
        </div>
      ) : null}

      {/* ── SEARCH & FILTER CHIPS ── */}
      <div className="space-y-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search notifications by title or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 h-10 text-xs sm:text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 no-scrollbar overflow-x-auto pb-0.5">
          {[
            { key: 'all', label: `All (${history.length})` },
            { key: 'push', label: 'Push Only' },
            { key: 'in_app', label: 'In-App' },
            { key: 'sent', label: 'Delivered' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`shrink-0 text-xs font-bold px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
                filter === t.key
                  ? 'text-white border-transparent shadow-xs'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
              style={filter === t.key ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── NOTIFICATIONS HISTORY CARDS LIST ── */}
      {loading ? (
        <div className="space-y-3 pt-2">
          <Skeleton rows={4} />
        </div>
      ) : error ? (
        <div className="p-4">
          <ApiError message={error} onRetry={load} />
        </div>
      ) : filteredHistory.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-10 text-center flex flex-col items-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
            style={{ background: 'var(--primary-light)' }}
          >
            <Bell className="w-7 h-7" style={{ color: 'var(--primary)' }} />
          </div>
          <h3 className="text-sm sm:text-base font-black text-gray-800">No notifications found</h3>
          <p className="text-xs text-gray-400 max-w-xs mt-1 mb-4 leading-relaxed">
            {search
              ? 'No notifications match your search query.'
              : 'Broadcast live announcements, rally reminders, or urgent news directly to your voters.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow cursor-pointer active:scale-95 transition-transform"
            style={{ background: 'var(--primary)' }}
          >
            <Plus className="w-3.5 h-3.5" /> Send First Notification
          </button>
        </div>
      ) : (
        /* Cards List */
        <div className="space-y-3">
          {filteredHistory.map((n) => {
            const isPush = n.channel === 'push' || n.channel === 'both'
            const audienceLabel =
              n.target === 'volunteers'
                ? 'Volunteers'
                : n.target === 'members'
                ? 'Members'
                : n.target === 'area'
                ? 'Specific Area'
                : 'All Citizens'

            return (
              <div
                key={n._id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-5 transition-all hover:border-gray-200 hover:shadow-md space-y-3"
              >
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Channel Icon Badge */}
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isPush ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                      }`}
                    >
                      {isPush ? <Smartphone className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
                    </div>

                    {/* Title and Message */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base font-black text-gray-900 leading-snug">
                        {n.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-line">
                        {n.body || n.message}
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(n._id, n.title)}
                    className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                    title="Delete Notification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Card Footer / Metadata Pills */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-50 text-[10px] sm:text-xs text-gray-400">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Audience Chip */}
                    <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {n.target === 'volunteers' && <Star className="w-3 h-3 text-amber-500" />}
                      {n.target === 'members' && <CreditCard className="w-3 h-3 text-emerald-500" />}
                      {n.target === 'area' && <MapPin className="w-3 h-3 text-purple-500" />}
                      {(!n.target || n.target === 'all') && <Users className="w-3 h-3 text-blue-500" />}
                      {audienceLabel}
                    </span>

                    {/* Channel Chip */}
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        n.channel === 'push'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : n.channel === 'in_app'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200/60'
                          : 'bg-orange-50 text-orange-700 border border-orange-200/60'
                      }`}
                    >
                      {n.channel || 'push'}
                    </span>

                    {/* Sent Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${
                        n.isSent !== false
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {n.isSent !== false ? 'Sent' : 'Draft'}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-1 font-medium text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{n.createdAt ? new Date(n.createdAt).toLocaleString('en-IN') : '—'}</span>
                  </div>
                </div>

                {/* Read Progress Bar (if sent) */}
                {n.sentCount !== undefined && n.sentCount > 0 && (
                  <div className="pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 mb-1">
                      <span>{n.readCount || 0} Citizens Read</span>
                      <span className="text-emerald-600">
                        {Math.round(((n.readCount || 0) / n.sentCount) * 100)}% Opened
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, Math.round(((n.readCount || 0) / n.sentCount) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── CREATE NOTIFICATION MODAL POPUP ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div
              className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0"
              style={{ background: 'var(--primary-light)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Send Notification</h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    Push alert or in-app message to citizens
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSend} className="overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">
                  Notification Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jan Sabha & Voter Abhaar Sammelan Alert"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition-all font-medium"
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">
                  Message Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Likhna shuru karein: Apne ward ke karyakram me zaroor padharein..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 resize-none transition-all font-medium"
                />
                <p className="text-[10px] text-gray-400 text-right mt-1">
                  {message.length} characters
                </p>
              </div>

              {/* Target & Channel Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Target Audience */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">
                    Target Audience
                  </label>
                  <div className="relative">
                    <select
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-2xl px-3.5 h-11 text-xs sm:text-sm font-semibold outline-none focus:border-[var(--primary)] pr-8 cursor-pointer"
                    >
                      <option value="all">👥 All Citizens / Users</option>
                      <option value="members">💳 Verified Members</option>
                      <option value="volunteers">⭐ Active Volunteers</option>
                      <option value="area">📍 Specific Area / Ward</option>
                    </select>
                    <ChevronRight className="rotate-90 absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Delivery Channel */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 block">
                    Delivery Channel
                  </label>
                  <div className="flex gap-1.5">
                    {[
                      { key: 'push', label: 'Push' },
                      { key: 'in_app', label: 'In-App' },
                      { key: 'both', label: 'Both' },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.key}
                        onClick={() => setChannel(c.key)}
                        className={`flex-1 h-11 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                          channel === c.key
                            ? 'text-white border-transparent shadow-xs'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                        style={
                          channel === c.key
                            ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
                            : {}
                        }
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Area Selector (if target === 'area') */}
              {target === 'area' && (
                <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1.5">
                  <label className="text-xs font-bold text-purple-900 block">
                    Select Constituency Area / Ward
                  </label>
                  <select
                    value={targetAreaId}
                    onChange={(e) => setTargetAreaId(e.target.value)}
                    className="w-full bg-white border border-purple-200 rounded-xl px-3 h-10 text-xs font-semibold outline-none focus:border-purple-400"
                  >
                    <option value="">-- Choose Ward / Block --</option>
                    {areas.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} {a.level ? `(${a.level})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs sm:text-sm font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-2 h-12 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{ background: 'var(--primary)' }}
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Broadcast...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Broadcast Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
