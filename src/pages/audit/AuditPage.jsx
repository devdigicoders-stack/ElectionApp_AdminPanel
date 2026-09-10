import { useState } from 'react'

const logs = [
  { id: 1, user: 'Admin',       action: 'LOGIN',            module: 'Auth',       record: '—',            ip: '192.168.1.1', device: 'Chrome / Win', time: '09 Sep 2026 10:00' },
  { id: 2, user: 'Admin',       action: 'CREATE',           module: 'Works',      record: 'Purvanchal Exp',ip: '192.168.1.1', device: 'Chrome / Win', time: '09 Sep 2026 10:15' },
  { id: 3, user: 'Admin',       action: 'EDIT',             module: 'Events',     record: 'Jan Sabha',    ip: '192.168.1.1', device: 'Chrome / Win', time: '09 Sep 2026 10:30' },
  { id: 4, user: 'Content Mgr', action: 'UPLOAD',           module: 'Gallery',    record: 'Album #3',     ip: '10.0.0.5',    device: 'Firefox / Mac',time: '09 Sep 2026 11:00' },
  { id: 5, user: 'Admin',       action: 'DELETE',           module: 'Banners',    record: 'Banner #2',    ip: '192.168.1.1', device: 'Chrome / Win', time: '08 Sep 2026 14:00' },
  { id: 6, user: 'Admin',       action: 'ROLE_CHANGE',      module: 'Roles',      record: 'User #45',     ip: '192.168.1.1', device: 'Chrome / Win', time: '08 Sep 2026 15:30' },
  { id: 7, user: 'Admin',       action: 'EXPORT',           module: 'Users',      record: 'users.csv',    ip: '192.168.1.1', device: 'Chrome / Win', time: '07 Sep 2026 09:00' },
  { id: 8, user: 'Unknown',     action: 'FAILED_LOGIN',     module: 'Auth',       record: '—',            ip: '203.0.113.5', device: 'Unknown',      time: '07 Sep 2026 03:22' },
]

const actionColor = {
  LOGIN:        'bg-green-100 text-green-700',
  CREATE:       'bg-blue-100 text-blue-700',
  EDIT:         'bg-yellow-100 text-yellow-700',
  DELETE:       'bg-red-100 text-red-600',
  UPLOAD:       'bg-purple-100 text-purple-700',
  ROLE_CHANGE:  'bg-orange-100 text-orange-700',
  EXPORT:       'bg-teal-100 text-teal-700',
  FAILED_LOGIN: 'bg-red-200 text-red-700',
}

export default function AuditPage() {
  const [filterAction, setFilterAction] = useState('All')
  const [filterModule, setFilterModule] = useState('All')

  const filtered = logs.filter(l =>
    (filterAction === 'All' || l.action === filterAction) &&
    (filterModule === 'All' || l.module === filterModule)
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Security &amp; Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track all admin actions and security events</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[['Total Logs','1,248','text-gray-800'],['Logins','320','text-green-600'],['Failed Logins','12','text-red-500'],['Data Exports','45','text-purple-600']].map(([l,v,c]) => (
          <div key={l} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
            <p className={`text-2xl font-black ${c}`}>{v}</p>
            <p className="text-xs text-gray-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex gap-3 flex-wrap">
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none">
          <option>All</option><option>LOGIN</option><option>CREATE</option><option>EDIT</option><option>DELETE</option><option>EXPORT</option><option>ROLE_CHANGE</option><option>FAILED_LOGIN</option>
        </select>
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none">
          <option>All</option><option>Auth</option><option>Works</option><option>Events</option><option>Gallery</option><option>Users</option><option>Roles</option><option>Banners</option>
        </select>
        <input type="date" className="border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none" />
        <button className="ml-auto border border-gray-200 text-gray-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-50">Export Logs</button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>{['User','Action','Module','Record','IP Address','Device','Time'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(l => (
                <tr key={l.id} className={`hover:bg-orange-50/20 ${l.action === 'FAILED_LOGIN' ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{l.user}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${actionColor[l.action]}`}>{l.action}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{l.module}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{l.record}</td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-500">{l.ip}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{l.device}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{l.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
