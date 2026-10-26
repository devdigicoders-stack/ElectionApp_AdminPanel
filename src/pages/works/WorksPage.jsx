import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import {
  CheckCircle2,
  Clock,
  Hourglass,
  HardHat,
  MapPin,
  IndianRupee,
  Camera,
  Edit2,
  Trash2,
  Check,
  X as CloseIcon,
  Sparkles,
  Search,
  Filter,
  RotateCcw,
} from 'lucide-react'
import { WorksAPI, AreasAPI } from '../../api/adminApis'
import { Skeleton, ApiError } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const EMPTY = {
  title: '',
  description: '',
  category: '',
  status: 'upcoming',
  areaId: '',
  budget: '',
  location: '',
  isPublished: true,
  images: [],
  beforeAfter: { before: [], after: [] },
}

const statusConfig = {
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed', Icon: CheckCircle2 },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Progress', Icon: Clock },
  upcoming: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Upcoming', Icon: Hourglass },
}

const DEFAULT_CATEGORIES = [
  'Roads & Infrastructure',
  'Water Supply',
  'Electricity & Lighting',
  'Drainage & Sanitation',
  'Parks & Beautification',
  'Healthcare & Clinics',
  'Schools & Education',
]

const SVG_FALLBACK = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f8fafc'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='13' font-weight='700' fill='%2364748b'%3EDevelopment Work Photo%3C/text%3E%3C/svg%3E"

const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return SVG_FALLBACK
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

