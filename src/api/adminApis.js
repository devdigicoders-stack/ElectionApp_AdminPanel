// ============================================================
//   ADMIN PANEL — ALL APIs READY TO INTEGRATE
//   Base URL: http://localhost:3000  (ya apna backend URL)
//   Auth Header: Authorization: Bearer <token>
// ============================================================

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'

// ── TOKEN & TENANT HELPERS ────────────────────────────────
const getToken = () => localStorage.getItem('admin_token')

// ✅ Dynamic Tenant Resolution:
// 1. URL Query Param (?tenant=slug)
// 2. LocalStorage (tenant_slug)
// 3. Saved Logged-in Admin User
// 4. Subdomain
// 5. Fallback to .env (VITE_TENANT_SLUG)
export const getTenantSlug = () => {
  if (typeof window !== 'undefined') {
    // 1️⃣ URL param (?tenant=chaurasiya ya ?tenant=cjp)
    const urlParams = new URLSearchParams(window.location.search)
    const slugFromQuery = urlParams.get('tenant')
    if (slugFromQuery && slugFromQuery.trim()) {
      const clean = slugFromQuery.trim().toLowerCase()
      localStorage.setItem('tenant_slug', clean)
      return clean
    }

    // 2️⃣ localStorage me saved tenant slug
    const slugFromStorage = localStorage.getItem('tenant_slug')
    if (slugFromStorage && slugFromStorage.trim()) {
      return slugFromStorage.trim().toLowerCase()
    }

    // 3️⃣ Saved admin user ka tenant
    try {
      const savedUser = localStorage.getItem('admin_user')
      if (savedUser) {
        const u = JSON.parse(savedUser)
        const userTenant = u?.tenantSlug || u?.tenant?.slug
        if (userTenant) return userTenant.trim().toLowerCase()
      }
    } catch {}

    // 4️⃣ Subdomain (production e.g. chaurasiya.admin.domain.com)
    const host = window.location.hostname || ''
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const parts = host.split('.')
      if (parts.length > 2) {
        return parts[0].toLowerCase()
      }
    }
  }

  // 5️⃣ .env se fallback
  return (import.meta.env.VITE_TENANT_SLUG || '').trim().toLowerCase()
}


const authHeader = () => {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const tenantSlug = getTenantSlug()
  if (tenantSlug) headers['x-tenant-slug'] = tenantSlug
  return headers
}

// ── GENERIC FETCH HELPER ──────────────────────────────────
async function api(method, path, body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: authHeader(),
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const errMsg = Array.isArray(data.errors) && data.errors.length
      ? data.errors.join(', ')
      : Array.isArray(data.message)
      ? data.message.join(', ')
      : data.message || `Request failed with status ${res.status}`
    throw new Error(errMsg)
  }
  return data
}

// ── AUTHENTICATED FILE DOWNLOAD HELPER ────────────────────
export async function downloadFile(path, defaultFilename = 'download') {
  const headers = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  const tenantSlug = getTenantSlug()
  if (tenantSlug) headers['x-tenant-slug'] = tenantSlug

  const res = await fetch(`${BASE_URL}${path}`, { headers })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const errMsg = data.message || `Download failed with status ${res.status}`
    throw new Error(errMsg)
  }
  const blob = await res.blob()
  const contentDisposition = res.headers.get('content-disposition')
  let filename = defaultFilename
  if (contentDisposition) {
    const match = contentDisposition.match(/filename=["']?([^"';]+)["']?/)
    if (match && match[1]) filename = match[1]
  }
  const blobUrl = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000)
}

// =============================================================
// 1. AUTH
// =============================================================
export const AuthAPI = {
  adminLogin: (email, password) => api('POST', '/auth/admin/login', { email, password }),
  superAdminLogin: (email, password) => api('POST', '/auth/super-admin/login', { email, password }),
  sendOtp: (mobile) => api('POST', '/auth/send-otp', { mobile }),
  verifyOtp: (mobile, otp) => api('POST', '/auth/verify-otp', { mobile, otp }),
}

// =============================================================
// 2. DASHBOARD
// =============================================================
export const DashboardAPI = {
  getSummary: () => api('GET', '/dashboard'),
}

