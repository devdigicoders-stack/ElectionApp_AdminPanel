import { useState, useEffect, useCallback } from 'react'
import { QrCode, CreditCard, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { MembershipAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function MembershipPage() {
  const { show, Toast } = useToast()
  const [tab, setTab] = useState('applications')
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 15

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit, status: tab === 'applications' ? 'pending' : 'approved' }
      const [res, st] = await Promise.all([
        MembershipAPI.getAll(params),
        MembershipAPI.getStats(),
      ])
      const data = res?.data ?? res
      setItems(Array.isArray(data?.memberships ?? data) ? (data?.memberships ?? data) : [])
      setTotal(data?.total ?? 0)
      setStats(st?.data ?? st)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [tab, page])

  useEffect(() => { setPage(1) }, [tab])
  useEffect(() => { load() }, [load])

  const handleApprove = async (id) => {
    try { await MembershipAPI.approve(id, {}); show('Approved! Card generated.'); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleReject = async (id) => {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    try { await MembershipAPI.reject(id, reason); show('Rejected.'); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleRegenCard = async (id) => {
    try { await MembershipAPI.regenerateCard(id, {}); show('Card regenerated!'); load() }
    catch (e) { show(e.message, 'error') }
  }
  const handleVerifyQR = async () => {
    const num = prompt('Enter membership number to verify:')
    if (!num) return
    try {
      const res = await MembershipAPI.verifyQR(num.trim())
      const d = res?.data ?? res
      show(`Verified: ${d?.user?.name || '—'} | ${num}`)
    } catch (e) { show('Invalid QR / Not found', 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Membership</h1>
          <p className="text-xs text-gray-400">Manage member applications</p>
        </div>
        <button onClick={handleVerifyQR}
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
          <QrCode className="w-3.5 h-3.5" />
          Verify QR
        </button>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[['Total', stats?.total, 'text-gray-800'], ['Approved', stats?.approved, 'text-green-600'], ['Pending', stats?.pending, 'text-yellow-600'], ['Rejected', stats?.rejected, 'text-red-500']].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
            <p className={`text-lg font-black ${c}`}>{v ?? 0}</p>
            <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {['applications', 'members'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-bold rounded-xl capitalize transition-all cursor-pointer ${tab === t ? 'text-white shadow-sm' : ' text-gray-500'}`}
            style={tab === t ? { background: 'var(--primary)' } : {}}>{t}</button>
        ))}
      </div>

      {
        loading ? <Skeleton rows={5} /> : error ? <ApiError message={error} onRetry={load} /> : (
          <>
            <div className="space-y-2.5">
              {items.map(m => (
                <div key={m._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-base shrink-0"
                      style={{ background: 'var(--primary)' }}>
                      {(m.user?.name || m.name || 'M')[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{m.user?.name || m.name || '—'}</p>
                      <p className="text-[10px] text-gray-400">{m.user?.mobile || '—'} · {m.user?.area?.name || '—'}</p>
                      {m.membershipNumber && (
                        <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--primary)' }}>{m.membershipNumber}</p>
                      )}
                    </div>

                    {tab === 'applications' ? (
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => handleApprove(m._id)}
                          className="text-xs font-bold text-white px-3 py-1.5 rounded-xl bg-green-500 cursor-pointer hover:bg-green-600 transition-colors">Approve</button>
                        <button onClick={() => handleReject(m._id)}
                          className="text-xs font-bold text-red-500 px-3 py-1.5 rounded-xl bg-red-50 cursor-pointer hover:bg-red-100 transition-colors">Reject</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.status}</span>
                        <a href={MembershipAPI.downloadCard(m._id)} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-colors"
                          style={{ color: 'var(--primary)', background: 'var(--primary-light)' }}>
                          <CreditCard className="w-3 h-3" />
                          Card
                        </a>
                        <button onClick={() => handleRegenCard(m._id)}
                          className="flex items-center justify-center text-xs font-bold text-orange-500 bg-orange-50 p-1.5 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer"
                          title="Regenerate Card">
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {tab === 'members' && m.membershipNumber && (
                    <div className="mt-3 p-3 rounded-2xl border-2 border-dashed" style={{ borderColor: 'var(--primary-light)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-gray-400 font-semibold">MEMBERSHIP CARD</p>
                          <p className="text-sm font-black text-gray-800">{m.user?.name || '—'}</p>
                          <p className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>{m.membershipNumber}</p>
                          <p className="text-[9px] text-gray-400">Valid till {m.validTill ? new Date(m.validTill).toLocaleDateString('en-IN') : '—'}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--primary-light)' }}>
                          <CreditCard className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {items.length === 0 && (
              <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No {tab} found</p>
              </div>
            )}
            {total > limit && (
              <div className="flex items-center justify-between">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                <span className="text-xs text-gray-400">Page {page}</span>
                <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="text-xs font-bold disabled:opacity-30 cursor-pointer flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )
      }
    </div >
  )
}
