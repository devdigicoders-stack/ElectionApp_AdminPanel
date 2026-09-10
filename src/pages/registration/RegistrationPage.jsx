import { useState, useEffect } from 'react'
import { FileEdit, Plus, X } from 'lucide-react'
import { RegistrationFormAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const FIELD_TYPES = ['text', 'number', 'date', 'select', 'radio', 'checkbox', 'file', 'phone', 'area_selector']
const EMPTY_FIELD = { key: '', label: '', type: 'text', required: false, options: '' }

export default function RegistrationPage() {
  const { show, Toast } = useToast()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newField, setNewField] = useState(EMPTY_FIELD)
  const [saving, setSaving] = useState(false)
  const [editKey, setEditKey] = useState(null)
  const [tab, setTab] = useState('builder')

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await RegistrationFormAPI.getAdminForm()
      const data = res?.data ?? res
      setForm(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const fields = form?.fields || []

  const handleToggleRequired = async (key) => {
    const field = fields.find(f => f.key === key)
    if (!field) return
    try {
      await RegistrationFormAPI.updateField(key, { required: !field.required })
      show('Updated!'); load()
    } catch (e) { show(e.message, 'error') }
  }

  const handleSaveAllFields = async () => {
    try {
      await RegistrationFormAPI.updateFields(fields)
      show('Form order saved!')
    } catch (e) { show(e.message, 'error') }
  }

  const handleDeleteField = async (key) => {
    if (!confirm('Remove this field?')) return
    try { await RegistrationFormAPI.deleteField(key); show('Field removed!'); load() } catch (e) { show(e.message, 'error') }
  }

  const handleAddField = async () => {
    if (!newField.key.trim() || !newField.label.trim()) { show('Key & Label required', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...newField, options: newField.options ? newField.options.split(',').map(o => o.trim()) : [] }
      if (editKey) await RegistrationFormAPI.updateField(editKey, payload)
      else await RegistrationFormAPI.addField(payload)
      show(editKey ? 'Field updated!' : 'Field added!')
      setShowAdd(false); setNewField(EMPTY_FIELD); setEditKey(null); load()
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleReset = async () => {
    if (!confirm('Reset registration form to default fields?')) return
    try { await RegistrationFormAPI.resetDefault(); show('Reset to default!'); load() } catch (e) { show(e.message, 'error') }
  }

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  return (
    <div className="space-y-4 max-w-2xl">
      <Toast />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Registration Form</h1>
          <p className="text-xs text-gray-400">Customize the public join form</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="text-xs font-bold px-3 py-2 border border-gray-200 rounded-2xl text-gray-500">Reset</button>
          <button onClick={() => { setNewField(EMPTY_FIELD); setEditKey(null); setShowAdd(true) }}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm">
            <Plus className="w-4 h-4" />Add Field
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {['builder', 'preview'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-bold rounded-xl capitalize transition-all ${tab === t ? 'text-white shadow-sm' : 'text-gray-500'}`}
            style={tab === t ? { background: 'var(--primary)' } : {}}>{t}</button>
        ))}
      </div>

      {/* Add/Edit Field Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold">{editKey ? 'Edit Field' : 'Add New Field'}</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Field Key</label>
                  <input value={newField.key} onChange={e => setNewField({ ...newField, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    disabled={!!editKey} placeholder="e.g. dob" className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-[var(--primary)] disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Label</label>
                  <input value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })}
                    placeholder="e.g. Date of Birth" className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Field Type</label>
                <select value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none">
                  {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {(newField.type === 'select' || newField.type === 'radio') && (
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Options (comma-separated)</label>
                  <input value={newField.options} onChange={e => setNewField({ ...newField, options: e.target.value })}
                    placeholder="Option A, Option B, Option C" className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-[var(--primary)]" />
                </div>
              )}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-2xl">
                <span className="text-sm font-semibold text-gray-700">Required Field</span>
                <button onClick={() => setNewField({ ...newField, required: !newField.required })}
                  className="relative w-10 h-5 rounded-full transition-all" style={{ background: newField.required ? 'var(--primary)' : '#d1d5db' }}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${newField.required ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 shrink-0">
              <button onClick={handleAddField} disabled={saving} className="btn-primary flex-1 h-11 text-sm disabled:opacity-70">{saving ? 'Saving...' : 'Save Field'}</button>
              <button onClick={() => setShowAdd(false)} className="flex-1 h-11 border border-gray-200 text-sm font-bold rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Builder Tab */}
      {tab === 'builder' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">{fields.length} fields</p>
            <button onClick={handleSaveAllFields} className="text-xs font-bold px-3 py-1.5 rounded-xl" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
              💾 Save Order
            </button>
          </div>
          <div className="bg-white rounded-2xl divide-y divide-gray-50 border border-gray-100 shadow-sm overflow-hidden">
            {fields.map(f => (
              <div key={f.key} className="p-4 flex items-center justify-between gap-3 group hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800">{f.label}</p>
                    <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{f.key}</span>
                    <span className="text-[9px] text-gray-400 font-semibold">{f.type}</span>
                  </div>
                  {f.options?.length > 0 && (
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">Options: {Array.isArray(f.options) ? f.options.join(', ') : f.options}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggleRequired(f.key)}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full transition-all"
                    style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {f.required ? 'Optional' : 'Required'}
                  </button>
                  <button onClick={() => { setNewField({ key: f.key, label: f.label, type: f.type, required: f.required, options: Array.isArray(f.options) ? f.options.join(',') : '' }); setEditKey(f.key); setShowAdd(true) }}
                    className="text-[10px] font-bold text-blue-500 opacity-0 group-hover:opacity-100">Edit</button>
                  {!['name', 'mobile'].includes(f.key) && (
                    <button onClick={() => handleDeleteField(f.key)}
                      className="text-[10px] font-bold text-red-400 opacity-0 group-hover:opacity-100">Del</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {fields.length === 0 && (
            <div className="py-10 text-center flex flex-col items-center">
              <FileEdit className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No fields. Click Reset to load defaults.</p>
            </div>
          )}
        </div>
      )}

      {/* Preview Tab */}
      {tab === 'preview' && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <p className="text-sm font-bold text-gray-800 mb-2">Form Preview</p>
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === 'select' || f.type === 'radio' ? (
                <select disabled className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm bg-gray-50 text-gray-400">
                  <option>Select {f.label}</option>
                  {(f.options || []).map(o => <option key={o}>{o}</option>)}
                </select>
              ) : f.type === 'date' ? (
                <input type="date" disabled className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm bg-gray-50" />
              ) : f.type === 'checkbox' ? (
                <div className="flex items-center gap-2">
                  <input type="checkbox" disabled className="rounded" />
                  <span className="text-xs text-gray-600">{f.label}</span>
                </div>
              ) : (
                <input disabled placeholder={`Enter ${f.label}`} className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm bg-gray-50 placeholder:text-gray-400" />
              )}
            </div>
          ))}
          <button disabled className="btn-primary w-full h-11 text-sm font-bold opacity-60 cursor-not-allowed">
            Submit Registration (Preview)
          </button>
        </div>
      )}
    </div>
  )
}
