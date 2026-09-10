import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
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
  History,
  LogOut,
  UserCheck
} from 'lucide-react'
import { useBranding } from '../context/BrandingContext'

// Bottom 5 tabs
const bottomTabs = [
  { path: '/dashboard', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { path: '/complaints', label: 'Complaints', icon: <AlertTriangle className="w-5 h-5" /> },
  { path: '/users', label: 'Citizens', icon: <Users className="w-5 h-5" /> },
  { path: '/analytics', label: 'Analytics', icon: <BarChart2 className="w-5 h-5" /> },
  { path: '/menu', label: 'Menu', icon: <MenuIcon className="w-5 h-5" /> },
]

// All menu items for drawer
const menuSections = [
  {
    label: 'People', items: [
      { path: '/users', icon: <Users className="w-5 h-5" />, label: 'Citizens / Users' },
      { path: '/membership', icon: <CreditCard className="w-5 h-5" />, label: 'Membership' },
      { path: '/volunteers', icon: <Star className="w-5 h-5" />, label: 'Volunteers' },
    ]
  },
  {
    label: 'Content', items: [
      { path: '/works', icon: <HardHat className="w-5 h-5" />, label: 'Development Works' },
      { path: '/complaints', icon: <AlertTriangle className="w-5 h-5" />, label: 'Complaints' },
      { path: '/events', icon: <Calendar className="w-5 h-5" />, label: 'Events' },
      { path: '/polls', icon: <BarChart3 className="w-5 h-5" />, label: 'Polls' },
      { path: '/news', icon: <Newspaper className="w-5 h-5" />, label: 'Blog / News' },
      { path: '/gallery', icon: <ImageIcon className="w-5 h-5" />, label: 'Photo Gallery' },
      { path: '/gallery', icon: <Film className="w-5 h-5" />, label: 'Video Gallery' },
      { path: '/manifesto', icon: <FileText className="w-5 h-5" />, label: 'Manifesto' },
      { path: '/banners', icon: <Flag className="w-5 h-5" />, label: 'Banner Management' },
      { path: '/notifications', icon: <Bell className="w-5 h-5" />, label: 'Notifications' },
      { path: '/posters', icon: <Palette className="w-5 h-5" />, label: 'Poster Templates' },
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
      { path: '/audit', icon: <History className="w-5 h-5" />, label: 'Audit Logs' },
    ]
  },
]

const pageTitles = {
  '/dashboard': 'Dashboard', '/users': 'Citizens', '/complaints': 'Complaints',
  '/works': 'Development Works', '/events': 'Events', '/polls': 'Polls',
  '/membership': 'Membership', '/volunteers': 'Volunteers', '/gallery': 'Gallery',
  '/manifesto': 'Manifesto', '/notifications': 'Notifications', '/areas': 'Area Management',
  '/leader-profile': 'Leader Profile', '/homepage': 'Homepage', '/posters': 'Poster Templates',
  '/registration': 'Registration Form', '/roles': 'Roles & Permissions', '/analytics': 'Analytics',
  '/settings': 'Settings', '/audit': 'Audit Logs', '/news': 'Blog / News', '/banners': 'Banners',
  '/staff': 'Staff Management',
}

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { branding, tenant } = useBranding()
  const [menuOpen, setMenuOpen] = useState(false)
  const user = JSON.parse(localStorage.getItem('admin_user') || '{}')

  const currentTitle = pageTitles[location.pathname] || 'Admin'

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
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 rounded-xl object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ background: 'var(--primary)' }}>
                {(branding?.leaderName || 'LA')[0]}
              </div>
            )}
            <div>
              <p className="text-[13px] font-black text-gray-900 leading-none">{currentTitle}</p>
              <p className="text-[9px] font-bold tracking-widest mt-0.5" style={{ color: 'var(--primary)' }}>ADMIN PANEL</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={() => navigate('/notifications')}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              style={{ background: 'var(--primary-light)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[8px] text-white flex items-center justify-center font-bold">3</span>
            </button>

            <button onClick={() => setMenuOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
              style={{ background: 'var(--primary)' }}>
              {user.name?.[0] || 'A'}
            </button>
          </div>
        </div>
      </header>

      {/* ── PAGE CONTENT ── */}
      <main className="flex-1 overflow-y-auto pb-20">
        <div className="p-4 max-w-2xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── BOTTOM TAB NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-16 px-2 max-w-2xl mx-auto">
          {bottomTabs.map(tab => {
            const isMenu = tab.path === '/menu'
            const isActive = isMenu ? menuOpen : (location.pathname === tab.path || location.pathname.startsWith(tab.path + '/'))
            return (
              <button key={tab.path} onClick={() => { isMenu ? setMenuOpen(true) : (setMenuOpen(false), navigate(tab.path)) }}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-all">
                <div className={`w-10 h-7 rounded-xl flex items-center justify-center transition-all ${isActive ? 'text-white shadow-sm' : 'text-gray-400'}`}
                  style={isActive ? { background: 'var(--primary)' } : {}}>
                  {tab.icon}
                </div>
                <span className={`text-[9px] font-bold leading-none ${isActive ? '' : 'text-gray-400'}`}
                  style={isActive ? { color: 'var(--primary)' } : {}}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── FULL MENU DRAWER ── */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[88vh] flex flex-col max-w-2xl mx-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 shrink-0">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-lg shrink-0"
                style={{ background: 'var(--primary)' }}>
                {user.name?.[0] || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{user.name || 'Admin User'}</p>
                <p className="text-[10px] text-gray-400 capitalize truncate">{user.role || 'admin'} · {tenant?.name || ''}</p>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-red-500 text-xs font-bold bg-red-50 px-3 py-1.5 rounded-xl">
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 pb-6 no-scrollbar">
              {menuSections.map(sec => (
                <div key={sec.label}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">{sec.label}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {sec.items.map(item => {
                      const isActive = location.pathname === item.path
                      return (
                        <NavLink key={item.path + item.label} to={item.path} onClick={() => setMenuOpen(false)}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl text-center transition-all ${isActive ? 'text-white' : 'bg-gray-50 text-gray-600 hover:text-gray-800'}`}
                          style={isActive ? { background: 'var(--primary)' } : {}}>
                          <span className="flex items-center justify-center">{item.icon}</span>
                          <span className="text-[9px] font-bold leading-tight">{item.label}</span>
                        </NavLink>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
