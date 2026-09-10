import { createContext, useContext, useState, useEffect } from 'react'
import { ConfigAPI } from '../api/adminApis'

const BrandingContext = createContext(null)

// Default fallback branding
const DEFAULT_BRANDING = {
  primaryColor:   '#4f46e5',
  secondaryColor: '#f59e0b',
  logoUrl:        null,
  leaderPhotoUrl: null,
  faviconUrl:     null,
  pwaIconUrl:     null,
  leaderName:     'Leader Admin',
  tagline:        'Manage • Connect • Serve',
}

// Convert hex to RGB safely
function hexToRgb(hex) {
  if (!hex) return '79, 70, 229'
  let clean = String(hex).replace('#', '').trim()
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('')
  }
  const r = parseInt(clean.slice(0, 2), 16) || 79
  const g = parseInt(clean.slice(2, 4), 16) || 70
  const b = parseInt(clean.slice(4, 6), 16) || 229
  return `${r}, ${g}, ${b}`
}

// Apply CSS variables to :root
function applyTheme(branding) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const primary   = branding?.primaryColor   || DEFAULT_BRANDING.primaryColor
  const secondary = branding?.secondaryColor || DEFAULT_BRANDING.secondaryColor

  const primaryRgb = hexToRgb(primary)
  const secondaryRgb = hexToRgb(secondary)

  root.style.setProperty('--primary',         primary)
  root.style.setProperty('--primary-rgb',     primaryRgb)
  root.style.setProperty('--secondary',       secondary)
  root.style.setProperty('--secondary-rgb',   secondaryRgb)

  // Light/dark variants auto-generate
  root.style.setProperty('--primary-light',   `rgba(${primaryRgb}, 0.12)`)
  root.style.setProperty('--primary-lighter', `rgba(${primaryRgb}, 0.06)`)
  root.style.setProperty('--secondary-light', `rgba(${secondaryRgb}, 0.12)`)

  // Update favicon if available
  if (branding?.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = branding.faviconUrl
  }

  // Update page title
  if (branding?.leaderName) {
    document.title = `${branding.leaderName} — Admin Panel`
  }
}

export function BrandingProvider({ children }) {
  // Read cached branding immediately to prevent color flash
  const [branding, setBranding] = useState(() => {
    try {
      const cached = localStorage.getItem('app_branding')
      if (cached) {
        const parsed = JSON.parse(cached)
        applyTheme(parsed)
        return parsed
      }
    } catch {}
    applyTheme(DEFAULT_BRANDING)
    return DEFAULT_BRANDING
  })

  const [tenant,   setTenant]   = useState(() => {
    try {
      const cached = localStorage.getItem('app_tenant')
      if (cached) return JSON.parse(cached)
    } catch {}
    return null
  })
  const [features, setFeatures] = useState([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    // Check if ?tenant=slug is in the URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlTenant = params.get('tenant')
      if (urlTenant) {
        localStorage.setItem('tenant_slug', urlTenant)
      }
    }
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res    = await ConfigAPI.getConfig()
      const data   = res?.data ?? res
      const brand  = { ...DEFAULT_BRANDING, ...(data?.branding || {}) }

      setBranding(brand)
      setTenant(data?.tenant || null)
      setFeatures(data?.enabledFeatures || [])
      applyTheme(brand)

      // Cache in localStorage for offline/fast load
      localStorage.setItem('app_branding', JSON.stringify(brand))
      localStorage.setItem('app_tenant',   JSON.stringify(data?.tenant || {}))
      if (data?.tenant?.slug) {
        localStorage.setItem('tenant_slug', data.tenant.slug)
      }
    } catch {
      // Use cached branding if API fails
      const cached = localStorage.getItem('app_branding')
      if (cached) {
        const brand = JSON.parse(cached)
        setBranding(brand)
        applyTheme(brand)
      } else {
        applyTheme(DEFAULT_BRANDING)
      }
    } finally {
      setLoading(false)
    }
  }

  const isFeatureEnabled = (key) => features.some(f => f.key === key)

  return (
    <BrandingContext.Provider value={{ branding, tenant, features, loading, isFeatureEnabled, reload: loadConfig }}>
      {children}
    </BrandingContext.Provider>
  )
}

export function useBranding() {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used inside BrandingProvider')
  return ctx
}
