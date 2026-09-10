import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { ComplaintsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const STATUSES = ['pending', 'assigned', 'in_progress', 'resolved', 'closed']
const statusLabel = { pending: 'Submitted', assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' }

export default function ComplaintDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [c, setC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newStatus, setNewStatus] = useState('pending')
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await ComplaintsAPI.getOne(id)
      const data = res?.data ?? res
      setC(data); setNewStatus(data?.status || 'pending')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleUpdate = async () => {
    setUpdating(true)
    try { await ComplaintsAPI.updateStatus(id, newStatus, note); show('Status updated!'); setNote(''); load() }
    catch (e) { show(e.message, 'error') }
    finally { setUpdating(false) }
  }

  if (loading) return <Skeleton rows={4} />
  if (error) return <ApiError message={error} onRetry={load} />

  const currentIdx = STATUSES.indexOf(c?.status?.toLowerCase())

  return (
    <div className="space-y-4">
      <Toast />
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold cursor-pointer" style={{ color: 'var(--primary)' }}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>{c?.complaintNumber || id}</span>
            <h2 className="text-base font-bold text-gray-800 mt-1">{c?.title}</h2>
            <p className="text-xs text-gray-400 mt-1">{c?.area?.name || '—'} · {c?.category || '—'}</p>
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-xl ${c?.status === 'resolved' ? 'bg-green-100 text-green-700' :
              c?.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'}`}>{c?.status}</span>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{c?.description || 'No description'}</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[['By', c?.user?.name || '—'], ['Mobile', c?.user?.mobile || '—'], ['Date', c?.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'], ['Area', c?.area?.name || '—']].map(([l, v]) => (
            <div key={l}><p className="text-[10px] text-gray-400">{l}</p><p className="text-sm font-semibold text-gray-800">{v}</p></div>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-4">Timeline</h3>
        {STATUSES.map((s, i) => {
          const done = i <= currentIdx
          return (
            <div key={s} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? 'text-white' : 'bg-gray-100'}`}
                  style={done ? { background: 'var(--primary)' } : {}}>
                  {done
                    ? <Check className="w-3.5 h-3.5" />
                    : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                {i < STATUSES.length - 1 && <div className={`w-0.5 h-8 ${done ? '' : 'bg-gray-100'}`} style={done ? { background: 'var(--primary-light)' } : {}} />}
              </div>
              <div className="pb-4">
                <p className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-400'}`}>{statusLabel[s]}</p>
                {done && i === currentIdx && c?.updatedAt && <p className="text-[10px] text-gray-400">{new Date(c.updatedAt).toLocaleString('en-IN')}</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Update Status */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 className="text-sm font-bold text-gray-800">Update Status</h3>
        <div className="relative">
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] pr-8">
            {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </div>
        <textarea rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="Add a note (optional)..."
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm outline-none resize-none focus:border-[var(--primary)]" />
        <button onClick={handleUpdate} disabled={updating}
          className="btn-primary w-full h-11 text-sm disabled:opacity-70 flex items-center justify-center gap-2">
          {updating ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Updating...</> : 'Update Status'}
        </button>
      </div>
    </div>
  )
}