// =============================================================
// 3. CITIZENS (CRM — User Management)
// =============================================================
export const CitizensAPI = {
  // GET /citizens?search=&areaId=&status=&page=&limit=
  getAll: (params = {}) => api('GET', `/citizens?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/citizens/${id}`),
  update: (id, data) => api('PATCH', `/citizens/${id}`, data),
  updateStatus: (id, status) => api('PATCH', `/citizens/${id}/status`, { status }),
  upgradeCategory: (id, category) => api('PATCH', `/citizens/${id}/category`, { category }),
  addTags: (id, tags) => api('POST', `/citizens/${id}/tags`, { tags }),
  removeTag: (id, tag) => api('DELETE', `/citizens/${id}/tags/${tag}`),
  bulkAddTags: (userIds, tags) => api('POST', '/citizens/bulk-tags', { userIds, tags }),
  bulkRemoveTag: (userIds, tag) => api('POST', '/citizens/bulk-untag', { userIds, tag }),
  getAvailableTags: () => api('GET', '/citizens/tags'),
  getAnalytics: () => api('GET', '/citizens/analytics'),
  exportCSV: (params = {}) => `${BASE_URL}/citizens/export?${new URLSearchParams(params)}&token=${getToken()}`,
  assignMembership: (id, data) => api('POST', `/citizens/${id}/membership`, data),
  assignVolunteer: (id, data) => api('POST', `/citizens/${id}/volunteer`, data),
}

// =============================================================
// 4. USERS (General)
// =============================================================
export const UsersAPI = {
  getAll: (params = {}) => api('GET', `/users?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/users/${id}`),
  getStats: () => api('GET', '/users/stats'),
  getAreaCount: () => api('GET', '/users/area-count'),
  toggleActive: (id, isActive) => api('PATCH', `/users/${id}/toggle-active`, { isActive }),
  updateProfile: (data) => api('PATCH', '/users/profile', data),
}

// =============================================================
// 5. ADMIN USERS (Staff)
// =============================================================
export const AdminUsersAPI = {
  getAll: () => api('GET', '/admin-users'),
  getOne: (id) => api('GET', `/admin-users/${id}`),
  create: (data) => api('POST', '/admin-users', data),
  update: (id, data) => api('PATCH', `/admin-users/${id}`, data),
  remove: (id) => api('DELETE', `/admin-users/${id}`),
}

// =============================================================
// 6. AREAS (8-Level Hierarchy)
// =============================================================
export const AreasAPI = {
  getTree: () => api('GET', '/areas/tree'),
  getLevels: () => api('GET', '/areas/levels'),
  getByLevel: (levelId) => api('GET', `/areas/by-level/${levelId}`),
  getChildren: (id) => api('GET', `/areas/${id}/children`),
  createLevel: (data) => api('POST', '/areas/levels', data),
  updateLevel: (id, data) => api('PATCH', `/areas/levels/${id}`, data),
  deleteLevel: (id) => api('DELETE', `/areas/levels/${id}`),
  createArea: (data) => api('POST', '/areas', data),
  updateArea: (id, data) => api('PATCH', `/areas/${id}`, data),
  deleteArea: (id) => api('DELETE', `/areas/${id}`),
}

