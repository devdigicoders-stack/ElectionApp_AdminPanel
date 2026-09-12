import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import { onMessageListener, requestNotificationPermission } from '../firebase'
import {
  Home,
  AlertTriangle,
  Users,
  BarChart2,
  Menu as MenuIcon,
  CreditCard,
  Star,
  HardHat,
  Calendar,
  BarChart3,
  Newspaper,
  Image as ImageIcon,
  Film,
  FileText,
  Flag,
  Bell,
  Palette,
  MapPin,
  User,
  LayoutTemplate,
  ClipboardList,
  Shield,
  TrendingUp,
  Settings,
  LogOut,
  UserCheck,
  Languages
} from 'lucide-react'
import { useBranding, resolveBrandingUrl } from '../context/BrandingContext'
import { useLanguage } from '../context/LanguageContext'

// ── ROLE-BASED ACCESS PERMISSION MAP ─────────────────────────
const ROLE_PERMITTED_PATHS = {
  owner: ['*'],
  leader: ['*'],
  admin: ['*'],
  super_admin: ['*'],

  content_manager: [
    '/dashboard',
    '/works',
    '/events',
    '/news',
    '/gallery',
    '/manifesto',
    '/banners',
    '/posters',
    '/notifications',
    '/homepage',
    '/leader-profile',
    '/menu',
  ],

  complaint_manager: [
    '/dashboard',
    '/complaints',
    '/notifications',
    '/menu',
  ],

  volunteer_manager: [
    '/dashboard',
    '/volunteers',
    '/membership',
    '/polls',
    '/notifications',
    '/menu',
  ],

  area_coordinator: [
    '/dashboard',
    '/users',
    '/complaints',
    '/works',
    '/events',
    '/notifications',
    '/menu',
  ],
  coordinator: [
    '/dashboard',
    '/users',
    '/complaints',
    '/works',
    '/events',
    '/notifications',
    '/menu',
  ],
}

function isPathAllowed(path, userRole) {
  const role = (userRole || 'admin').toLowerCase()
  const allowedList = ROLE_PERMITTED_PATHS[role] || ROLE_PERMITTED_PATHS.admin
  if (allowedList.includes('*')) return true
  const clean = path.split('?')[0].replace(/\/$/, '')
  if (clean === '/profile' || clean === '/leader-profile') return true
  return allowedList.some(p => clean === p || clean.startsWith(`${p}/`))
}

