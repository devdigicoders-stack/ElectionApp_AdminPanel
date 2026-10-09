import { useState, useEffect } from 'react'
import {
  Building,
  Link2,
  CheckCircle2,
  Hourglass,
  Info,
  AlertTriangle,
  Copy,
  Check,
  Globe,
  RefreshCw,
  Layers,
  Users,
  HardDrive,
  UserCheck,
  Image as ImageIcon,
  Bell,
  Sparkles,
  ShieldCheck,
  XCircle,
  FileText,
  Lock,
  UploadCloud,
  Palette,
  Save,
} from 'lucide-react'
import { TenantSettingsAPI, ConfigAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { useBranding } from '../../context/BrandingContext'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const resolveImg = (url) => {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url
  return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
}

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
  const [savingBranding, setSavingBranding] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [copiedKey, setCopiedKey] = useState(null)

  // Editable branding states
  const [leaderName, setLeaderName] = useState('')
  const [tagline, setTagline] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#a8150b')
  const [secondaryColor, setSecondaryColor] = useState('#f59e0b')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [loginBgUrl, setLoginBgUrl] = useState('')
  const [loginBgFile, setLoginBgFile] = useState(null)
  const [loginBgPreview, setLoginBgPreview] = useState('')

  // Legal & policy states
  const [privacyPolicyContent, setPrivacyPolicyContent] = useState('')
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState('')
  const [termsContent, setTermsContent] = useState('')
  const [termsUrl, setTermsUrl] = useState('')

  const copyToClipboard = (text, key) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    show('Copied to clipboard!', 'success')
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [cfgRes, domRes, usgRes, brandRes] = await Promise.all([
        ConfigAPI.getConfig().catch(() => null),
        TenantSettingsAPI.getDomainStatus().catch(() => null),
        TenantSettingsAPI.getUsage().catch(() => null),
        TenantSettingsAPI.getBranding().catch(() => null),
      ])

      const cfgData = cfgRes?.data ?? cfgRes
      const domData = domRes?.data ?? domRes
      const usgData = usgRes?.data ?? usgRes
      const brandData = brandRes?.data ?? brandRes ?? cfgData?.branding ?? {}

      setConfig(cfgData)
      setDomain(domData)
      setDomainInput(domData?.configuredDomain || domData?.customDomain || '')
      setUsage(usgData)

      // Sync form fields from backend branding
      setLeaderName(brandData?.leaderName || cfgData?.branding?.leaderName || '')
      setTagline(brandData?.tagline || cfgData?.branding?.tagline || '')
      setPrimaryColor(brandData?.primaryColor || cfgData?.branding?.primaryColor || '#a8150b')
      setSecondaryColor(brandData?.secondaryColor || cfgData?.branding?.secondaryColor || '#f59e0b')
      setLogoUrl(brandData?.logoUrl || brandData?.logo || cfgData?.branding?.logoUrl || '')
      setLogoPreview(brandData?.logoUrl || brandData?.logo || cfgData?.branding?.logoUrl || '')
      setLoginBgUrl(brandData?.loginBgUrl || '')
      setLoginBgPreview(brandData?.loginBgUrl || '')
      setPrivacyPolicyContent(brandData?.privacyPolicyContent || '')
      setPrivacyPolicyUrl(brandData?.privacyPolicyUrl || '')
      setTermsContent(brandData?.termsContent || '')
      setTermsUrl(brandData?.termsUrl || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  // ── SAVE BRANDING & CUSTOMIZATION ──────────────────────────
  const handleSaveBranding = async () => {
    setSavingBranding(true)
    try {
      let finalLogoUrl = logoUrl
      let finalLoginBgUrl = loginBgUrl

      // Upload logo if new file chosen
      if (logoFile) {
        const uploadRes = await UploadAPI.uploadFiles('branding', logoFile)
        if (uploadRes?.urls?.[0]) {
          finalLogoUrl = uploadRes.urls[0]
          setLogoUrl(finalLogoUrl)
        }
      }

      // Upload login background if new file chosen
      if (loginBgFile) {
        const uploadRes = await UploadAPI.uploadFiles('branding', loginBgFile)
        if (uploadRes?.urls?.[0]) {
          finalLoginBgUrl = uploadRes.urls[0]
          setLoginBgUrl(finalLoginBgUrl)
        }
      }

      const payload = {
        leaderName: leaderName.trim(),
        tagline: tagline.trim(),
        primaryColor,
        secondaryColor,
        logoUrl: finalLogoUrl,
        logo: finalLogoUrl,
        loginBgUrl: finalLoginBgUrl,
        privacyPolicyContent: privacyPolicyContent.trim(),
        privacyPolicyUrl: privacyPolicyUrl.trim(),
        termsContent: termsContent.trim(),
        termsUrl: termsUrl.trim(),
      }

      await TenantSettingsAPI.updateBranding(payload)
      show('Settings and branding saved successfully!', 'success')

      // Reload global branding context so colors & logo update immediately across PWA
      if (reloadBranding) {
        await reloadBranding()
      }
      setLogoFile(null)
      setLoginBgFile(null)
      await load()
    } catch (e) {
      show(e.message || 'Failed to save settings', 'error')
    } finally {
      setSavingBranding(false)
    }
  }

  // ── DOMAIN ACTIONS ─────────────────────────────────────────
  const handleSaveDomain = async () => {
    if (!domainInput.trim()) {
      show('Please enter a domain name', 'error')
      return
    }
    setSaving(true)
    try {
      await TenantSettingsAPI.configureDomain(domainInput.trim())
      show('Custom domain saved successfully!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to save domain', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyDomain = async () => {
    setVerifying(true)
    try {
      const res = await TenantSettingsAPI.verifyDomain()
      const data = res?.data ?? res
      if (data?.isVerified) {
        show('DNS verification successful! Domain is active.')
      } else {
        show('DNS check completed. Records still propagating.', 'info')
      }
      await load()
    } catch (e) {
      show(e.message || 'Verification failed', 'error')
    } finally {
      setVerifying(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!window.confirm('Are you sure you want to disconnect this custom domain?')) return
    setSaving(true)
    try {
      await TenantSettingsAPI.removeDomain()
      show('Domain disconnected successfully!')
      setDomainInput('')
      await load()
    } catch (e) {
      show(e.message || 'Failed to remove domain', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  const metrics = usage?.metrics || {}

  return (
    <div className="space-y-5 max-w-4xl pb-16">
      <Toast />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
            Settings &amp; PWA Customization
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
            Manage PWA theme colors, logo, login screen, policies, custom domain &amp; quota
          </p>
        </div>
        <button
          onClick={load}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 bg-gray-100/80 p-1.5 rounded-2xl no-scrollbar overflow-x-auto">
        {[
          { id: 'branding', label: 'Theme & Branding', icon: Palette },
          { id: 'login_legal', label: 'Privacy & Policy', icon: FileText },
          { id: 'domain', label: 'Custom Domain', icon: Globe },
          { id: 'usage', label: 'Plan & Usage', icon: Layers },
        ].map((t) => {
          const Icon = t.icon
          const isActive = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 shrink-0 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
              style={isActive ? { background: 'var(--primary)' } : {}}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* ========================================================= */}
      {/* TAB 1: THEME & BRANDING                                   */}
      {/* ========================================================= */}
      {tab === 'branding' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800">PWA Theme &amp; Identity</h2>
                <p className="text-xs text-gray-400">Change theme colors, leader title and logo for citizen app &amp; admin</p>
              </div>
              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                <Save className="w-4 h-4" />
                <span>{savingBranding ? 'Saving...' : 'Save Branding'}</span>
              </button>
            </div>

            {/* Portal Metadata Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-2 text-gray-700">
                <Building className="w-4 h-4 text-gray-400 shrink-0" />
                <span>Organization: <strong>{config?.tenant?.name || '—'}</strong></span>
              </div>
              <div className="flex items-center justify-between text-gray-700">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-gray-400 shrink-0" />
                  <span>Subdomain: <code className="font-mono font-bold text-blue-700">{config?.tenant?.slug}.madiyayu.com</code></span>
                </div>
                <button
                  onClick={() => copyToClipboard(`https://${config?.tenant?.slug}.madiyayu.com`, 'subdomain')}
                  className="text-gray-400 hover:text-gray-800"
                  title="Copy URL"
                >
                  {copiedKey === 'subdomain' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Leader Name & Tagline Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Leader / Admin Name</label>
                <input
                  value={leaderName}
                  onChange={(e) => setLeaderName(e.target.value)}
                  placeholder="e.g. Narendra Modi / Shri Leader"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1.5 block">Portal Tagline / Slogan</label>
                <input
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Seva • Samarpan • Vikas"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
            </div>

            {/* Logo Customization */}
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <label className="text-xs font-bold text-gray-700 block">Portal Logo &amp; Avatar</label>
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div
                  className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md flex items-center justify-center shrink-0"
                  style={{ background: primaryColor }}
                >
                  {logoPreview ? (
                    <img src={resolveImg(logoPreview)} alt="Logo" className="w-full h-full object-contain p-1.5" />
                  ) : (
                    <span className="text-white text-3xl font-black">{(leaderName || 'L')[0]}</span>
                  )}
                </div>

                <div className="flex-1 space-y-2 w-full">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all" style={{ background: primaryColor }}>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Logo File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setLogoFile(file)
                            setLogoPreview(URL.createObjectURL(file))
                          }
                        }}
                      />
                    </label>
                    {logoFile && (
                      <span className="text-xs text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                        {logoFile.name}
                      </span>
                    )}
                  </div>
                  <div>
                    <input
                      value={logoUrl}
                      onChange={(e) => {
                        setLogoUrl(e.target.value)
                        setLogoPreview(e.target.value)
                      }}
                      placeholder="Or paste direct Image URL (https://...)"
                      className="w-full border border-gray-200 bg-white rounded-xl px-3.5 h-9 text-xs outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Primary & Secondary Color Pickers */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Primary Theme Color (Applied to buttons, header &amp; active tabs)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-11 h-11 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-28 font-mono text-xs uppercase font-bold border border-gray-200 rounded-xl px-3 h-10"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { hex: '#a8150b', label: 'Crimson' },
                      { hex: '#4f46e5', label: 'Indigo' },
                      { hex: '#f97316', label: 'Saffron' },
                      { hex: '#16a34a', label: 'Emerald' },
                      { hex: '#2563eb', label: 'Blue' },
                      { hex: '#9333ea', label: 'Purple' },
                      { hex: '#dc2626', label: 'Red' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setPrimaryColor(c.hex)}
                        className={`w-7 h-7 rounded-lg border-2 transition-transform ${
                          primaryColor.toLowerCase() === c.hex.toLowerCase() ? 'scale-115 border-gray-800 shadow-sm' : 'border-white'
                        }`}
                        style={{ background: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Secondary Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-11 h-11 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                  />
                  <input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-28 font-mono text-xs uppercase font-bold border border-gray-200 rounded-xl px-3 h-10"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                <Save className="w-4 h-4" />
                <span>{savingBranding ? 'Saving...' : 'Save Branding &amp; Apply Theme'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: LOGIN SCREEN & LEGAL POLICIES                      */}
      {/* ========================================================= */}
      {tab === 'login_legal' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800">Privacy &amp; Policy</h2>
                <p className="text-xs text-gray-400">Manage Privacy Policy &amp; Terms</p>
              </div>
              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                <Save className="w-4 h-4" />
                <span>{savingBranding ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

            {/* Privacy Policy */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Privacy Policy</span>
              </label>
              <div className="space-y-2">
                <input
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                  placeholder="External Privacy Policy Link (optional, e.g. https://yoursite.in/privacy)"
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-xs outline-none focus:border-[var(--primary)]"
                />
                <textarea
                  rows={4}
                  value={privacyPolicyContent}
                  onChange={(e) => setPrivacyPolicyContent(e.target.value)}
                  placeholder="Or write your Privacy Policy text/content directly here..."
                  className="w-full border border-gray-200 rounded-2xl p-3.5 text-xs outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t border-gray-100 pt-5 space-y-3">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Terms &amp; Conditions</span>
              </label>
              <div className="space-y-2">
                <input
                  value={termsUrl}
                  onChange={(e) => setTermsUrl(e.target.value)}
                  placeholder="External Terms & Conditions Link (optional, e.g. https://yoursite.in/terms)"
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-xs outline-none focus:border-[var(--primary)]"
                />
                <textarea
                  rows={4}
                  value={termsContent}
                  onChange={(e) => setTermsContent(e.target.value)}
                  placeholder="Or write your Terms and Conditions text/content directly here..."
                  className="w-full border border-gray-200 rounded-2xl p-3.5 text-xs outline-none focus:border-[var(--primary)]"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button
                onClick={handleSaveBranding}
                disabled={savingBranding}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white rounded-xl shadow-sm transition-all disabled:opacity-50"
                style={{ background: 'var(--primary)' }}
              >
                <Save className="w-4 h-4" />
                <span>{savingBranding ? 'Saving...' : 'Save Login &amp; Policy Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: CUSTOM DOMAIN                                      */}
      {/* ========================================================= */}
      {tab === 'domain' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-gray-800">Custom Domain &amp; DNS Routing</h2>
              <p className="text-xs text-gray-400">Connect your personal or political domain (e.g. yourname.in)</p>
            </div>
            {domain?.configuredDomain && (
              <span
                className={`px-3 py-1 text-xs font-extrabold rounded-full flex items-center gap-1.5 ${
                  domain.isVerified
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : domain.verificationStatus === 'failed'
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                {domain.isVerified ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                    <span>Active &amp; Verified</span>
                  </>
                ) : domain.verificationStatus === 'failed' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    <span>Verification Failed</span>
                  </>
                ) : (
                  <>
                    <Hourglass className="w-3.5 h-3.5 text-yellow-600" />
                    <span>Pending DNS Setup</span>
                  </>
                )}
              </span>
            )}
          </div>

          {/* Current Domain Card */}
          {domain?.configuredDomain ? (
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Configured Domain</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Globe className="w-4 h-4 text-gray-600" />
                    <span className="text-base font-black text-gray-800">{domain.configuredDomain}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleVerifyDomain}
                    disabled={verifying}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all text-white disabled:opacity-60"
                    style={{ background: 'var(--primary)' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${verifying ? 'animate-spin' : ''}`} />
                    <span>{verifying ? 'Checking DNS...' : 'Verify DNS Now'}</span>
                  </button>
                  <button
                    onClick={handleRemoveDomain}
                    disabled={saving}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {domain.failureReason && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start gap-2 mt-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <div>
                    <strong className="block">DNS Check Issue:</strong>
                    <span>{domain.failureReason}</span>
                  </div>
                </div>
              )}

              {domain.verifiedAt && (
                <p className="text-[11px] text-gray-400">
                  Verified on {new Date(domain.verifiedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
              <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <p className="font-bold">No Custom Domain Connected Yet</p>
                <p className="text-blue-700/80 mt-0.5">
                  Your platform is currently served on <code className="font-bold">{config?.tenant?.slug}.madiyayu.com</code>. You can attach your custom domain below.
                </p>
              </div>
            </div>
          )}

          {/* Domain Input Form */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 block">
              {domain?.configuredDomain ? 'Change Custom Domain' : 'Enter Custom Domain'}
            </label>
            <div className="flex gap-2">
              <input
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                placeholder="e.g. leadername.in or www.leadername.in"
                className="flex-1 border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              />
              <button
                onClick={handleSaveDomain}
                disabled={saving || !domainInput.trim()}
                className="px-5 h-11 text-xs font-bold text-white rounded-2xl disabled:opacity-50 transition-all shadow-sm"
                style={{ background: 'var(--primary)' }}
              >
                {saving ? 'Saving...' : 'Save Domain'}
              </button>
            </div>
          </div>

          {/* DNS Configuration Instructions */}
          <div className="border-t border-gray-100 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              DNS Configuration Instructions
            </h3>
            <p className="text-xs text-gray-500">
              Log in to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.) and add the following DNS records:
            </p>

            {/* Target CNAME Record */}
            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">1. CNAME Routing Record</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold">Routing</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="bg-white p-2 rounded-xl border border-gray-200">
                  <span className="text-gray-400 block text-[9px] uppercase font-sans">Type</span>
                  <strong>CNAME</strong>
                </div>
                <div className="bg-white p-2 rounded-xl border border-gray-200 flex items-center justify-between">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase font-sans">Points To</span>
                    <strong>{domain?.targetCname || 'cname.madiyayu.com'}</strong>
                  </div>
                  <button
                    onClick={() => copyToClipboard(domain?.targetCname || 'cname.madiyayu.com', 'cname')}
                    className="p-1 text-gray-500 hover:text-gray-900"
                    title="Copy CNAME"
                  >
                    {copiedKey === 'cname' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* TXT Challenge Token if available */}
            {domain?.verificationToken && (
              <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700">2. TXT Verification Record</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold">Ownership Challenge</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-white p-2 rounded-xl border border-gray-200">
                    <span className="text-gray-400 block text-[9px] uppercase font-sans">Record Name / Host</span>
                    <strong>_madiyayu-challenge</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 block text-[9px] uppercase font-sans">TXT Value</span>
                      <strong className="truncate max-w-[150px] inline-block">{domain.verificationToken}</strong>
                    </div>
                    <button
                      onClick={() => copyToClipboard(domain.verificationToken, 'txt')}
                      className="p-1 text-gray-500 hover:text-gray-900"
                      title="Copy TXT Value"
                    >
                      {copiedKey === 'txt' ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DNS Records Table from Backend */}
            {domain?.dnsRecords?.length > 0 && (
              <div className="rounded-2xl border border-gray-200 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">
                    <tr>
                      <th className="p-3">Type</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-mono text-[11px]">
                    {domain.dnsRecords.map((r, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{r.type}</td>
                        <td className="p-3 text-gray-600">{r.name}</td>
                        <td className="p-3 text-gray-800 truncate max-w-[160px]">{r.value}</td>
                        <td className="p-3 font-sans text-gray-500">{r.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: PLAN & QUOTA USAGE                                 */}
      {/* ========================================================= */}
      {tab === 'usage' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          {/* Plan Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-md">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400 block">
                Subscription Plan
              </span>
              <h2 className="text-xl font-black mt-0.5">
                {usage?.plan?.name || 'Political Growth Plan'}
              </h2>
              <p className="text-xs text-gray-300 mt-1">
                Status: <span className="text-green-400 font-bold capitalize">{usage?.overallStatus || 'Normal'}</span> • Quota resets on the 1st of every month
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-semibold text-gray-400 block">Billing Tier</span>
              <span className="text-lg font-black text-white">
                {usage?.plan?.price ? `₹${usage.plan.price.toLocaleString('en-IN')}` : 'Active / Managed'}
              </span>
            </div>
          </div>

          {/* Proactive Quota Alerts if any */}
          {usage?.alerts?.length > 0 && (
            <div className="space-y-2">
              {usage.alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs border border-red-200 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span className="font-semibold">{alert}</span>
                </div>
              ))}
            </div>
          )}

          {/* All 5 Live Backend Metrics */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Resource Consumption &amp; Quotas
            </h3>

            {[
              {
                label: 'Registered Citizens',
                icon: Users,
                color: 'var(--primary)',
                metric: metrics.citizens,
                formattedUsed: (metrics.citizens?.used || 0).toLocaleString(),
                formattedLimit: metrics.citizens?.limit === -1 || !metrics.citizens?.limit ? 'Unlimited' : metrics.citizens?.limit.toLocaleString(),
                pct: metrics.citizens?.percentUsed || 0,
              },
              {
                label: 'Cloud Storage',
                icon: HardDrive,
                color: '#22c55e',
                metric: metrics.storageMB,
                formattedUsed: metrics.storageMB?.formattedUsed || `${metrics.storageMB?.used || 0} MB`,
                formattedLimit: metrics.storageMB?.formattedLimit || 'Unlimited',
                pct: metrics.storageMB?.percentUsed || 0,
              },
              {
                label: 'Staff & Sub-Admin Accounts',
                icon: UserCheck,
                color: '#3b82f6',
                metric: metrics.staffUsers,
                formattedUsed: (metrics.staffUsers?.used || 0).toLocaleString(),
                formattedLimit: metrics.staffUsers?.limit === -1 || !metrics.staffUsers?.limit ? 'Unlimited' : metrics.staffUsers?.limit.toLocaleString(),
                pct: metrics.staffUsers?.percentUsed || 0,
              },
              {
                label: 'Posters Generated (This Month)',
                icon: ImageIcon,
                color: '#ec4899',
                metric: metrics.postersThisMonth,
                formattedUsed: (metrics.postersThisMonth?.used || 0).toLocaleString(),
                formattedLimit: metrics.postersThisMonth?.limit === -1 || !metrics.postersThisMonth?.limit ? 'Unlimited' : metrics.postersThisMonth?.limit.toLocaleString(),
                pct: metrics.postersThisMonth?.percentUsed || 0,
              },
              {
                label: 'Broadcast Notifications (This Month)',
                icon: Bell,
                color: '#f59e0b',
                metric: metrics.notificationsThisMonth,
                formattedUsed: (metrics.notificationsThisMonth?.used || 0).toLocaleString(),
                formattedLimit: metrics.notificationsThisMonth?.limit === -1 || !metrics.notificationsThisMonth?.limit ? 'Unlimited' : metrics.notificationsThisMonth?.limit.toLocaleString(),
                pct: metrics.notificationsThisMonth?.percentUsed || 0,
              },
            ].map((item) => {
              const Icon = item.icon
              const isWarning = item.pct > 80
              const isRestricted = item.pct >= 100
              return (
                <div key={item.label} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-500" />
                      {item.label}
                    </span>
                    <span className="font-mono text-gray-600 font-semibold">
                      {item.formattedUsed} / {item.formattedLimit}
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(item.pct, 100)}%`,
                        background: isRestricted ? '#ef4444' : isWarning ? '#f59e0b' : item.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span>
                      {item.metric?.remaining === 'unlimited' ? 'No limit enforced' : `${item.metric?.remaining ?? '—'} remaining`}
                    </span>
                    <span className={`font-bold ${isRestricted ? 'text-red-500' : isWarning ? 'text-amber-600' : 'text-gray-500'}`}>
                      {item.pct}% quota utilized
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
