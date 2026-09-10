import { useEffect, useState } from 'react'
import { Users, CreditCard, Star, CheckCircle2, Download } from 'lucide-react'
import { CitizensAPI, ComplaintsAPI, WorksAPI } from '../../api/adminApis'
import { Skeleton, ApiError } from '../../hooks/useFetch.jsx'

export default function AnalyticsPage() {
  const [crm, setCrm] = useState(null)
  const [cmpSt, setCmpSt] = useState(null)
  const [wrkSt, setWrkSt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [cr, cs, ws] = await Promise.all([
        CitizensAPI.getAnalytics().catch(() => null),
        ComplaintsAPI.getStats().catch(() => null),
        WorksAPI.getStats().catch(() => null),
      ])
      setCrm(cr?.data ?? cr)
      setCmpSt(cs?.data ?? cs)
      setWrkSt(ws?.data ?? ws)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  const genderM = crm?.demographics?.gender?.male || 0
  const genderF = crm?.demographics?.gender?.female || 0
  const genderT = genderM + genderF || 1

  const kpis = [
    { label: 'Total Citizens', value: crm?.totalCitizens ?? '—', color: 'text-blue-600', bg: 'bg-blue-50', Icon: Users },
    { label: 'Members', value: crm?.totalMembers ?? '—', color: 'text-green-600', bg: 'bg-green-50', Icon: CreditCard },
    { label: 'Volunteers', value: crm?.totalVolunteers ?? '—', color: 'text-purple-600', bg: 'bg-purple-50', Icon: Star },
    { label: 'Active Users', value: crm?.activeUsers ?? '—', color: 'text-orange-600', bg: 'bg-orange-50', Icon: CheckCircle2 },
  ]

  const maxCmp = cmpSt?.total || 1
  const cmpBars = [
    { label: 'Resolved', value: cmpSt?.resolved, color: 'bg-green-400' },
    { label: 'Pending', value: cmpSt?.pending, color: 'bg-yellow-400' },
    { label: 'In Progress', value: cmpSt?.inProgress, color: 'bg-blue-400' },
    { label: 'Escalated', value: cmpSt?.escalated, color: 'bg-red-400' },
  ]

  const topTags = crm?.topTags || []
  const categories = crm?.categoryDistribution || []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Analytics</h1>
          <p className="text-xs text-gray-400">Insights & reports</p>
        </div>
        <div className="flex gap-1.5">
          {['Excel', 'CSV'].map(f => (
            <button key={f} className="h-8 px-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 flex items-center gap-1.5 shadow-sm">
              <Download className="w-3.5 h-3.5 text-gray-500" /> {f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.bg} ${k.color}`}>
              <k.Icon className="w-6 h-6" />
            </div>
            <div>
              <p className={`text-2xl font-black ${k.color}`}>{typeof k.value === 'number' ? k.value.toLocaleString() : k.value}</p>
              <p className="text-xs text-gray-600 font-medium">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* User area bar chart */}
      {(crm?.areaWise || crm?.areaDistribution) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-4">User by Area</p>
          <div className="space-y-3">
            {(crm?.areaWise || crm?.areaDistribution || []).slice(0, 5).map((d, i) => {
              const maxV = (crm?.areaWise || crm?.areaDistribution)[0]?.count || 1
              const pct = Math.round(((d.count || 0) / maxV) * 100)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                    <span>{d.area?.name || d._id || '—'}</span>
                    <span style={{ color: 'var(--primary)' }}>{(d.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Gender */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-800 mb-4">Gender Distribution</p>
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e0f2fe" strokeWidth="5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="5"
                strokeDasharray={`${Math.round((genderM / genderT) * 100)} ${100 - Math.round((genderM / genderT) * 100)}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-gray-700">{genderT.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[['Male', genderM, 'bg-blue-400', 'text-blue-600'], ['Female', genderF, 'bg-pink-400', 'text-pink-500']].map(([l, v, bg, tc]) => (
              <div key={l}>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <div className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${bg}`} /><span>{l}</span></div>
                  <span className={tc}>{genderT > 0 ? Math.round((v / genderT) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className={`h-full ${bg} rounded-full`} style={{ width: `${genderT > 0 ? Math.round((v / genderT) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Complaints */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-800 mb-4">Complaint Status — Total: {cmpSt?.total || 0}</p>
        <div className="space-y-3">
          {cmpBars.map(b => {
            const pct = maxCmp > 0 ? Math.round(((b.value || 0) / maxCmp) * 100) : 0
            return (
              <div key={b.label}>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>{b.label}</span><span className="text-gray-500">{b.value || 0}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full">
                  <div className={`h-full ${b.color} rounded-full`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Works */}
      {wrkSt && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-4">Development Works — Total: {wrkSt?.total || 0}</p>
          <div className="grid grid-cols-3 gap-3">
            {[['Completed', wrkSt?.completed, 'text-green-600', 'bg-green-50'], ['In Progress', wrkSt?.inProgress || wrkSt?.in_progress, 'text-blue-600', 'bg-blue-50'], ['Upcoming', wrkSt?.upcoming, 'text-yellow-600', 'bg-yellow-50']].map(([l, v, tc, bg]) => (
              <div key={l} className={`${bg} rounded-2xl p-3 text-center`}>
                <p className={`text-xl font-black ${tc}`}>{v ?? 0}</p>
                <p className="text-[9px] text-gray-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Tags */}
      {topTags.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-3">Top CRM Tags</p>
          <div className="flex flex-wrap gap-2">
            {topTags.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'var(--primary-light)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>{t.tag || t._id}</span>
                <span className="text-[10px] text-gray-400">({t.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
