import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Phone,
  UserCheck,
  Flame,
  CheckCircle2,
  XCircle,
  Lock,
  Globe,
  Camera,
  X,
  Send,
  MessageSquare
} from 'lucide-react'
import { ComplaintsAPI, AdminUsersAPI, UploadAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog, successAlert, errorAlert } from '../../utils/sweetAlert'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

const STATUSES = ['submitted', 'under_review', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected']
const statusLabel = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
}

const statusBadge = {
  submitted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  under_review: 'bg-orange-100 text-orange-800 border-orange-200',
  assigned: 'bg-purple-100 text-purple-800 border-purple-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-700 border-gray-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
}

const priorityConfig = {
  urgent: { bg: 'bg-red-500 text-white font-black', label: 'Urgent' },
  high: { bg: 'bg-orange-100 text-orange-800', label: 'High' },
  medium: { bg: 'bg-amber-100 text-amber-800', label: 'Medium' },
  low: { bg: 'bg-slate-100 text-slate-700', label: 'Low' },
}

export default function ComplaintDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()

  const [c, setC] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [staffList, setStaffList] = useState([])

  // Quick Status Transition
  const [newStatus, setNewStatus] = useState('submitted')
  const [statusNote, setStatusNote] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Modals state
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigneeId, setAssigneeId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assignPriority, setAssignPriority] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [showPriorityModal, setShowPriorityModal] = useState(false)
  const [selectedPriority, setSelectedPriority] = useState('medium')
  const [priorityNote, setPriorityNote] = useState('')
  const [updatingPriority, setUpdatingPriority] = useState(false)

  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionDetails, setResolutionDetails] = useState('')
  const [resolveProofFiles, setResolveProofFiles] = useState([])
  const [resolveNote, setResolveNote] = useState('')
  const [resolving, setResolving] = useState(false)

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const [showCloseModal, setShowCloseModal] = useState(false)
  const [closingNote, setClosingNote] = useState('')
  const [closing, setClosing] = useState(false)

  // Remarks state
  const [remarkText, setRemarkText] = useState('')
  const [isInternalRemark, setIsInternalRemark] = useState(true)
  const [submittingRemark, setSubmittingRemark] = useState(false)

  // Image Zoom Modal
  const [zoomImage, setZoomImage] = useState(null)

  const getMediaUrl = (path) => {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`
  }

  // Load Single Complaint
  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await ComplaintsAPI.getOne(id)
      const data = res?.data ?? res
      setC(data)
      setNewStatus(data?.status || 'submitted')
      setSelectedPriority(data?.priority || 'medium')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  // Load Staff List for Assignment
  const loadStaff = useCallback(async () => {
    try {
      const res = await AdminUsersAPI.getAll()
      const list = res?.data ?? res ?? []
      setStaffList(Array.isArray(list) ? list : [])
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    load()
    loadStaff()
  }, [load, loadStaff])

  // ── 1. Assign Staff Action ──────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assigneeId) {
      show('Please select a staff member', 'error')
      return
    }
    setAssigning(true)
    try {
      await ComplaintsAPI.assign(id, {
        assignedTo: assigneeId,
        note: assignNote.trim() || undefined,
        priority: assignPriority || undefined,
      })
      show('Complaint assigned successfully!')
      setShowAssignModal(false)
      setAssignNote('')
      load()
    } catch (e) {
      show(e.message || 'Failed to assign complaint', 'error')
    } finally {
      setAssigning(false)
    }
  }

  // ── 2. Update Priority Action ───────────────────────────────
  const handleUpdatePriority = async (e) => {
    e.preventDefault()
    setUpdatingPriority(true)
    try {
      await ComplaintsAPI.updatePriority(id, selectedPriority, priorityNote.trim())
      show('Priority updated successfully!')
      setShowPriorityModal(false)
      setPriorityNote('')
      load()
    } catch (e) {
      show(e.message || 'Failed to update priority', 'error')
    } finally {
      setUpdatingPriority(false)
    }
  }

  // ── 3. Resolve with Proof Media Action ──────────────────────
  const handleResolve = async (e) => {
    e.preventDefault()
    if (!resolutionDetails.trim()) {
      show('Resolution details are required', 'error')
      return
    }
    setResolving(true)
    try {
      let resolutionProof = []
      if (resolveProofFiles.length > 0) {
        const upRes = await UploadAPI.uploadFiles('complaints', resolveProofFiles)
        resolutionProof = upRes?.urls || []
      }

      await ComplaintsAPI.resolve(id, {
        resolutionDetails: resolutionDetails.trim(),
        resolutionProof,
        note: resolveNote.trim() || undefined,
      })
      show('Complaint resolved with proof!')
      setShowResolveModal(false)
      setResolutionDetails('')
      setResolveProofFiles([])
      setResolveNote('')
      load()
    } catch (e) {
      show(e.message || 'Failed to resolve complaint', 'error')
    } finally {
      setResolving(false)
    }
  }

  // ── 4. Reject Action ────────────────────────────────────────
  const handleReject = async (e) => {
    e.preventDefault()
    if (!rejectionReason.trim()) {
      show('Rejection reason is required', 'error')
      return
    }
    setRejecting(true)
    try {
      await ComplaintsAPI.reject(id, rejectionReason.trim())
      show('Complaint rejected')
      setShowRejectModal(false)
      setRejectionReason('')
      load()
    } catch (e) {
      show(e.message || 'Failed to reject complaint', 'error')
    } finally {
      setRejecting(false)
    }
  }

  // ── 5. Close Action ─────────────────────────────────────────
  const handleClose = async (e) => {
    e.preventDefault()
    setClosing(true)
    try {
      await ComplaintsAPI.close(id, closingNote.trim() || undefined)
      show('Complaint officially closed')
      setShowCloseModal(false)
      setClosingNote('')
      load()
    } catch (e) {
      show(e.message || 'Failed to close complaint', 'error')
    } finally {
      setClosing(false)
    }
  }

  // ── 6. Generic Status Transition ────────────────────────────
  const handleStatusUpdate = async () => {
    setUpdatingStatus(true)
    try {
      await ComplaintsAPI.updateStatus(id, newStatus, statusNote.trim())
      show('Status updated!')
      setStatusNote('')
      load()
    } catch (e) {
      show(e.message || 'Failed to update status', 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // ── 7. Add Remark (Internal / Public) ───────────────────────
  const handleAddRemark = async (e) => {
    e.preventDefault()
    if (!remarkText.trim()) return
    setSubmittingRemark(true)
    try {
      await ComplaintsAPI.addRemark(id, remarkText.trim(), isInternalRemark)
      show(isInternalRemark ? 'Internal remark added' : 'Public reply sent to citizen')
      setRemarkText('')
      load()
    } catch (e) {
      show(e.message || 'Failed to add remark', 'error')
    } finally {
      setSubmittingRemark(false)
    }
  }

  // ── Toggle Public Visibility Action (Citizen PWA) ─────────
  const [togglingPublic, setTogglingPublic] = useState(false)
  const handleTogglePublic = async () => {
    const nextState = !c?.isPublic
    const confirmed = await confirmDialog({
      title: nextState ? 'Publish to Citizen PWA?' : 'Make Private?',
      text: nextState
        ? 'This complaint, its photos and resolution details will become visible to all citizens on the PWA community board. Sensitive citizen contact info will remain private.'
        : 'This complaint will be removed from the public PWA board and will only be visible to the original submitter.',
      confirmButtonText: nextState ? 'Yes, Publish to PWA' : 'Yes, Make Private',
      icon: nextState ? 'question' : 'warning',
    })
    if (!confirmed) return
    setTogglingPublic(true)
    try {
      await ComplaintsAPI.togglePublic(id, nextState)
      successAlert(
        nextState ? 'Published to PWA!' : 'Made Private',
        nextState ? 'Complaint is now visible to all citizens on Citizen PWA.' : 'Complaint is now private.'
      )
      load()
    } catch (e) {
      errorAlert('Action Failed', e.message || 'Failed to update public status')
    } finally {
      setTogglingPublic(false)
    }
  }

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />
  if (!c) return null

  const currentIdx = STATUSES.indexOf(c?.status?.toLowerCase())
  const allAttachments = [...(c?.attachments || []), ...(c?.mediaUrls || [])]
  const pc = priorityConfig[c?.priority?.toLowerCase()] || priorityConfig.medium
  const sc = statusBadge[c?.status?.toLowerCase()] || statusBadge.submitted

  // Remarks array merged & sorted
  const allRemarks = [
    ...(c?.internalRemarks || []).map((r) => ({ ...r, isInternal: true })),
    ...(c?.publicRemarks || []).map((r) => ({ ...r, isInternal: false })),
  ].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))

  return (
    <div className="space-y-4 max-w-3xl pb-10">
      <Toast />

      {/* Top Back & Quick Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Complaints
        </button>

        <span className="text-xs text-gray-400 font-medium">
          Created {c?.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : ''}
        </span>
      </div>

      {/* ============================================================ */}
      {/* 1. MAIN OVERVIEW CARD                                        */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        {/* Header Badges */}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-wider" style={{ color: 'var(--primary)' }}>
                {c?.complaintNumber || '#' + c?._id?.slice(-6)}
              </span>
              <span className="text-xs text-gray-400 font-semibold">•</span>
              <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                {c?.category || 'General'}
              </span>
            </div>
            <h1 className="text-lg font-black text-gray-900 mt-1">{c?.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Priority Badge (Clickable to change) */}
            <button
              onClick={() => {
                setSelectedPriority(c?.priority || 'medium')
                setShowPriorityModal(true)
              }}
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border shadow-xs flex items-center gap-1 cursor-pointer hover:opacity-90 ${pc.bg}`}
              title="Click to update priority"
            >
              <Flame className="w-3 h-3" />
              {pc.label}
            </button>

            {/* Status Badge */}
            <span className={`text-[11px] font-bold px-3 py-1 rounded-xl border ${sc}`}>
              {statusLabel[c?.status?.toLowerCase()] || c?.status}
            </span>
          </div>
        </div>

        {/* Public to Citizen PWA Toggle Banner */}
        <div
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
            c?.isPublic
              ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                c?.isPublic
                  ? 'bg-emerald-500 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              <Globe className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs font-black">
                  {c?.isPublic ? 'Live on Citizen PWA' : 'Private Complaint'}
                </p>
                {c?.isPublic && (
                  <span className="text-[9px] font-black uppercase bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                    Public
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-75 mt-0.5">
                {c?.isPublic
                  ? 'Visible to all citizens on the PWA community board with resolution & photos.'
                  : 'Only visible to the submitter citizen and admin team.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleTogglePublic}
            disabled={togglingPublic}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ml-2 ${
              c?.isPublic
                ? 'bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-100/60'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            {togglingPublic ? 'Updating...' : c?.isPublic ? 'Make Private' : 'Make Public'}
          </button>
        </div>

        {/* Description */}
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-100 text-sm text-gray-700 leading-relaxed">
          {c?.description || 'No description provided.'}
        </div>

        {/* Citizen Details Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Citizen Name</p>
            <p className="font-bold text-gray-800 mt-0.5 truncate">{c?.userId?.name || c?.user?.name || '—'}</p>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Mobile Number</p>
            {c?.userId?.mobile ? (
              <a
                href={`tel:${c.userId.mobile}`}
                className="font-bold text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
              >
                <Phone className="w-3 h-3" /> {c.userId.mobile}
              </a>
            ) : (
              <p className="font-semibold text-gray-700 mt-0.5">—</p>
            )}
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Constituency / Area</p>
            <p className="font-bold text-gray-800 mt-0.5 truncate">{c?.areaId?.name || c?.area?.name || '—'}</p>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Voter ID</p>
            <p className="font-bold text-gray-800 mt-0.5 truncate">{c?.userId?.voterId || 'N/A'}</p>
          </div>
        </div>

        {/* Citizen Photo Attachments */}
        {allAttachments.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
              <Camera className="w-3.5 h-3.5 text-blue-600" />
              Citizen Attachments ({allAttachments.length} Photos)
            </div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              {allAttachments.map((url, i) => (
                <img
                  key={i}
                  src={getMediaUrl(url)}
                  alt={`Attachment ${i + 1}`}
                  onClick={() => setZoomImage(getMediaUrl(url))}
                  className="w-20 h-20 object-cover rounded-xl border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity shrink-0 shadow-xs"
                />
              ))}
            </div>
          </div>
        )}

        {/* Citizen Video Link (if any) */}
        {c?.videoUrl && (
          <div className="pt-2 text-xs">
            <span className="font-bold text-gray-700">Video Link: </span>
            <a
              href={c.videoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline font-semibold"
            >
              {c.videoUrl}
            </a>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* 2. ASSIGNED STAFF & DISPATCH CARD                           */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--primary-light)' }}
          >
            <UserCheck className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase">Assigned Staff / Coordinator</p>
            {c?.assignedTo ? (
              <div>
                <p className="text-sm font-bold text-gray-900">{c.assignedTo.name}</p>
                <p className="text-xs text-gray-500">
                  {c.assignedTo.role} {c.assignedTo.phone ? `• 📞 ${c.assignedTo.phone}` : ''}
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold text-amber-600 mt-0.5">⚠️ No staff assigned yet</p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setAssigneeId(c?.assignedTo?._id || '')
            setShowAssignModal(true)
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
          style={{ background: 'var(--primary)' }}
        >
          {c?.assignedTo ? 'Re-assign Staff' : 'Assign to Staff'}
        </button>
      </div>

      {/* ============================================================ */}
      {/* 3. RESOLUTION PROOF (IF RESOLVED OR CLOSED)                 */}
      {/* ============================================================ */}
      {(c?.status === 'resolved' || c?.status === 'closed' || c?.resolutionDetails) && (
        <div className="bg-green-50/70 border border-green-200 rounded-3xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-800 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Resolution Details & Proof
            </div>
            {c?.resolvedAt && (
              <span className="text-[11px] text-green-700 font-semibold">
                Resolved: {new Date(c.resolvedAt).toLocaleDateString('en-IN')}
              </span>
            )}
          </div>

          <p className="text-xs text-green-900 bg-white p-3 rounded-xl border border-green-100 leading-relaxed">
            {c?.resolutionDetails || 'No resolution note recorded.'}
          </p>

          {/* Proof Photos */}
          {c?.resolutionProof && c.resolutionProof.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-green-800">Before / After Proof Photos:</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {c.resolutionProof.map((url, i) => (
                  <img
                    key={i}
                    src={getMediaUrl(url)}
                    alt={`Proof ${i + 1}`}
                    onClick={() => setZoomImage(getMediaUrl(url))}
                    className="w-20 h-20 object-cover rounded-xl border border-green-200 cursor-pointer shadow-xs"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rejection Details (If Rejected) */}
      {c?.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
            <XCircle className="w-4 h-4 text-red-600" />
            Complaint Rejected
          </div>
          <p className="text-xs text-red-900 bg-white p-3 rounded-xl border border-red-100">
            <strong>Reason: </strong> {c?.rejectionReason || 'No explicit reason provided.'}
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. FAST ACTION TOOLBAR                                       */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h3 className="text-sm font-bold text-gray-900">Complaint Actions</h3>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
          {/* Resolve Button */}
          <button
            onClick={() => setShowResolveModal(true)}
            className="p-2.5 rounded-2xl bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Resolve
          </button>

          {/* Assign Staff */}
          <button
            onClick={() => setShowAssignModal(true)}
            className="p-2.5 rounded-2xl bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <UserCheck className="w-4 h-4" />
            Assign
          </button>

          {/* Change Priority */}
          <button
            onClick={() => setShowPriorityModal(true)}
            className="p-2.5 rounded-2xl bg-amber-500 text-white hover:bg-amber-600 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Flame className="w-4 h-4" />
            Priority
          </button>

          {/* Close Complaint */}
          <button
            onClick={() => setShowCloseModal(true)}
            className="p-2.5 rounded-2xl bg-gray-700 text-white hover:bg-gray-800 flex items-center justify-center gap-1.5 shadow-xs transition-colors"
          >
            <Check className="w-4 h-4" />
            Close
          </button>

          {/* Reject */}
          <button
            onClick={() => setShowRejectModal(true)}
            className="p-2.5 rounded-2xl bg-red-600 text-white hover:bg-red-700 flex items-center justify-center gap-1.5 shadow-xs transition-colors col-span-2 sm:col-span-1"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>

        {/* Status Dropdown & Manual Transition */}
        <div className="pt-3 border-t border-gray-100 flex items-center gap-2">
          <div className="relative flex-1">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-3 h-10 text-xs font-bold outline-none focus:border-[var(--primary)] pr-8"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  Change Status ➔ {statusLabel[s]}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button
            onClick={handleStatusUpdate}
            disabled={updatingStatus}
            className="px-4 h-10 rounded-xl text-xs font-bold text-white shadow-xs disabled:opacity-50 shrink-0"
            style={{ background: 'var(--primary)' }}
          >
            {updatingStatus ? 'Saving...' : 'Apply Status'}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. REMARKS (INTERNAL ADMIN NOTES & PUBLIC REPLIES)          */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-700" />
            <h3 className="text-sm font-bold text-gray-900">Remarks & Comments</h3>
          </div>
          <span className="text-[11px] text-gray-400 font-semibold">{allRemarks.length} Total</span>
        </div>

        {/* Add Remark Form */}
        <form onSubmit={handleAddRemark} className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 space-y-2.5">
          <textarea
            rows={2}
            placeholder="Add an internal note or public reply to the citizen..."
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[var(--primary)] resize-none"
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternalRemark}
                onChange={(e) => setIsInternalRemark(e.target.checked)}
                className="rounded text-indigo-600 w-4 h-4"
              />
              {isInternalRemark ? (
                <span className="flex items-center gap-1 text-purple-700">
                  <Lock className="w-3 h-3" /> Internal Note (Admin only)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-700">
                  <Globe className="w-3 h-3" /> Public Reply (Visible to Citizen)
                </span>
              )}
            </label>

            <button
              type="submit"
              disabled={submittingRemark || !remarkText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-xs disabled:opacity-40"
              style={{ background: 'var(--primary)' }}
            >
              <Send className="w-3 h-3" />
              {submittingRemark ? 'Adding...' : 'Post Remark'}
            </button>
          </div>
        </form>

        {/* Remarks Feed */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {allRemarks.map((r, i) => (
            <div
              key={i}
              className={`p-3 rounded-2xl border text-xs space-y-1 ${
                r.isInternal ? 'bg-purple-50/60 border-purple-100' : 'bg-green-50/60 border-green-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">
                  {r.addedByName || 'Admin Staff'}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                      r.isInternal ? 'bg-purple-200 text-purple-800' : 'bg-green-200 text-green-800'
                    }`}
                  >
                    {r.isInternal ? 'Internal' : 'Public'}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('en-IN') : ''}
                  </span>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">{r.remark}</p>
            </div>
          ))}

          {allRemarks.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-3">No remarks yet. Add the first one above.</p>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. TIMELINE & AUDIT TRAIL                                    */}
      {/* ============================================================ */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Audit Timeline</h3>
        {STATUSES.map((s, i) => {
          const done = i <= currentIdx
          const eventMatch = (c?.timeline || [])
            .slice()
            .reverse()
            .find((t) => t.status?.toLowerCase() === s.toLowerCase())
          const timeText = eventMatch?.updatedAt || (done && i === currentIdx ? c?.updatedAt : null)

          return (
            <div key={s} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'text-white' : 'bg-gray-100'
                  }`}
                  style={done ? { background: 'var(--primary)' } : {}}
                >
                  {done ? <Check className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                {i < STATUSES.length - 1 && (
                  <div
                    className={`w-0.5 h-8 ${done ? '' : 'bg-gray-100'}`}
                    style={done ? { background: 'var(--primary-light)' } : {}}
                  />
                )}
              </div>
              <div className="pb-4 flex-1">
                <p className={`text-sm font-semibold ${done ? 'text-gray-800' : 'text-gray-400'}`}>
                  {statusLabel[s]}
                </p>
                {timeText && (
                  <p className="text-[10px] text-gray-400">{new Date(timeText).toLocaleString('en-IN')}</p>
                )}
                {eventMatch?.note && (
                  <p className="text-xs text-gray-600 mt-1 bg-gray-50 rounded-xl px-2.5 py-1.5 border border-gray-100">
                    {eventMatch.note}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ============================================================ */}
      {/* MODAL 1: ASSIGN TO STAFF                                     */}
      {/* ============================================================ */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                <h2 className="text-base font-bold text-gray-900">Assign Complaint</h2>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAssign} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Select Field Worker / Coordinator *</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 h-10 text-xs font-bold outline-none focus:border-[var(--primary)]"
                  required
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffList.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.role}) {s.phone ? `- ${s.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Optional Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 h-10 text-xs font-bold outline-none focus:border-[var(--primary)]"
                >
                  <option value="">Keep current priority</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Instruction / Dispatch Note</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please visit the site and check the transformer..."
                  value={assignNote}
                  onChange={(e) => setAssignNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {assigning ? 'Assigning...' : 'Assign Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: UPDATE PRIORITY                                     */}
      {/* ============================================================ */}
      {showPriorityModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-gray-900">Set Priority</h2>
              </div>
              <button onClick={() => setShowPriorityModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePriority} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {['low', 'medium', 'high', 'urgent'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSelectedPriority(p)}
                    className={`p-3 rounded-2xl text-xs font-black uppercase border text-center transition-all ${
                      selectedPriority === p
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Reason / Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Reason for priority change..."
                  value={priorityNote}
                  onChange={(e) => setPriorityNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPriorityModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingPriority}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {updatingPriority ? 'Updating...' : 'Save Priority'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: RESOLVE WITH PROOF PHOTOS                           */}
      {/* ============================================================ */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h2 className="text-base font-bold text-gray-900">Resolve Complaint</h2>
              </div>
              <button onClick={() => setShowResolveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Resolution Details * (Describe work completed)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Broken water pipe replaced and tested with community..."
                  value={resolutionDetails}
                  onChange={(e) => setResolutionDetails(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[var(--primary)] resize-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Upload Proof Photos (Before / After Photos)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setResolveProofFiles(Array.from(e.target.files || []))}
                  className="w-full text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                {resolveProofFiles.length > 0 && (
                  <p className="text-[10px] text-green-600 font-bold mt-1">
                    ✓ {resolveProofFiles.length} photo(s) selected
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Internal Note (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Internal notes for record..."
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolving}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 shadow-xs disabled:opacity-50"
                >
                  {resolving ? 'Uploading & Resolving...' : 'Confirm Resolve'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: REJECT COMPLAINT                                    */}
      {/* ============================================================ */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <h2 className="text-base font-bold text-gray-900">Reject Complaint</h2>
              </div>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Rejection Reason * (Required)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Duplicate request or issue falls outside jurisdiction..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-red-500 resize-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejecting}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-xs disabled:opacity-50"
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* MODAL 5: CLOSE COMPLAINT                                     */}
      {/* ============================================================ */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-gray-700" />
                <h2 className="text-base font-bold text-gray-900">Close Complaint</h2>
              </div>
              <button onClick={() => setShowCloseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleClose} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Closing Note (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified with citizen on phone, work completed satisfactorily..."
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-gray-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloseModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closing}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 shadow-xs disabled:opacity-50"
                >
                  {closing ? 'Closing...' : 'Confirm Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 5: FULL-SCREEN IMAGE ZOOM                              */}
      {/* ============================================================ */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-2xl max-h-[85vh]">
            <img
              src={zoomImage}
              alt="Zoom Preview"
              className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 bg-white text-gray-900 rounded-full p-1.5 shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
