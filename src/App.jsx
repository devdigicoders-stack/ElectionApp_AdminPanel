import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { BrandingProvider } from './context/BrandingContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminLayout from './layouts/AdminLayout'
import SplashScreen from './pages/SplashScreen'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import UsersPage from './pages/users/UsersPage'
import UserDetailPage from './pages/users/UserDetailPage'
import AreasPage from './pages/areas/AreasPage'
import HomepagePage from './pages/homepage/HomepagePage'
import LeaderProfilePage from './pages/leader/LeaderProfilePage'
import WorksPage from './pages/works/WorksPage'
import ComplaintsPage from './pages/complaints/ComplaintsPage'
import ComplaintDetailPage from './pages/complaints/ComplaintDetailPage'
import EventsPage from './pages/events/EventsPage'
import PollsPage from './pages/polls/PollsPage'
import MembershipPage from './pages/membership/MembershipPage'
import VolunteersPage from './pages/volunteers/VolunteersPage'
import GalleryPage from './pages/gallery/GalleryPage'
import ManifestoPage from './pages/manifesto/ManifestoPage'
import PostersPage from './pages/posters/PostersPage'
import PosterDetailPage from './pages/posters/PosterDetailPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import RolesPage from './pages/roles/RolesPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import SettingsPage from './pages/settings/SettingsPage'
import RegistrationPage from './pages/registration/RegistrationPage'
import AuditPage from './pages/audit/AuditPage'
import NewsPage from './pages/news/NewsPage'
import NewsDetailPage from './pages/news/NewsDetailPage'
import BannersPage from './pages/banners/BannersPage'
import AdminUsersPage from './pages/staff/AdminUsersPage'
import WorkDetailPage from './pages/works/WorkDetailPage'
import EventDetailPage from './pages/events/EventDetailPage'
import PollDetailPage from './pages/polls/PollDetailPage'
import MemberDetailPage from './pages/membership/MemberDetailPage'
import GalleryDetailPage from './pages/gallery/GalleryDetailPage'
import ManifestoDetailPage from './pages/manifesto/ManifestoDetailPage'

function AppRoutes() {
  const [showSplash, setShowSplash] = useState(true)
  const onSplashDone = useCallback(() => setShowSplash(false), [])

  if (showSplash) return <SplashScreen onDone={onSplashDone} />

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="homepage" element={<HomepagePage />} />
        <Route path="leader-profile" element={<LeaderProfilePage />} />
        <Route path="works" element={<WorksPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="complaints/:id" element={<ComplaintDetailPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="polls" element={<PollsPage />} />
        <Route path="membership" element={<MembershipPage />} />
        <Route path="volunteers" element={<VolunteersPage />} />
        <Route path="gallery" element={<GalleryPage />} />
        <Route path="manifesto" element={<ManifestoPage />} />
        <Route path="posters" element={<PostersPage />} />
        <Route path="posters/:id" element={<PosterDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="registration" element={<RegistrationPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="news" element={<NewsPage />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="staff" element={<AdminUsersPage />} />
        <Route path="works/:id" element={<WorkDetailPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="polls/:id" element={<PollDetailPage />} />
        <Route path="membership/:id" element={<MemberDetailPage />} />
        <Route path="gallery/:id" element={<GalleryDetailPage />} />
        <Route path="manifesto/:id" element={<ManifestoDetailPage />} />
        <Route path="news/:id" element={<NewsDetailPage />} />
        <Route path="menu" element={<Navigate to="/dashboard" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrandingProvider>
      <BrowserRouter>
        <ToastContainer position="top-center" autoClose={2500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover theme="colored" />
        <AppRoutes />
      </BrowserRouter>
    </BrandingProvider>
  )
}
