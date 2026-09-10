import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CreditCard, AlertTriangle, ArrowLeft, X } from 'lucide-react'
import { CitizensAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const TABS = ['Details', 'Activity', 'Tags', 'Notes']

export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState(0)
  const [tagInput, setTagInput] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try { const res = await CitizensAPI.getOne(id); setUser(res?.data ?? res) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleBlock = async () => {
    const newStatus = user?.status === 'blocked' ? 'active' : 'blocked'
    try { await CitizensAPI.updateStatus(id, newStatus); show(`User ${newStatus}!`); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleUpgradeCategory = async (category) => {
    try { await CitizensAPI.upgradeCategory(id, category); show(`Upgraded to ${category}!`); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleAssignMembership = async () => {
    if (!confirm('Assign membership to this user?')) return
    try { await CitizensAPI.assignMembership(id, { notes: 'Assigned by admin' }); show('Membership assigned!'); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleAssignVolunteer = async () => {
    if (!confirm('Assign volunteer role to this user?')) return
    try { await CitizensAPI.assignVolunteer(id, { role: 'volunteer' }); show('Volunteer role assigned!'); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleAddTag = async () => {
    if (!tagInput.trim()) return
    try { await CitizensAPI.addTags(id, [tagInput.trim()]); show('Tag added!'); setTagInput(''); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleRemoveTag = async (tag) => {
    try { await CitizensAPI.removeTag(id, tag); show('Removed!'); load() }
    catch (e) { show(e.message, 'error') }
  }

  if (loading) return <div className="space-y-4"><Skeleton rows={4} /></div>
  if (error) return <ApiError message={error} onRetry={load} />

  const u = user || {}

  return (
    <div className="space-y-4">
      <Toast />
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header gradient */}
        <div className="h-20 relative" style={{ background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000))` }}>
          <div className="absolute top-3 right-3 flex gap-2">
            <button onClick={handleBlock}
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${u.status === 'blocked' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
              {u.status === 'blocked' ? 'Unblock' : 'Block User'}
            </button>
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="relative flex items-end justify-between -mt-10 mb-3">
            <div className="w-20 h-20 rounded-2xl border-4 border-white shadow-md flex items-center justify-center font-black text-2xl text-white overflow-hidden"
              style={{ background: 'var(--primary)' }}>
              {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover" /> : (u.name || 'U')[0]}
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${u.category === 'member' ? 'bg-green-100 text-green-700' : u.category === 'volunteer' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
              {u.category || 'citizen'}
            </span>
          </div>

          <div>
            <h1 className="text-lg font-black text-gray-900">{u.name || 'Unnamed User'}</h1>
            <p className="text-xs text-gray-400 mt-0.5">{u.mobile} · {u.area?.name || 'No area assigned'}</p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button onClick={() => handleUpgradeCategory('member')}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-green-50 text-green-600">
              + Make Member
            </button>
            <button onClick={() => handleUpgradeCategory('volunteer')}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-600">
              + Make Volunteer
            </button>
            {!u.membership && (
              <button onClick={handleAssignMembership}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-xl bg-orange-50 text-orange-600 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Assign Membership
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              ['Complaints', u.complaintsCount ?? '—'],
              ['Events', u.eventsCount ?? '—'],
              ['Polls', u.pollsCount ?? '—'],
            ].map(([l, v]) => (
              <div key={l} className="text-center py-2 rounded-xl" style={{ background: 'var(--primary-lighter)' }}>
                <p className="text-base font-black text-gray-800">{v}</p>
                <p className="text-[9px] text-gray-500">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 pb-1">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`text-xs font-bold pb-2 transition-all border-b-2 -mb-1 px-1 ${tab === i ? 'text-gray-900' : 'text-gray-400 border-transparent'}`}
            style={tab === i ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}}>{t}</button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        {tab === 0 && (
          <div className="space-y-3">
            {[
              ['Mobile', u.mobile || '—'],
              ['Email', u.email || '—'],
              ['Voter ID', u.voterId || '—'],
              ['Aadhaar (masked)', u.aadhaarLast4 ? `XXXX-XXXX-${u.aadhaarLast4}` : '—'],
              ['Gender', u.gender || '—'],
              ['Age / DOB', u.age ? `${u.age} yrs` : u.dob ? new Date(u.dob).toLocaleDateString('en-IN') : '—'],
              ['Area / Ward', u.area?.name || '—'],
              ['Village/Ward', u.area?.village?.name || u.area?.ward?.name || u.village || '—'],
              ['Booth', u.area?.booth?.name || u.booth || '—'],
              ['Joined', u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-[10px] text-gray-400 font-semibold">{l}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-3">
            {(u.complaints || []).length > 0 ? u.complaints.map(c => (
              <div key={c._id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--primary-lighter)' }}>
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{c.complaintNumber}</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                </div>
                <span className="text-[9px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{c.status}</span>
              </div>
            )) : <div className="text-center py-6"><p className="text-sm text-gray-400">No activity found</p></div>}
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(u.tags || []).map(t => (
                <div key={t} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                  style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                  {t}
                  <button onClick={() => handleRemoveTag(t)} className="opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              ))}
              {(u.tags || []).length === 0 && <p className="text-xs text-gray-400">No tags assigned</p>}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                placeholder="Add tag (e.g. VIP, Youth, Influencer)..."
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                className="flex-1 border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)]" />
              <button onClick={handleAddTag} className="btn-primary px-4 h-10 text-xs font-bold">Add</button>
            </div>
          </div>
        )}

        {tab === 3 && (
          <div>
            <p className="text-xs text-gray-400">{u.notes || 'No admin notes for this citizen.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
