import { useState, useEffect } from 'react'
import { Building, Link2, CheckCircle2, Hourglass, Info } from 'lucide-react'
import { TenantSettingsAPI, ConfigAPI, UploadAPI } from '../../api/adminApis'
import { useBranding } from '../../context/BrandingContext'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function SettingsPage() {
  const { show, Toast } = useToast()
  const { branding, reload: reloadBranding } = useBranding()
  const [tab, setTab] = useState('branding')
  const [config, setConfig] = useState(null)
  const [domain, setDomain] = useState(null)
  const [usage, setUsage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#4f46e5')
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b')
  const [logoFile, setLogoFile] = useState(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [cfg, dom, usg] = await Promise.all([
        ConfigAPI.getConfig().catch(() => null),
        TenantSettingsAPI.getDomainStatus().catch(() => null),
        TenantSettingsAPI.getUsage().catch(() => null),
      ])
      setConfig(cfg?.data ?? cfg)
      setDomain(dom?.data ?? dom)
      setDomainInput((dom?.data ?? dom)?.customDomain || '')
      setUsage(usg?.data ?? usg)
      setPrimaryColor((cfg?.data ?? cfg)?.branding?.primaryColor || branding?.primaryColor || '#4f46e5')
      setSecondaryColor((cfg?.data ?? cfg)?.branding?.secondaryColor || branding?.secondaryColor || '#f59e0b')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleSaveDomain = async () => {
    if (!domainInput.trim()) { show('Domain required', 'error'); return }
    setSaving(true)
    try { await TenantSettingsAPI.configureDomain(domainInput); show('Domain saved!'); load() }
    catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <Skeleton rows={4} />
  if (error) return <ApiError message={error} onRetry={load} />

  return (
    <div className="space-y-4 max-w-2xl">
      <Toast />
      <div>
        <h1 className="text-xl font-black text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400">Portal configuration & branding</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl no-scrollbar overflow-x-auto">
        {['branding', 'domain', 'usage'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-1.5 text-sm font-bold rounded-xl capitalize transition-all ${tab === t ? 'text-white shadow-sm' : 'text-gray-500'}`}
            style={tab === t ? { background: 'var(--primary)' } : {}}>{t}</button>
        ))}
      </div>

      {tab === 'branding' && (
        <div className="space-y-4">
          {/* Current branding info */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-sm font-bold text-gray-700 mb-4">Portal Branding</h2>
            <div className="bg-gray-50 rounded-2xl p-3 text-xs font-semibold text-gray-600 mb-4 space-y-1">
              <p className="flex items-center gap-1.5"><Building className="w-3.5 h-3.5 text-gray-400" /> Portal: <strong>{config?.tenant?.name || '—'}</strong></p>
              <p className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5 text-gray-400" /> Domain: <code className="text-xs font-mono">{config?.tenant?.slug}.madiyayu.com</code></p>
            </div>

            {/* Logo */}
            <div className="flex items-center gap-4 mb-4 p-4 rounded-2xl" style={{ background: 'var(--primary-lighter)' }}>
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md flex items-center justify-center"
                style={{ background: 'var(--primary)' }}>
                {branding?.logoUrl
                  ? <img src={branding.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                  : <span className="text-white text-2xl font-black">{(branding?.leaderName || 'L')[0]}</span>}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{branding?.leaderName || '—'}</p>
                <p className="text-xs text-gray-500">{branding?.tagline || '—'}</p>
                <label className="mt-2 block">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer" style={{ background: 'var(--primary)', color: 'white' }}>
                    Change Logo
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]
                    if (f) setLogoFile(f)
                  }} />
                </label>
                {logoFile && <p className="text-xs mt-1 font-semibold" style={{ color: 'var(--primary)' }}>{logoFile.name}</p>}
              </div>
            </div>

            {/* Color pickers */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Primary Color (Main theme color)</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer" />
                  <div className="flex gap-2">
                    {['#4f46e5', '#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#0ea5e9'].map(c => (
                      <button key={c} onClick={() => setPrimaryColor(c)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${primaryColor === c ? 'border-gray-400 scale-110' : 'border-white'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Secondary Color</label>
                <input type="color" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border-2 border-gray-200 cursor-pointer" />
              </div>
            </div>

            <p className="text-[10px] text-gray-600 mt-3 bg-yellow-50 p-3 rounded-xl flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-yellow-600 shrink-0 mt-0.5" />
              <span>Color changes are applied via <strong>Settings → Tenant Branding</strong> in the backend. Contact Super Admin to save permanently.</span>
            </p>
          </div>
        </div>
      )}

      {tab === 'domain' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700">Custom Domain</h2>
          <div className="bg-blue-50 rounded-2xl p-3 text-xs text-blue-700 font-semibold">
            Current: <code className="font-mono">{config?.tenant?.slug}.madiyayu.com</code>
          </div>
          {domain?.customDomain && (
            <div className={`p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 ${domain.isVerified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
              {domain.isVerified ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" /> : <Hourglass className="w-4 h-4 text-yellow-600 shrink-0" />}
              <span>{domain.customDomain} — {domain.isVerified ? 'Verified' : 'Pending DNS verification'}</span>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Custom Domain</label>
            <input value={domainInput} onChange={e => setDomainInput(e.target.value)} placeholder="yourdomain.com"
              className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
          </div>
          <div className="bg-yellow-50 rounded-2xl p-3 text-xs text-yellow-700">
            <p className="font-bold mb-1">DNS Setup:</p>
            <p>Add CNAME → <code className="font-mono">cname.madiyayu.com</code></p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSaveDomain} disabled={saving} className="btn-primary flex-1 h-10 text-sm disabled:opacity-70">{saving ? 'Saving...' : 'Save Domain'}</button>
            {domain?.customDomain && (
              <>
                <button onClick={() => TenantSettingsAPI.verifyDomain().then(() => show('Verification initiated!')).catch(e => show(e.message, 'error'))}
                  className="flex-1 h-10 border text-sm font-bold rounded-2xl" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Verify DNS</button>
                <button onClick={() => TenantSettingsAPI.removeDomain().then(() => { show('Domain removed!'); load() }).catch(e => show(e.message, 'error'))}
                  className="h-10 px-3 border border-red-200 text-red-500 text-xs font-bold rounded-xl">Remove</button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === 'usage' && (
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Plan Usage</h2>
          {usage ? (
            <div className="space-y-4">
              {[['Users', usage.users?.used, usage.users?.limit, 'var(--primary)'],
              ['Storage (MB)', usage.storage?.used, usage.storage?.limit, '#22c55e'],
              ['Notifications', usage.notifications?.used, usage.notifications?.limit, '#8b5cf6'],
              ['API Calls', usage.apiCalls?.used, usage.apiCalls?.limit, '#f59e0b'],
              ].map(([label, used, limit, color]) => {
                const pct = limit > 0 ? Math.round(((used || 0) / limit) * 100) : 0
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
                      <span>{label}</span>
                      <span>{(used || 0).toLocaleString()} / {(limit || '∞').toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
                    </div>
                    <p className={`text-[10px] mt-0.5 ${pct > 90 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>{pct}% used</p>
                  </div>
                )
              })}
              {usage.plan && (
                <div className="rounded-2xl p-3 mt-2" style={{ background: 'var(--primary-light)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--primary)' }}>Current Plan: {usage.plan?.name || '—'}</p>
                  {usage.expiresAt && <p className="text-[10px] text-gray-500 mt-0.5">Expires: {new Date(usage.expiresAt).toLocaleDateString('en-IN')}</p>}
                </div>
              )}
            </div>
          ) : <p className="text-sm text-gray-400 text-center py-6">No usage data available</p>}
        </div>
      )}
    </div>
  )
}
