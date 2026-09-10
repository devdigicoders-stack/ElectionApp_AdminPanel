import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Play, Square, CheckCircle2, XCircle } from 'lucide-react'
import { PollsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function PollDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [poll,    setPoll]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await PollsAPI.getOne(id)
      setPoll(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleToggle = async () => {
    const isActive = poll?.isActive || poll?.status === 'active'
    try {
      await PollsAPI.update(id, { isActive: !isActive, status: isActive ? 'closed' : 'active' })
      show(isActive ? 'Poll closed!' : 'Poll activated!'); load()
    } catch(e) { show(e.message,'error') }
  }

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const p          = poll || {}
  const totalVotes = p.options?.reduce((s,o) => s + (o.votes||o.voteCount||0), 0) || 0
  const isActive   = p.isActive || p.status === 'active'
  const maxVotes   = Math.max(...(p.options||[]).map(o => o.votes||o.voteCount||0), 1)

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to Polls
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h2 className="text-base font-black text-gray-800 flex-1">{p.question || '—'}</h2>
          <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 ${isActive?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
            {isActive ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <XCircle className="w-3.5 h-3.5 text-gray-400" />}
            {isActive ? 'Active' : 'Closed'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            ['Total Votes', totalVotes, 'text-gray-800', 'bg-gray-50'],
            ['Target', p.targetAudience||'All', 'text-blue-600', 'bg-blue-50'],
            ['Area', p.area?.name||'All', 'text-purple-600', 'bg-purple-50'],
          ].map(([l,v,tc,bg]) => (
            <div key={l} className={`${bg} rounded-2xl p-3 text-center`}>
              <p className={`text-base font-black ${tc}`}>{typeof v==='number'?v.toLocaleString():v}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>

        {/* Options with results */}
        <div className="space-y-3">
          {(p.options||[]).map((o, i) => {
            const votes = o.votes || o.voteCount || 0
            const pct   = totalVotes > 0 ? Math.round((votes/totalVotes)*100) : 0
            const isTop = votes === maxVotes && votes > 0
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {isTop && <Trophy className="w-4 h-4 text-amber-500 inline shrink-0" />}
                    <span className="text-sm font-semibold text-gray-700">{o.text}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-500">{votes.toLocaleString()} votes</span>
                    <span className="text-xs font-black" style={{color:'var(--primary)'}}>{pct}%</span>
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{width:`${pct}%`, background: isTop ? 'var(--primary)' : 'var(--primary-light)'}}/>
                </div>
              </div>
            )
          })}
        </div>

        {/* Participation rate */}
        {p.totalEligible > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-2xl">
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
              <span>Participation Rate</span>
              <span style={{color:'var(--primary)'}}>{Math.round((totalVotes/p.totalEligible)*100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-full rounded-full" style={{width:`${Math.round((totalVotes/p.totalEligible)*100)}%`,background:'var(--primary)'}}/>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{totalVotes.toLocaleString()} of {p.totalEligible.toLocaleString()} eligible voters</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-5 pt-4 border-t border-gray-50">
          <button onClick={handleToggle}
            className={`flex-1 h-10 text-sm font-bold rounded-2xl flex items-center justify-center gap-1.5 ${isActive?'bg-yellow-50 text-yellow-600':'bg-green-50 text-green-600'}`}>
            {isActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isActive ? 'Close Poll' : 'Activate Poll'}
          </button>
          <button onClick={() => navigate(`/polls`)} className="h-10 px-4 border border-gray-200 text-sm font-bold rounded-2xl text-gray-500">
            Back
          </button>
        </div>
      </div>

      {/* Area-wise breakdown */}
      {p.areaBreakdown?.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Area-wise Votes</h3>
          <div className="space-y-3">
            {p.areaBreakdown.map((ab, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>{ab.area?.name || ab.areaName || `Area ${i+1}`}</span>
                  <span style={{color:'var(--primary)'}}>{ab.votes || 0} votes</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className="h-full rounded-full" style={{width:`${totalVotes>0?Math.round(((ab.votes||0)/totalVotes)*100):0}%`,background:'var(--primary)'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
