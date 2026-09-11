import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Crown,
  Shield,
  FileEdit,
  AlertTriangle,
  Star,
  MapPin,
  Eye,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Users,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react'
import { AdminUsersAPI } from '../../api/adminApis'
import { useBranding } from '../../context/BrandingContext'

const roles = [
  {
    key: 'owner',
    backendKeys: ['owner', 'leader'],
    label: 'Owner / Leader',
    desc: 'Full sovereign access to entire platform, settings, billing, domain, and data.',
    Icon: Crown,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  },
  {
    key: 'admin',
    backendKeys: ['admin'],
    label: 'Admin',
    desc: 'Almost full management access across all modules, staff, and area configurations.',
    Icon: Shield,
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  {
    key: 'content_manager',
    backendKeys: ['content_manager'],
    label: 'Content Manager',
    desc: 'Manages dynamic content: Banners, Works, Gallery, Events, Manifesto & News.',
    Icon: FileEdit,
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  {
    key: 'complaint_manager',
    backendKeys: ['complaint_manager'],
    label: 'Complaint Manager',
    desc: 'Receives, assigns, updates status, and resolves citizen grievances and complaints.',
    Icon: AlertTriangle,
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  {
    key: 'volunteer_manager',
    backendKeys: ['volunteer_manager'],
    label: 'Volunteer Manager',
    desc: 'Manages volunteers list, task assignments, verifications, and grassroots teams.',
    Icon: Star,
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  {
    key: 'area_coordinator',
    backendKeys: ['area_coordinator', 'coordinator'],
    label: 'Area Coordinator',
    desc: 'Scoped access restricted strictly to assigned Ward / Block area boundaries.',
    Icon: MapPin,
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
]

const modules = [
  { name: 'Dashboard', featureKey: null },
  { name: 'Citizens', featureKey: null },
  { name: 'Complaints', featureKey: 'complaints' },
  { name: 'Works', featureKey: 'works' },
  { name: 'Events', featureKey: 'events' },
  { name: 'Polls', featureKey: 'polls' },
  { name: 'Membership', featureKey: 'membership' },
  { name: 'Volunteers', featureKey: 'volunteers' },
  { name: 'Gallery', featureKey: 'gallery' },
  { name: 'Manifesto', featureKey: 'manifesto' },
  { name: 'News', featureKey: 'news' },
  { name: 'Banners', featureKey: 'banners' },
  { name: 'Notifications', featureKey: 'notifications' },
  { name: 'Areas', featureKey: null },
  { name: 'Settings', featureKey: null },
]

const actions = [
  { key: 'view', label: 'View', Icon: Eye },
  { key: 'create', label: 'Create', Icon: Plus },
  { key: 'edit', label: 'Edit', Icon: Edit3 },
  { key: 'delete', label: 'Delete', Icon: Trash2 },
]

// Permission matrix
const matrix = {
  owner: { view: true, create: true, edit: true, delete: true },
  admin: { view: true, create: true, edit: true, delete: true },
  content_manager: { view: true, create: true, edit: true, delete: false },
  complaint_manager: { view: true, create: false, edit: true, delete: false },
  volunteer_manager: { view: true, create: true, edit: true, delete: false },
  area_coordinator: { view: true, create: false, edit: false, delete: false },
}

// Module-specific overrides
const moduleOverrides = {
  complaint_manager: {
    Complaints: { view: true, create: true, edit: true, delete: false },
  },
  content_manager: {
    Works: { view: true, create: true, edit: true, delete: true },
    Events: { view: true, create: true, edit: true, delete: true },
    Gallery: { view: true, create: true, edit: true, delete: true },
    Banners: { view: true, create: true, edit: true, delete: true },
    News: { view: true, create: true, edit: true, delete: true },
    Manifesto: { view: true, create: true, edit: true, delete: true },
  },
  area_coordinator: {
    Dashboard: { view: true, create: false, edit: false, delete: false },
    Citizens: { view: true, create: false, edit: false, delete: false },
    Complaints: { view: true, create: false, edit: true, delete: false },
    Works: { view: true, create: false, edit: false, delete: false },
    Events: { view: true, create: false, edit: false, delete: false },
  },
}

function getAccess(roleKey, modName, actionKey) {
  if (roleKey === 'owner') return true
  const override = moduleOverrides[roleKey]?.[modName]
  if (override) return override[actionKey] ?? false
  if (roleKey === 'area_coordinator') return false
  return matrix[roleKey]?.[actionKey] ?? false
}

export default function RolesPage() {
  const navigate = useNavigate()
  const { isFeatureEnabled } = useBranding()
  const [selectedRole, setSelectedRole] = useState('admin')
  const [staffList, setStaffList] = useState([])
  const [loadingStaff, setLoadingStaff] = useState(true)

  // Fetch live staff from /admin-users API
  useEffect(() => {
    let isMounted = true
    AdminUsersAPI.getAll()
      .then(res => {
        if (!isMounted) return
        const data = res?.data ?? res
        const list = Array.isArray(data?.adminUsers ?? data?.staff ?? data)
          ? (data?.adminUsers ?? data?.staff ?? data)
          : []
        setStaffList(list)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingStaff(false)
      })
    return () => { isMounted = false }
  }, [])

  const currentRole = roles.find(r => r.key === selectedRole) || roles[0]
  const RoleIcon = currentRole.Icon || Shield

  // Filter staff matching the selected role
  const assignedStaff = staffList.filter(s =>
    currentRole.backendKeys.includes(s.role)
  )

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-black text-gray-900">Roles & Permissions</h1>
          <p className="text-xs text-gray-400">Predefined RBAC access matrix & team role assignment</p>
        </div>
        <Link
          to="/staff"
          className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold"
        >
          <Users className="w-3.5 h-3.5" />
          Manage Staff
        </Link>
      </div>

      {/* Role Pill Tabs with Live Count Badge */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {roles.map(r => {
          const RIcon = r.Icon
          const isSelected = selectedRole === r.key
          const count = staffList.filter(s => r.backendKeys.includes(s.role)).length

          return (
            <button
              key={r.key}
              onClick={() => setSelectedRole(r.key)}
              className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-xs font-bold transition-all shadow-sm ${
                isSelected
                  ? 'text-white border-transparent'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              style={isSelected ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
            >
              <RIcon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {loadingStaff ? '...' : count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Selected Role Overview Card */}
      <div className={`rounded-3xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${currentRole.bg} ${currentRole.border}`}>
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-white/80 flex items-center justify-center shrink-0 shadow-sm">
            <RoleIcon className={`w-7 h-7 ${currentRole.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`text-base font-black ${currentRole.color}`}>{currentRole.label}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-gray-700 border border-gray-200 shadow-2xs">
                {assignedStaff.length} Assigned
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 max-w-xl leading-relaxed">{currentRole.desc}</p>
          </div>
        </div>

        {currentRole.key !== 'owner' && (
          <button
            onClick={() => navigate(`/staff?role=${currentRole.key}`)}
            className="self-start sm:self-center shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-white rounded-xl text-xs font-bold shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
            style={{ color: 'var(--primary)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Add {currentRole.label}
          </button>
        )}
      </div>

      {/* Coordinator Note (if applicable) */}
      {selectedRole === 'area_coordinator' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-900">Area Restriction Guard</p>
            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
              Area Coordinator sirf apne assigned Ward ya Block ke citizens aur complaints ko access kar sakta hai.
              Staff create/edit karte waqt area assign kiya jata hai.
            </p>
          </div>
        </div>
      )}

      {/* Live Assigned Staff for this Role */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Active Team Members with this Role ({assignedStaff.length})
            </h3>
          </div>
          <Link
            to="/staff"
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            All Staff <ExternalLink className="w-3 h-3" />
          </Link>
        </div>

        {loadingStaff ? (
          <div className="py-4 text-center text-xs text-gray-400">Checking active members...</div>
        ) : assignedStaff.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {assignedStaff.map(s => (
              <div
                key={s._id}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                    style={{ background: 'var(--primary)' }}
                  >
                    {(s.name || 'S')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{s.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{s.email}</p>
                    {s.assignedAreaId?.name && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {s.assignedAreaId.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${s.isActive !== false ? 'bg-green-500' : 'bg-gray-300'}`}
                    title={s.isActive !== false ? 'Active' : 'Inactive'}
                  />
                  <Link
                    to="/staff"
                    className="text-[11px] font-bold text-[var(--primary)] hover:underline"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center rounded-xl bg-gray-50/60 border border-dashed border-gray-200">
            <p className="text-xs font-semibold text-gray-500">No team members currently assigned to {currentRole.label}</p>
            {currentRole.key !== 'owner' && (
              <button
                onClick={() => navigate(`/staff?role=${currentRole.key}`)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-white px-3 py-1.5 rounded-xl shadow-xs"
                style={{ background: 'var(--primary)' }}
              >
                <Plus className="w-3.5 h-3.5" /> Assign Staff Member
              </button>
            )}
          </div>
        )}
      </div>

      {/* Permission Table Matrix */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 px-4 py-3 border-b border-gray-100" style={{ background: 'var(--primary-lighter)' }}>
          <div className="col-span-1">
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Module</p>
          </div>
          {actions.map(a => {
            const AIcon = a.Icon
            return (
              <div key={a.key} className="flex flex-col items-center justify-center">
                <AIcon className="w-3.5 h-3.5 text-gray-600 mb-0.5" />
                <p className="text-[8px] text-gray-600 font-bold uppercase tracking-wider">{a.label}</p>
              </div>
            )
          })}
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-50">
          {modules.map((mod, i) => {
            const isFeatureActive = mod.featureKey ? isFeatureEnabled(mod.featureKey) : true

            return (
              <div
                key={mod.name}
                className={`grid grid-cols-5 px-4 py-2.5 items-center ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                }`}
              >
                <div className="col-span-1 flex items-center gap-1.5 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{mod.name}</p>
                  {mod.featureKey && !isFeatureActive && (
                    <span className="hidden sm:inline-block text-[8px] font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-400">
                      Plan OFF
                    </span>
                  )}
                </div>

                {actions.map(action => {
                  const allowed = getAccess(selectedRole, mod.name, action.key)
                  return (
                    <div key={action.key} className="flex items-center justify-center">
                      {allowed ? (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100 shadow-2xs">
                          <Check className="w-3 h-3 text-green-700" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-100">
                          <X className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend & Policy Note */}
      <div className="bg-gray-50 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-green-700" strokeWidth={3} />
            </div>
            <span className="text-xs font-medium text-gray-600">Access Allowed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
              <X className="w-2.5 h-2.5 text-gray-400" strokeWidth={2.5} />
            </div>
            <span className="text-xs font-medium text-gray-600">Access Restricted</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <Info className="w-3.5 h-3.5" />
          <span>Role permissions are enforced at API controller level.</span>
        </div>
      </div>
    </div>
  )
}
