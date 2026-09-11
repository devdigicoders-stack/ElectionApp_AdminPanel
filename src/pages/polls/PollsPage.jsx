import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3, Plus, X, ChevronDown, ChevronUp,
  Download, CheckCircle, XCircle, TrendingUp, Clock, Users, AlertCircle
} from 'lucide-react'
import { PollsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

// Status badge helper
function StatusBadge({ status, isActive }) {
  const s = status || (isActive ? 'active' : 'closed')
  const map = {
    active:   { label: 'Active',    cls: 'bg-green-100 text-green-700' },
    upcoming: { label: 'Upcoming',  cls: 'bg-blue-100 text-blue-700' },
    closed:   { label: 'Closed',    cls: 'bg-gray-100 text-gray-500' },
    ended:    { label: 'Ended',     cls: 'bg-orange-100 text-orange-600' },
  }
  const { label, cls } = map[s] ?? map.closed
  return (
    <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  )
}

// Analytics Modal
function AnalyticsModal({ pollId, question, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    PollsAPI.getAnalytics(pollId)
      .then(r => setData(r?.data ?? r))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [pollId])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold">Poll Analytics</h2>
            <p className="text-xs text-gray-400 truncate max-w-xs">{question}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          {loading && <div className="text-center text-gray-400 py-10 text-sm">Loading analytics...</div>}
          {error && <div className="text-center text-red-400 py-10 text-sm">{error}</div>}
          {data && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Votes', value: data.totalVotes ?? data.summary?.totalVotes ?? 0, icon: <Users className="w-4 h-4" /> },
                  { label: 'Participation', value: `${data.participationRate ?? data.summary?.participationRate ?? 0}%`, icon: <TrendingUp className="w-4 h-4" /> },
                  { label: 'Status', value: data.status ?? data.summary?.status ?? '-', icon: <Clock className="w-4 h-4" /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="bg-gray-50 rounded-2xl p-3 text-center">
                    <div className="flex justify-center text-gray-400 mb-1">{icon}</div>
                    <p className="text-base font-black text-gray-800">{value}</p>
                    <p className="text-[10px] text-gray-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* Option Breakdown */}
              {(data.options || data.optionBreakdown) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Option Breakdown</h3>
                  <div className="space-y-2">
                    {(data.options || data.optionBreakdown || []).map((o, i) => {
                      const total = data.totalVotes || data.summary?.totalVotes || 1
                      const votes = o.votes ?? o.voteCount ?? 0
                      const pct = total > 0 ? Math.round((votes / total) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                            <span>{o.text || o.option}</span>
                            <span style={{ color: 'var(--primary)' }}>{pct}% ({votes})</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Area Breakdown */}
              {(data.areaBreakdown || data.byArea) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">By Area</h3>
                  <div className="space-y-1">
                    {(data.areaBreakdown || data.byArea || []).slice(0, 5).map((a, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600 py-1 border-b border-gray-50">
                        <span>{a.areaName || a.name || 'Area'}</span>
                        <span className="font-bold">{a.votes ?? a.count ?? 0} votes</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gender Breakdown */}
              {(data.genderBreakdown || data.byGender) && (
                <div>
                  <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">By Gender</h3>
                  <div className="flex gap-3">
                    {(data.genderBreakdown || data.byGender || []).map((g, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl px-3 py-2 text-center flex-1">
                        <p className="text-sm font-black text-gray-800">{g.count ?? g.votes ?? 0}</p>
                        <p className="text-[10px] text-gray-400 capitalize">{g.gender ?? g._id ?? 'Other'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Create Poll Form
function CreatePollForm({ onClose, onCreated, show }) {
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({
    question: '',
    description: '',
    category: 'General',
    options: ['', ''],
    startsAt: '',
    endsAt: '',
    durationHours: '',
    targetAudience: 'ALL',
    targetGender: '',
    targetMinAge: '',
    targetMaxAge: '',
    resultVisibility: 'AFTER_VOTE',
    allowRevote: false,
    allowMultipleChoices: false,
    maxChoices: 1,
    isActive: true,
  })

  const handleSubmit = async () => {
    setFormError('')
    const q = form.question.trim()
    if (!q) {
      setFormError('Question is required.')
      show('Question is required', 'error')
      return
    }
    const validOpts = form.options.map(o => o.trim()).filter(Boolean)
    if (validOpts.length < 2) {
      setFormError('At least 2 non-empty options are required.')
      show('At least 2 options required', 'error')
      return
    }

    if (form.startsAt && form.endsAt) {
      if (new Date(form.endsAt) <= new Date(form.startsAt)) {
        setFormError('End date must be after the start date.')
        show('End date must be after start date', 'error')
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        question: q,
        options: validOpts,
        ...(form.description.trim() && { description: form.description.trim() }),
        ...(form.category.trim() && { category: form.category.trim() }),
        ...(form.startsAt && { startsAt: new Date(form.startsAt).toISOString() }),
        ...(form.endsAt && { endsAt: new Date(form.endsAt).toISOString() }),
        ...(form.durationHours && { durationHours: Number(form.durationHours) }),
        targetAudience: form.targetAudience || 'ALL',
        resultVisibility: form.resultVisibility || 'AFTER_VOTE',
        ...(form.targetGender && { targetGender: form.targetGender }),
        ...(form.targetMinAge && { targetMinAge: Number(form.targetMinAge) }),
        ...(form.targetMaxAge && { targetMaxAge: Number(form.targetMaxAge) }),
        allowRevote: Boolean(form.allowRevote),
        allowMultipleChoices: Boolean(form.allowMultipleChoices),
        maxChoices: Number(form.maxChoices) || 1,
        isActive: Boolean(form.isActive),
      }
      await PollsAPI.create(payload)
      show('Poll created successfully!', 'success')
      onCreated()
      onClose()
    } catch (e) {
      console.error('Poll create error:', e)
      const msg = e?.message || 'Failed to create poll'
      setFormError(msg)
      show(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
        <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-bold text-gray-900">Create New Poll</h2>
              <p className="text-xs text-gray-400">Add question and choices for your campaign</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto p-5 space-y-4">
            {/* Error Banner */}
            {formError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-2xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span className="leading-relaxed font-medium">{formError}</span>
              </div>
            )}

            {/* Question */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Question <span className="text-red-500">*</span></label>
              <textarea rows={2} value={form.question} onChange={e => setField('question', e.target.value)}
                placeholder="E.g., Which civic improvement should be prioritized next?"
                className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none resize-none focus:border-[var(--primary)] transition-colors" />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Description (optional)</label>
              <input value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder="Provide extra context for voters..." className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-[var(--primary)]" />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Category</label>
              <input value={form.category} onChange={e => setField('category', e.target.value)}
                placeholder="General, Development, Policy, Youth..." className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-[var(--primary)]" />
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">Options <span className="text-red-500">*</span> (min 2)</label>
                <button type="button" onClick={() => setField('options', [...form.options, ''])} className="text-xs font-bold hover:underline" style={{ color: 'var(--primary)' }}>
                  + Add Option
                </button>
              </div>
              <div className="space-y-2">
                {form.options.map((o, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm" style={{ background: 'var(--primary)' }}>
                      {i + 1}
                    </span>
                    <input value={o} onChange={e => { const n = [...form.options]; n[i] = e.target.value; setField('options', n) }}
                      placeholder={`Option ${i + 1}`} className="flex-1 border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-[var(--primary)]" />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => setField('options', form.options.filter((_, idx) => idx !== i))} className="text-red-400 p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Starts At</label>
                <input type="datetime-local" value={form.startsAt} onChange={e => setField('startsAt', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)] bg-white" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Ends At</label>
                <input type="datetime-local" value={form.endsAt} onChange={e => setField('endsAt', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)] bg-white" />
              </div>
            </div>

            {/* Duration hours */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Duration (Hours) — optional if Ends At is set</label>
              <input type="number" min="0.1" step="0.5" value={form.durationHours} onChange={e => setField('durationHours', e.target.value)}
                placeholder="e.g. 24, 48, 72" className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-[var(--primary)]" />
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Audience</label>
              <select value={form.targetAudience} onChange={e => setField('targetAudience', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-[var(--primary)] bg-white">
                <option value="ALL">All Citizens (Public)</option>
                <option value="MEMBERS_ONLY">Party Members Only</option>
                <option value="VOLUNTEERS_ONLY">Volunteers Only</option>
                <option value="SPECIFIC_AREA">Specific Area</option>
                <option value="AGE_GROUP">Specific Age Group</option>
                <option value="GENDER">Specific Gender</option>
              </select>
            </div>

            {/* Gender + Age */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Gender Filter</label>
                <select value={form.targetGender} onChange={e => setField('targetGender', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-2.5 h-10 text-xs outline-none focus:border-[var(--primary)] bg-white">
                  <option value="">Any</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Min Age</label>
                <input type="number" min="1" max="120" value={form.targetMinAge} onChange={e => setField('targetMinAge', e.target.value)}
                  placeholder="18" className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Max Age</label>
                <input type="number" min="1" max="120" value={form.targetMaxAge} onChange={e => setField('targetMaxAge', e.target.value)}
                  placeholder="60" className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)]" />
              </div>
            </div>

            {/* Result Visibility */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Result Visibility</label>
              <select value={form.resultVisibility} onChange={e => setField('resultVisibility', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-[var(--primary)] bg-white">
                <option value="AFTER_VOTE">Show results after user votes</option>
                <option value="AFTER_END">Show results after poll ends</option>
                <option value="ALWAYS_PUBLIC">Always public</option>
                <option value="ADMIN_ONLY">Admin only</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="flex gap-4 pt-1">
              {[
                { label: 'Allow Revote', key: 'allowRevote' },
                { label: 'Multiple Choices', key: 'allowMultipleChoices' },
                { label: 'Active Now', key: 'isActive' },
              ].map(({ label, key }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={form[key]} onChange={e => setField(key, e.target.checked)}
                    className="w-4 h-4 accent-[var(--primary)] rounded" />
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
            <button onClick={handleSubmit} disabled={saving} className="btn-primary flex-1 h-11 text-sm font-bold disabled:opacity-60 transition-opacity">
              {saving ? 'Creating Poll...' : 'Create Poll'}
            </button>
            <button onClick={onClose} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Main PollsPage
export default function PollsPage() {
  const { show, Toast } = useToast()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [analyticsId, setAnalyticsId] = useState(null)
  const [analyticsQuestion, setAnalyticsQuestion] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = {}
      if (statusFilter !== 'all') params.status = statusFilter
      const res = await PollsAPI.getAll(params)
      const data = res?.data ?? res
      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.polls)
        ? data.polls
        : Array.isArray(data)
        ? data
        : []
      setPolls(list)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Poll?',
      text: 'This will also delete all votes. Cannot be undone.',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try { await PollsAPI.remove(id); show('Poll deleted!'); load() }
    catch (e) { show(e.message, 'error') }
  }

  const handleToggle = async (id, isActive) => {
    try {
      await PollsAPI.update(id, { isActive: !isActive })
      show(isActive ? 'Poll deactivated' : 'Poll activated', 'success')
      load()
    } catch (e) { show(e.message, 'error') }
  }

  const handleDeclareResult = async (id) => {
    const confirmed = await confirmDialog({ title: 'Declare Result?', text: 'This will publish results to all voters.', confirmButtonText: 'Declare' })
    if (!confirmed) return
    try { await PollsAPI.declareResult(id); show('Result declared!'); load() }
    catch (e) { show(e.message, 'error') }
  }

  const handleClose = async (id) => {
    const confirmed = await confirmDialog({ title: 'Close Poll?', text: 'No more votes will be accepted.', confirmButtonText: 'Close Poll' })
    if (!confirmed) return
    try { await PollsAPI.closePoll(id); show('Poll closed!'); load() }
    catch (e) { show(e.message, 'error') }
  }

  const handleExport = async (id, question) => {
    try {
      show('Preparing CSV export...', 'info')
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || ''
      const slug = localStorage.getItem('tenantSlug') || ''
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3001'
      const headers = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      if (slug) headers['x-tenant-slug'] = slug

      const res = await fetch(`${base}/polls/${id}/export?format=csv`, { headers })
      if (!res.ok) throw new Error('Failed to export CSV')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeTitle = (question || 'poll').replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
      a.download = `${safeTitle}_voter_audit.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      show('CSV downloaded successfully!', 'success')
    } catch (e) {
      show(e?.message || 'Failed to export CSV', 'error')
    }
  }

  const openAnalytics = (p) => { setAnalyticsId(p._id); setAnalyticsQuestion(p.question) }

  return (
    <div className="space-y-4">
      <Toast />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Polls</h1>
          <p className="text-xs text-gray-400">{polls.length} polls</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />Create
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'active', 'upcoming', 'closed'].map(f => (
          <button key={f} onClick={() => setStatusFilter(f)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${statusFilter === f ? 'text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'}`}
            style={statusFilter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>
            {f}
          </button>
        ))}
      </div>

      {/* Create Form */}
      {showForm && <CreatePollForm onClose={() => setShowForm(false)} onCreated={load} show={show} />}

      {/* Analytics Modal */}
      {analyticsId && (
        <AnalyticsModal pollId={analyticsId} question={analyticsQuestion} onClose={() => setAnalyticsId(null)} />
      )}

      {/* List */}
      {loading ? <Skeleton rows={4} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <div className="space-y-4">
          {polls.map(p => {
            const totalVotes = p.totalVotes ?? p.options?.reduce((s, o) => s + (o.votes || o.voteCount || 0), 0) ?? 0
            const isActive = p.isActive || p.status === 'active'
            const isExpanded = expandedId === p._id

            return (
              <div key={p._id} className="bg-white rounded-2xl shadow-sm border border-gray-100">
                {/* Poll Header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm font-bold text-gray-800 flex-1">{p.question}</p>
                    <StatusBadge status={p.status} isActive={p.isActive} />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {(p.options || []).map((o, i) => {
                      const votes = o.votes ?? o.voteCount ?? 0
                      const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                            <span>{o.text}</span>
                            <span style={{ color: 'var(--primary)' }}>{pct}% ({votes})</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                    <div className="text-[10px] text-gray-400 space-y-0.5">
                      <p>{totalVotes.toLocaleString()} total votes</p>
                      {p.category && <p className="font-medium text-gray-500">{p.category}</p>}
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : p._id)}
                      className="text-[10px] font-bold text-gray-400 flex items-center gap-0.5 hover:text-gray-600">
                      Actions {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                {isExpanded && (
                  <div className="px-4 pb-4 grid grid-cols-2 gap-2 border-t border-gray-50 pt-3">
                    {/* Toggle Active */}
                    <button onClick={() => handleToggle(p._id, isActive)}
                      className={`flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-xl ${isActive ? 'bg-yellow-50 text-yellow-600' : 'bg-green-50 text-green-600'}`}>
                      {isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      {isActive ? 'Deactivate' : 'Activate'}
                    </button>

                    {/* Close Poll */}
                    {isActive && (
                      <button onClick={() => handleClose(p._id)}
                        className="flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-xl bg-orange-50 text-orange-600">
                        <XCircle className="w-3.5 h-3.5" />Close Poll
                      </button>
                    )}

                    {/* Declare Result */}
                    <button onClick={() => handleDeclareResult(p._id)}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-xl bg-blue-50 text-blue-600">
                      <CheckCircle className="w-3.5 h-3.5" />Declare Result
                    </button>

                    {/* Analytics */}
                    <button onClick={() => openAnalytics(p)}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-xl bg-purple-50 text-purple-600">
                      <TrendingUp className="w-3.5 h-3.5" />Analytics
                    </button>

                    {/* Export CSV */}
                    <button onClick={() => handleExport(p._id, p.question)}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-xl bg-gray-50 text-gray-600">
                      <Download className="w-3.5 h-3.5" />Export CSV
                    </button>

                    {/* Delete */}
                    <button onClick={() => handleDelete(p._id)}
                      className="flex items-center justify-center gap-1 text-[11px] font-bold px-2 py-2 rounded-xl bg-red-50 text-red-500">
                      <X className="w-3.5 h-3.5" />Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {polls.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <BarChart3 className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-400">No polls found</p>
              <p className="text-xs text-gray-300 mt-1">Create your first poll</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
