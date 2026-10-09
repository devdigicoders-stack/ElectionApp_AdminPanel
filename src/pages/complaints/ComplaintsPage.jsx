import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  ChevronRight,
  ChevronLeft,
  X,
  Download,
  Filter,
  Layers,
  Plus,
  Trash2,
  UserCheck,
  Camera,
  Flame,
  Globe
} from 'lucide-react'
import { ComplaintsAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const statusConfig = {
  submitted: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Submitted' },
  under_review: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Under Review' },
  assigned: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Assigned' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress' },
  resolved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Resolved' },
  closed: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Closed' },
  rejected: { bg: 'bg-red-100', text: 'text-red-600', label: 'Rejected' },
}

const priorityConfig = {
  urgent: { bg: 'bg-red-500 text-white', label: 'Urgent', icon: true },
  high: { bg: 'bg-orange-100 text-orange-700', label: 'High' },
  medium: { bg: 'bg-amber-100 text-amber-700', label: 'Medium' },
  low: { bg: 'bg-slate-100 text-slate-600', label: 'Low' },
}

const filterTabs = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
  { label: 'Rejected', value: 'rejected' },
]

import { confirmDialog, errorAlert, successAlert } from '../../utils/sweetAlert'

export default function ComplaintsPage() {
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [publicFilter, setPublicFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [exporting, setExporting] = useState(false)

  // Categories Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [catLoading, setCatLoading] = useState(false)

  const limit = 20

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await ComplaintsAPI.getCategories()
      const data = res?.data ?? res ?? []
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      // silently fallback
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (filter && filter !== 'all') params.status = filter
      if (categoryFilter && categoryFilter !== 'all') params.category = categoryFilter
      if (priorityFilter && priorityFilter !== 'all') params.priority = priorityFilter
      if (publicFilter === 'public') params.isPublic = true
      if (publicFilter === 'private') params.isPublic = false
      if (search) params.search = search

      const [res, st] = await Promise.all([
        ComplaintsAPI.getAll(params),
        ComplaintsAPI.getStats(),
      ])

      const data = res?.data ?? res ?? {}
      const complaintsList = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.complaints)
        ? data.complaints
        : Array.isArray(data)
        ? data
        : []

      setItems(complaintsList)
      const listTotal = data?.meta?.total ?? data?.total ?? complaintsList.length
      setTotal(listTotal)

      const stData = st?.data ?? st ?? {}
      const sumSubmitted = stData?.submitted ?? 0
      const sumUnderReview = stData?.under_review ?? 0
      const sumAssigned = stData?.assigned ?? 0
      const sumInProgress = stData?.in_progress ?? 0
      const sumResolved = stData?.resolved ?? 0
      const sumClosed = stData?.closed ?? 0
      const sumRejected = stData?.rejected ?? 0

      const calcTotalFromStats =
        sumSubmitted +
        sumUnderReview +
        sumAssigned +
        sumInProgress +
        sumResolved +
        sumClosed +
        sumRejected

      const calcTotal =
        stData?.total && stData.total > 0
          ? stData.total
          : calcTotalFromStats > 0
          ? calcTotalFromStats
          : listTotal

      setStats({
        ...stData,
        total: calcTotal,
        submitted: sumSubmitted,
        under_review: sumUnderReview,
        assigned: sumAssigned,
        in_progress: sumInProgress,
        resolved: sumResolved,
        closed: sumClosed,
        rejected: sumRejected,
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filter, categoryFilter, priorityFilter, search])

  useEffect(() => {
    load()
  }, [load])

  // Handle CSV/Excel Export
  const handleExport = async (format = 'csv') => {
    setExporting(true)
    try {
      const params = {}
      if (filter !== 'all') params.status = filter
      if (categoryFilter !== 'all') params.category = categoryFilter
      if (priorityFilter !== 'all') params.priority = priorityFilter
      if (search) params.search = search

      await ComplaintsAPI.exportComplaints(format, params)
      show(`Complaints exported as ${format.toUpperCase()} successfully!`)
    } catch (e) {
      show(e.message || 'Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }

  // Handle Add Category
  const handleAddCategory = async (e) => {
    e.preventDefault()
    if (!newCatName.trim()) {
      show('Category name is required', 'error')
      return
    }
    setCatLoading(true)
    try {
      await ComplaintsAPI.createCategory({
        name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
      })
      show('Category added successfully!')
      setNewCatName('')
      setNewCatDesc('')
      loadCategories()
    } catch (e) {
      show(e.message || 'Failed to add category', 'error')
    } finally {
      setCatLoading(false)
    }
  }

  // Handle Delete Category
  const handleDeleteCategory = async (catId) => {
    const confirmed = await confirmDialog({
      title: 'Delete Complaint Category?',
      text: 'Are you sure you want to delete this complaint category?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await ComplaintsAPI.deleteCategory(catId)
      successAlert('Deleted!', 'Complaint category deleted successfully')
      loadCategories()
    } catch (e) {
      errorAlert('Delete Failed', e.message || 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-4">
      <Toast />

      {/* Header & Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-black text-gray-900">Complaints</h1>
          <p className="text-xs text-gray-400">Track, assign & resolve citizen complaints</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Manage Categories Button */}
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Layers className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            Categories
          </button>

          {/* Export CSV / Excel Button */}
          <button
            disabled={exporting}
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-2">
        {[
          ['Total', stats?.total, 'text-gray-800'],
          ['Submitted', stats?.submitted, 'text-yellow-600'],
          ['Progress', stats?.in_progress, 'text-blue-600'],
          ['Resolved', stats?.resolved, 'text-green-600'],
        ].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
            <p className={`text-lg font-black ${c}`}>{v ?? 0}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters Bar */}
      <div className="space-y-2">
        {/* Search */}
        <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 h-11 gap-2 shadow-sm">
          <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            placeholder="Search Complaint ID, title, or citizen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                setPage(1)
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Secondary dropdown filters: Category & Priority */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          {/* Category Dropdown */}
          <div className="relative shrink-0">
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none pr-7 shadow-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat._id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Filter className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Priority Dropdown */}
          <div className="relative shrink-0">
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setPage(1)
              }}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none pr-7 shadow-sm"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Filter className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Public / Private Visibility Filter */}
          <div className="relative shrink-0">
            <select
              value={publicFilter}
              onChange={(e) => {
                setPublicFilter(e.target.value)
                setPage(1)
              }}
              className="appearance-none bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-gray-700 outline-none pr-7 shadow-sm"
            >
              <option value="all">All Visibility</option>
              <option value="public">🌐 Public on PWA</option>
              <option value="private">🔒 Private Only</option>
            </select>
            <Filter className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {(categoryFilter !== 'all' || priorityFilter !== 'all' || publicFilter !== 'all') && (
            <button
              onClick={() => {
                setCategoryFilter('all')
                setPriorityFilter('all')
                setPublicFilter('all')
                setPage(1)
              }}
              className="text-[11px] font-bold text-red-500 hover:text-red-700 shrink-0 px-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Filter status pills */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {filterTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setFilter(t.value)
              setPage(1)
            }}
            className={`shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all ${
              filter === t.value
                ? 'text-white border-transparent'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
            style={
              filter === t.value
                ? { background: 'var(--primary)', borderColor: 'var(--primary)' }
                : {}
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <Skeleton rows={6} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <>
          <div className="space-y-2.5">
            {items.map((c) => {
              const sc = statusConfig[c.status?.toLowerCase()] || statusConfig.submitted
              const pc = priorityConfig[c.priority?.toLowerCase()] || priorityConfig.medium
              const photoCount = (c.attachments?.length || 0) + (c.mediaUrls?.length || 0)
              const citizenName = c.userId?.name || c.user?.name || 'Citizen'
              const citizenMobile = c.userId?.mobile || c.user?.mobile || ''

              return (
                <div
                  key={c._id}
                  onClick={() => navigate(`/complaints/${c._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black" style={{ color: 'var(--primary)' }}>
                        {c.complaintNumber || '#' + c._id?.slice(-5)}
                      </span>

                      {/* Status Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
                        {sc.label}
                      </span>

                      {/* Priority Badge */}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${pc.bg}`}>
                        {pc.icon && <Flame className="w-2.5 h-2.5 fill-white" />}
                        {pc.label}
                      </span>

                      {/* Public on PWA Badge */}
                      {c.isPublic && (
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Globe className="w-2.5 h-2.5" />
                          Public PWA
                        </span>
                      )}
                    </div>

                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-gray-900 mt-2 line-clamp-1">{c.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>

                  {/* Metadata line */}
                  <div className="flex items-center justify-between flex-wrap gap-2 mt-3 pt-3 border-t border-gray-50 text-[11px] text-gray-400">
                    <div className="flex items-center gap-3">
                      <span>👤 {citizenName} {citizenMobile ? `(${citizenMobile})` : ''}</span>
                      <span>📍 {c.areaId?.name || c.area?.name || 'Area'}</span>
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                        {c.category || 'General'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {photoCount > 0 && (
                        <span className="text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-1.5 py-0.5 rounded">
                          <Camera className="w-3 h-3" />
                          {photoCount}
                        </span>
                      )}

                      {c.assignedTo?.name ? (
                        <span className="text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {c.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                          Unassigned
                        </span>
                      )}

                      <span>
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-semibold">No complaints found</p>
              <p className="text-xs text-gray-400 mt-1">Try changing filters or search keywords</p>
            </div>
          )}

          {total > limit && (
            <div className="flex items-center justify-between pt-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-xs font-bold disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--primary)' }}
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <span className="text-xs text-gray-400 font-medium">
                Page {page} of {Math.ceil(total / limit)} ({total} complaints)
              </span>
              <button
                disabled={page >= Math.ceil(total / limit)}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs font-bold disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                style={{ color: 'var(--primary)' }}
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* MANAGE CATEGORIES MODAL (CRUD)                              */}
      {/* ============================================================ */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                <h2 className="text-base font-bold text-gray-900">Manage Complaint Categories</h2>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Add New Category Form */}
            <form onSubmit={handleAddCategory} className="bg-gray-50 p-3.5 rounded-2xl space-y-2 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">Add New Category</p>
              <input
                type="text"
                placeholder="Category Name (e.g. Sadak, Bijli, Safai)..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
                required
              />
              <input
                type="text"
                placeholder="Description (optional)..."
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-[var(--primary)]"
              />
              <button
                type="submit"
                disabled={catLoading}
                className="w-full h-9 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                <Plus className="w-3.5 h-3.5" />
                {catLoading ? 'Adding...' : 'Add Category'}
              </button>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Existing Categories ({categories.length})
              </p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat._id || cat.name}
                    className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-3 py-2 text-xs shadow-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-800">{cat.name}</p>
                      {cat.description && <p className="text-[10px] text-gray-400">{cat.description}</p>}
                    </div>
                    {cat._id && (
                      <button
                        onClick={() => handleDeleteCategory(cat._id)}
                        className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {categories.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-4">No custom categories yet</p>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowCategoryModal(false)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
