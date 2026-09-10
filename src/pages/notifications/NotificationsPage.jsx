import { useState, useEffect, useCallback } from 'react'
import { Bell, Send, Trash2 } from 'lucide-react'
import { NotificationsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function NotificationsPage() {
  const { show, Toast } = useToast()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState('all')
  const [channel, setChannel] = useState('push')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await NotificationsAPI.getAllAdmin({ page: 1, limit: 20 })
      const data = res?.data ?? res
      setHistory(Array.isArray(data?.notifications ?? data) ? (data?.notifications ?? data) : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { show('Title and message required', 'error'); return }
    setSending(true)
    try {
      const res = await NotificationsAPI.create({ title, message, targetAudience: target, channel })
      await NotificationsAPI.send(res?.data?._id || res?._id)
      show('Notification sent!'); setTitle(''); setMessage(''); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSending(false) }
  }

  const handleDelete = async (id) => {
    try { await NotificationsAPI.remove(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-5">
      <Toast />
      <div><h1 className="text-xl font-black text-gray-900">Notifications</h1><p className="text-xs text-gray-400">Send & manage</p></div>

      {/* Create Form */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-5 py-4">
          <p className="text-white font-bold text-sm">Create Notification</p>
          <p className="text-orange-100 text-[10px]">Push ya In-App notification bhejo</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 h-12 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
            <textarea rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Message likhein..." className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 resize-none transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Target</label>
              <div className="relative">
                <select value={target} onChange={e => setTarget(e.target.value)} className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-2xl px-4 h-12 text-sm outline-none focus:border-orange-400 pr-8">
                  <option value="all">All Users</option>
                  <option value="members">Members</option>
                  <option value="volunteers">Volunteers</option>
                  <option value="area">Area</option>
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Channel</label>
              <div className="flex gap-2">
                {['push', 'in_app', 'both'].map(c => (
                  <button key={c} onClick={() => setChannel(c)} className={`flex-1 h-12 rounded-2xl text-xs font-bold border transition-all ${channel === c ? 'bg-orange-500 text-white border-orange-500' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>{c === 'push' ? 'Push' : c === 'in_app' ? 'In-App' : 'Both'}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSend} disabled={sending} className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-400 text-white text-sm font-bold rounded-2xl shadow-lg shadow-orange-200 disabled:opacity-70 flex items-center justify-center gap-2">
              {sending ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <p className="text-sm font-bold text-gray-800">Notification History</p>
          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{history.length} sent</span>
        </div>
        {loading ? <div className="p-4"><Skeleton rows={3} /></div> : error ? <div className="p-4"><ApiError message={error} onRetry={load} /></div> : (
          <div className="divide-y divide-gray-50">
            {history.map(n => (
              <div key={n._id} className="px-5 py-4 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${n.channel === 'push' ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  <Bell className={`w-5 h-5 ${n.channel === 'push' ? 'text-blue-500' : 'text-purple-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">{n.title}</p>
                    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${n.channel === 'push' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{n.channel}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">{n.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">{n.targetAudience || 'all'}</span>
                    <span className="text-gray-200">·</span>
                    <span className="text-[10px] text-gray-400">{n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN') : '—'}</span>
                  </div>
                  {/* Read progress */}
                  {n.readCount !== undefined && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-gray-400">{n.readCount || 0} read</span>
                        <span className="text-green-500">{n.sentCount > 0 ? Math.round(((n.readCount || 0) / n.sentCount) * 100) : 0}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full">
                        <div className="h-full bg-green-400 rounded-full" style={{ width: `${n.sentCount > 0 ? Math.round(((n.readCount || 0) / n.sentCount) * 100) : 0}%` }} />
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(n._id)} className="text-[10px] text-red-400 font-bold shrink-0">Del</button>
              </div>
            ))}
            {history.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No notifications sent yet</p>}
          </div>
        )}
      </div>
    </div>
  )
}


