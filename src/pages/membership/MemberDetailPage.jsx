import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CreditCard, Download, RefreshCw } from 'lucide-react'
import { MembershipAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function MemberDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [member,  setMember]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await MembershipAPI.getOne(id)
      setMember(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleRegenCard = async () => {
    try { await MembershipAPI.regenerateCard(id, {}); show('Card regenerated successfully!'); load() }
    catch(e) { show(e.message,'error') }
  }

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const m = member || {}
  const u = m.user || {}

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to Membership
      </button>

      {/* Member Card Preview */}
      <div className="rounded-3xl overflow-hidden shadow-lg"
        style={{background:`linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, #000))`}}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full ${m.status==='approved'?'bg-green-400 text-white':'bg-white/20 text-white'}`}>
              {m.status?.toUpperCase() || '—'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl overflow-hidden border-2 border-white/30">
              {u.photo ? <img src={u.photo} alt="" className="w-full h-full object-cover"/> : (u.name||'M')[0]}
            </div>
            <div>
              <p className="text-white font-black text-base">{u.name || '—'}</p>
              <p className="text-white/70 text-xs">{m.designation || u.occupation || 'Member'}</p>
              <p className="text-white/90 text-xs font-bold mt-0.5">{m.membershipNumber || '—'}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20">
            <div>
              <p className="text-white/60 text-[9px]">VALID TILL</p>
              <p className="text-white text-xs font-bold">{m.validTill ? new Date(m.validTill).toLocaleDateString('en-IN') : '—'}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-[9px]">AREA</p>
              <p className="text-white text-xs font-bold">{u.area?.name || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-800">Member Details</h3>
          <div className="flex gap-2">
            <a href={MembershipAPI.downloadCard(id)} target="_blank" rel="noreferrer"
              className="text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5" style={{background:'var(--primary-light)',color:'var(--primary)'}}>
              <Download className="w-3.5 h-3.5" /> Download Card
            </a>
            <button onClick={handleRegenCard} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-orange-50 text-orange-600 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Regen Card
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            ['Member ID',     m.membershipNumber || '—'],
            ['Name',          u.name             || '—'],
            ['Mobile',        u.mobile           || '—'],
            ['Email',         u.email            || '—'],
            ['Status',        m.status           || '—'],
            ['Payment',       m.paymentStatus    || '—'],
            ['Applied On',    m.createdAt   ? new Date(m.createdAt).toLocaleDateString('en-IN')   : '—'],
            ['Approved On',   m.approvedAt  ? new Date(m.approvedAt).toLocaleDateString('en-IN')  : '—'],
            ['Valid Till',    m.validTill   ? new Date(m.validTill).toLocaleDateString('en-IN')   : '—'],
            ['Area',          u.area?.name       || '—'],
          ].map(([l,v]) => (
            <div key={l}>
              <p className="text-[10px] text-gray-400 font-semibold">{l}</p>
              <p className="text-sm font-bold text-gray-800 mt-0.5 capitalize">{v}</p>
            </div>
          ))}
        </div>

        {/* Notes */}
        {m.notes && (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{m.notes}</p>
          </div>
        )}

        {/* Rejection reason */}
        {m.rejectionReason && (
          <div className="bg-red-50 rounded-xl p-3">
            <p className="text-xs font-bold text-red-600 mb-1">Rejection Reason</p>
            <p className="text-sm text-red-700">{m.rejectionReason}</p>
          </div>
        )}
      </div>
    </div>
  )
}
