import { useEffect, useState } from 'react'
import { Users, CreditCard, Star, CheckCircle2, Download } from 'lucide-react'
import { CitizensAPI, ComplaintsAPI, WorksAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function AnalyticsPage() {
  const { show, Toast } = useToast()
  const [crm, setCrm] = useState(null)
  const [cmpSt, setCmpSt] = useState(null)
  const [wrkSt, setWrkSt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [exporting, setExporting] = useState(false)

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

  // Overview KPIs (Backend returns under crm.overview and crm.categories)
  const totalCitizens = crm?.overview?.totalCitizens ?? crm?.totalCitizens ?? 0
  const totalMembers = crm?.categories?.member ?? crm?.totalMembers ?? 0
  const totalVolunteers = crm?.categories?.volunteer ?? crm?.totalVolunteers ?? 0
  const activeUsers = crm?.overview?.active ?? crm?.activeUsers ?? totalCitizens

  const kpis = [
    { label: 'Total Citizens', value: totalCitizens, color: 'text-blue-600', bg: 'bg-blue-50', Icon: Users },
    { label: 'Members', value: totalMembers, color: 'text-green-600', bg: 'bg-green-50', Icon: CreditCard },
    { label: 'Volunteers', value: totalVolunteers, color: 'text-purple-600', bg: 'bg-purple-50', Icon: Star },
    { label: 'Active Users', value: activeUsers, color: 'text-orange-600', bg: 'bg-orange-50', Icon: CheckCircle2 },
  ]

  // Demographics / Gender
  const genderData = crm?.demographics?.gender || {}
  const genderM = genderData.male ?? genderData.Male ?? 0
  const genderF = genderData.female ?? genderData.Female ?? 0
  const genderOther = genderData.other ?? genderData.Other ?? genderData.Unspecified ?? 0
  const genderT = genderM + genderF + genderOther || (totalCitizens > 0 ? totalCitizens : 1)

  // Complaints breakdown & accurate total
  const cmpResolved = cmpSt?.resolved || 0
  const cmpSubmitted = cmpSt?.submitted || 0
  const cmpInProgress = cmpSt?.in_progress || 0
  const cmpClosed = (cmpSt?.closed || 0) + (cmpSt?.rejected || 0)
  const cmpAssigned = cmpSt?.assigned || 0
  const totalComplaints = (cmpSt?.total && cmpSt.total > 0)
    ? cmpSt.total
    : (cmpResolved + cmpSubmitted + cmpInProgress + cmpClosed + cmpAssigned)
  const maxCmp = totalComplaints || 1

  const cmpBars = [
    { label: 'Resolved', value: cmpResolved, color: 'bg-emerald-500' },
    { label: 'Submitted', value: cmpSubmitted, color: 'bg-amber-500' },
    { label: 'In Progress', value: cmpInProgress, color: 'bg-blue-500' },
    { label: 'Assigned', value: cmpAssigned, color: 'bg-purple-500' },
    { label: 'Closed / Rejected', value: cmpClosed, color: 'bg-gray-400' },
  ].filter(b => b.value > 0 || ['Resolved', 'Submitted', 'In Progress'].includes(b.label))

  // Development Works normalize (backend returns an array of [{ _id, count }])
  const wrkObj = Array.isArray(wrkSt)
    ? wrkSt.reduce((acc, w) => {
        const count = w.count || 0
        return {
          ...acc,
          [w._id]: count,
          total: (acc.total || 0) + count
        }
      }, { total: 0, completed: 0, in_progress: 0, upcoming: 0 })
    : (wrkSt || { total: 0, completed: 0, in_progress: 0, upcoming: 0 })

  const topTags = crm?.topTags || []
  const areaList = crm?.topAreas || crm?.areaWise || crm?.areaDistribution || []

  // ── CSV EXPORT ──
  const handleExportCSV = () => {
    setExporting(true)
    try {
      const now = new Date().toISOString().slice(0, 10)
      const rows = [
        ['ANALYTICS & INSIGHTS REPORT'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['--- OVERVIEW METRICS ---'],
        ['Metric', 'Count'],
        ['Total Citizens', totalCitizens],
        ['Members', totalMembers],
        ['Volunteers', totalVolunteers],
        ['Active Users', activeUsers],
        [],
        ['--- GENDER DEMOGRAPHICS ---'],
        ['Gender', 'Count', 'Percentage'],
        ['Male', genderM, `${Math.round((genderM / genderT) * 100)}%`],
        ['Female', genderF, `${Math.round((genderF / genderT) * 100)}%`],
        ['Other / Unspecified', genderOther, `${Math.round((genderOther / genderT) * 100)}%`],
        [],
        ['--- COMPLAINT STATUS ---'],
        ['Status', 'Count', 'Share %'],
        ...cmpBars.map(b => [b.label, b.value, `${Math.round((b.value / maxCmp) * 100)}%`]),
        ['Total Complaints', totalComplaints, '100%'],
        [],
        ['--- DEVELOPMENT WORKS ---'],
        ['Status', 'Count'],
        ['Completed', wrkObj.completed || 0],
        ['In Progress', wrkObj.in_progress || wrkObj.inProgress || 0],
        ['Upcoming', wrkObj.upcoming || 0],
        ['Total Development Works', wrkObj.total || 0],
        [],
        ['--- TOP CRM TAGS ---'],
        ['Tag Name', 'Frequency'],
        ...(topTags.length > 0 ? topTags.map(t => [t.tag || t._id, t.count]) : [['No tags recorded', 0]]),
        [],
        ['--- CITIZENS BY AREA ---'],
        ['Area', 'Count'],
        ...(areaList.length > 0 ? areaList.map(a => [a.areaName || a.area?.name || a._id || '—', a.count || 0]) : [['No areas mapped', 0]]),
      ]

      const csvContent = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Analytics_Report_${now}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      show('CSV report downloaded successfully!', 'success')
    } catch (e) {
      show('Failed to export CSV: ' + e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── EXCEL EXPORT ──
  const handleExportExcel = () => {
    setExporting(true)
    try {
      const now = new Date().toISOString().slice(0, 10)
      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Analytics Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
          <style>
            th { background-color: #7c2d12; color: #ffffff; font-weight: bold; }
            td { mso-number-format:"\\@"; }
            .section-head { font-weight: bold; font-size: 13pt; background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <table>
            <tr><td colspan="3" style="font-size: 16pt; font-weight: bold; color: #7c2d12;">Analytics & Insights Report</td></tr>
            <tr><td colspan="3" style="color: #6b7280;">Generated At: ${new Date().toLocaleString()}</td></tr>
            <tr><td></td></tr>

            <tr><td colspan="3" class="section-head">1. Overview KPIs</td></tr>
            <tr><th>Metric</th><th>Count</th><th>Notes</th></tr>
            <tr><td>Total Citizens</td><td>${totalCitizens}</td><td>All registered citizens in CRM</td></tr>
            <tr><td>Active Users</td><td>${activeUsers}</td><td>Citizens with active status</td></tr>
            <tr><td>Members</td><td>${totalMembers}</td><td>Assigned party members</td></tr>
            <tr><td>Volunteers</td><td>${totalVolunteers}</td><td>Active campaign volunteers</td></tr>
            <tr><td></td></tr>

            <tr><td colspan="3" class="section-head">2. Gender Distribution</td></tr>
            <tr><th>Gender</th><th>Count</th><th>Percentage</th></tr>
            <tr><td>Male</td><td>${genderM}</td><td>${Math.round((genderM / genderT) * 100)}%</td></tr>
            <tr><td>Female</td><td>${genderF}</td><td>${Math.round((genderF / genderT) * 100)}%</td></tr>
            <tr><td>Other / Unspecified</td><td>${genderOther}</td><td>${Math.round((genderOther / genderT) * 100)}%</td></tr>
            <tr><td></td></tr>

            <tr><td colspan="3" class="section-head">3. Complaints Status</td></tr>
            <tr><th>Status</th><th>Count</th><th>Share</th></tr>
            ${cmpBars.map(b => `<tr><td>${b.label}</td><td>${b.value}</td><td>${Math.round((b.value / maxCmp) * 100)}%</td></tr>`).join('')}
            <tr><td style="font-weight:bold;">Total Complaints</td><td style="font-weight:bold;">${totalComplaints}</td><td>100%</td></tr>
            <tr><td></td></tr>

            <tr><td colspan="3" class="section-head">4. Development Works</td></tr>
            <tr><th>Status</th><th>Count</th><th>Remarks</th></tr>
            <tr><td>Completed</td><td>${wrkObj.completed || 0}</td><td>Finished projects</td></tr>
            <tr><td>In Progress</td><td>${wrkObj.in_progress || wrkObj.inProgress || 0}</td><td>Ongoing works</td></tr>
            <tr><td>Upcoming</td><td>${wrkObj.upcoming || 0}</td><td>Planned works</td></tr>
            <tr><td style="font-weight:bold;">Total Works</td><td style="font-weight:bold;">${wrkObj.total || 0}</td><td></td></tr>
            <tr><td></td></tr>

            <tr><td colspan="3" class="section-head">5. Top CRM Tags</td></tr>
            <tr><th>Tag Name</th><th>Frequency</th><th></th></tr>
            ${topTags.length > 0 ? topTags.map(t => `<tr><td>#${t.tag || t._id}</td><td>${t.count}</td><td></td></tr>`).join('') : '<tr><td colspan="3">No tags recorded</td></tr>'}
            <tr><td></td></tr>

            <tr><td colspan="3" class="section-head">6. Citizens By Area</td></tr>
            <tr><th>Area Name</th><th>Count</th><th></th></tr>
            ${areaList.length > 0 ? areaList.map(a => `<tr><td>${a.areaName || a.area?.name || a._id || '—'}</td><td>${a.count || 0}</td><td></td></tr>`).join('') : '<tr><td colspan="3">No areas mapped</td></tr>'}
          </table>
        </body>
        </html>
      `
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Analytics_Report_${now}.xls`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      show('Excel report downloaded successfully!', 'success')
    } catch (e) {
      show('Failed to export Excel: ' + e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <Toast />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Analytics</h1>
          <p className="text-xs text-gray-400">Insights & reports</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-8 px-3 bg-white border border-gray-200 hover:border-emerald-500 hover:text-emerald-700 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Excel
          </button>
          <button 
            onClick={handleExportCSV}
            disabled={exporting}
            className="h-8 px-3 bg-white border border-gray-200 hover:border-blue-500 hover:text-blue-700 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" /> CSV
          </button>
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

      {/* Gender Distribution */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <p className="text-sm font-bold text-gray-800 mb-4">Gender Distribution</p>
        <div className="flex items-center gap-5">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#fce7f3" strokeWidth="5" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3b82f6" strokeWidth="5"
                strokeDasharray={`${Math.round((genderM / genderT) * 100)} ${100 - Math.round((genderM / genderT) * 100)}`} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black text-gray-700">{genderT.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            {[
              ['Male', genderM, 'bg-blue-500', 'text-blue-600'],
              ['Female', genderF, 'bg-pink-500', 'text-pink-500'],
              ...(genderOther > 0 ? [['Other', genderOther, 'bg-purple-500', 'text-purple-600']] : [])
            ].map(([l, v, bg, tc]) => {
              const pct = genderT > 0 ? Math.round((v / genderT) * 100) : 0
              return (
                <div key={l}>
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${bg}`} />
                      <span>{l} ({v})</span>
                    </div>
                    <span className={tc}>{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${bg} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Complaints Status */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-800">Complaint Status</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            Total: {totalComplaints}
          </span>
        </div>
        <div className="space-y-3">
          {cmpBars.map(b => {
            const pct = maxCmp > 0 ? Math.round(((b.value || 0) / maxCmp) * 100) : 0
            return (
              <div key={b.label}>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>{b.label}</span>
                  <span className="text-gray-500 font-bold">{b.value || 0} <span className="text-[10px] text-gray-400 font-normal">({pct}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${b.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Development Works */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold text-gray-800">Development Works</p>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            Total: {wrkObj?.total || 0}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Completed', wrkObj?.completed || 0, 'text-green-600', 'bg-green-50'],
            ['In Progress', wrkObj?.in_progress || wrkObj?.inProgress || 0, 'text-blue-600', 'bg-blue-50'],
            ['Upcoming', wrkObj?.upcoming || 0, 'text-yellow-600', 'bg-yellow-50']
          ].map(([l, v, tc, bg]) => (
            <div key={l} className={`${bg} rounded-2xl p-3 text-center`}>
              <p className={`text-xl font-black ${tc}`}>{v ?? 0}</p>
              <p className="text-[9px] text-gray-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* User area bar chart */}
      {areaList.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-4">Citizens by Area</p>
          <div className="space-y-3">
            {areaList.slice(0, 5).map((d, i) => {
              const maxV = areaList[0]?.count || 1
              const pct = Math.round(((d.count || 0) / maxV) * 100)
              return (
                <div key={i}>
                  <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                    <span>{d.areaName || d.area?.name || d._id || '—'}</span>
                    <span style={{ color: 'var(--primary)' }} className="font-bold">{(d.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Top CRM Tags */}
      {topTags.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-800 mb-3">Top CRM Tags</p>
          <div className="flex flex-wrap gap-2">
            {topTags.map((t, i) => (
              <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'var(--primary-light)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--primary)' }}>#{t.tag || t._id}</span>
                <span className="text-[10px] text-gray-400 font-bold">({t.count})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