// =============================================================
// 7. COMPLAINTS (100% Backend Integrated)
// =============================================================
export const ComplaintsAPI = {
  // Queries
  getAll: (params = {}) => api('GET', `/complaints?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/complaints/${id}`),
  getStats: () => api('GET', '/complaints/stats'),
  getAnalytics: () => api('GET', '/complaints/analytics'),
  getMine: () => api('GET', '/complaints/my'),
  create: (data) => api('POST', '/complaints', data),
  remove: (id) => api('DELETE', `/complaints/${id}`),
  delete: (id) => api('DELETE', `/complaints/${id}`),

  // Export CSV / Excel
  exportComplaints: async (format = 'csv', params = {}) => {
    const token = getToken()
    const slug = getTenantSlug()
    const query = new URLSearchParams({ ...params, format })
    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (slug) headers['x-tenant-slug'] = slug
    const res = await fetch(`${BASE_URL}/complaints/export?${query.toString()}`, { headers })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Failed to export complaints')
    }
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `complaints_${new Date().toISOString().slice(0, 10)}.${format === 'excel' ? 'xlsx' : 'csv'}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  },

  // Actions & Workflow
  assign: (id, data) => api('PATCH', `/complaints/${id}/assign`, data),
  updatePriority: (id, priority, note = '') => api('PATCH', `/complaints/${id}/priority`, { priority, note }),
  addRemark: (id, remark, isInternal = true) => api('POST', `/complaints/${id}/remarks`, { remark, isInternal }),
  resolve: (id, data) => api('PATCH', `/complaints/${id}/resolve`, data),
  reject: (id, reason) => api('PATCH', `/complaints/${id}/reject`, { reason }),
  close: (id, closingNote = '') => api('PATCH', `/complaints/${id}/close`, { closingNote }),
  updateStatus: (id, status, note = '') => api('PATCH', `/complaints/${id}/status`, { status, note }),
  togglePublic: (id, isPublic) => api('PATCH', `/complaints/${id}/public`, { isPublic }),
  getPublic: (params = {}) => api('GET', `/complaints/public?${new URLSearchParams(params)}`),

  // Categories Master CRUD
  getCategories: () => api('GET', '/complaints/categories'),
  createCategory: (data) => api('POST', '/complaints/categories', data),
  updateCategory: (catId, data) => api('PATCH', `/complaints/categories/${catId}`, data),
  deleteCategory: (catId) => api('DELETE', `/complaints/categories/${catId}`),
}

// =============================================================
// 8. WORKS (Development Projects)
// =============================================================
export const WorksAPI = {
  getAll: (params = {}) => api('GET', `/works?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/works/${id}`),
  getStats: () => api('GET', '/works/stats'),
  create: (data) => api('POST', '/works', data),
  update: (id, data) => api('PATCH', `/works/${id}`, data),
  remove: (id) => api('DELETE', `/works/${id}`),
  delete: (id) => api('DELETE', `/works/${id}`),
}

// =============================================================
// 9. EVENTS
// =============================================================
export const EventsAPI = {
  getAll: (params = {}) => api('GET', `/events?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/events/${id}`),
  create: (data) => api('POST', '/events', data),
  update: (id, data) => api('PATCH', `/events/${id}`, data),
  remove: (id) => api('DELETE', `/events/${id}`),
  rsvp: (id, status) => api('POST', `/events/${id}/rsvp`, { status }),
  getMyRsvp: (id) => api('GET', `/events/${id}/my-rsvp`),
  getAnalytics: (id) => api('GET', `/events/${id}/analytics`),
  exportAttendees: (id, format = 'csv') => `${BASE_URL}/events/${id}/export?format=${format}`,
  lookupTicket: (id, ticketNumber) => api('GET', `/events/${id}/check-in/lookup/${ticketNumber}`),
  checkIn: (id, data) => api('POST', `/events/${id}/check-in`, data),
  getTicket: (id, userId = '') => api('GET', `/events/${id}/ticket${userId ? `?userId=${userId}` : ''}`),
  getShareLink: (id) => api('GET', `/events/${id}/share`),
}

// =============================================================
// 10. POLLS
// =============================================================
export const PollsAPI = {
  // List polls — supports ?status=active|upcoming|closed|all&category=&areaId=&page=&limit=
  getAll: (params = {}) => {
    const q = new URLSearchParams()
    if (params.areaId)   q.set('areaId',   params.areaId)
    if (params.category) q.set('category', params.category)
    if (params.status)   q.set('status',   params.status)
    if (params.page)     q.set('page',     params.page)
    if (params.limit)    q.set('limit',    params.limit)
    const qs = q.toString()
    return api('GET', `/polls${qs ? '?' + qs : ''}`)
  },
  // GET /polls/:id — single poll detail
  getOne: (id) => api('GET', `/polls/${id}`),
  // POST /polls — create poll
  // Body fields: question(req), options[](req strings), description?, category?,
  //   startsAt?, endsAt?, durationHours?, durationDays?, resultDeclaredAt?,
  //   targetAudience?(ALL|MEMBERS|VOLUNTEERS|AREA), targetAreaId?, targetGender?,
  //   targetMinAge?, targetMaxAge?, resultVisibility?(AFTER_VOTE|AFTER_CLOSE|ADMIN_ONLY),
  //   allowRevote?, allowMultipleChoices?, maxChoices?, isActive?
  create: (data) => api('POST', '/polls', data),
  // PATCH /polls/:id — update poll (same optional fields as create)
  update: (id, data) => api('PATCH', `/polls/${id}`, data),
  // DELETE /polls/:id — delete poll + votes (Admin/Leader only)
  remove: (id) => api('DELETE', `/polls/${id}`),
  // POST /polls/:id/vote — citizen cast vote { optionId? | optionIds[]? }
  vote: (id, optionId) => api('POST', `/polls/${id}/vote`, { optionId }),
  // GET /polls/:id/my-vote — citizen's own vote for a poll
  getMyVote: (id) => api('GET', `/polls/${id}/my-vote`),
  // GET /polls/:id/analytics — full analytics: option breakdown, area, gender, age, timeline
  getAnalytics: (id) => api('GET', `/polls/${id}/analytics`),
  // GET /polls/:id/export — CSV export of voter audit log (?format=csv)
  exportCsv: (id) => api('GET', `/polls/${id}/export?format=csv`),
  // POST /polls/:id/declare-result — manually declare result now
  declareResult: (id) => api('POST', `/polls/${id}/declare-result`),
  // POST /polls/:id/close — manually close poll now
  closePoll: (id) => api('POST', `/polls/${id}/close`),
}

// =============================================================
// 11. MEMBERSHIP
// =============================================================
export const MembershipAPI = {
  // Admin APIs - Members & Applications
  getAll: (params = {}) => {
    const cleaned = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleaned[k] = v
    })
    const qs = new URLSearchParams(cleaned).toString()
    return api('GET', `/membership${qs ? '?' + qs : ''}`)
  },
  getOne: (id) => api('GET', `/membership/${id}`),
  getStats: () => api('GET', '/membership/stats'),
  approve: (id, data = {}) => api('PATCH', `/membership/${id}/approve`, data),
  reject: (id, reason) => api('PATCH', `/membership/${id}/reject`, { reason }),
  regenerateCard: (id, data = {}) => api('POST', `/membership/${id}/regenerate-card`, data),
  updateCardDetails: (id, data) => api('PATCH', `/membership/${id}/card-details`, data),
  downloadCard: (id) => `${BASE_URL}/membership/${id}/card/download`,
  downloadCardBlob: (id, filename) => downloadFile(`/membership/${id}/card/download`, filename || `membership-card-${id}.png`),
  exportCsv: (params = {}) => {
    const cleaned = {}
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') cleaned[k] = v
    })
    const qs = new URLSearchParams(cleaned).toString()
    return downloadFile(`/membership/export${qs ? '?' + qs : ''}`, `members-${new Date().toISOString().slice(0, 10)}.csv`)
  },
  verifyQR: (membershipNumber) => api('GET', `/membership/verify/${membershipNumber}`),

  // Admin APIs - Membership Plans Management
  getPlans: () => api('GET', '/membership/plans/admin'),
  getPublicPlans: () => api('GET', '/membership/plans'),
  getPlan: (id) => api('GET', `/membership/plans/${id}`),
  createPlan: (data) => api('POST', '/membership/plans', data),
  updatePlan: (id, data) => api('PATCH', `/membership/plans/${id}`, data),
  deletePlan: (id) => api('DELETE', `/membership/plans/${id}`),

  // Citizen APIs (for reference)
  apply: (data) => api('POST', '/membership/apply', data),
  getMine: () => api('GET', '/membership/my'),
  getMyCard: () => api('GET', '/membership/my/card'),
  downloadMyCard: () => `${BASE_URL}/membership/my/card/download`,
}

// =============================================================
// 12. VOLUNTEERS
// =============================================================
export const VolunteersAPI = {
  getAll: (params = {}) => api('GET', `/volunteers?${new URLSearchParams(params)}`),
  getMine: () => api('GET', '/volunteers/my'),
  add: (data) => api('POST', '/volunteers', data),
  update: (id, data) => api('PATCH', `/volunteers/${id}`, data),
  remove: (id) => api('DELETE', `/volunteers/${id}`),
}

// =============================================================
// 13. VOLUNTEER TASKS
// =============================================================
export const VolunteerTasksAPI = {
  getAll: (params = {}) => api('GET', `/volunteer-tasks?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/volunteer-tasks/${id}`),
  getMyTasks: () => api('GET', '/volunteer-tasks/my'),
  getStats: () => api('GET', '/volunteer-tasks/stats'),
  create: (data) => api('POST', '/volunteer-tasks', data),
  update: (id, data) => api('PATCH', `/volunteer-tasks/${id}`, data),
  updateStatus: (id, status) => api('PATCH', `/volunteer-tasks/${id}/status`, { status }),
  remove: (id) => api('DELETE', `/volunteer-tasks/${id}`),
}

// =============================================================
// 14. GALLERY
// =============================================================
export const GalleryAPI = {
  getAll: (params = {}) => api('GET', `/gallery?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/gallery/${id}`),
  create: (data) => api('POST', '/gallery', data),
  update: (id, data) => api('PATCH', `/gallery/${id}`, data),
  remove: (id) => api('DELETE', `/gallery/${id}`),
}

// =============================================================
// 15. MANIFESTO
// =============================================================
export const ManifestoAPI = {
  getAll: (params = {}) => api('GET', `/manifesto?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/manifesto/${id}`),
  create: (data) => api('POST', '/manifesto', data),
  update: (id, data) => api('PATCH', `/manifesto/${id}`, data),
  remove: (id) => api('DELETE', `/manifesto/${id}`),
}

// =============================================================
// 16. NEWS / ARTICLES
// =============================================================
export const NewsAPI = {
  getAll: (params = {}) => api('GET', `/news?${new URLSearchParams(params)}`),
  getAllAdmin: (params = {}) => api('GET', `/news/admin?${new URLSearchParams(params)}`),
  getOne: (id) => api('GET', `/news/admin/${id}`).catch(() => api('GET', `/news/${id}`)),
  getCategories: () => api('GET', '/news/categories'),
  getStats: () => api('GET', '/news/stats'),
  create: (data) => api('POST', '/news', data),
  update: (id, data) => api('PATCH', `/news/${id}`, data),
  updateStatus: (id, status) => api('PATCH', `/news/${id}/status`, { status }),
  remove: (id) => api('DELETE', `/news/${id}`),
}

// =============================================================
// 17. NOTIFICATIONS
// =============================================================
export const NotificationsAPI = {
  // Admin
  create: (data) => api('POST', '/notifications', data),
  send: (id) => api('POST', `/notifications/${id}/send`),
  getAllAdmin: (params = {}) => api('GET', `/notifications/admin?${new URLSearchParams(params)}`),
  getPlatformBroadcasts: (params = {}) => api('GET', `/notifications/platform-broadcasts?${new URLSearchParams(params)}`),
  remove: (id) => api('DELETE', `/notifications/${id}`),
  // Citizen
  getMine: (params = {}) => api('GET', `/notifications/my?${new URLSearchParams(params)}`),
  getUnreadCount: () => api('GET', '/notifications/unread-count'),
  markRead: (id) => api('PATCH', `/notifications/${id}/read`),
  registerFcmToken: (token) => api('POST', '/notifications/register-token', { token }),
  testPush: (token) => api('POST', '/notifications/test-push', { token }),
}

// =============================================================
// 18. BANNERS
// =============================================================
export const BannersAPI = {
  getAll: (params = {}) => api('GET', `/banners/all${Object.keys(params).length ? '?' + new URLSearchParams(params) : ''}`),
  getActive: () => api('GET', '/banners'),
  getOne: (id) => api('GET', `/banners/${id}`),
  create: (data) => api('POST', '/banners', data),
  update: (id, data) => api('PATCH', `/banners/${id}`, data),
  toggleActive: (id, isActive) => api('PATCH', `/banners/${id}`, { isActive }),
  reorder: (orders) => api('PATCH', '/banners/reorder', { orders }),
  remove: (id) => api('DELETE', `/banners/${id}`),
}

// =============================================================
// 19. POSTER GENERATOR
// =============================================================
export const PosterAPI = {
  // Admin — Template Management
  getTemplates: (category = '') => api('GET', `/poster-generator/templates${category ? '?category=' + category : ''}`),
  getAdminTemplates: (params = {}) => api('GET', `/poster-generator/templates/admin?${new URLSearchParams(params)}`),
  getCategories: () => api('GET', '/poster-generator/templates/categories'),
  getOneTemplate: (id) => api('GET', `/poster-generator/templates/${id}`),
  createTemplate: (data) => api('POST', '/poster-generator/templates', data),
  updateTemplate: (id, data) => api('PATCH', `/poster-generator/templates/${id}`, data),
  removeTemplate: (id) => api('DELETE', `/poster-generator/templates/${id}`),
  // Admin — Moderation of Generated Posters
  getAdminPosters: (params = {}) => api('GET', `/poster-generator/admin/posters?${new URLSearchParams(params)}`),
  deleteAdminPoster: (id) => api('DELETE', `/poster-generator/admin/posters/${id}`),
  // Citizen
  generatePoster: (templateId, formData) => {
    // formData = FormData object with photo file + fieldValues JSON string
    return fetch(`${BASE_URL}/poster-generator/generate/${templateId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    }).then(r => r.json())
  },
  getMyPosters: () => api('GET', '/poster-generator/my-posters'),
}

