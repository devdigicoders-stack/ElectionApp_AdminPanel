import { useState } from 'react'
import { Crown, Shield, FileEdit, AlertTriangle, Star, MapPin, Eye, Plus, Edit3, Trash2, Check, X } from 'lucide-react'

const roles = [
  { key: 'owner', label: 'Owner / Leader', desc: 'Full access to everything', Icon: Crown, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'admin', label: 'Admin', desc: 'Almost full management access', Icon: Shield, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  { key: 'content_manager', label: 'Content Manager', desc: 'Banners, Works, Gallery, Events', Icon: FileEdit, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  { key: 'complaint_manager', label: 'Complaint Manager', desc: 'Complaints, Assignment, Resolution', Icon: AlertTriangle, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'volunteer_manager', label: 'Volunteer Manager', desc: 'Volunteers, Tasks, Assignments', Icon: Star, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  { key: 'coordinator', label: 'Area Coordinator', desc: 'Only assigned area access', Icon: MapPin, color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
]

const modules = [
  'Dashboard', 'Citizens', 'Complaints', 'Works', 'Events', 'Polls',
  'Membership', 'Volunteers', 'Gallery', 'Manifesto', 'News', 'Banners',
  'Notifications', 'Areas', 'Settings', 'Audit',
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
  coordinator: { view: true, create: false, edit: false, delete: false },
}

// Module-specific overrides
const moduleOverrides = {
  complaint_manager: { Complaints: { view: true, create: true, edit: true, delete: false } },
  content_manager: {
    Works: { view: true, create: true, edit: true, delete: true },
    Events: { view: true, create: true, edit: true, delete: true },
    Gallery: { view: true, create: true, edit: true, delete: true },
    Banners: { view: true, create: true, edit: true, delete: true },
    News: { view: true, create: true, edit: true, delete: true },
    Manifesto: { view: true, create: true, edit: true, delete: true },
  },
  coordinator: {
    Dashboard: { view: true, create: false, edit: false, delete: false },
    Citizens: { view: true, create: false, edit: false, delete: false },
    Complaints: { view: true, create: false, edit: true, delete: false },
    Works: { view: true, create: false, edit: false, delete: false },
    Events: { view: true, create: false, edit: false, delete: false },
  },
}

function getAccess(role, mod, action) {
  if (role === 'owner') return true
  const override = moduleOverrides[role]?.[mod]
  if (override) return override[action] ?? false
  if (role === 'coordinator') return false  // only override modules accessible
  return matrix[role]?.[action] ?? false
}

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState('admin')
  const role = roles.find(r => r.key === selectedRole)
  const RoleIcon = role?.Icon || Shield

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-black text-gray-900">Roles & Permissions</h1>
        <p className="text-xs text-gray-400">Define access control for each role</p>
      </div>

      {/* Role scroll pills */}
      <div className="flex gap-2 no-scrollbar overflow-x-auto pb-1">
        {roles.map(r => {
          const RIcon = r.Icon
          return (
            <button key={r.key} onClick={() => setSelectedRole(r.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${selectedRole === r.key ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
              style={selectedRole === r.key ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>
              <RIcon className="w-3.5 h-3.5" />
              {r.label}
            </button>
          )
        })}
      </div>

      {/* Selected Role Card */}
      <div className={`rounded-2xl p-4 border flex items-center gap-3 ${role?.bg} ${role?.border}`}>
        <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shrink-0 shadow-sm">
          <RoleIcon className={`w-6 h-6 ${role?.color}`} />
        </div>
        <div>
          <p className={`text-sm font-black ${role?.color}`}>{role?.label}</p>
          <p className="text-xs text-gray-600 mt-0.5">{role?.desc}</p>
        </div>
      </div>

      {/* Coordinator Note */}
      {selectedRole === 'coordinator' && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-yellow-800">Area Restriction</p>
            <p className="text-[11px] text-yellow-700 mt-0.5">
              Coordinator sirf apne assigned area ka data dekh sakta hai. Ward 10 coordinator ko Ward 11 ka data nahi dikhega.
            </p>
          </div>
        </div>
      )}

      {/* Permission Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-5 px-4 py-3 border-b border-gray-100" style={{ background: 'var(--primary-lighter)' }}>
          <div className="col-span-1">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Module</p>
          </div>
          {actions.map(a => {
            const AIcon = a.Icon
            return (
              <div key={a.key} className="flex flex-col items-center justify-center">
                <AIcon className="w-3.5 h-3.5 text-gray-600 mb-0.5" />
                <p className="text-[8px] text-gray-500 font-semibold capitalize">{a.label}</p>
              </div>
            )
          })}
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50">
          {modules.map((mod, i) => (
            <div key={mod} className={`grid grid-cols-5 px-4 py-2.5 items-center ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
              <div className="col-span-1">
                <p className="text-xs font-semibold text-gray-700 truncate">{mod}</p>
              </div>
              {actions.map(action => {
                const allowed = getAccess(selectedRole, mod, action.key)
                return (
                  <div key={action.key} className="flex items-center justify-center">
                    {allowed ? (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100">
                        <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full flex items-center justify-center bg-gray-100">
                        <X className="w-3 h-3 text-gray-300" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center py-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-green-600" strokeWidth={3} />
          </div>
          <span className="text-xs text-gray-500">Allowed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-2.5 h-2.5 text-gray-400" strokeWidth={3} />
          </div>
          <span className="text-xs text-gray-500">Not Allowed</span>
        </div>
      </div>
    </div>
  )
}