export default function WorksPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [stats, setStats] = useState(null)
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAreaId, setFilterAreaId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState(null)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newBeforeUrl, setNewBeforeUrl] = useState('')
  const [newAfterUrl, setNewAfterUrl] = useState('')
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('admin_work_categories')
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES
    } catch {
      return DEFAULT_CATEGORIES
    }
  })
  const [categoryToEdit, setCategoryToEdit] = useState(null)
  const [editingCategoryName, setEditingCategoryName] = useState('')
  const [areaTreeData, setAreaTreeData] = useState({ levels: [], tree: [] })
  const [selectedAreas, setSelectedAreas] = useState({})
  const [limit, setLimit] = useState(10)

  // Flatten area tree to simple list for dropdown
  const flattenAreas = (nodes, result = []) => {
    if (!Array.isArray(nodes)) return result
    for (const node of nodes) {
      result.push({ _id: node._id, name: node.name, levelName: node.levelId?.name || node.levelName || '' })
      if (node.children?.length) {
        flattenAreas(node.children, result)
      }
    }
    return result
  }

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = { page, limit }
      if (filter !== 'all') params.status = filter
      if (filterCategory) params.category = filterCategory
      if (filterAreaId) params.areaId = filterAreaId
      const [res, st, arRes] = await Promise.all([
        WorksAPI.getAll(params),
        WorksAPI.getStats().catch(() => null),
        AreasAPI.getTree().catch(() => null),
      ])

      // 1. Works list
      const rawData = res?.data ?? res
      const worksList = Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData?.works)
        ? rawData.works
        : Array.isArray(rawData)
        ? rawData
        : []
      setItems(worksList)
      setTotal(rawData?.total ?? worksList.length)

      // Dynamically merge categories from DB works with existing categories
      if (worksList.length > 0) {
        const fromWorks = worksList.map(w => w.category?.trim()).filter(Boolean)
        setCustomCategories(prev => {
          const merged = Array.from(new Set([...prev, ...fromWorks]))
          localStorage.setItem('admin_work_categories', JSON.stringify(merged))
          return merged
        })
      }

      // 2. Stats
      const stData = st?.data ?? st
      let statsObj = { completed: 0, in_progress: 0, upcoming: 0 }
      if (Array.isArray(stData)) {
        stData.forEach(item => {
          const key = String(item._id || '').toLowerCase()
          if (key.includes('complete') || key.includes('पूर्ण')) {
            statsObj.completed = (statsObj.completed || 0) + Number(item.count || 0)
          } else if (key.includes('progress') || key.includes('ongoing') || key.includes('प्रगति')) {
            statsObj.in_progress = (statsObj.in_progress || 0) + Number(item.count || 0)
          } else {
            statsObj.upcoming = (statsObj.upcoming || 0) + Number(item.count || 0)
          }
        })
      } else if (typeof stData === 'object' && stData !== null) {
        statsObj = {
          completed: Number(stData.completed || stData.Completed || 0),
          in_progress: Number(stData.in_progress || stData.inProgress || stData.InProgress || 0),
          upcoming: Number(stData.upcoming || stData.Upcoming || 0),
        }
      }
      setStats(statsObj)

      // 3. Areas for dropdown & hierarchical selection
      const treeData = arRes?.data?.tree ?? arRes?.tree ?? (Array.isArray(arRes?.data) ? arRes.data : [])
      const levelsData = arRes?.data?.levels ?? arRes?.levels ?? []
      setAreaTreeData({ levels: levelsData, tree: treeData })
      const flat = flattenAreas(treeData)
      setAreas(flat)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [page, limit, filter, filterCategory, filterAreaId])

  useEffect(() => { load() }, [load])

  // Automatically compress uploaded image files to max 1000px and 70% quality (reduces 8MB to ~50KB)
  const compressImageFile = (file, maxWidth = 1000, maxHeight = 1000, quality = 0.7) => {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = () => resolve('')
        reader.readAsDataURL(file)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            } else {
              width = Math.round((width * maxHeight) / height)
              height = maxHeight
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', quality)
          resolve(compressed)
        }
        img.onerror = () => resolve(e.target.result)
        img.src = e.target.result
      }
      reader.onerror = () => resolve('')
      reader.readAsDataURL(file)
    })
  }

  // Helper for image file uploads (with automatic compression)
  const handleFileUpload = async (files, target, field = null) => {
    if (!files || !files.length) return
    for (const file of Array.from(files)) {
      try {
        const url = await compressImageFile(file)
        if (!url) continue
        if (target === 'images') {
          setForm(prev => ({ ...prev, images: [...(prev.images || []), url] }))
        } else if (target === 'beforeAfter' && field) {
          setForm(prev => ({
            ...prev,
            beforeAfter: {
              ...prev.beforeAfter,
              [field]: [...(prev.beforeAfter?.[field] || []), url],
            },
          }))
        }
      } catch (err) {
        console.error('Image compression error:', err)
      }
    }
  }

  const saveCustomCategories = (newList) => {
    setCustomCategories(newList)
    try {
      localStorage.setItem('admin_work_categories', JSON.stringify(newList))
    } catch {}
  }

  const handleAddCategory = () => {
    const val = form.category?.trim()
    if (!val) {
      toast.warning('Pehle category ka naam type karein')
      return
    }
    if (customCategories.some(c => c.toLowerCase() === val.toLowerCase())) {
      toast.info(`"${val}" pehle se hi categories me maujood hai`)
      return
    }
    const updated = [...customCategories, val]
    saveCustomCategories(updated)
    toast.success(`Category "${val}" list me add ho gayi!`)
  }

  const handleStartEditCategory = (cat, e) => {
    e.stopPropagation()
    setCategoryToEdit(cat)
    setEditingCategoryName(cat)
  }

  const handleSaveEditCategory = (oldCat, e) => {
    e.stopPropagation()
    const trimmed = editingCategoryName.trim()
    if (!trimmed) {
      toast.warning('Category ka naam khali nahi ho sakta')
      return
    }
    const updated = customCategories.map(c => c === oldCat ? trimmed : c)
    saveCustomCategories(updated)
    if (form.category === oldCat) {
      setForm(prev => ({ ...prev, category: trimmed }))
    }
    setCategoryToEdit(null)
    setEditingCategoryName('')
    toast.success(`Category update ho gayi!`)
  }

  const handleDeleteCategory = async (catToDelete, e) => {
    e.stopPropagation()
    const confirmed = await confirmDialog({
      title: 'Delete Category?',
      text: `Kya aap category "${catToDelete}" ko suggestions list se hatana chahte hain?`,
      confirmButtonText: 'Yes, Remove',
    })
    if (!confirmed) return
    const updated = customCategories.filter(c => c !== catToDelete)
    saveCustomCategories(updated)
    if (form.category === catToDelete) {
      setForm(prev => ({ ...prev, category: '' }))
    }
    toast.success(`Category "${catToDelete}" remove ho gayi!`)
  }

  // ── Hierarchical Area Cascade Helpers (Block -> Gram Panchayat -> Village -> Ward) ──
  const getAreaOptionsForLevel = (levelIndex) => {
    if (!areaTreeData.tree || areaTreeData.tree.length === 0) return []
    if (levelIndex === 0) return areaTreeData.tree

    let currentNodes = areaTreeData.tree
    for (let i = 0; i < levelIndex; i++) {
      const prevLevel = areaTreeData.levels?.[i]
      const prevLevelId = String(prevLevel?._id || prevLevel?.id || '')
      const selectedId = selectedAreas[prevLevelId]
      if (!selectedId) return []
      const matchedNode = currentNodes.find(node => String(node._id || node.id) === String(selectedId))
      if (!matchedNode || !Array.isArray(matchedNode.children)) return []
      currentNodes = matchedNode.children
    }
    return currentNodes
  }

  const handleAreaSelect = (levelId, levelIndex, selectedId) => {
    const levelKey = String(levelId)
    const updatedAreas = { ...selectedAreas }

    if (selectedId && String(selectedId).trim() !== '') {
      updatedAreas[levelKey] = String(selectedId)
    } else {
      delete updatedAreas[levelKey]
    }

    // Reset deeper child levels
    const levels = areaTreeData.levels || []
    for (let i = levelIndex + 1; i < levels.length; i++) {
      const childLvlId = String(levels[i]?._id || levels[i]?.id || '')
      if (childLvlId) {
        delete updatedAreas[childLvlId]
      }
    }
    setSelectedAreas(updatedAreas)

    // Deepest selected area becomes form.areaId
    const validIds = Object.values(updatedAreas).filter(v => v && String(v).trim() !== '')
    const activeSelectedId = validIds.length > 0 ? validIds[validIds.length - 1] : ''
    setForm(prev => ({ ...prev, areaId: activeSelectedId }))
  }

  // Find chain of ancestor IDs for a given areaId in the tree
  const findAreaAncestorMap = (targetId, nodes = areaTreeData.tree, path = {}) => {
    if (!targetId || !Array.isArray(nodes)) return null
    for (const node of nodes) {
      const levelId = String(node.levelId?._id || node.levelId || '')
      const nodeId = String(node._id || node.id)
      const currentPath = { ...path, [levelId]: nodeId }
      if (nodeId === String(targetId)) {
        return currentPath
      }
      if (node.children?.length) {
        const found = findAreaAncestorMap(targetId, node.children, currentPath)
        if (found) return found
      }
    }
    return null
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.warning('⚠️ Title likhna zaroori hai!')
      return
    }
    if (!form.category.trim()) {
      toast.warning('⚠️ Category likhna zaroori hai!')
      return
    }
    setSaving(true)
    try {
      const catVal = form.category.trim()
      // Auto-save category into suggestions list if not present
      if (catVal && !customCategories.some(c => c.toLowerCase() === catVal.toLowerCase())) {
        saveCustomCategories([...customCategories, catVal])
      }

      const payload = {
        title: form.title.trim(),
        category: catVal,
        description: form.description?.trim() || null,
        status: form.status || 'upcoming',
        budget: form.budget?.trim() || null,
        location: form.location?.trim() || null,
        isPublished: form.isPublished !== false,
        images: form.images || [],
        beforeAfter: form.beforeAfter || { before: [], after: [] },
      }

      if (form.areaId) {
        payload.areaId = form.areaId
      }

      if (editId) {
        await WorksAPI.update(editId, payload)
        toast.success(`✨ Work "${payload.title}" successfully update ho gaya!`)
      } else {
        await WorksAPI.create(payload)
        toast.success(`🎉 Naya Work "${payload.title}" successfully add ho gaya!`)
      }
      setShowForm(false)
      setEditId(null)
      setForm(EMPTY)
      setNewImageUrl('')
      setNewBeforeUrl('')
      setNewAfterUrl('')
      load()
    } catch (e) {
      toast.error(`❌ Save nahi ho paya: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, title, e) => {
    e.stopPropagation()
    const confirmed = await confirmDialog({
      title: 'Delete Work Project?',
      text: `Kya aap sach me "${title || 'is work'}" ko delete karna chahte hain?`,
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await WorksAPI.remove(id)
      toast.success(`🗑️ "${title || 'Work'}" successfully delete ho gaya!`)
      load()
    } catch (e) {
      toast.error(`❌ Delete karne me error: ${e.message}`)
    }
  }

  const openEdit = (w, e) => {
    e.stopPropagation()
    const targetAreaId = w.areaId?._id || w.areaId || w.area?._id || ''
    const ancestorMap = findAreaAncestorMap(targetAreaId) || {}
    setSelectedAreas(ancestorMap)

    setForm({
      title: w.title || '',
      description: w.description || '',
      category: w.category || '',
      status: w.status || 'upcoming',
      areaId: targetAreaId,
      budget: w.budget || '',
      location: w.location || '',
      isPublished: w.isPublished !== false,
      images: Array.isArray(w.images) ? w.images : [],
      beforeAfter: {
        before: Array.isArray(w.beforeAfter?.before) ? w.beforeAfter.before : (Array.isArray(w.beforeImages) ? w.beforeImages : []),
        after: Array.isArray(w.beforeAfter?.after) ? w.beforeAfter.after : (Array.isArray(w.afterImages) ? w.afterImages : []),
      },
    })
    setEditId(w._id)
    setShowForm(true)
    toast.info(`Editing: "${w.title}"`, { autoClose: 1500 })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Development Works</h1>
          <p className="text-xs text-gray-400">{total} works</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setSelectedAreas({}); setShowForm(true) }}
          className="btn-primary flex items-center gap-1.5 px-4 py-2.5 text-sm cursor-pointer">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Add Work
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[['Completed', stats?.completed, 'text-green-600'], ['In Progress', stats?.in_progress, 'text-blue-600'], ['Upcoming', stats?.upcoming, 'text-yellow-600']].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-3 text-center border border-gray-100 shadow-sm">
              <p className={`text-lg font-black ${c}`}>{v ?? 0}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar with Status, Category, Area & Search */}
      <div className="bg-white rounded-2xl p-3 border border-gray-100 shadow-xs space-y-3">
        {/* Status Pills */}
        <div className="flex gap-2 no-scrollbar overflow-x-auto pb-0.5">
          {['all', 'upcoming', 'in_progress', 'completed'].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(1) }}
              className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize cursor-pointer ${filter === f ? 'text-white border-transparent' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
              style={filter === f ? { background: 'var(--primary)', borderColor: 'var(--primary)' } : {}}>{f.replace('_', ' ')}</button>
          ))}
        </div>

        {/* Category & Area Dropdowns + Search Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 border-t border-gray-100">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
              className="w-full h-10 border border-gray-200 rounded-xl px-3 text-xs font-semibold text-gray-700 bg-gray-50/50 outline-none focus:border-[var(--primary)] focus:bg-white transition-all cursor-pointer truncate"
            >
              <option value="">📁 All Categories (सभी श्रेणियां)</option>
              {customCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="relative">
            <select
              value={filterAreaId}
              onChange={(e) => { setFilterAreaId(e.target.value); setPage(1) }}
              className="w-full h-10 border border-gray-200 rounded-xl px-3 text-xs font-semibold text-gray-700 bg-gray-50/50 outline-none focus:border-[var(--primary)] focus:bg-white transition-all cursor-pointer truncate"
            >
              <option value="">📍 All Areas (सभी क्षेत्र)</option>
              {areas.map(a => (
                <option key={a._id} value={a._id}>
                  {a.name} {a.levelName ? `(${a.levelName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box & Reset */}
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search work title, desc..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl pl-8 pr-3 text-xs font-medium text-gray-800 bg-gray-50/50 outline-none focus:border-[var(--primary)] focus:bg-white transition-all"
              />
            </div>
            {(filter !== 'all' || filterCategory || filterAreaId || searchQuery.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setFilter('all')
                  setFilterCategory('')
                  setFilterAreaId('')
                  setSearchQuery('')
                  setPage(1)
                }}
                title="Reset Filters"
                className="h-10 px-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Complete Form Modal with ALL Backend Fields */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">{editId ? 'Edit Work' : 'Add New Work'}</h2>
                <p className="text-[11px] text-gray-400">Sabhi fields bharein aur save karein</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer p-1">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Title (Kaam Ka Naam) *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Main Market Road CC Pavement"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-700">Category *</label>
                  {form.category?.trim() && !customCategories.some(c => c.toLowerCase() === form.category.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
                    >
                      + Save as Category
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Roads & Infrastructure"
                    className="flex-1 border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
                
                {/* Category Chips with Edit & Delete */}
                <div className="mt-2.5">
                  <p className="text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">Quick Suggestions (Click to select, edit, delete):</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {customCategories.map(cat => {
                      const isSelected = form.category?.trim().toLowerCase() === cat.toLowerCase()
                      const isEditing = categoryToEdit === cat

                      if (isEditing) {
                        return (
                          <div key={cat} className="flex items-center gap-1 bg-white border border-primary p-1 rounded-xl shadow-xs">
                            <input
                              type="text"
                              autoFocus
                              value={editingCategoryName}
                              onChange={e => setEditingCategoryName(e.target.value)}
                              className="text-xs px-2 py-0.5 border border-gray-300 rounded-lg outline-none w-28"
                            />
                            <button
                              type="button"
                              onClick={(e) => handleSaveEditCategory(cat, e)}
                              className="p-1 bg-green-600 text-white rounded-md cursor-pointer hover:bg-green-700"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setCategoryToEdit(null) }}
                              className="p-1 bg-gray-200 text-gray-700 rounded-md cursor-pointer hover:bg-gray-300"
                            >
                              <CloseIcon className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      }

                      return (
                        <div
                          key={cat}
                          onClick={() => setForm({ ...form, category: cat })}
                          className={`group inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-xl border transition-all cursor-pointer select-none ${
                            isSelected
                              ? 'bg-primary text-white border-transparent shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                          }`}
                          style={isSelected ? { background: 'var(--primary)', color: '#fff' } : {}}
                        >
                          <span className="truncate max-w-[140px]">{cat}</span>
                          <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100">
                            <button
                              type="button"
                              title="Edit Category"
                              onClick={(e) => handleStartEditCategory(cat, e)}
                              className={`p-0.5 rounded hover:scale-110 transition-transform cursor-pointer ${
                                isSelected ? 'text-white/90 hover:text-white' : 'text-gray-400 hover:text-blue-600'
                              }`}
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              title="Remove Category"
                              onClick={(e) => handleDeleteCategory(cat, e)}
                              className={`p-0.5 rounded hover:scale-110 transition-transform cursor-pointer ${
                                isSelected ? 'text-white/90 hover:text-white' : 'text-gray-400 hover:text-red-600'
                              }`}
                            >
                              <CloseIcon className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Hierarchical Area Selection (Block -> Gram Panchayat -> Village) */}
              <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>Area Hierarchy (Block → Panchayat → Village)</span>
                  </label>
                  {form.areaId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAreas({})
                        setForm(prev => ({ ...prev, areaId: '' }))
                      }}
                      className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                    >
                      Clear Area
                    </button>
                  )}
                </div>

                {areaTreeData.levels && areaTreeData.levels.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {areaTreeData.levels
                      .filter(lvl => (lvl.name || '').toLowerCase() !== 'ward' && (lvl.levelOrder || 0) <= 3)
                      .map((lvl, index) => {
                        const lvlId = String(lvl._id || lvl.id)
                        const isFirstLevel = index === 0
                        const prevLevels = areaTreeData.levels.filter(l => (l.name || '').toLowerCase() !== 'ward' && (l.levelOrder || 0) <= 3)
                        const prevLevel = prevLevels[index - 1]
                        const prevLevelId = prevLevel ? String(prevLevel._id || prevLevel.id) : null
                        const isParentSelected = isFirstLevel || (prevLevelId && Boolean(selectedAreas[prevLevelId]))
                        const options = isParentSelected ? getAreaOptionsForLevel(index) : []
                        const currentValue = selectedAreas[lvlId] || ''

                        if (!isParentSelected && !currentValue) return null

                        return (
                          <div key={lvlId} className="flex flex-col gap-1">
                            <label className="text-[11px] font-bold text-gray-600">
                              {lvl.name || `Level ${index + 1}`}
                            </label>
                            <select
                              value={currentValue}
                              onChange={(e) => handleAreaSelect(lvlId, index, e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)] bg-white font-medium"
                            >
                              <option value="">{`-- Select ${lvl.name || 'Area'} --`}</option>
                              {options.map((opt) => (
                                <option key={opt._id || opt.id} value={opt._id || opt.id}>
                                  {opt.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                  </div>
                ) : (
                  <select
                    value={form.areaId}
                    onChange={(e) => setForm({ ...form, areaId: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 h-10 text-xs outline-none focus:border-[var(--primary)] bg-white"
                  >
                    <option value="">All Area / Select</option>
                    {areas.map(a => (
                      <option key={a._id} value={a._id}>
                        {a.name} {a.levelName ? `(${a.levelName})` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Budget */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Budget (Laagat)</label>
                <input value={form.budget || ''} onChange={e => setForm({ ...form, budget: e.target.value })}
                  placeholder="e.g. ₹ 15,00,000"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>

              {/* Location & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Location (Sthaan)</label>
                  <input value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })}
                    placeholder="e.g. Near Gandhi Chowk"
                    className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">Status (Sthiti)</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-gray-200 rounded-2xl px-3 h-11 text-xs outline-none bg-white font-semibold">
                    <option value="upcoming">Upcoming (Prastavit)</option>
                    <option value="in_progress">In Progress (Chal raha hai)</option>
                    <option value="completed">Completed (Poora)</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Description (Vivaran)</label>
                <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Kaam ke baare me poori jaankari..."
                  className="w-full border border-gray-200 rounded-2xl px-4 py-2.5 text-sm outline-none resize-none focus:border-[var(--primary)]" />
              </div>

              {/* isPublished Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">Publish on Public App</p>
                  <p className="text-[10px] text-gray-400">Citizen app par janta ko dikhana hai</p>
                </div>
                <input type="checkbox" checked={form.isPublished !== false}
                  onChange={e => setForm({ ...form, isPublished: e.target.checked })}
                  className="w-5 h-5 accent-[var(--primary)] rounded cursor-pointer" />
              </div>

              {/* Work Images Section */}
              <div className="border border-gray-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-gray-800">📸 Work Photos (Images)</p>
                    <p className="text-[10px] text-gray-400">Kaam ki normal photos</p>
                  </div>
                  <label className="text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer text-white shadow-sm"
                    style={{ background: 'var(--primary)' }}>
                    + Upload Photos
                    <input type="file" multiple accept="image/*" className="hidden"
                      onChange={e => handleFileUpload(e.target.files, 'images')} />
                  </label>
                </div>

                {/* URL Input */}
                <div className="flex gap-2">
                  <input value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                    placeholder="Ya image URL paste karein..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 h-8 text-xs outline-none" />
                  <button type="button" onClick={() => {
                    if (newImageUrl.trim()) {
                      setForm(prev => ({ ...prev, images: [...(prev.images || []), newImageUrl.trim()] }))
                      setNewImageUrl('')
                    }
                  }} className="text-xs font-bold px-3 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer">Add</button>
                </div>

                {/* Previews */}
                {form.images?.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    {form.images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden h-16 border border-gray-200">
                        <img src={img} alt={`Work ${idx}`} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => {
                          setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
                        }} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-90 hover:opacity-100 cursor-pointer">✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Before & After Photos Section */}
              <div className="border border-blue-100 bg-blue-50/30 rounded-2xl p-3.5 space-y-3">
                <div>
                  <p className="text-xs font-bold text-blue-900">🔄 Before & After Photos</p>
                  <p className="text-[10px] text-gray-400">Pehle ki aur baad ki photos comparison</p>
                </div>

                {/* Before Photos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">Pehle Ki Photos (Before)</span>
                    <label className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200">
                      + Upload Before
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e => handleFileUpload(e.target.files, 'beforeAfter', 'before')} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input value={newBeforeUrl} onChange={e => setNewBeforeUrl(e.target.value)}
                      placeholder="Before image URL..."
                      className="flex-1 border border-gray-200 rounded-xl px-3 h-8 text-xs outline-none bg-white" />
                    <button type="button" onClick={() => {
                      if (newBeforeUrl.trim()) {
                        setForm(prev => ({
                          ...prev,
                          beforeAfter: { ...prev.beforeAfter, before: [...(prev.beforeAfter?.before || []), newBeforeUrl.trim()] }
                        }))
                        setNewBeforeUrl('')
                      }
                    }} className="text-xs font-bold px-2.5 h-8 bg-gray-100 rounded-xl cursor-pointer">Add</button>
                  </div>
                  {form.beforeAfter?.before?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {form.beforeAfter.before.map((img, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden h-14 border border-gray-200">
                          <img src={img} alt={`Before ${idx}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              beforeAfter: { ...prev.beforeAfter, before: prev.beforeAfter.before.filter((_, i) => i !== idx) }
                            }))
                          }} className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* After Photos */}
                <div className="space-y-1.5 pt-2 border-t border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-700">Baad Ki Photos (After)</span>
                    <label className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-green-100 text-green-700 cursor-pointer hover:bg-green-200">
                      + Upload After
                      <input type="file" multiple accept="image/*" className="hidden"
                        onChange={e => handleFileUpload(e.target.files, 'beforeAfter', 'after')} />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <input value={newAfterUrl} onChange={e => setNewAfterUrl(e.target.value)}
                      placeholder="After image URL..."
                      className="flex-1 border border-gray-200 rounded-xl px-3 h-8 text-xs outline-none bg-white" />
                    <button type="button" onClick={() => {
                      if (newAfterUrl.trim()) {
                        setForm(prev => ({
                          ...prev,
                          beforeAfter: { ...prev.beforeAfter, after: [...(prev.beforeAfter?.after || []), newAfterUrl.trim()] }
                        }))
                        setNewAfterUrl('')
                      }
                    }} className="text-xs font-bold px-2.5 h-8 bg-gray-100 rounded-xl cursor-pointer">Add</button>
                  </div>
                  {form.beforeAfter?.after?.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      {form.beforeAfter.after.map((img, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden h-14 border border-gray-200">
                          <img src={img} alt={`After ${idx}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            setForm(prev => ({
                              ...prev,
                              beforeAfter: { ...prev.beforeAfter, after: prev.beforeAfter.after.filter((_, i) => i !== idx) }
                            }))
                          }} className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] cursor-pointer">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 sm:p-5 border-t border-gray-100 shrink-0 bg-gray-50 rounded-b-3xl">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm font-bold disabled:opacity-70 cursor-pointer shadow-md">
                {saving ? 'Saving Work...' : (editId ? 'Save Changes' : 'Save Work')}
              </button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-300 text-sm font-bold rounded-2xl bg-white hover:bg-gray-50 cursor-pointer">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <>
          <div className="space-y-3">
            {items
              .filter(w => {
                if (!searchQuery.trim()) return true
                const q = searchQuery.toLowerCase().trim()
                const areaName = (w.areaId?.name || w.area?.name || '').toLowerCase()
                const loc = (w.location || '').toLowerCase()
                const title = (w.title || '').toLowerCase()
                const desc = (w.description || '').toLowerCase()
                const cat = (w.category || '').toLowerCase()
                return title.includes(q) || desc.includes(q) || areaName.includes(q) || loc.includes(q) || cat.includes(q)
              })
              .map(w => {
              const sc = statusConfig[w.status?.toLowerCase()] || statusConfig.upcoming
              const StatusIcon = sc.Icon
              const areaName = w.areaId?.name || w.area?.name || 'All Area'
              const thumbImg = w.images?.[0] || w.beforeAfter?.after?.[0] || w.beforeAfter?.before?.[0] || w.beforeImages?.[0] || w.afterImages?.[0]
              const totalPhotos = (w.images?.length || 0) + (w.beforeAfter?.before?.length || 0) + (w.beforeAfter?.after?.length || 0)

              return (
                <div key={w._id} onClick={() => navigate(`/works/${w._id}`)}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 sm:p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform hover:border-gray-200">
                  {/* Image or Icon */}
                  {thumbImg ? (
                    <img
                      src={resolveImageUrl(thumbImg)}
                      alt={w.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.target.onerror = null; e.target.src = SVG_FALLBACK }}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-gray-100 shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                      style={{ background: 'var(--primary-light)' }}>
                      <HardHat className="w-7 h-7" style={{ color: 'var(--primary)' }} />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800 truncate">{w.title}</p>
                      {w.isPublished === false && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">Draft</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate flex items-center gap-1">
                      <span>{w.category || 'General'}</span>
                      <span>·</span>
                      <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                      <span>{areaName} {w.location ? `(${w.location})` : ''}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sc.bg} ${sc.text}`}>
                        <StatusIcon className="w-3 h-3" /> {sc.label}
                      </span>
                      {w.budget && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <IndianRupee className="w-3 h-3" /> {w.budget}
                        </span>
                      )}
                      {totalPhotos > 0 && (
                        <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1">
                          <Camera className="w-3 h-3" /> {totalPhotos}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0 items-end" onClick={e => e.stopPropagation()}>
                    <button onClick={e => openEdit(w, e)}
                      className="px-2.5 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 cursor-pointer flex items-center gap-1">
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button onClick={e => handleDelete(w._id, w.title, e)}
                      className="px-2.5 py-1 text-xs font-bold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 cursor-pointer flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                      <span>Del</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {items.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 text-gray-400">
                <HardHat className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-gray-600">No development works found</p>
              <p className="text-xs text-gray-400 mt-1">Naya work add karne ke liye "+ Add Work" button par click karein</p>
            </div>
          )}
          {/* Pagination & Page Size Control */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 bg-white p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
                className="h-8 border border-gray-200 rounded-lg px-2 text-xs font-bold text-gray-700 bg-gray-50 outline-none focus:border-[var(--primary)] cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-xs text-gray-400 font-medium">
                (Showing {items.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} of {total})
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => Math.max(1, p - 1))} 
                className="text-xs font-bold disabled:opacity-30 cursor-pointer px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all" 
                style={{ color: 'var(--primary)' }}
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-600 font-bold px-1">
                Page {page} of {Math.max(1, Math.ceil(total / limit))}
              </span>
              <button 
                disabled={page >= Math.ceil(total / limit) || total === 0} 
                onClick={() => setPage(p => p + 1)} 
                className="text-xs font-bold disabled:opacity-30 cursor-pointer px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all" 
                style={{ color: 'var(--primary)' }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
