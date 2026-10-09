import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Download, RefreshCw, CheckCircle, XCircle, Edit3, X, AlertCircle } from 'lucide-react'
import { MembershipAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Edit Card modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [designation, setDesignation] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [savingCard, setSavingCard] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await MembershipAPI.getOne(id)
      setMember(res?.data ?? res)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  const handleRegenCard = async () => {
    setActionLoading(true)
    try {
      await MembershipAPI.regenerateCard(id, { forceRegenerate: true })
      show('Card regenerated successfully!')
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadCard = async () => {
    try {
      const num = member?.membershipNumber || id
      await MembershipAPI.downloadCardBlob(id, `membership-${num}.png`)
      show('Card downloaded!')
    } catch (e) {
      show(e.message || 'Download failed', 'error')
    }
  }

  const handleApprove = async () => {
    const des = prompt('Designation for member card:', member?.designation || 'Active Member')
    if (des === null) return
    try {
      await MembershipAPI.approve(id, { designation: des })
      show('Approved! Card generated.')
      load()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  const handleReject = async () => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    try {
      await MembershipAPI.reject(id, reason)
      show('Rejected.')
      load()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  const openEditModal = () => {
    setDesignation(member?.designation || 'Active Member')
    const exp = member?.expiresAt || member?.validTill
    setExpiresAt(exp ? new Date(exp).toISOString().slice(0, 10) : '')
    setIsEditModalOpen(true)
  }

  const handleSaveCard = async () => {
    setSavingCard(true)
    try {
      const payload = { designation: designation.trim() }
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString()
      await MembershipAPI.updateCardDetails(id, payload)
      show('Card details updated!')
      setIsEditModalOpen(false)
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSavingCard(false)
    }
  }

  if (loading) return <Skeleton rows={4} />
  if (error) return <ApiError message={error} onRetry={load} />

  const m = member || {}
  const u = m.userId || m.user || {}
  const plan = m.planId || {}
  const expiresDate = m.expiresAt || m.validTill
  const isApproved = m.status === 'approved'
  const isPending = m.status === 'pending'

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      <Toast />
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition-opacity cursor-pointer"
        style={{ color: 'var(--primary)' }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Membership
      </button>

      {/* Member Card Preview */}
      <div
        className="rounded-3xl overflow-hidden shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${plan.badgeColor || 'var(--primary)'}, color-mix(in srgb, ${plan.badgeColor || 'var(--primary)'} 60%, #000))`,
        }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span
              className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full ${
                isApproved ? 'bg-green-400 text-white' : isPending ? 'bg-amber-400 text-white' : 'bg-red-400 text-white'
              }`}
            >
              {m.status || 'PENDING'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl overflow-hidden border-2 border-white/30">
              {m.photoUrl || u.photo ? (
                <img src={m.photoUrl || u.photo} alt="" className="w-full h-full object-cover" />
              ) : (
                (u.name || 'M')[0]
              )}
            </div>
            <div>
              <p className="text-white font-black text-base">{u.name || '—'}</p>
              <p className="text-white/80 text-xs">{m.designation || plan.name || 'Active Member'}</p>
              <p className="text-white/95 text-xs font-bold font-mono mt-0.5">{m.membershipNumber || '—'}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
            <div>
              <p className="text-white/60 text-[9px] uppercase font-bold">Valid Till</p>
              <p className="text-white text-xs font-bold">
                {expiresDate ? new Date(expiresDate).toLocaleDateString('en-IN') : 'Lifetime'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[9px] uppercase font-bold">Area / Unit</p>
              <p className="text-white text-xs font-bold">{u.areaId?.name || u.area?.name || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details & Actions */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
          <h3 className="text-sm font-black text-gray-900">Member Details</h3>
          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  onClick={handleApprove}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-green-600 text-white flex items-center gap-1 hover:bg-green-700 cursor-pointer"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </button>
                <button
                  onClick={handleReject}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </>
            )}

            {isApproved && (
              <>
                <button
                  onClick={handleDownloadCard}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                  style={{ background: 'var(--primary-light, #eff6ff)', color: 'var(--primary)' }}
                >
                  <Download className="w-3.5 h-3.5" /> Download Card
                </button>
                <button
                  onClick={handleRegenCard}
                  disabled={actionLoading}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 flex items-center gap-1.5 hover:bg-orange-100 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} /> Regen
                </button>
                <button
                  onClick={openEditModal}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 flex items-center gap-1.5 hover:bg-gray-200 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 text-xs">
          {[
            ['Member ID', m.membershipNumber || '—'],
            ['Full Name', u.name || '—'],
            ['Mobile Number', u.mobile || '—'],
            ['Email Address', u.email || '—'],
            ['Status', m.status || '—'],
            ['Membership Plan', plan.name || 'Default Tier'],
            ['Applied Date', m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'],
            ['Approved Date', m.approvedAt ? new Date(m.approvedAt).toLocaleDateString('en-IN') : '—'],
            ['Valid Till', expiresDate ? new Date(expiresDate).toLocaleDateString('en-IN') : 'Lifetime'],
            ['Area / Constituency', u.areaId?.name || u.area?.name || '—'],
          ].map(([l, v]) => (
            <div key={l} className="bg-gray-50/70 p-2.5 rounded-2xl">
              <p className="text-[10px] text-gray-400 font-semibold">{l}</p>
              <p className="text-xs font-black text-gray-800 mt-0.5 capitalize">{v}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {m.notes && (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Notes</p>
            <p className="text-xs text-gray-700 bg-gray-50 rounded-2xl p-3">{m.notes}</p>
          </div>
        )}

        {/* Rejection reason */}
        {m.rejectionReason && (
          <div className="bg-red-50 rounded-2xl p-3 border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-700">Rejection Reason</p>
              <p className="text-xs text-red-600 mt-0.5">{m.rejectionReason}</p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Card Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Edit Card Details
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Valid Till Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCard}
                disabled={savingCard}
                className="flex-1 py-2 text-xs font-bold rounded-xl text-white shadow-sm cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                {savingCard ? 'Saving...' : 'Save & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
