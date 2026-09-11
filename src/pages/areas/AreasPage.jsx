import { useState, useEffect, useCallback } from 'react'
import {
  MapPin,
  ChevronRight,
  Plus,
  X,
  Layers,
  Edit2,
  Trash2,
  CornerDownRight,
  FolderTree,
  Building2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { AreasAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import Swal, { confirmDialog } from '../../utils/sweetAlert'

function TreeNode({ node, depth = 0, onAdd, onEdit, onDelete }) {
  const [open, setOpen] = useState(true)
  const levelName = node.levelId?.name || node.levelName || 'Area'
  const hasChildren = Boolean(node.children && node.children.length > 0)

  const levelColorStyles = [
    'bg-purple-50 text-purple-700 border-purple-200/60',
    'bg-blue-50 text-blue-700 border-blue-200/60',
    'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    'bg-amber-50 text-amber-700 border-amber-200/60',
    'bg-indigo-50 text-indigo-700 border-indigo-200/60',
    'bg-rose-50 text-rose-700 border-rose-200/60',
    'bg-teal-50 text-teal-700 border-teal-200/60',
    'bg-gray-50 text-gray-700 border-gray-200/60',
  ]

  const badgeStyle = levelColorStyles[depth % levelColorStyles.length]

  return (
    <div className="relative">
      {/* Node Row */}
      <div
        className={`flex items-center justify-between gap-2 py-2.5 px-3 rounded-2xl transition-all hover:bg-gray-50/90 border border-transparent hover:border-gray-100 ${
          depth > 0 ? 'mt-1' : 'mt-2'
        }`}
        style={{ marginLeft: `${depth * 18}px` }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Depth connector indicator */}
          {depth > 0 && (
            <CornerDownRight className="w-3.5 h-3.5 text-gray-300 shrink-0 -ml-1" />
          )}

          {/* Expand / Collapse Toggle */}
          {hasChildren ? (
            <button
              onClick={() => setOpen(!open)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 shrink-0 transition-all"
              title={open ? 'Collapse' : 'Expand'}
            >
              <ChevronRight
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  open ? 'rotate-90 text-gray-700' : ''
                }`}
              />
            </button>
          ) : (
            <div className="w-6 h-6 flex items-center justify-center shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            </div>
          )}

          {/* Level Badge */}
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border shrink-0 ${badgeStyle}`}
          >
            {levelName}
          </span>

          {/* Area Name */}
          <span className="text-xs sm:text-sm font-bold text-gray-800 truncate">
            {node.name}
          </span>

          {/* Code pill if available */}
          {node.code && (
            <span className="hidden sm:inline-flex text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 shrink-0">
              {node.code}
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Add Child Area */}
          <button
            onClick={() => onAdd(node)}
            className="text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            title="Add sub-area under this"
          >
            +Child
          </button>

          {/* Edit Area */}
          <button
            onClick={() => onEdit(node)}
            className="p-1 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
            title="Edit area details"
          >
            <Edit2 className="w-3 h-3 sm:hidden" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          {/* Delete Area */}
          <button
            onClick={() => onDelete(node)}
            className="p-1 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-colors"
            title="Delete this area"
          >
            <Trash2 className="w-3 h-3 sm:hidden" />
            <span className="hidden sm:inline">Del</span>
          </button>
        </div>
      </div>

      {/* Children Nodes */}
      {open && hasChildren && (
        <div className="relative pl-1">
          {node.children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              depth={depth + 1}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function AreasPage() {
  const { show, Toast } = useToast()
  const [tree, setTree] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Form modal state
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', code: '', levelId: '', parentId: '' })
  const [parentName, setParentName] = useState('')
  const [saving, setSaving] = useState(false)

  // Level configuration modal
  const [newLevel, setNewLevel] = useState('')
  const [showLevelModal, setShowLevelModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [trRes, lvRes] = await Promise.all([
        AreasAPI.getTree(),
        AreasAPI.getLevels().catch(() => null),
      ])

      // Robust tree parsing (handles both { levels, tree } and raw arrays)
      const trData = trRes?.data ?? trRes
      const treeList = Array.isArray(trData?.tree)
        ? trData.tree
        : Array.isArray(trData)
        ? trData
        : []
      setTree(treeList)

      // Robust levels parsing
      const lvData = lvRes?.data ?? lvRes
      const levelsList = Array.isArray(trData?.levels)
        ? trData.levels
        : Array.isArray(lvData)
        ? lvData
        : []

      // Sort levels by levelOrder
      levelsList.sort((a, b) => (a.levelOrder ?? 0) - (b.levelOrder ?? 0))
      setLevels(levelsList)
    } catch (e) {
      setError(e.message || 'Failed to load area hierarchy')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Flat list of all areas for parent selection
  const flattenAreas = (nodes, result = []) => {
    if (!Array.isArray(nodes)) return result
    for (const node of nodes) {
      result.push({
        _id: node._id,
        name: node.name,
        levelName: node.levelId?.name || node.levelName || '',
      })
      if (node.children?.length) {
        flattenAreas(node.children, result)
      }
    }
    return result
  }

  const allAreasFlat = flattenAreas(tree)

  // Open modal for Adding Area
  const handleAdd = (parent = null) => {
    setEditId(null)
    setParentName(parent?.name || '')

    // Determine default level (next child level if parent exists, else root level)
    let nextLevelId = ''
    if (parent && levels.length > 0) {
      const parentLevelId = parent.levelId?._id || parent.levelId
      const parentIdx = levels.findIndex((l) => l._id === parentLevelId)
      if (parentIdx !== -1 && parentIdx + 1 < levels.length) {
        nextLevelId = levels[parentIdx + 1]._id
      } else {
        nextLevelId = levels[levels.length - 1]._id
      }
    } else if (levels.length > 0) {
      nextLevelId = levels[0]._id
    }

    setForm({
      name: '',
      code: '',
      levelId: nextLevelId,
      parentId: parent?._id || '',
    })
    setShowForm(true)
  }

  // Open modal for Editing Area
  const handleEdit = (node) => {
    setEditId(node._id)
    setParentName('')
    setForm({
      name: node.name || '',
      code: node.code || '',
      levelId: node.levelId?._id || node.levelId || '',
      parentId: node.parentId?._id || node.parentId || '',
    })
    setShowForm(true)
  }

  // Save Area (Create or Update)
  const handleSave = async () => {
    if (!form.name.trim()) {
      show('Area name is required', 'error')
      return
    }
    if (!form.levelId) {
      show('Please select a hierarchy level', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        levelId: form.levelId,
        parentId: form.parentId || undefined,
        code: form.code?.trim() || undefined,
      }

      if (editId) {
        await AreasAPI.updateArea(editId, payload)
        show('Area updated successfully!')
      } else {
        await AreasAPI.createArea(payload)
        show('Area created successfully!')
      }

      setShowForm(false)
      setEditId(null)
      await load()
    } catch (e) {
      show(e.message || 'Failed to save area', 'error')
    } finally {
      setSaving(false)
    }
  }

  // Delete Area
  const handleDelete = async (node) => {
    const confirmed = await confirmDialog({
      title: 'Delete Area?',
      text: `Are you sure you want to delete "${node.name}"? If it has sub-areas, delete them first.`,
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return

    try {
      await AreasAPI.deleteArea(node._id)
      show('Area deleted successfully!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to delete area', 'error')
    }
  }

  // Create Hierarchy Level
  const handleCreateLevel = async () => {
    if (!newLevel.trim()) return
    try {
      await AreasAPI.createLevel({
        name: newLevel.trim(),
        levelOrder: levels.length + 1,
        rank: levels.length + 1,
      })
      show('Hierarchy level created!')
      setNewLevel('')
      await load()
    } catch (e) {
      show(e.message || 'Failed to create level', 'error')
    }
  }

  // Delete Level
  const handleDeleteLevel = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Area Level?',
      text: 'Are you sure you want to delete this level? Areas must not be using this level.',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return

    try {
      await AreasAPI.deleteLevel(id)
      show('Level deleted!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to delete level', 'error')
    }
  }

  // Rename Level
  const handleEditLevel = async (id, currentName) => {
    const { value: name } = await Swal.fire({
      title: 'Rename Hierarchy Level',
      input: 'text',
      inputValue: currentName,
      showCancelButton: true,
      confirmButtonText: 'Save',
      confirmButtonColor: 'var(--primary)',
      customClass: {
        popup: 'rounded-3xl p-5 shadow-2xl font-sans border border-gray-100',
        title: 'text-base font-bold text-gray-900',
        input: 'rounded-xl text-xs font-semibold',
        confirmButton: 'rounded-xl font-bold px-4 py-2 text-xs shadow-xs',
        cancelButton: 'rounded-xl font-bold px-4 py-2 text-xs shadow-xs',
      },
    })
    if (!name?.trim() || name.trim() === currentName) return

    try {
      await AreasAPI.updateLevel(id, { name: name.trim() })
      show('Level updated!')
      await load()
    } catch (e) {
      show(e.message || 'Failed to update level', 'error')
    }
  }

  return (
    <div className="space-y-4 pb-28 sm:pb-12 max-w-3xl mx-auto">
      <Toast />

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between gap-2 bg-white p-4 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-black text-gray-900 truncate">
            Area Hierarchy
          </h1>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {allAreasFlat.length} areas configured · {levels.length} levels
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowLevelModal(true)}
            className="flex items-center gap-1 text-xs font-bold px-3 py-2 border border-gray-200 rounded-xl sm:rounded-2xl text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Manage</span> Levels
          </button>

          <button
            onClick={() => handleAdd(null)}
            className="btn-primary flex items-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm shadow-sm active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Area</span>
          </button>
        </div>
      </div>

      {/* ── CONFIGURED LEVELS BADGES BAR ── */}
      {levels.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 px-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
            Hierarchy:
          </span>
          {levels.map((l, i) => (
            <div
              key={l._id}
              className="shrink-0 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200/80 shadow-2xs"
            >
              <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-xs font-bold text-gray-700">{l.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── TREE CONTAINER ── */}
      {loading ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <Skeleton rows={6} />
        </div>
      ) : error ? (
        <ApiError message={error} onRetry={load} />
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs border border-gray-100/90">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <FolderTree className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              Territory Tree View
            </span>
            <span className="text-xs text-gray-400">
              Click +Child to nest deeper
            </span>
          </div>

          {tree.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: 'var(--primary-light)' }}
              >
                <MapPin className="w-7 h-7" style={{ color: 'var(--primary)' }} />
              </div>
              <h3 className="text-base font-bold text-gray-800">
                No Areas Configured Yet
              </h3>
              <p className="text-xs text-gray-400 max-w-xs mt-1">
                Start by configuring levels (e.g. Block, Ward, Booth) and then add your primary areas.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowLevelModal(true)}
                  className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Configure Levels
                </button>
                <button
                  onClick={() => handleAdd(null)}
                  className="btn-primary px-4 py-2 text-xs flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add First Area
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tree.map((node) => (
                <TreeNode
                  key={node._id}
                  node={node}
                  depth={0}
                  onAdd={handleAdd}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CONFIGURE LEVELS MODAL ── */}
      {showLevelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Configure Hierarchy Levels
                </h2>
                <p className="text-[11px] text-gray-400">
                  Defines levels from top (1) to bottom (e.g. Block ➔ Ward ➔ Booth)
                </p>
              </div>
              <button
                onClick={() => setShowLevelModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto no-scrollbar">
              {/* Add New Level Input */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Add New Level (Rank {levels.length + 1})
                </label>
                <div className="flex gap-2">
                  <input
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    placeholder="e.g. Mandal, Sector, Booth..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 h-10 text-xs sm:text-sm outline-none focus:border-[var(--primary)]"
                  />
                  <button
                    onClick={handleCreateLevel}
                    className="btn-primary px-4 text-xs font-bold rounded-xl active:scale-95"
                  >
                    Add Level
                  </button>
                </div>
              </div>

              {/* Levels List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-gray-500 block">
                  Current Levels ({levels.length})
                </span>

                {levels.map((l, i) => (
                  <div
                    key={l._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100/80"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-gray-800">
                        {l.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditLevel(l._id, l.name)}
                        className="text-xs font-bold px-2.5 py-1 rounded-lg text-blue-600 bg-white border border-blue-100 hover:bg-blue-50"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => handleDeleteLevel(l._id)}
                        className="text-xs font-bold px-2 py-1 rounded-lg text-red-500 bg-white border border-red-100 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
              <button
                onClick={() => setShowLevelModal(false)}
                className="btn-primary text-xs font-bold px-5 py-2.5"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT AREA MODAL ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {editId ? 'Edit Area Details' : 'Add New Area'}
                </h2>
                <p className="text-[11px] text-gray-400">
                  {editId
                    ? 'Modify area title, level or parent association'
                    : parentName
                    ? `Adding child under: ${parentName}`
                    : 'Create a new territory unit'}
                </p>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 overflow-y-auto max-h-[75vh] no-scrollbar">
              {/* Area Name */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Area Name *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Ward 12, Gandhi Nagar, Central Block"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Area Code */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Area Code (Optional)
                </label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. W-12, BLK-01"
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>

              {/* Hierarchy Level */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Hierarchy Level *
                </label>
                <select
                  value={form.levelId}
                  onChange={(e) => setForm({ ...form, levelId: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] bg-white"
                >
                  <option value="">-- Select Level --</option>
                  {levels.map((l, i) => (
                    <option key={l._id} value={l._id}>
                      Level {i + 1}: {l.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Parent Area */}
              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">
                  Parent Area (Optional)
                </label>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)] bg-white"
                >
                  <option value="">None (Top Root Level)</option>
                  {allAreasFlat
                    .filter((a) => a._id !== editId) // Prevent circular parenting
                    .map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.levelName || 'Area'})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 p-4 border-t border-gray-100 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 h-11 border border-gray-200 text-xs sm:text-sm font-bold rounded-2xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex-1 h-11 text-xs sm:text-sm font-bold rounded-2xl disabled:opacity-70 shadow-sm"
              >
                {saving
                  ? 'Saving...'
                  : editId
                  ? 'Update Area'
                  : 'Create Area'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
