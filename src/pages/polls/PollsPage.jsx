import { useState, useEffect, useCallback } from 'react'
import { BarChart3, Plus, X } from 'lucide-react'
import { PollsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function PollsPage() {
  const { show, Toast } = useToast()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await PollsAPI.getAll()
      const data = res?.data ?? res
      let list = Array.isArray(data?.polls ?? data) ? (data?.polls ?? data) : []
      if (filter === 'active') list = list.filter(p => p.isActive || p.status === 'active')
      if (filter === 'closed') list = list.filter(p => p.status === 'closed' || !p.isActive)
      setPolls(list)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleCreate = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) { show('Question + 2 options required', 'error'); return }
    setSaving(true)
    try {
      await PollsAPI.create({ question, options: options.filter(o => o.trim()).map(text => ({ text })) })
      show('Poll created!'); setShowForm(false); setQuestion(''); setOptions(['', '']); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete poll?')) return
    try { await PollsAPI.remove(id); show('Deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  const handleToggle = async (id, isActive) => {
    try { await PollsAPI.update(id, { isActive: !isActive, status: isActive ? 'closed' : 'active' }); show('Updated!'); load() }
    catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Polls</h1>
          <p className="text-xs text-gray-400">{polls.length} polls</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />Create
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'active', 'closed'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${filter === f ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{f}</button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">Create Poll</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Question</label>
                <textarea rows={2} value={question} onChange={e => setQuestion(e.target.value)}
                  placeholder="Poll question..." className="w-full border border-gray-200 rounded-2xl px-4 py-2 text-sm outline-none resize-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Options</label>
                <div className="space-y-2">
                  {options.map((o, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: 'var(--primary)' }}>{i + 1}</span>
                      <input value={o} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                        placeholder={`Option ${i + 1}`} className="flex-1 border border-gray-200 rounded-xl px-3 h-9 text-sm outline-none focus:border-[var(--primary)]" />
                      {options.length > 2 && (
                        <button onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-red-400 p-1 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setOptions([...options, ''])} className="text-xs font-bold" style={{ color: 'var(--primary)' }}>+ Add Option</button>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving ? 'Creating...' : 'Create'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={4} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <div className="space-y-4">
          {polls.map(p => {
            const totalVotes = p.options?.reduce((s, o) => s + (o.votes || o.voteCount || 0), 0) || 0
            const isActive = p.isActive || p.status === 'active'
            return (
              <div key={p._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-bold text-gray-800 flex-1">{p.question}</p>
                  <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div className="space-y-2">
                  {(p.options || []).map((o, i) => {
                    const votes = o.votes || o.voteCount || 0
                    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                          <span>{o.text}</span>
                          <span style={{ color: 'var(--primary)' }}>{pct}% ({votes})</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                  <span className="text-[10px] text-gray-400">{totalVotes.toLocaleString()} total votes</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleToggle(p._id, isActive)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg ${isActive ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                      {isActive ? 'Close' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(p._id)} className="text-[10px] font-bold text-red-400 px-2 py-1 rounded-lg bg-red-50">Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
          {polls.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No polls found</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