// =============================================================
// 20. REGISTRATION FORM BUILDER
// =============================================================
export const RegistrationFormAPI = {
  getPublicForm: () => api('GET', '/registration-form/public'),
  getAdminForm: () => api('GET', '/registration-form'),
  updateFields: (fields) => api('PUT', '/registration-form/fields', { fields }),
  addField: (data) => api('POST', '/registration-form/fields', data),
  updateField: (key, data) => api('PATCH', `/registration-form/fields/${key}`, data),
  deleteField: (key) => api('DELETE', `/registration-form/fields/${key}`),
  resetDefault: () => api('POST', '/registration-form/reset-default'),
  completeProfile: (data) => api('POST', '/registration-form/complete-profile', data),
}

// =============================================================
// 21. ABOUT LEADER
// =============================================================
export const LeaderAPI = {
  get: () => api('GET', '/about-leader'),
  update: (data) => api('PUT', '/about-leader', data),
}

// =============================================================
// 22. DASHBOARD / DOMAIN / USAGE (Tenant Settings)
// =============================================================
export const TenantSettingsAPI = {
  getBranding: () => api('GET', '/dashboard/branding'),
  updateBranding: (data) => api('PATCH', '/dashboard/branding', data),
  getDomainStatus: () => api('GET', '/dashboard/domain'),
  configureDomain: (domain) => api('POST', '/dashboard/domain', { domain }),
  verifyDomain: () => api('POST', '/dashboard/domain/verify'),
  removeDomain: () => api('DELETE', '/dashboard/domain'),
  getUsage: () => api('GET', '/dashboard/usage'),
}

// =============================================================
// 23. FILE UPLOAD
// =============================================================
export const UploadAPI = {
  // module = 'gallery' | 'works' | 'events' | 'banners' | 'misc' | 'branding'
  uploadFiles: async (module, files) => {
    const formData = new FormData()
    const fileList = Array.isArray(files) ? files : [files]
    fileList.forEach(f => formData.append('files', f))
    const uploadHeaders = {}
    const token = getToken()
    if (token) uploadHeaders['Authorization'] = `Bearer ${token}`
    const slug = getTenantSlug()
    if (slug) uploadHeaders['x-tenant-slug'] = slug
    const res = await fetch(`${BASE_URL}/uploads/${module}`, {
      method: 'POST',
      headers: uploadHeaders,
      body: formData,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Upload failed')
    const urls = json?.data?.urls || json?.urls || []
    return { urls, ...json }
  }
}

// =============================================================
// 24. PUBLIC CONFIG (App Bootstrap)
// =============================================================
export const ConfigAPI = {
  getConfig: () => api('GET', '/config'),
}
