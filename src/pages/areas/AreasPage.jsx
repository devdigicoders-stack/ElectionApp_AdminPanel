import { useState, useEffect } from 'react'
import { MapPin, ChevronRight, Plus, X } from 'lucide-react'
import { AreasAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

function TreeNode({ node, depth = 0, onAdd, onEdit }) {
  const [open, setOpen] = useState(depth < 2)
  const levelName = node.level?.name || node.levelName || 'Area'
  const levelColors = ['text-purple-600', 'text-blue-600', 'text-indigo-600', 'text-orange-600', 'text-yellow-600', 'text-green-600', 'text-teal-600', 'text-gray-600']

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-gray-50 group transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}>
        {node.children?.length > 0
          ? <button onClick={() => setOpen(!open)} className="w-4 h-4 flex items-center justify-center text-gray-400 shrink-0">
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
          : <div className="w-4 shrink-0" />}
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 ${levelColors[depth % levelColors.length]}`}>{levelName}</span>
        <span className="text-sm font-semibold text-gray-700 flex-1 truncate">{node.name}</span>
        <div className="hidden group-hover:flex items-center gap-2">
          <button onClick={() => onAdd(node)} className="text-[10px] font-bold" style={{ color: 'var(--primary)' }}>+Add</button>
          <button onClick={() => onEdit(node)} className="text-[10px] font-bold text-blue-500">Edit</button>
        </div>
      </div>
      {open && node.children?.map(child => (
        <TreeNode key={child._id} node={child} depth={depth + 1} onAdd={onAdd} onEdit={onEdit} />
      ))}
    </div>
  )
}

export default function AreasPage() {
  const { show, Toast } = useToast()
  const [tree, setTree] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', levelId: '', parentId: '' })
  const [saving, setSaving] = useState(false)
  const [newLevel, setNewLevel] = useState('')
  const [showLevelModal, setShowLevelModal] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const [tr, lv] = await Promise.all([AreasAPI.getTree(), AreasAPI.getLevels()])
      setTree(Array.isArray(tr?.data ?? tr) ? (tr?.data ?? tr) : [])
      setLevels(Array.isArray(lv?.data ?? lv) ? (lv?.data ?? lv) : [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handleAdd = (parent) => { setForm({ name: '', levelId: '', parentId: parent?._id || '' }); setShowForm(true) }
  const handleEdit = (node) => { setForm({ name: node.name, levelId: node.levelId || node.level?._id || '', parentId: node.parentId || '' }); setShowForm(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { show('Name required', 'error'); return }
    setSaving(true)
    try { await AreasAPI.createArea(form); show('Area created!'); setShowForm(false); load() }
    catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleCreateLevel = async () => {
    if (!newLevel.trim()) return
    try {
      await AreasAPI.createLevel({ name: newLevel.trim(), rank: levels.length + 1 })
      show('Level created!'); setNewLevel(''); setShowLevelModal(false); load()
    } catch (e) { show(e.message, 'error') }
  }

  const handleDeleteLevel = async (id) => {
    if (!confirm('Delete level?')) return
    try { await AreasAPI.deleteLevel(id); show('Level deleted!'); load() } catch (e) { show(e.message, 'error') }
  }

  const handleEditLevel = async (id, currentName) => {
    const name = prompt('New name:', currentName)
    if (!name?.trim()) return
    try { await AreasAPI.updateLevel(id, { name: name.trim() }); show('Updated!'); load() } catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="space-y-4">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Area Hierarchy</h1>
          <p className="text-xs text-gray-400">Manage districts, constituencies, wards & booths</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowLevelModal(true)} className="text-xs font-bold px-3 py-2 border border-gray-200 rounded-2xl text-gray-600">Levels</button>
          <button onClick={() => handleAdd(null)} className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus className="w-4 h-4" />Add Area
          </button>
        </div>
      </div>

      {showLevelModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Configure Hierarchy Levels</h2>
              <button onClick={() => setShowLevelModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex gap-2">
              <input value={newLevel} onChange={e => setNewLevel(e.target.value)} placeholder="e.g. District, Block, Ward..."
                className="flex-1 border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-[var(--primary)]" />
              <button onClick={handleCreateLevel} className="btn-primary px-4 text-sm font-bold">Add</button>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1">
              {levels.map((l, i) => (
                <div key={l._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-bold text-gray-700">{i + 1}. {l.name}</span>
                  <div className="flex gap-2">
                    <button onClick={() => handleEditLevel(l._id, l.name)} className="text-[10px] font-bold text-blue-500">Edit</button>
                    <button onClick={() => handleDeleteLevel(l._id)} className="text-[10px] font-bold text-red-400">Del</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold">Add Area</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Area Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none focus:border-[var(--primary)]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Level</label>
                <select value={form.levelId} onChange={e => setForm({ ...form, levelId: e.target.value })}
                  className="w-full border border-gray-200 rounded-2xl px-4 h-11 text-sm outline-none">
                  <option value="">Select Level</option>
                  {levels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving ? 'Saving...' : 'Save'}</button>
              <button onClick={() => setShowForm(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <Skeleton rows={5} /> : error ? <ApiError message={error} onRetry={load} /> : (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          {tree.length === 0
            ? (
              <div className="text-center py-8 flex flex-col items-center">
                <MapPin className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No areas configured yet</p>
              </div>
            )
            : tree.map(node => <TreeNode key={node._id} node={node} onAdd={handleAdd} onEdit={handleEdit} />)}
        </div>
      )}
    </div>
  )
}
