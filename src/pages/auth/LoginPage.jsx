import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthAPI } from '../../api/adminApis'
import { useBranding, resolveBrandingUrl } from '../../context/BrandingContext'

function PartySymbolIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Center Saffron Petal */}
      <path d="M32 10C32 10 26 23 32 37C38 23 32 10 32 10Z" fill="#FF671F" />
      {/* Left Petal */}
      <path d="M32 19C28 19 18 24 18 35C22 37 28 35 32 31C29 26 30 21 32 19Z" fill="#FF7824" />
      {/* Right Petal */}
      <path d="M32 19C36 19 46 24 46 35C42 37 36 35 32 31C35 26 34 21 32 19Z" fill="#FF7824" />
      {/* Far Left Petal */}
      <path d="M21 33C15 35 12 39 12 43C17 43 23 41 26 38C24 36 22 34 21 33Z" fill="#FF9933" />
      {/* Far Right Petal */}
      <path d="M43 33C49 35 52 39 52 43C47 43 41 41 38 38C40 36 42 34 43 33Z" fill="#FF9933" />
      {/* Green Stem & Leaves */}
      <path d="M20 43C26 41 38 41 44 43C42 46 38 47 32 47C26 47 22 46 20 43Z" fill="#046A38" />
      <path d="M30 47H34V53H30V47Z" fill="#046A38" />
      <path d="M25 53H39V55H25V53Z" fill="#046A38" />
    </svg>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { branding } = useBranding()

  const [form, setForm] = useState(() => ({
    email: localStorage.getItem('remember_admin_email') || '',
    password: ''
  }))
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  // ── Password Login ──────────────────────────────────────
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Email aur password dono bharein')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await AuthAPI.adminLogin(form.email, form.password)
      const token = res?.data?.token || res?.token || res?.access_token
      const user = res?.data?.admin || res?.admin || res?.user || { email: form.email, name: 'Admin', role: 'admin' }

      localStorage.setItem('admin_token', token)
      localStorage.setItem('admin_user', JSON.stringify(user))

      const tenantInfo = res?.data?.tenant || res?.tenant
      if (tenantInfo?.slug) {
        localStorage.setItem('tenant_slug', tenantInfo.slug)
        localStorage.setItem('app_tenant', JSON.stringify(tenantInfo))
        if (tenantInfo.branding) {
          localStorage.setItem('app_branding', JSON.stringify(tenantInfo.branding))
        }
      }

      if (rememberMe) {
        localStorage.setItem('remember_admin_email', form.email)
      } else {
        localStorage.removeItem('remember_admin_email')
      }

      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed. Check credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-white sm:bg-slate-100 flex flex-col justify-center items-center sm:p-6 font-sans">
      {/* Mobile Card Container - Edge-to-Edge on Mobile, Centered Card on Desktop */}
      <div className="w-full sm:max-w-[420px] bg-white sm:rounded-3xl sm:shadow-2xl overflow-hidden flex flex-col min-h-screen sm:min-h-0 sm:border sm:border-slate-100">
        
        {/* Top Hero Banner with Leader Photo from public/image.png */}
        <div className="relative w-full h-64 sm:h-72 overflow-hidden bg-slate-900">
          <img
            src={resolveBrandingUrl(branding?.loginBgUrl) || '/image.png'}
            alt="Leader"
            className="w-full h-full object-cover object-top block"
            onError={(e) => {
              if (e.currentTarget.src !== '/image.png') {
                e.currentTarget.src = '/image.png'
              } else {
                e.currentTarget.style.opacity = '0.7'
              }
            }}
          />
          {/* Subtle top shade & Bottom seamless white gradient blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
        </div>

        {/* Center Circular Badge (Leader / Party Symbol) */}
        <div className="relative z-10 flex justify-center -mt-12">
          <div
            className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-white shadow-xl flex items-center justify-center p-1 ring-4 ring-white/80"
            style={{ border: '2.5px solid var(--secondary)' }}
          >
            {resolveBrandingUrl(branding?.logoUrl) ? (
              <img
                src={resolveBrandingUrl(branding?.logoUrl)}
                alt="Logo"
                className="w-full h-full object-contain rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.login-symbol-fallback');
                  if (fallback) fallback.style.display = 'block';
                }}
              />
            ) : null}
            <div
              className="login-symbol-fallback"
              style={{ display: resolveBrandingUrl(branding?.logoUrl) ? 'none' : 'block' }}
            >
              <PartySymbolIcon />
            </div>
          </div>
        </div>

        {/* Title & Tagline */}
        <div className="text-center px-6 mt-3">
          <h1 className="text-2xl sm:text-[26px] font-black tracking-tight" style={{ color: 'var(--primary)' }}>
            {branding?.leaderName || 'Leader Admin'}
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-400 mt-1 tracking-wide">
            {branding?.tagline || 'Manage • Connect • Serve'}
          </p>
        </div>

        {/* Main Content & Login Form */}
        <div className="px-6 pt-6 pb-6 flex-1 flex flex-col">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs sm:text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2 shadow-xs">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handlePasswordLogin} className="space-y-4">
            {/* Mobile / Email Input - BORDER NONE */}
            <div
              className="flex items-center bg-[#f3f4f8] rounded-2xl px-4 py-3.5 gap-3 transition-all focus-within:bg-[#eef2f8]"
              style={{ border: 'none', outline: 'none' }}
            >
              {/* Phone / Device Icon */}
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <input
                type="text"
                placeholder="Mobile Number or Email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                required
              />
            </div>

            {/* Password Input - BORDER NONE */}
            <div
              className="flex items-center bg-[#f3f4f8] rounded-2xl px-4 py-3.5 gap-3 transition-all focus-within:bg-[#eef2f8]"
              style={{ border: 'none', outline: 'none' }}
            >
              {/* Lock Icon */}
              <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="flex-1 bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-400"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                required
              />
              {/* Show/Hide Toggle */}
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label="Toggle password visibility"
              >
                {showPass ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                />
                <span>Remember me</span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-60 border-0"
              style={{
                background: `linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000))`,
                boxShadow: `0 8px 20px 0 rgba(var(--primary-rgb), 0.30)`,
                border: 'none',
              }}
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          {/* Compliance & Security Footer */}
          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] font-medium text-slate-400 leading-relaxed">
              Private Campaign Management Portal
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Authorized personnel only • Not affiliated with any Government Election Authority
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

