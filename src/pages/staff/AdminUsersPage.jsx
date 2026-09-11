import { useState, useEffect, useCallback } from 'react'
import { UserCheck, Plus, X } from 'lucide-react'
import { AdminUsersAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const ROLES = ['admin', 'content_manager', 'complaint_manager', 'volunteer_manager', 'coordinator']
const EMPTY = { name: '', email: '', password: '', role: 'admin', isActive: true }

const roleColor = {
  admin: 'bg-orange-100 text-orange-700',
  content_manager: 'bg-blue-100 text-blue-700',
  complaint_manager: 'bg-red-100 text-red-700',
  volunteer_manager: 'bg-green-100 text-green-700',
  coordinator: 'bg-yellow-100 text-yellow-700',
}

export default function AdminUsersPage() {
  const { show, Toast } = useToast()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await AdminUsersAPI.getAll()
      const data = res?.data ?? res
      setStaff(Array.isArray(data?.adminUsers ?? data?.staff ?? data) ? (data?.adminUsers ?? data?.staff ?? data) : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { show('Name & Email required', 'error'); return }
    if (!editId && !form.password.trim()) { show('Password required for new staff', 'error'); return }
    setSaving(true)
    try {
      if (editId) await AdminUsersAPI.update(editId, { name: form.name, role: form.role, isActive: form.isActive })
      else await AdminUsersAPI.create(form)
      show(editId ? 'Updated!' : 'Staff created!'); setShowForm(false); setEditId(null); setForm(EMPTY); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Remove Staff Member?',
      text: 'Are you sure you want to remove this staff member?',
      confirmButtonText: 'Yes, Remove',
    })
    if (!confirmed) return
    try { await AdminUsersAPI.remove(id); show('Staff removed!'); load() } catch (e) { show(e.message, 'error') }
  }

  const openEdit = async (id) => {
    // Use AdminUsersAPI.getOne for fresh data
    try {
      const res = await AdminUsersAPI.getOne(id)
      const s = res?.data ?? res
      setForm({ name: s.name || '', email: s.email || '', password: '', role: s.role || 'admin', isActive: s.isActive !== false })
      setEditId(id); setShowForm(true)
    } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Admin Staff</h1>
          <p className="text-xs text-gray-400">{staff.length} team members</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editId ? 'Edit Staff' : 'Add Staff Member'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Full Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" placeholder="Staff name" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editId}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] disabled:bg-gray-50 disabled:text-gray-400" placeholder="staff@example.com" />
              </div>
              {!editId && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Password</label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" placeholder="Min 8 characters" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  {ROLES.map(r => (
                    <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Active</span>
                <button onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className="relative w-10 h-5 rounded-full transition-all" style={{ background: form.isActive ? 'var(--primary)' : '#d1d5db' }}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.isActive ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <div className="space-y-2.5">
          {staff.map(s => (
            <div key={s._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0"
                style={{ background: 'var(--primary)' }}>
                {(s.name || 'S')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-gray-800 truncate">{s.name || '—'}</p>
                  <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${roleColor[s.role] || 'bg-gray-100 text-gray-600'}`}>
                    {(s.role || '').replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{s.email || '—'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-2 h-2 rounded-full ${s.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`} />
                <button onClick={() => openEdit(s._id)} className="text-xs font-bold px-2 py-1 rounded-lg" style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>Edit</button>
                <button onClick={() => handleDelete(s._id)} className="text-xs font-bold text-red-400 bg-red-50 px-2 py-1 rounded-lg">Remove</button>
              </div>
            </div>
          ))}
          {staff.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100 flex flex-col items-center">
              <UserCheck className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No staff members yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
