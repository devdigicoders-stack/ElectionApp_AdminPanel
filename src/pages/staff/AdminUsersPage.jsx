import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { UserCheck, Plus, X, MapPin, Phone, Shield, ArrowRight } from 'lucide-react'
import { AdminUsersAPI, AreasAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const ROLES = [
  { key: 'admin', label: 'Admin' },
  { key: 'content_manager', label: 'Content Manager' },
  { key: 'complaint_manager', label: 'Complaint Manager' },
  { key: 'volunteer_manager', label: 'Volunteer Manager' },
  { key: 'area_coordinator', label: 'Area Coordinator' },
]

const EMPTY = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'admin',
  assignedAreaId: '',
  isActive: true,
}

const roleColor = {
  leader: 'bg-purple-100 text-purple-700',
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-orange-100 text-orange-700',
  content_manager: 'bg-blue-100 text-blue-700',
  complaint_manager: 'bg-red-100 text-red-700',
  volunteer_manager: 'bg-green-100 text-green-700',
  area_coordinator: 'bg-yellow-100 text-yellow-700',
  coordinator: 'bg-yellow-100 text-yellow-700',
}

// Helper to flatten area tree for select dropdown
function flattenAreas(nodes, result = [], prefix = '') {
  if (!Array.isArray(nodes)) return result
  for (const n of nodes) {
    const label = prefix ? `${prefix} > ${n.name}` : n.name
    result.push({ id: n._id, name: label, type: n.levelId?.name || 'Area' })
    if (n.children?.length) {
      flattenAreas(n.children, result, label)
    }
  }
  return result
}

