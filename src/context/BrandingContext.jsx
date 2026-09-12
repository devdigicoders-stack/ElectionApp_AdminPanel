import { createContext, useContext, useState, useEffect } from 'react'
import { ConfigAPI, BASE_URL } from '../api/adminApis'

const BrandingContext = createContext(null)

export const resolveBrandingUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.trim()) return null
  const trimmed = url.trim()
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }
  const cleanBase = (BASE_URL || '').replace(/\/+$/, '')
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${cleanBase}${cleanPath}`
}

export const normalizeBranding = (b) => {
  if (!b) return b
  const logo = resolveBrandingUrl(b.logoUrl || b.logo)
  return {
    ...b,
    logoUrl: logo,
    logo: logo,
    leaderPhotoUrl: resolveBrandingUrl(b.leaderPhotoUrl),
    faviconUrl: resolveBrandingUrl(b.faviconUrl),
    pwaIconUrl: resolveBrandingUrl(b.pwaIconUrl),
    loginBgUrl: resolveBrandingUrl(b.loginBgUrl),
  }
}

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
// Apply CSS variables to :root, dynamic favicon and title
function applyTheme(branding, tenant) {
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

  // ✅ 1. Update Favicon dynamically: priority faviconUrl > logoUrl > logo
  const iconRaw = branding?.faviconUrl || branding?.logoUrl || branding?.logo
  if (iconRaw) {
    const fullFavicon = resolveBrandingUrl(iconRaw)
    if (fullFavicon) {
      let link = document.querySelector("link[rel~='icon']")
      if (!link) {
        link = document.createElement('link')
        link.rel = 'icon'
        document.head.appendChild(link)
      }
      link.href = fullFavicon
    }
  }

  // ✅ 2. Update Page Title dynamically
  const tenantName =
    tenant?.title ||
    tenant?.name ||
    branding?.platformName ||
    branding?.title ||
    branding?.leaderName ||
    'Leader'
  document.title = `${tenantName} — Admin Panel`
}

export function BrandingProvider({ children }) {
  // Read cached branding immediately to prevent color flash
  const [branding, setBranding] = useState(() => {
    try {
      const cached = localStorage.getItem('app_branding')
      const cachedTenant = localStorage.getItem('app_tenant')
      if (cached) {
        const parsed = normalizeBranding(JSON.parse(cached))
        const parsedTenant = cachedTenant ? JSON.parse(cachedTenant) : null
        applyTheme(parsed, parsedTenant)
        return parsed
      }
    } catch {}
    applyTheme(DEFAULT_BRANDING, null)
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
      if (urlTenant && urlTenant.trim()) {
        const clean = urlTenant.trim().toLowerCase()
        const prev = localStorage.getItem('tenant_slug')
        if (prev !== clean) {
          localStorage.setItem('tenant_slug', clean)
          localStorage.removeItem('app_branding')
          localStorage.removeItem('app_tenant')
        }
      }
    }
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      const res    = await ConfigAPI.getConfig()
      const data   = res?.data ?? res
      const rawBrand = { ...DEFAULT_BRANDING, ...(data?.branding || {}) }
      const brand  = normalizeBranding(rawBrand)
      const currentTenant = data?.tenant || null

      setBranding(brand)
      setTenant(currentTenant)
      setFeatures(data?.enabledFeatures || [])
      applyTheme(brand, currentTenant)

      // Cache in localStorage for offline/fast load
      localStorage.setItem('app_branding', JSON.stringify(brand))
      if (currentTenant) {
        localStorage.setItem('app_tenant', JSON.stringify(currentTenant))
        if (currentTenant.slug) {
          localStorage.setItem('tenant_slug', currentTenant.slug)
        }
      }
    } catch {
      // Use cached branding if API fails
      const cached = localStorage.getItem('app_branding')
      const cachedTenant = localStorage.getItem('app_tenant')
      if (cached) {
        const brand = normalizeBranding(JSON.parse(cached))
        const t = cachedTenant ? JSON.parse(cachedTenant) : null
        setBranding(brand)
        applyTheme(brand, t)
      } else {
        applyTheme(DEFAULT_BRANDING, null)
      }
    } finally {
      setLoading(false)
    }
  }

  const isFeatureEnabled = (key) => {
    if (!key) return true
    if (!features || features.length === 0) return true
    if (key === 'news') {
      const match = features.find(f => f.key === 'news')
      return match ? match.isEnabled !== false : true
    }
    return features.some(f => f.key === key)
  }

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
