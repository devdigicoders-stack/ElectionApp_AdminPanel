import { useState, useEffect } from 'react'
import {
  FileEdit,
  Plus,
  X,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Eye,
  Sliders,
} from 'lucide-react'
import { RegistrationFormAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'phone',
  'email',
  'date',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'photo',
  'area_selector',
]

const FIELD_TYPE_LABELS = {
  text: 'Single Line Text',
  textarea: 'Multi-line Paragraph',
  number: 'Numeric / Number',
  phone: 'Mobile Phone (+91)',
  email: 'Email Address',
  date: 'Date (Calendar)',
  select: 'Dropdown (Single Choice)',
  multiselect: 'Multi-Select Options',
  radio: 'Radio Buttons',
  checkbox: 'Checkbox (Yes / No)',
  photo: 'Photo Upload',
  area_selector: 'Area / Ward Selector',
}

const EMPTY_FIELD = {
  key: '',
  label: '',
  type: 'text',
  required: false,
  options: '',
  placeholder: '',
  helpText: '',
}

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
    setLoading(true)
    setError(null)
    try {
      const res = await RegistrationFormAPI.getAdminForm()
      const data = res?.data ?? res
      setForm(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const fields = form?.fields || []
  const stats = form?.stats || {}

  // ── Toggle Required Status ────────────────────────────────
  const handleToggleRequired = async (key) => {
    const field = fields.find((f) => f.key === key)
    if (!field) return
    const nextRequired = !field.required
    try {
      // Optimistic update
      setForm((prev) => ({
        ...prev,
        fields: prev.fields.map((f) =>
          f.key === key ? { ...f, required: nextRequired } : f
        ),
      }))
      await RegistrationFormAPI.updateField(key, { required: nextRequired })
      show(nextRequired ? 'Field required ho gaya!' : 'Field optional ho gaya!')
    } catch (e) {
      show(e.message, 'error')
      load()
    }
  }

  // ── Reorder Field (Move Up / Down) ────────────────────────
  const moveField = async (index, direction) => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= fields.length) return

    const newFields = [...fields]
    const temp = newFields[index]
    newFields[index] = newFields[targetIndex]
    newFields[targetIndex] = temp

    const updatedFields = newFields.map((f, idx) => ({
      ...f,
      sortOrder: idx + 1,
    }))

    setForm((prev) => ({ ...prev, fields: updatedFields }))

    try {
      await RegistrationFormAPI.updateFields(updatedFields)
      show('Field order update ho gaya!')
    } catch (e) {
      show(e.message, 'error')
      load()
    }
  }

  // ── Save Bulk Field Order ─────────────────────────────────
  const handleSaveAllFields = async () => {
    try {
      await RegistrationFormAPI.updateFields(fields)
      show('Form order saved!')
    } catch (e) {
      show(e.message, 'error')
    }
  }

  // ── Delete Field ──────────────────────────────────────────
  const handleDeleteField = async (key, label) => {
    const confirmed = await confirmDialog({
      title: 'Field Remove Karein?',
      text: `Kya aap "${label || key}" field ko registration form se delete karna chahte hain?`,
      confirmButtonText: 'Haan, Delete Karo',
    })
    if (!confirmed) return
    try {
      await RegistrationFormAPI.deleteField(key)
      show('Field successfully removed!')
      load()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  // ── Add / Edit Field ──────────────────────────────────────
  const handleAddField = async () => {
    if (!newField.key.trim() || !newField.label.trim()) {
      show('Key aur Label required hai', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        key: newField.key.trim(),
        label: newField.label.trim(),
        type: newField.type,
        required: Boolean(newField.required),
        placeholder: newField.placeholder?.trim() || '',
        helpText: newField.helpText?.trim() || '',
        options: newField.options
          ? Array.isArray(newField.options)
            ? newField.options
            : newField.options.split(',').map((o) => o.trim()).filter(Boolean)
          : [],
      }

      if (editKey) {
        await RegistrationFormAPI.updateField(editKey, payload)
        show('Field successfully update ho gaya!')
      } else {
        await RegistrationFormAPI.addField(payload)
        show('Naya field successfully add ho gaya!')
      }

      setShowAdd(false)
      setNewField(EMPTY_FIELD)
      setEditKey(null)
      load()
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Reset to Default Template ─────────────────────────────
  const handleReset = async () => {
    const confirmed = await confirmDialog({
      title: 'Default Form Reset Karein?',
      text: 'Kya aap registration form ko wapas standard default template par reset karna chahte hain?',
      confirmButtonText: 'Haan, Reset Karo',
    })
    if (!confirmed) return
    try {
      await RegistrationFormAPI.resetDefault()
      show('Form default template par reset ho gaya!')
      load()
    } catch (e) {
      show(e.message, 'error')
    }
  }

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  return (
    <div className="space-y-4 max-w-3xl pb-28">
      <Toast />

      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileEdit className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500 shrink-0" />
            Registration Form Builder
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Citizen App ke public registration form ke fields, labels aur order ko customize karein
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleReset}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 shadow-xs transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5 text-gray-400" /> Reset
          </button>
          <button
            onClick={() => {
              setNewField(EMPTY_FIELD)
              setEditKey(null)
              setShowAdd(true)
            }}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
      </div>

      {/* ── Stats & Tabs Bar ───────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-xs">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shrink-0">
          {['builder', 'preview'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-lg capitalize transition-all ${
                tab === t ? 'bg-white text-orange-600 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'builder' ? 'Form Builder' : 'Live Preview'}
            </button>
          ))}
        </div>

        {/* Stats Pill */}
        <div className="text-right text-[11px] sm:text-xs text-gray-500 pr-2 truncate">
          <span className="font-bold text-gray-800">{fields.length} Fields</span>
          <span className="hidden sm:inline text-gray-300"> • </span>
          <span className="block sm:inline text-orange-600 font-semibold">
            {stats.customFieldsCount ?? fields.filter((f) => !f.isSystem).length} Custom
          </span>
        </div>
      </div>

      {/* ── Builder Tab ────────────────────────────────────── */}
      {tab === 'builder' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span className="text-[11px] text-gray-400">Move: ▲ / ▼ buttons se order change karein</span>
            <button
              onClick={handleSaveAllFields}
              className="font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 text-xs"
            >
              💾 Save All Order
            </button>
          </div>

          <div className="bg-white rounded-2xl divide-y divide-gray-100 border border-gray-100 shadow-xs overflow-hidden">
            {fields.map((f, idx) => {
              const isCoreField = ['name', 'mobile', 'areaId'].includes(f.key) || f.isSystem
              return (
                <div
                  key={f.key}
                  className="p-3.5 sm:p-4 hover:bg-orange-50/20 transition-colors"
                >
                  {/* Top Part: Index + Label + Type + Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0 mt-0.5">
                        #{idx + 1}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-gray-900 leading-snug">{f.label}</p>
                          <code className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                            {f.key}
                          </code>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCoreField
                                ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                            }`}
                          >
                            {isCoreField ? 'System' : 'Custom'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                          <span className="font-semibold text-gray-700">
                            {FIELD_TYPE_LABELS[f.type] || f.type}
                          </span>
                          {f.placeholder && (
                            <span className="text-gray-400 truncate max-w-[180px] sm:max-w-[240px]">
                              • "{f.placeholder}"
                            </span>
                          )}
                        </div>

                        {f.options && f.options.length > 0 && (
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[240px] sm:max-w-md">
                            Options: {Array.isArray(f.options) ? f.options.join(', ') : f.options}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Toolbar (Clean on mobile & desktop) */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 mt-2.5 pt-2 border-t border-gray-100">
                    {/* Reorder Buttons */}
                    <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 shrink-0">
                      <button
                        onClick={() => moveField(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 sm:p-1.5 rounded text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveField(idx, 'down')}
                        disabled={idx === fields.length - 1}
                        title="Move Down"
                        className="p-1 sm:p-1.5 rounded text-gray-600 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition-all active:scale-90"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Required / Optional Toggle Button */}
                      <button
                        onClick={() => handleToggleRequired(f.key)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all active:scale-95 ${
                          f.required
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.required ? 'Required *' : 'Optional'}
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          setNewField({
                            key: f.key,
                            label: f.label,
                            type: f.type,
                            required: Boolean(f.required),
                            options: Array.isArray(f.options) ? f.options.join(', ') : f.options || '',
                            placeholder: f.placeholder || '',
                            helpText: f.helpText || '',
                          })
                          setEditKey(f.key)
                          setShowAdd(true)
                        }}
                        title="Edit Field"
                        className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all active:scale-90"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      {/* Delete Button (Only Custom Fields) */}
                      {!isCoreField ? (
                        <button
                          onClick={() => handleDeleteField(f.key, f.label)}
                          title="Delete Field"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-90"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-7" />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {fields.length === 0 && (
            <div className="py-12 text-center bg-white rounded-2xl border border-gray-200 flex flex-col items-center">
              <FileEdit className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm font-bold text-gray-700">Koi Field Maujood Nahi Hai</p>
              <p className="text-xs text-gray-400 mt-0.5">Reset button dabakar default fields load karein.</p>
              <button
                onClick={handleReset}
                className="mt-3 px-4 py-2 bg-orange-500 text-white font-bold text-xs rounded-xl"
              >
                Reset Defaults
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Preview Tab ────────────────────────────────────── */}
      {tab === 'preview' && (
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xs border border-gray-100 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-orange-500" />
              Citizen Registration Form (Live Preview)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Citizen App par nagrikon ko registration ke waqt yahi form dikhega.
            </p>
          </div>

          <div className="space-y-4 max-w-lg">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {FIELD_TYPE_LABELS[f.type] || f.type}
                  </span>
                </label>

                {f.type === 'select' || f.type === 'multiselect' ? (
                  <select
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm bg-gray-50 text-gray-500 outline-none"
                  >
                    <option>{f.placeholder || `Select ${f.label}`}</option>
                    {(f.options || []).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'radio' ? (
                  <div className="space-y-2 pt-1">
                    {(f.options || ['Option 1', 'Option 2']).map((o) => (
                      <label key={o} className="flex items-center gap-2 text-xs text-gray-600">
                        <input type="radio" disabled name={f.key} className="text-orange-500" />
                        <span>{o}</span>
                      </label>
                    ))}
                  </div>
                ) : f.type === 'checkbox' ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" disabled className="w-4 h-4 rounded text-orange-500" />
                    <span className="text-xs text-gray-700">{f.label}</span>
                  </div>
                ) : f.type === 'date' ? (
                  <input
                    type="date"
                    disabled
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm bg-gray-50 text-gray-400 outline-none"
                  />
                ) : f.type === 'textarea' ? (
                  <textarea
                    disabled
                    rows={3}
                    placeholder={f.placeholder || `Enter ${f.label}`}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 placeholder:text-gray-400 outline-none resize-none"
                  />
                ) : f.type === 'photo' ? (
                  <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center bg-gray-50">
                    <p className="text-xs font-bold text-gray-600">Photo Upload</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG allowed (Max 5MB)</p>
                  </div>
                ) : f.type === 'area_selector' ? (
                  <div className="w-full border border-gray-200 rounded-xl px-3.5 h-11 flex items-center justify-between text-sm bg-gray-50 text-gray-400">
                    <span>{f.placeholder || 'Select Ward / Panchayat / Area'}</span>
                    <span className="text-xs text-orange-500 font-bold">Cascading Selector</span>
                  </div>
                ) : (
                  <input
                    disabled
                    type={f.type === 'number' ? 'number' : f.type === 'email' ? 'email' : 'text'}
                    placeholder={f.placeholder || `Enter ${f.label}`}
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-11 text-sm bg-gray-50 placeholder:text-gray-400 outline-none"
                  />
                )}

                {f.helpText && <p className="text-[10px] text-gray-400 italic">{f.helpText}</p>}
              </div>
            ))}

            <button
              disabled
              className="w-full h-12 bg-orange-500/60 text-white font-bold rounded-xl text-sm mt-4 cursor-not-allowed"
            >
              Submit Registration (Citizen Form)
            </button>
          </div>
        </div>
      )}

      {/* ── Add / Edit Field Modal (Mobile Bottom Sheet + Desktop Modal) ── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[88vh] flex flex-col shadow-2xl border border-gray-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2 truncate">
                <FileEdit className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="truncate">{editKey ? `Edit: ${newField.label || editKey}` : 'Add New Field'}</span>
              </h2>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto p-5 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    Field Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newField.key}
                    onChange={(e) =>
                      setNewField({
                        ...newField,
                        key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
                      })
                    }
                    disabled={Boolean(editKey)}
                    placeholder="e.g. voter_id, education"
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-orange-500 disabled:bg-gray-100 disabled:text-gray-500 font-mono"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Unique ID (letters, numbers, _)</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    Field Label <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    placeholder="e.g. Voter Card No. / शिक्षा"
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">Form par yahi naam dikhega</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Field Type</label>
                <select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-orange-500 bg-white"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t] || t} ({t})
                    </option>
                  ))}
                </select>
              </div>

              {(newField.type === 'select' ||
                newField.type === 'multiselect' ||
                newField.type === 'radio') && (
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    Options (Comma separated)
                  </label>
                  <input
                    value={newField.options}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    placeholder="e.g. 10th Pass, 12th Pass, Graduate, Post Graduate"
                    className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-orange-500"
                  />
                  <span className="text-[10px] text-gray-400 mt-0.5 block">
                    Options ko comma se alag karein
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Placeholder (Optional)</label>
                <input
                  value={newField.placeholder}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  placeholder="e.g. Apna Voter ID darj karein"
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 mb-1 block">Help Text (Optional)</label>
                <input
                  value={newField.helpText}
                  onChange={(e) => setNewField({ ...newField, helpText: e.target.value })}
                  placeholder="e.g. Chunav aayog dwara jaari ID"
                  className="w-full border border-gray-200 rounded-xl px-3.5 h-10 text-sm outline-none focus:border-orange-500"
                />
              </div>

              {/* Required Switch */}
              <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200/70">
                <div>
                  <span className="text-sm font-bold text-gray-800 block">Zaroori Field (Required)</span>
                  <span className="text-xs text-gray-400">Nagrik ke liye yeh field bharna mandatory hoga</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewField({ ...newField, required: !newField.required })}
                  className={`relative w-11 h-6 rounded-full transition-all flex items-center ${
                    newField.required ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform transform ${
                      newField.required ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-gray-100 shrink-0 bg-white">
              <button
                onClick={() => setShowAdd(false)}
                className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddField}
                disabled={saving}
                className="flex-1 sm:flex-none justify-center px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl shadow-xs transition-all disabled:opacity-60"
              >
                {saving ? 'Saving...' : editKey ? 'Update Field' : 'Save Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