export default function AdminUsersPage() {
  const { show, Toast } = useToast()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [staff, setStaff] = useState([])
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [staffRes, areasRes] = await Promise.all([
        AdminUsersAPI.getAll().catch(e => { throw e }),
        AreasAPI.getTree().catch(() => null),
      ])

      const data = staffRes?.data ?? staffRes
      const list = Array.isArray(data?.adminUsers ?? data?.staff ?? data)
        ? (data?.adminUsers ?? data?.staff ?? data)
        : []
      setStaff(list)

      if (areasRes?.data?.tree) {
        setAreas(flattenAreas(areasRes.data.tree))
      }
    } catch (e) {
      setError(e.message || 'Failed to load staff list')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // If redirected with ?role=xxx, open add modal with pre-selected role
  useEffect(() => {
    const roleParam = searchParams.get('role')
    if (roleParam) {
      const validRole = ROLES.some(r => r.key === roleParam) ? roleParam : 'admin'
      setForm({ ...EMPTY, role: validRole })
      setEditId(null)
      setShowForm(true)
    }
  }, [searchParams])

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      show('Name & Email required', 'error')
      return
    }
    if (!editId && !form.password.trim()) {
      show('Password required for new staff', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        isActive: form.isActive,
        phone: form.phone ? form.phone.trim() : undefined,
        assignedAreaId: form.assignedAreaId || undefined,
      }

      if (form.password.trim()) {
        payload.password = form.password.trim()
      }

      if (editId) {
        await AdminUsersAPI.update(editId, payload)
        show('Staff member updated successfully!')
      } else {
        payload.email = form.email.trim().toLowerCase()
        await AdminUsersAPI.create(payload)
        show('Staff member created successfully!')
      }

      setShowForm(false)
      setEditId(null)
      setForm(EMPTY)
      await load()
    } catch (e) {
      show(e.message || 'Failed to save staff member', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Remove Staff Member?',
      text: 'Are you sure you want to remove this staff member from your team?',
      confirmButtonText: 'Yes, Remove',
    })
    if (!confirmed) return
    try {
      await AdminUsersAPI.remove(id)
      show('Staff member removed successfully!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to remove staff', 'error')
    }
  }

  const openEdit = async (id) => {
    try {
      const res = await AdminUsersAPI.getOne(id)
      const s = res?.data ?? res
      setForm({
        name: s.name || '',
        email: s.email || '',
        password: '',
        phone: s.phone || '',
        role: s.role === 'coordinator' ? 'area_coordinator' : (s.role || 'admin'),
        assignedAreaId: s.assignedAreaId?._id || s.assignedAreaId || '',
        isActive: s.isActive !== false,
      })
      setEditId(id)
      setShowForm(true)
    } catch (e) {
      show(e.message || 'Failed to fetch staff detail', 'error')
    }
  }

  return (
    <div className="space-y-4">
      <Toast />

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-gray-900">Admin Staff & Team</h1>
          <p className="text-xs text-gray-400">{staff.length} team members registered</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/roles"
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-gray-500" />
            Roles Matrix
          </Link>
          <button
            onClick={() => {
              setForm(EMPTY)
              setEditId(null)
              setShowForm(true)
            }}
            className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Staff
          </button>
        </div>
      </div>

      {/* Roles Matrix Banner Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-800">Predefined Role Powers & Permissions</p>
            <p className="text-[11px] text-gray-500">View what each role (Admin, Content, Complaints, Coordinator) can do.</p>
          </div>
        </div>
        <Link
          to="/roles"
          className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-700 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-50 transition-colors"
        >
          View Roles <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900">
                {editId ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Full Name *</label>
                <input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email Address *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  disabled={!!editId}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="staff@platform.local"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Mobile Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  placeholder="10 digit mobile number"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">
                  {editId ? 'New Password (leave blank to keep current)' : 'Login Password *'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]"
                  placeholder={editId ? 'Leave empty to keep existing password' : 'Min 6 characters'}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">System Role *</label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] bg-white"
                >
                  {ROLES.map(r => (
                    <option key={r.key} value={r.key}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  Each role has fixed permissions defined by the platform RBAC rules.
                </p>
              </div>

              {/* Assigned Area Dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 flex items-center justify-between">
                  <span>Assigned Area {form.role === 'area_coordinator' ? '(Required for Coordinator)' : '(Optional)'}</span>
                  <span className="text-[10px] text-gray-400">Ward / Block</span>
                </label>
                <select
                  value={form.assignedAreaId}
                  onChange={e => setForm({ ...form, assignedAreaId: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] bg-white"
                >
                  <option value="">-- No specific area restriction (Global) --</option>
                  {areas.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <div>
                  <span className="text-sm font-semibold text-gray-700 block">Active Status</span>
                  <span className="text-[10px] text-gray-400">Allow login to Admin PWA</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="relative w-10 h-5 rounded-full transition-all"
                  style={{ background: form.isActive ? 'var(--primary)' : '#d1d5db' }}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 h-11 text-sm disabled:opacity-70"
              >
                {saving ? 'Saving...' : (editId ? 'Update Staff' : 'Create Staff')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Members List */}
      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <div className="space-y-2.5">
          {staff.map(s => (
            <div
              key={s._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3"
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-sm"
                style={{ background: 'var(--primary)' }}
              >
                {(s.name || 'S')[0]?.toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-gray-800 truncate">{s.name || '—'}</p>
                  <span
                    className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      roleColor[s.role] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {(s.role || '').replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 mt-0.5 truncate">{s.email || '—'}</p>

                {/* Sub details: Phone and Assigned Area */}
                <div className="flex items-center gap-3 mt-1 flex-wrap text-[10px] text-gray-500">
                  {s.phone && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {s.phone}
                    </span>
                  )}
                  {s.assignedAreaId && (
                    <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md font-semibold">
                      <MapPin className="w-3 h-3 text-amber-600" />
                      {s.assignedAreaId?.name || 'Assigned Area'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div
                  title={s.isActive !== false ? 'Active' : 'Inactive'}
                  className={`w-2.5 h-2.5 rounded-full ${s.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                />
                <button
                  onClick={() => openEdit(s._id)}
                  className="text-xs font-bold px-2.5 py-1 rounded-lg transition-colors"
                  style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}
                >
                  Edit
                </button>
                {s.role !== 'leader' && (
                  <button
                    onClick={() => handleDelete(s._id)}
                    className="text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}

          {staff.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <UserCheck className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500 font-semibold">No staff members found</p>
              <p className="text-xs text-gray-400 mt-1">Add sub-admins or coordinators to manage your team.</p>
              <button
                onClick={() => {
                  setForm(EMPTY)
                  setEditId(null)
                  setShowForm(true)
                }}
                className="btn-primary mt-3 text-xs px-3.5 py-2 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add First Staff Member
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
