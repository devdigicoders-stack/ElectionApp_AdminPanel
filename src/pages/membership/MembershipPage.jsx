import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  QrCode,
  CreditCard,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit3,
  Trash2,
  Eye,
  ShieldCheck,
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import { MembershipAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function MembershipPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()

  // Main navigation & list state
  const [tab, setTab] = useState('applications') // 'applications' | 'members' | 'rejected' | 'plans'
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [exporting, setExporting] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const limit = 15

  // Plans Tab State
  const [plans, setPlans] = useState([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState(null)
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [planForm, setPlanForm] = useState({
    name: '',
    code: '',
    description: '',
    price: 0,
    validityDays: 365,
    badgeText: 'MEMBER',
    badgeColor: '#2563eb',
    benefits: '',
    requiresApproval: false,
    isActive: true,
  })
  const [savingPlan, setSavingPlan] = useState(false)

  // Verify QR Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [verifyInput, setVerifyInput] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [verifyError, setVerifyError] = useState(null)

  // Approve Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
  const [approveTarget, setApproveTarget] = useState(null)
  const [approveDesignation, setApproveDesignation] = useState('Active Member')
  const [approveValidDays, setApproveValidDays] = useState(365)
  const [approving, setApproving] = useState(false)

  // Reject Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Edit Card Details Modal State
  const [isCardModalOpen, setIsCardModalOpen] = useState(false)
  const [cardTarget, setCardTarget] = useState(null)
  const [cardDesignation, setCardDesignation] = useState('')
  const [cardExpiresAt, setCardExpiresAt] = useState('')
  const [savingCard, setSavingCard] = useState(false)

  // Load Members Data
  const load = useCallback(async () => {
    if (tab === 'plans') {
      loadPlans()
      return
    }
    setLoading(true)
    setError(null)
    try {
      const statusMap = {
        applications: 'pending',
        members: 'approved',
        rejected: 'rejected',
      }
      const params = {
        page,
        limit,
        status: statusMap[tab] || 'pending',
      }
      if (searchQuery.trim()) params.search = searchQuery.trim()

      const [res, st] = await Promise.all([
        MembershipAPI.getAll(params),
        MembershipAPI.getStats(),
      ])

      const resData = res?.data ?? res
      const list = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData?.items)
        ? resData.items
        : Array.isArray(resData?.memberships)
        ? resData.memberships
        : Array.isArray(resData)
        ? resData
        : []

      setItems(list)
      setTotal(resData?.total ?? list.length)
      setStats(st?.data ?? st)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [tab, page, searchQuery])

  // Load Plans Data
  const loadPlans = async () => {
    setPlansLoading(true)
    setPlansError(null)
    try {
      const [res, st] = await Promise.all([
        MembershipAPI.getPlans(),
        MembershipAPI.getStats(),
      ])
      const resData = res?.data ?? res
      const list = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData)
        ? resData
        : []
      setPlans(list)
      setStats(st?.data ?? st)
    } catch (e) {
      setPlansError(e.message)
    } finally {
      setPlansLoading(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
  }, [tab, searchQuery])

  useEffect(() => {
    load()
  }, [load])

  // Debounced Search trigger
  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearchQuery(search)
  }

  // Action: Export CSV
  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const statusMap = {
        applications: 'pending',
        members: 'approved',
        rejected: 'rejected',
      }
      const params = {}
      if (tab !== 'plans' && statusMap[tab]) params.status = statusMap[tab]
      if (searchQuery.trim()) params.search = searchQuery.trim()

      await MembershipAPI.exportCsv(params)
      show('Members exported successfully!')
    } catch (e) {
      show(e.message || 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  // Action: Open Approve Modal
  const openApproveModal = (m) => {
    setApproveTarget(m)
    setApproveDesignation(m.designation || m.planId?.name || 'Active Member')
    setApproveValidDays(m.planId?.validityDays || 365)
    setIsApproveModalOpen(true)
  }

  // Action: Confirm Approve
  const handleConfirmApprove = async () => {
    if (!approveTarget) return
    setApproving(true)
    try {
      const payload = {
        designation: approveDesignation.trim(),
      }
      const days = Number(approveValidDays)
      if (days && days > 0) {
        payload.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      }
      await MembershipAPI.approve(approveTarget._id, payload)
      show('Approved! Digital membership card generated.')
      setIsApproveModalOpen(false)
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setApproving(false)
    }
  }

  // Action: Open Reject Modal
  const openRejectModal = (m) => {
    setRejectTarget(m)
    setRejectReason('')
    setIsRejectModalOpen(true)
  }

  // Action: Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectTarget) return
    if (!rejectReason.trim()) {
      show('Please enter rejection reason', 'error')
      return
    }
    setRejecting(true)
    try {
      await MembershipAPI.reject(rejectTarget._id, rejectReason.trim())
      show('Application rejected.')
      setIsRejectModalOpen(false)
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setRejecting(false)
    }
  }

  // Action: Regenerate Card
  const handleRegenCard = async (id) => {
    setActionLoadingId(id)
    try {
      await MembershipAPI.regenerateCard(id, { forceRegenerate: true })
      show('Card regenerated with latest QR code!')
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Action: Download Card PNG
  const handleDownloadCard = async (m) => {
    try {
      const num = m.membershipNumber || m._id
      await MembershipAPI.downloadCardBlob(m._id, `membership-${num}.png`)
      show('Card downloaded!')
    } catch (e) {
      show(e.message || 'Download failed', 'error')
    }
  }

  // Action: Open Edit Card Details Modal
  const openCardModal = (m) => {
    setCardTarget(m)
    setCardDesignation(m.designation || 'Active Member')
    const exp = m.expiresAt || m.validTill
    setCardExpiresAt(exp ? new Date(exp).toISOString().slice(0, 10) : '')
    setIsCardModalOpen(true)
  }

  // Action: Save Card Details
  const handleSaveCardDetails = async () => {
    if (!cardTarget) return
    setSavingCard(true)
    try {
      const payload = { designation: cardDesignation.trim() }
      if (cardExpiresAt) payload.expiresAt = new Date(cardExpiresAt).toISOString()
      await MembershipAPI.updateCardDetails(cardTarget._id, payload)
      show('Card details updated and regenerated!')
      setIsCardModalOpen(false)
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSavingCard(false)
    }
  }

  // Action: Verify QR / Membership ID
  const handleVerifyQR = async () => {
    if (!verifyInput.trim()) {
      setVerifyError('Please enter a membership number or scan QR code')
      return
    }
    setVerifyLoading(true)
    setVerifyError(null)
    setVerifyResult(null)
    try {
      const res = await MembershipAPI.verifyQR(verifyInput.trim())
      const data = res?.data ?? res
      setVerifyResult(data)
    } catch (e) {
      setVerifyError(e.message || 'Membership number not found or invalid')
    } finally {
      setVerifyLoading(false)
    }
  }

  // Action: Open Create/Edit Plan Modal
  const openCreatePlanModal = () => {
    setEditingPlan(null)
    setPlanForm({
      name: '',
      code: '',
      description: '',
      price: 0,
      validityDays: 365,
      badgeText: 'MEMBER',
      badgeColor: '#2563eb',
      benefits: '',
      requiresApproval: false,
      isActive: true,
    })
    setIsPlanModalOpen(true)
  }

  const openEditPlanModal = (p) => {
    setEditingPlan(p)
    setPlanForm({
      name: p.name || '',
      code: p.code || '',
      description: p.description || '',
      price: p.price ?? 0,
      validityDays: p.validityDays ?? 365,
      badgeText: p.badgeText || 'MEMBER',
      badgeColor: p.badgeColor || '#2563eb',
      benefits: Array.isArray(p.benefits) ? p.benefits.join(', ') : '',
      requiresApproval: !!p.requiresApproval,
      isActive: p.isActive !== false,
    })
    setIsPlanModalOpen(true)
  }

  // Action: Save Plan
  const handleSavePlan = async (e) => {
    e.preventDefault()
    if (!planForm.name.trim() || !planForm.code.trim()) {
      show('Plan name and unique code are required', 'error')
      return
    }
    setSavingPlan(true)
    try {
      const benefitsArray = planForm.benefits
        ? planForm.benefits.split(',').map((b) => b.trim()).filter(Boolean)
        : []

      const payload = {
        name: planForm.name.trim(),
        code: planForm.code.trim().toUpperCase(),
        description: planForm.description.trim(),
        price: Number(planForm.price) || 0,
        validityDays: Number(planForm.validityDays) || 0,
        badgeText: planForm.badgeText.trim() || 'MEMBER',
        badgeColor: planForm.badgeColor || '#2563eb',
        benefits: benefitsArray,
        requiresApproval: planForm.requiresApproval,
        isActive: planForm.isActive,
      }

      if (editingPlan) {
        await MembershipAPI.updatePlan(editingPlan._id, payload)
        show('Membership plan updated!')
      } else {
        await MembershipAPI.createPlan(payload)
        show('Membership plan created!')
      }
      setIsPlanModalOpen(false)
      loadPlans()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSavingPlan(false)
    }
  }

  // Action: Delete Plan
  const handleDeletePlan = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${name}"?`)) return
    try {
      await MembershipAPI.deletePlan(id)
      show('Plan deleted successfully!')
      loadPlans()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      <Toast />

      {/* ── TOP HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Membership Management
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage applications, digital cards, verification & membership tier plans
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setIsVerifyModalOpen(true)
              setVerifyResult(null)
              setVerifyError(null)
              setVerifyInput('')
            }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl border cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
          >
            <QrCode className="w-3.5 h-3.5" />
            Verify QR / ID
          </button>

          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-2xl bg-gray-900 text-white cursor-pointer hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>

          {tab === 'plans' && (
            <button
              onClick={openCreatePlanModal}
              className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-2xl text-white cursor-pointer hover:opacity-95 transition-opacity shadow-sm"
              style={{ background: 'var(--primary)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              New Plan
            </button>
          )}
        </div>
      </div>

      {/* ── STATS COUNTERS ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {[
          { label: 'Total Records', val: stats?.total, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Approved Members', val: stats?.approved, color: 'text-green-600', bg: 'bg-green-50/50' },
          { label: 'Pending Applications', val: stats?.pending, color: 'text-amber-600', bg: 'bg-amber-50/50' },
          { label: 'Rejected', val: stats?.rejected, color: 'text-red-500', bg: 'bg-red-50/50' },
        ].map((s) => (
          <div
            key={s.label}
            className={`${s.bg} rounded-2xl p-3.5 border border-gray-100 shadow-sm text-center transition-all hover:shadow`}
          >
            <p className={`text-xl font-black ${s.color}`}>{s.val ?? 0}</p>
            <p className="text-[10px] uppercase font-bold text-gray-400 mt-1 tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── TABS NAVIGATION ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl border border-gray-200/50">
          {[
            { id: 'applications', label: 'Pending Applications', count: stats?.pending },
            { id: 'members', label: 'Approved Members', count: stats?.approved },
            { id: 'rejected', label: 'Rejected', count: stats?.rejected },
            { id: 'plans', label: 'Membership Plans', count: plans?.length || undefined },
          ].map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id)
                  setPage(1)
                }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  active ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
                style={active ? { background: 'var(--primary)' } : {}}
              >
                <span>{t.label}</span>
                {t.count !== undefined && (
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      active ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search Bar (Only for Member / Application tabs) */}
        {tab !== 'plans' && (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, mobile, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setSearchQuery('')
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        )}
      </div>

      {/* ── TAB CONTENT: MEMBERSHIP PLANS ─────────────────────── */}
      {tab === 'plans' ? (
        plansLoading ? (
          <Skeleton rows={4} />
        ) : plansError ? (
          <ApiError message={plansError} onRetry={loadPlans} />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-bl-full opacity-10 pointer-events-none"
                    style={{ background: plan.badgeColor || 'var(--primary)' }}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full text-white shadow-xs"
                        style={{ background: plan.badgeColor || '#2563eb' }}
                      >
                        {plan.badgeText || plan.code || 'MEMBER'}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          plan.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {plan.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-gray-900">{plan.name}</h3>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">Code: {plan.code}</p>

                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-gray-900">
                        {plan.price > 0 ? `₹${plan.price}` : 'Free'}
                      </span>
                      <span className="text-[11px] text-gray-400 font-semibold">
                        / {plan.validityDays === 0 ? 'Lifetime' : `${plan.validityDays} Days`}
                      </span>
                    </div>

                    {plan.description && (
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{plan.description}</p>
                    )}

                    {Array.isArray(plan.benefits) && plan.benefits.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Benefits</p>
                        <div className="flex flex-wrap gap-1">
                          {plan.benefits.map((b, i) => (
                            <span key={i} className="text-[10px] font-medium bg-gray-50 text-gray-700 px-2 py-0.5 rounded-lg">
                              • {b}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-semibold">
                      {plan.requiresApproval ? 'Requires Admin Approval' : 'Auto-Approve'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditPlanModal(plan)}
                        className="p-1.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                        title="Edit Plan"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlan(plan._id, plan.name)}
                        className="p-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                        title="Delete Plan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {plans.length === 0 && (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
                <Layers className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-700">No Membership Plans Created</p>
                <p className="text-xs text-gray-400 mt-0.5">Click "New Plan" button to create your first tier.</p>
                <button
                  onClick={openCreatePlanModal}
                  className="mt-3 px-4 py-2 text-xs font-bold rounded-xl text-white cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                  style={{ background: 'var(--primary)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create First Plan
                </button>
              </div>
            )}
          </div>
        )
      ) : loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        /* ── TAB CONTENT: MEMBERS LIST ────────────────────────── */
        <div className="space-y-3">
          <div className="space-y-2.5">
            {items.map((m) => {
              const u = m.userId || m.user || {}
              const isApproved = m.status === 'approved'
              const isPending = m.status === 'pending'
              const isRejected = m.status === 'rejected'
              const expiresDate = m.expiresAt || m.validTill
              const plan = m.planId || {}

              return (
                <div
                  key={m._id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Member Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 overflow-hidden shadow-xs"
                        style={{ background: plan.badgeColor || 'var(--primary)' }}
                      >
                        {m.photoUrl || u.photo ? (
                          <img
                            src={m.photoUrl || u.photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          (u.name || m.name || 'M')[0]
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-black text-gray-900 truncate">
                            {u.name || m.name || '—'}
                          </p>
                          {m.membershipNumber && (
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded-lg border font-mono"
                              style={{
                                color: 'var(--primary)',
                                borderColor: 'var(--primary-light, #e0e7ff)',
                                background: 'var(--primary-light, #f5f7ff)',
                              }}
                            >
                              {m.membershipNumber}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              isApproved
                                ? 'bg-green-100 text-green-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1 font-medium">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {u.mobile || '—'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {u.areaId?.name || u.area?.name || '—'}
                          </span>
                          <span className="text-indigo-600 font-semibold">
                            {m.designation || 'Active Member'}
                          </span>
                          {plan.name && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                              {plan.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center gap-1.5 shrink-0 justify-end">
                      {isPending ? (
                        <>
                          <button
                            onClick={() => openApproveModal(m)}
                            className="flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 transition-colors shadow-xs cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => openRejectModal(m)}
                            className="flex items-center gap-1 text-xs font-bold text-red-600 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      ) : isApproved ? (
                        <>
                          <button
                            onClick={() => handleDownloadCard(m)}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-xl cursor-pointer transition-colors"
                            style={{ color: 'var(--primary)', background: 'var(--primary-light, #eff6ff)' }}
                            title="Download Digital Card"
                          >
                            <Download className="w-3 h-3" />
                            Card
                          </button>
                          <button
                            onClick={() => handleRegenCard(m._id)}
                            disabled={actionLoadingId === m._id}
                            className="p-1.5 rounded-xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors cursor-pointer disabled:opacity-50"
                            title="Regenerate Card Image & QR"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${actionLoadingId === m._id ? 'animate-spin' : ''}`}
                            />
                          </button>
                          <button
                            onClick={() => openCardModal(m)}
                            className="p-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                            title="Edit Card Details & Validity"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openApproveModal(m)}
                            className="text-xs font-bold text-green-700 px-2.5 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 transition-colors cursor-pointer"
                          >
                            Re-Approve
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => navigate(`/membership/${m._id}`)}
                        className="p-1.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                        title="View Full Profile"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Rejected Reason Banner */}
                  {isRejected && m.rejectionReason && (
                    <div className="mt-2.5 p-2.5 rounded-2xl bg-red-50/70 border border-red-100 flex items-center gap-2 text-xs text-red-700">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>
                        <strong className="font-bold">Rejection Reason:</strong> {m.rejectionReason}
                      </span>
                    </div>
                  )}

                  {/* Approved Member Card Summary Preview */}
                  {isApproved && m.membershipNumber && (
                    <div
                      className="mt-3 p-3 rounded-2xl border border-dashed flex items-center justify-between bg-gray-50/50"
                      style={{ borderColor: 'var(--primary-light, #dbeafe)' }}
                    >
                      <div className="space-y-0.5">
                        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">
                          Digital Card Preview
                        </p>
                        <p className="text-xs font-black text-gray-800">
                          {u.name || '—'} ·{' '}
                          <span style={{ color: 'var(--primary)' }}>{m.designation || 'Active Member'}</span>
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Valid till:{' '}
                          <span className="font-semibold text-gray-700">
                            {expiresDate ? new Date(expiresDate).toLocaleDateString('en-IN') : 'Lifetime'}
                          </span>
                        </p>
                      </div>

                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{ background: 'var(--primary-light, #eff6ff)' }}
                      >
                        <CreditCard className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {items.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
              <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-gray-700">No {tab} found</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {searchQuery
                  ? 'Try searching with a different keyword or clear search.'
                  : `Currently there are no ${tab} records.`}
              </p>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between bg-white px-4 py-3 rounded-2xl border border-gray-100 shadow-sm">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-gray-500 font-semibold">
                Page {page} of {Math.ceil(total / limit)} ({total} records)
              </span>
              <button
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: 'var(--primary)' }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: VERIFY QR / MEMBERSHIP ID ──────────────────── */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ background: 'var(--primary)' }}
                >
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900">Verify Membership Card</h3>
                  <p className="text-[10px] text-gray-400">Scan QR or enter membership number</p>
                </div>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700">Membership Number / Card Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. MEM-2026-0001"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyQR()}
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 font-mono uppercase"
                />
                <button
                  onClick={handleVerifyQR}
                  disabled={verifyLoading}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white shadow-sm cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {verifyLoading ? 'Checking...' : 'Verify'}
                </button>
              </div>
            </div>

            {verifyError && (
              <div className="p-3 rounded-2xl bg-red-50 text-red-600 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            {verifyResult && (
              <div className="p-4 rounded-2xl border-2 border-green-200 bg-green-50/50 space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <span className="text-xs font-black uppercase tracking-wider">
                    {verifyResult.valid ? 'Verified Active Member' : 'Verification Status'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">Name</p>
                    <p className="font-bold text-gray-900">
                      {verifyResult.user?.name || verifyResult.name || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">Membership ID</p>
                    <p className="font-bold font-mono" style={{ color: 'var(--primary)' }}>
                      {verifyResult.membershipNumber || verifyInput}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">Designation</p>
                    <p className="font-bold text-gray-900">{verifyResult.designation || 'Active Member'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">Status</p>
                    <span className="inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      {verifyResult.status || 'Approved'}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">Valid Till</p>
                    <p className="font-bold text-gray-900">
                      {verifyResult.expiresAt || verifyResult.validTill
                        ? new Date(verifyResult.expiresAt || verifyResult.validTill).toLocaleDateString('en-IN')
                        : 'Lifetime'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold">Area / Unit</p>
                    <p className="font-bold text-gray-900">
                      {verifyResult.user?.area?.name || verifyResult.area?.name || '—'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: APPROVE APPLICATION ─────────────────────────── */}
      {isApproveModalOpen && approveTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Approve Membership Application
              </h3>
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 text-xs space-y-1">
              <p className="text-gray-500">
                Applicant:{' '}
                <strong className="text-gray-900 font-bold">
                  {approveTarget.userId?.name || approveTarget.user?.name || approveTarget.name}
                </strong>
              </p>
              <p className="text-gray-500">
                Mobile:{' '}
                <strong className="text-gray-900 font-bold">
                  {approveTarget.userId?.mobile || approveTarget.user?.mobile || '—'}
                </strong>
              </p>
              {approveTarget.planId?.name && (
                <p className="text-gray-500">
                  Selected Plan:{' '}
                  <strong className="text-indigo-600 font-bold">{approveTarget.planId?.name}</strong>
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Designation on Card</label>
                <input
                  type="text"
                  value={approveDesignation}
                  onChange={(e) => setApproveDesignation(e.target.value)}
                  placeholder="e.g. Active Member, Youth President"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Validity (Days)</label>
                <input
                  type="number"
                  value={approveValidDays}
                  onChange={(e) => setApproveValidDays(e.target.value)}
                  placeholder="e.g. 365 (0 = lifetime)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApprove}
                disabled={approving}
                className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {approving ? 'Generating Card...' : 'Confirm & Issue Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REJECT APPLICATION ──────────────────────────── */}
      {isRejectModalOpen && rejectTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Reject Membership Application
              </h3>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Are you sure you want to reject the application for{' '}
              <strong className="text-gray-900">
                {rejectTarget.userId?.name || rejectTarget.user?.name || rejectTarget.name}
              </strong>
              ?
            </p>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete details, invalid area or verification unconfirmed"
                className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejecting}
                className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-red-600 hover:bg-red-700 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {rejecting ? 'Rejecting...' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT CARD DETAILS ───────────────────────────── */}
      {isCardModalOpen && cardTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                Edit Member Card Details
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-3 text-xs space-y-1">
              <p className="text-gray-500">
                Member:{' '}
                <strong className="text-gray-900 font-bold">
                  {cardTarget.userId?.name || cardTarget.user?.name || cardTarget.name}
                </strong>
              </p>
              <p className="text-gray-500">
                Member ID:{' '}
                <strong className="font-mono" style={{ color: 'var(--primary)' }}>
                  {cardTarget.membershipNumber || '—'}
                </strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Designation</label>
                <input
                  type="text"
                  value={cardDesignation}
                  onChange={(e) => setCardDesignation(e.target.value)}
                  placeholder="e.g. Youth Wing President"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Valid Till Date</label>
                <input
                  type="date"
                  value={cardExpiresAt}
                  onChange={(e) => setCardExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCardModalOpen(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCardDetails}
                disabled={savingCard}
                className="flex-1 py-2 text-xs font-bold rounded-xl text-white shadow-sm cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                {savingCard ? 'Updating...' : 'Save & Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT MEMBERSHIP PLAN ───────────────── */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                {editingPlan ? 'Edit Membership Plan' : 'Create New Membership Plan'}
              </h3>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Plan Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Member"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Plan Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PRIMARY"
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Price (₹ INR)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.price}
                    onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Validity Days (0 = Lifetime)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.validityDays}
                    onChange={(e) => setPlanForm({ ...planForm, validityDays: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. ACTIVE, VIP, PATRON"
                    value={planForm.badgeText}
                    onChange={(e) => setPlanForm({ ...planForm, badgeText: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Badge Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={planForm.badgeColor}
                      onChange={(e) => setPlanForm({ ...planForm, badgeColor: e.target.value })}
                      className="w-9 h-9 p-0.5 rounded-xl border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={planForm.badgeColor}
                      onChange={(e) => setPlanForm({ ...planForm, badgeColor: e.target.value })}
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description of this tier"
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Benefits (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Free Event Passes, Voting in internal polls, Official Pin"
                  value={planForm.benefits}
                  onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">Requires Admin Approval</p>
                  <p className="text-[10px] text-gray-400">If unchecked, member is auto-approved upon applying</p>
                </div>
                <input
                  type="checkbox"
                  checked={planForm.requiresApproval}
                  onChange={(e) => setPlanForm({ ...planForm, requiresApproval: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">Active Status</p>
                  <p className="text-[10px] text-gray-400">Citizens can only see and choose active plans</p>
                </div>
                <input
                  type="checkbox"
                  checked={planForm.isActive}
                  onChange={(e) => setPlanForm({ ...planForm, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlan}
                  className="flex-1 py-2 text-xs font-bold rounded-xl text-white shadow-sm cursor-pointer disabled:opacity-50"
                  style={{ background: 'var(--primary)' }}
                >
                  {savingPlan ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
