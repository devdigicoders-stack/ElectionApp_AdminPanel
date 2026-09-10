import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  CreditCard,
  Star,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  BarChart3,
  HardHat,
  Bell,
  ChevronRight
} from 'lucide-react'
import { DashboardAPI, ComplaintsAPI, CitizensAPI, WorksAPI } from '../../api/adminApis'
import { useBranding } from '../../context/BrandingContext'
import { Skeleton, ApiError } from '../../hooks/useFetch.jsx'

const statusColor = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-green-100 text-green-700',
  assigned: 'bg-purple-100 text-purple-700',
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { branding, tenant } = useBranding()
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')

  const [summary, setSummary] = useState(null)
  const [cmpStats, setCmpStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [sum, cs, cmps] = await Promise.all([
        DashboardAPI.getSummary().catch(() => null),
        ComplaintsAPI.getStats().catch(() => null),
        ComplaintsAPI.getAll({ limit: 5, page: 1 }).catch(() => null),
      ])
      setSummary(sum?.data ?? sum)
      setCmpStats(cs?.data ?? cs)
      const list = cmps?.data?.complaints ?? cmps?.data ?? cmps?.complaints ?? []
      setRecent(Array.isArray(list) ? list.slice(0, 5) : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="space-y-4">
      <div className="rounded-3xl h-32 animate-pulse" style={{ background: 'var(--primary-light)' }} />
      <div className="grid grid-cols-2 gap-3"><Skeleton rows={4} /></div>
    </div>
  )
  if (error) return <ApiError message={error} onRetry={load} />

  const stats = [
    { label: 'Citizens', value: summary?.totalUsers ?? 0, icon: <Users className="w-5 h-5 text-blue-600" />, path: '/users' },
    { label: 'Members', value: summary?.totalMembers ?? 0, icon: <CreditCard className="w-5 h-5 text-green-600" />, path: '/membership' },
    { label: 'Volunteers', value: summary?.totalVolunteers ?? 0, icon: <Star className="w-5 h-5 text-amber-500" />, path: '/volunteers' },
    { label: 'Events', value: summary?.upcomingEvents ?? 0, icon: <Calendar className="w-5 h-5 text-purple-600" />, path: '/events' },
    { label: 'Complaints', value: cmpStats?.total ?? 0, icon: <AlertTriangle className="w-5 h-5 text-red-500" />, path: '/complaints' },
    { label: 'Pending', value: cmpStats?.pending ?? 0, icon: <Clock className="w-5 h-5 text-yellow-600" />, path: '/complaints' },
    { label: 'Resolved', value: cmpStats?.resolved ?? 0, icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />, path: '/complaints' },
    { label: 'Active Polls', value: summary?.activePolls ?? 0, icon: <BarChart3 className="w-5 h-5 text-indigo-600" />, path: '/polls' },
  ]

  return (
    <div className="space-y-4">

      {/* Leader Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-lg text-white p-5"
        style={{ background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))` }}>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full" />

        <div className="relative flex items-center gap-4">
          {/* Leader photo / avatar */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 overflow-hidden border-2 border-white/30">
            {branding?.logoUrl
              ? <img src={branding.logoUrl} alt="Leader" className="w-full h-full object-cover" />
              : <span className="text-white text-2xl font-black">{(branding?.leaderName || user.name || 'A')[0]}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-xs font-semibold">Good Morning,</p>
            <h2 className="text-white text-lg font-black leading-tight truncate">
              {user.name || branding?.leaderName || 'Admin'}
            </h2>
            <p className="text-white/60 text-[10px] capitalize mt-0.5">
              {user.role || 'admin'} · {tenant?.name || ''}
            </p>
          </div>
          {/* Notification bell */}
          <button onClick={() => navigate('/notifications')} className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 hover:bg-white/30 transition-colors">
            <Bell className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2">
        {stats.map(s => (
          <button key={s.label} onClick={() => navigate(s.path)}
            className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100 active:scale-95 transition-transform flex flex-col items-center">
            <div className="mb-1 flex items-center justify-center">{s.icon}</div>
            <p className="text-base font-black text-gray-800">
              {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
            </p>
            <p className="text-[9px] text-gray-400 font-medium leading-tight mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-bold text-gray-800 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: <AlertTriangle className="w-5 h-5 text-red-500" />, label: 'Add Complaint', path: '/complaints', color: 'bg-red-50' },
            { icon: <HardHat className="w-5 h-5 text-blue-600" />, label: 'Add Work', path: '/works', color: 'bg-blue-50' },
            { icon: <Calendar className="w-5 h-5 text-emerald-600" />, label: 'Add Event', path: '/events', color: 'bg-green-50' },
            { icon: <BarChart3 className="w-5 h-5 text-purple-600" />, label: 'Create Poll', path: '/polls', color: 'bg-purple-50' },
          ].map(a => (
            <button key={a.label} onClick={() => navigate(a.path)}
              className={`${a.color} rounded-2xl p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform`}>
              <span className="flex items-center justify-center">{a.icon}</span>
              <span className="text-[9px] font-bold text-gray-600 text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Complaint Status */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">Complaint Status</h3>
          <button onClick={() => navigate('/complaints')} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: 'var(--primary)' }}>
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            ['Total', cmpStats?.total, 'text-gray-800'],
            ['New', cmpStats?.new, 'text-blue-600'],
            ['Pending', cmpStats?.pending, 'text-yellow-600'],
            ['Resolved', cmpStats?.resolved, 'text-green-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="text-center">
              <p className={`text-lg font-black ${c}`}>{v ?? 0}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
          <h3 className="text-sm font-bold text-gray-800">Recent Complaints</h3>
          <button onClick={() => navigate('/complaints')} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: 'var(--primary)' }}>
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        {recent.length === 0
          ? <p className="text-center text-xs text-gray-400 py-8">No complaints yet</p>
          : <div className="divide-y divide-gray-50">
            {recent.map(c => (
              <div key={c._id} onClick={() => navigate(`/complaints/${c._id}`)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--primary-light)' }}>
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black" style={{ color: 'var(--primary)' }}>{c.complaintNumber || '#' + c._id?.slice(-4)}</p>
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.title}</p>
                  <p className="text-[10px] text-gray-400">{c.area?.name || ''} · {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : ''}</p>
                </div>
                <span className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[c.status?.toLowerCase()] || 'bg-gray-100 text-gray-500'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        }
      </div>

    </div>
  )
}