// ── ROLE-SPECIFIC BOTTOM NAVIGATION BARS ─────────────────────
const ROLE_BOTTOM_TABS = {
  admin: [
    { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/users', label: 'Citizens', icon: <Users className="w-5 h-5" /> },
    { path: '/analytics', label: 'Analytics', icon: <BarChart2 className="w-5 h-5" /> },
    { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
  ],
  content_manager: [
    { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/works', label: 'Works', icon: <HardHat className="w-5 h-5" /> },
    { path: '/banners', label: 'Banners', icon: <Flag className="w-5 h-5" /> },
    { path: '/gallery', label: 'Gallery', icon: <ImageIcon className="w-5 h-5" /> },
    { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
  ],
  complaint_manager: [
    { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/notifications', label: 'Notifs', icon: <Bell className="w-5 h-5" /> },
    { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
  ],
  volunteer_manager: [
    { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/volunteers', label: 'Volunteers', icon: <Star className="w-5 h-5" /> },
    { path: '/membership', label: 'Members', icon: <CreditCard className="w-5 h-5" /> },
    { path: '/polls', label: 'Polls', icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
  ],
  area_coordinator: [
    { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/users', label: 'Citizens', icon: <Users className="w-5 h-5" /> },
    { path: '/works', label: 'Works', icon: <HardHat className="w-5 h-5" /> },
    { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
  ],
  coordinator: [
    { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { path: '/complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
    { path: '/users', label: 'Citizens', icon: <Users className="w-5 h-5" /> },
    { path: '/works', label: 'Works', icon: <HardHat className="w-5 h-5" /> },
    { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
  ],
}

// ── ALL MASTER MENU ITEMS FOR DRAWER ─────────────────────────
const masterMenuSections = [
  {
    label: 'People', items: [
      { path: '/users', icon: <Users className="w-5 h-5" />, label: 'Citizens / Users' },
      { path: '/membership', icon: <CreditCard className="w-5 h-5" />, label: 'Membership', featureKey: 'membership' },
    ]
  },
  {
    label: 'Content', items: [
      { path: '/works', icon: <HardHat className="w-5 h-5" />, label: 'Development Works', featureKey: 'works' },
      { path: '/complaints', icon: <AlertTriangle className="w-5 h-5" />, label: 'Complaints', featureKey: 'complaints' },
      { path: '/events', icon: <Calendar className="w-5 h-5" />, label: 'Events', featureKey: 'events' },
      { path: '/polls', icon: <BarChart3 className="w-5 h-5" />, label: 'Polls', featureKey: 'polls' },
      { path: '/news', icon: <Newspaper className="w-5 h-5" />, label: 'Blog / News', featureKey: 'news' },
      { path: '/gallery', icon: <ImageIcon className="w-5 h-5" />, label: 'Photo Gallery', featureKey: 'gallery' },
      { path: '/gallery', icon: <Film className="w-5 h-5" />, label: 'Video Gallery', featureKey: 'gallery' },
      { path: '/manifesto', icon: <FileText className="w-5 h-5" />, label: 'Manifesto', featureKey: 'manifesto' },
      { path: '/banners', icon: <Flag className="w-5 h-5" />, label: 'Banner Management', featureKey: 'banners' },
      { path: '/posters', icon: <Palette className="w-5 h-5" />, label: 'Poster Studio', featureKey: 'poster_generator' },
      { path: '/notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications', featureKey: 'notifications' },
    ]
  },
  {
    label: 'Setup', items: [
      { path: '/areas', icon: <MapPin className="w-5 h-5" />, label: 'Area Management' },
      { path: '/leader-profile', icon: <User className="w-5 h-5" />, label: 'Leader Profile' },
      { path: '/homepage', icon: <LayoutTemplate className="w-5 h-5" />, label: 'Homepage Mgmt' },
      { path: '/registration', icon: <ClipboardList className="w-5 h-5" />, label: 'Registration Form' },
    ]
  },
  {
    label: 'Admin', items: [
      { path: '/staff', icon: <UserCheck className="w-5 h-5" />, label: 'Staff Management' },
      { path: '/roles', icon: <Shield className="w-5 h-5" />, label: 'Roles & Permissions' },
      { path: '/analytics', icon: <TrendingUp className="w-5 h-5" />, label: 'Analytics' },
      { path: '/settings', icon: <Settings className="w-5 h-5" />, label: 'Settings / Branding' },
    ]
  },
]

const pageTitles = {
  '/dashboard': 'Dashboard', '/users': 'Citizens', '/complaints': 'Complaints',
  '/works': 'Development Works', '/events': 'Events', '/polls': 'Polls',
  '/membership': 'Membership', '/volunteers': 'Volunteers', '/gallery': 'Gallery',
  '/manifesto': 'Manifesto', '/notifications': 'Notifications', '/areas': 'Area Management',
  '/leader-profile': 'Leader Profile', '/profile': 'Profile', '/homepage': 'Homepage',
  '/registration': 'Registration Form', '/roles': 'Roles & Permissions', '/analytics': 'Analytics',
  '/settings': 'Settings', '/news': 'Blog / News', '/banners': 'Banners',
  '/posters': 'Poster Studio', '/posters/:id': 'Poster Details',
  '/staff': 'Staff Management',
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { branding, tenant, isFeatureEnabled } = useBranding()
  const { language, toggleLanguage } = useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')
  const userRole = (user?.role || 'admin').toLowerCase()

  const currentTitle = pageTitles[location.pathname] || 'Admin'
  const isAllowed = isPathAllowed(location.pathname, userRole)

  // ── FIREBASE WEB PUSH LISTENERS & TOKEN AUTO-SYNC ──
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      requestNotificationPermission().catch(() => {})
    }

    onMessageListener((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Notification Alert'
      const body = payload.notification?.body || payload.data?.body || payload.data?.message || ''
      toast.info(
        <div>
          <p className="font-black text-sm text-gray-900">{title}</p>
          <p className="text-xs text-gray-600 mt-0.5 leading-snug">{body}</p>
        </div>,
        {
          position: 'top-center',
          autoClose: 5000,
          icon: '🔔',
        }
      )

      // Also trigger browser OS desktop popup notification with app branding logo
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const appLogo = resolveBrandingUrl(branding?.logoUrl || branding?.logo) || '/logo.png'
          new Notification(title, {
            body,
            icon: appLogo,
            badge: appLogo,
          })
        } catch (e) {
          console.warn('Native notification failed:', e)
        }
      }
    })
  }, [])

  // Filter drawer menu items by logged-in user's role AND tenant plan features
  const filteredMenuSections = masterMenuSections
    .map(sec => ({
      ...sec,
      items: sec.items.filter(item => {
        const roleAllowed = isPathAllowed(item.path, userRole)
        const featureAllowed = item.featureKey && isFeatureEnabled ? isFeatureEnabled(item.featureKey) : true
        return roleAllowed && featureAllowed
      }),
    }))
    .filter(sec => sec.items.length > 0)

  // Pick customized bottom tabs for role and filter out features disabled by Super Admin
  const rawBottomTabs = ROLE_BOTTOM_TABS[userRole] || ROLE_BOTTOM_TABS.admin
  const bottomTabs = rawBottomTabs.filter(tab => {
    if (tab.path === '/complaints') return isFeatureEnabled ? isFeatureEnabled('complaints') : true
    if (tab.path === '/works') return isFeatureEnabled ? isFeatureEnabled('works') : true
    if (tab.path === '/banners') return isFeatureEnabled ? isFeatureEnabled('banners') : true
    if (tab.path === '/gallery') return isFeatureEnabled ? isFeatureEnabled('gallery') : true
    if (tab.path === '/volunteers') return isFeatureEnabled ? isFeatureEnabled('volunteers') : true
    if (tab.path === '/membership') return isFeatureEnabled ? isFeatureEnabled('membership') : true
    if (tab.path === '/polls') return isFeatureEnabled ? isFeatureEnabled('polls') : true
    return true
  })

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    navigate('/login')
  }

  return (
    <div className="flex flex-col w-full h-screen bg-gray-50 overflow-hidden">

      {/* ── TOP HEADER ── */}
      <header className="shrink-0 bg-white shadow-sm z-20" style={{ borderBottom: '2px solid var(--primary-light)' }}>
        <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto w-full">
          <div className="flex items-center gap-2.5">
            {resolveBrandingUrl(branding?.logoUrl || branding?.logo) ? (
              <img
                key={resolveBrandingUrl(branding?.logoUrl || branding?.logo)}
                src={resolveBrandingUrl(branding?.logoUrl || branding?.logo)}
                alt="Logo"
                className="w-8 h-8 rounded-xl object-contain bg-white border border-gray-100 shadow-xs"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.header-logo-fallback');
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="header-logo-fallback w-8 h-8 rounded-xl items-center justify-center text-white text-xs font-black shadow-xs"
              style={{
                background: 'var(--primary)',
                display: resolveBrandingUrl(branding?.logoUrl || branding?.logo) ? 'none' : 'flex',
              }}
            >
              {(tenant?.name || branding?.platformName || branding?.leaderName || 'LA')[0]}
            </div>
            <div>
              <p className="text-[13px] font-black text-gray-900 leading-none truncate max-w-[160px] sm:max-w-xs">
                {tenant?.name || branding?.platformName || currentTitle}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] font-bold tracking-widest" style={{ color: 'var(--primary)' }}>
                  {currentTitle.toUpperCase()}
                </span>
                {tenant?.slug && (
                  <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-md bg-gray-100 text-gray-600 font-mono">
                    @{tenant.slug}
                  </span>
                )}
                {userRole !== 'admin' && userRole !== 'leader' && userRole !== 'owner' && (
                  <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-md uppercase tracking-wider bg-gray-100 text-gray-600">
                    {userRole.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher Button (English ⇄ Hindi) */}
            <button
              onClick={toggleLanguage}
              title={language === 'hi' ? 'Switch to English / अंग्रेज़ी' : 'Switch to Hindi / हिन्दी'}
              className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all border shadow-xs hover:opacity-90 active:scale-95 cursor-pointer"
              style={{
                background: 'var(--primary-light)',
                borderColor: 'var(--primary-light)',
                color: 'var(--primary)',
              }}
            >
              <Languages className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
              <span className="text-[11px] font-black tracking-wide">
                {language === 'hi' ? 'हिन्दी' : 'EN'}
              </span>
            </button>

            {/* Notification Bell (if allowed for role) */}
            {isPathAllowed('/notifications', userRole) && (
              <button
                onClick={() => navigate('/notifications')}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
                style={{ background: 'var(--primary-light)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">3</span>
              </button>
            )}

            <button
              onClick={() => navigate('/leader-profile')}
              title="My Profile"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              style={{ background: 'var(--primary)' }}
            >
              {(user.name || 'A')[0]?.toUpperCase()}
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT & ROLE ACCESS GUARD ── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 max-w-2xl mx-auto">
          {isAllowed ? (
            <Outlet />
          ) : (
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm text-center flex flex-col items-center mt-6">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3.5 border border-amber-200 shadow-sm">
                <Shield className="w-8 h-8" />
              </div>
              <h2 className="text-base font-black text-gray-900">Access Restricted</h2>
              <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
                Your role (<span className="font-bold text-gray-800 uppercase tracking-wider">{userRole.replace(/_/g, ' ')}</span>) does not have permission to access this section.
              </p>
              <button
                onClick={() => navigate('/dashboard')}
                className="btn-primary mt-5 text-xs px-4 py-2 font-bold"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── ROLE-FILTERED BOTTOM TAB NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 px-2 max-w-2xl mx-auto">
          {bottomTabs.map(tab => {
            const isMenu = tab.path === '/menu'
            const isActive = isMenu
              ? menuOpen
              : (location.pathname === tab.path || (tab.path !== '/dashboard' && location.pathname.startsWith(tab.path + '/')))

            return (
              <button
                key={tab.path + tab.label}
                onClick={() => {
                  if (isMenu) {
                    setMenuOpen(true)
                  } else {
                    setMenuOpen(false)
                    navigate(tab.path)
                  }
                }}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all"
              >
                <div
                  className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all ${
                    isActive ? 'text-white shadow-sm' : 'text-gray-400'
                  }`}
                  style={isActive ? { background: 'var(--primary)' } : {}}
                >
                  {tab.icon}
                </div>
                <span
                  className={`text-[9px] font-bold leading-none ${isActive ? '' : 'text-gray-400'}`}
                  style={isActive ? { color: 'var(--primary)' } : {}}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── ROLE-FILTERED FULL MENU DRAWER ── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col max-w-2xl mx-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* User Info with Role Badge */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
              <div
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/leader-profile')
                }}
                title="View Profile"
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0 shadow-sm cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                style={{ background: 'var(--primary)' }}
              >
                {(user.name || 'A')[0]?.toUpperCase()}
              </div>
              <div
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/leader-profile')
                }}
                title="View Profile"
                className="flex-1 min-w-0 cursor-pointer group"
              >
                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                  {user.name || 'Admin User'}
                  <span className="text-[10px] text-gray-400 font-normal">→</span>
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase tracking-wider bg-gray-100 text-gray-700">
                    {userRole.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">· {tenant?.name || ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleLanguage}
                  title="Toggle Language"
                  className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 rounded-xl transition-colors cursor-pointer border"
                  style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    borderColor: 'var(--primary-light)',
                  }}
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span className="text-[10px]">{language === 'hi' ? 'हिन्दी' : 'EN'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-red-500 text-xs font-bold bg-red-50 px-2.5 py-1.5 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </div>

            {/* Menu Items (Filtered by Role) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-6 no-scrollbar">
              {filteredMenuSections.map(sec => (
                <div key={sec.label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">{sec.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sec.items.map(item => {
                      const isActive = location.pathname === item.path
                      return (
                        <NavLink
                          key={item.path + item.label}
                          to={item.path}
                          onClick={() => setMenuOpen(false)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all ${
                            isActive ? 'text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:text-gray-800'
                          }`}
                          style={isActive ? { background: 'var(--primary)' } : {}}
                        >
                          <span className="flex items-center justify-center">{item.icon}</span>
                          <span className="text-[9px] font-bold leading-tight">{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}

              {filteredMenuSections.length === 0 && (
                <div className="text-center py-8 text-xs text-gray-400">
                  No additional menu modules available for your role.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
