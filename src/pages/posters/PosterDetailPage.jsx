import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Trash2, Edit2, Calendar, Tag, ToggleLeft, ToggleRight,
  Palette, Layers, ImageIcon, CheckSquare, Square, Eye, EyeOff
} from 'lucide-react'
import { PosterAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'
import { confirmDialog } from '../../utils/sweetAlert'

const FIELD_LABELS = {
  photo: '📷 Photo Zone',
  name: '✏️ Name',
  designation: '💼 Designation',
  text: '📝 Custom Text',
  logo: '🏷️ Logo',
  background: '🎨 Background',
  area: '📍 Area',
}

export default function PosterDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toggling, setToggling] = useState(false)

  const resolveUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http') || url.startsWith('data:')) return url
    return `${BASE_URL}${url}`
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await PosterAPI.getOneTemplate(id)
      const data = res?.data ?? res
      setItem(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleDelete = async () => {
    const confirmed = await confirmDialog({
      title: 'Delete Poster Template?',
      text: 'Yeh template permanently delete ho jayega. Kya aap sure hain?',
      confirmButtonText: 'Yes, Delete',
    })
    if (!confirmed) return
    try {
      await PosterAPI.removeTemplate(id)
      show('Template deleted!')
      navigate('/posters')
    } catch (e) {
      show(e.message, 'error')
    }
  }

  const handleToggle = async () => {
    if (!item) return
    setToggling(true)
    try {
      const res = await PosterAPI.updateTemplate(id, { isActive: !item.isActive })
      const updated = res?.data ?? res
      setItem(updated)
      show(updated.isActive ? 'Template enabled!' : 'Template disabled!')
    } catch (e) {
      show(e.message, 'error')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return <Skeleton rows={6} />
  if (error) return <ApiError message={error} onRetry={load} />

  const t = item || {}
  const displayTitle = t.title || t.name || 'Untitled Template'
  const imageUrl = resolveUrl(t.templateImageUrl || t.imageUrl)
  const fields = Array.isArray(t.fields) ? t.fields : []
  const fieldKeys = fields.map(f => typeof f === 'string' ? f : f?.key).filter(Boolean)

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      <Toast />

      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm font-bold hover:underline cursor-pointer"
          style={{ color: 'var(--primary)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Templates
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/posters')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Template Image Preview */}
      <div className="bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-800">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={displayTitle}
            className="w-full max-h-[420px] object-contain"
          />
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <Palette className="w-14 h-14 mb-3 opacity-30" />
            <p className="text-sm font-semibold opacity-50">No preview image</p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 flex items-center gap-1">
              <Tag className="w-3 h-3 text-gray-400" />
              {t.category || 'General'}
            </span>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                t.isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {t.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {t.isActive ? 'Active' : 'Disabled'}
            </span>

            {t.dimensionPreset && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                {t.dimensionPreset}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-black text-gray-900 leading-snug">{displayTitle}</h1>

          {/* Description */}
          {t.description && (
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1.5">Description</p>
              <p className="text-sm text-gray-700 font-medium leading-relaxed">{t.description}</p>
            </div>
          )}

          {/* Meta Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Created
              </p>
              <p className="text-sm font-bold text-gray-800 mt-1">
                {t.createdAt
                  ? new Date(t.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>

            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5" /> Dimensions
              </p>
              <p className="text-sm font-bold text-gray-800 mt-1">
                {t.width && t.height ? `${t.width} × ${t.height}px` : '1080 × 1080px'}
              </p>
            </div>

            {typeof t.usageCount === 'number' && (
              <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Used Times</p>
                <p className="text-2xl font-black mt-1" style={{ color: 'var(--primary)' }}>
                  {t.usageCount}
                </p>
              </div>
            )}

            <div className="bg-gray-50/80 rounded-2xl p-4 border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sort Order</p>
              <p className="text-2xl font-black mt-1 text-gray-800">{t.sortOrder ?? 0}</p>
            </div>
          </div>

          {/* Editable Fields */}
          {fieldKeys.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                <CheckSquare className="w-3.5 h-3.5" /> Editable Zones
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['photo', 'name', 'designation', 'text', 'area', 'logo', 'background'].map(key => {
                  const active = fieldKeys.includes(key)
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold ${
                        active
                          ? 'border-transparent text-white'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}
                      style={active ? { background: 'var(--primary)' } : {}}
                    >
                      {active
                        ? <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        : <Square className="w-3.5 h-3.5 shrink-0" />
                      }
                      {FIELD_LABELS[key] || key}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {t.tags?.length > 0 && (
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {t.tags.map(tag => (
                  <span key={tag} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Active Footer */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-t border-gray-100 ${
            t.isActive ? 'bg-emerald-50/60' : 'bg-amber-50/60'
          }`}
        >
          <div>
            <p className="text-sm font-bold text-gray-800">
              {t.isActive ? 'Template is Active' : 'Template is Disabled'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {t.isActive ? 'Citizens can use this template' : 'Hidden from public view'}
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-60"
            style={t.isActive
              ? { background: '#fef3c7', color: '#d97706' }
              : { background: 'var(--primary-light)', color: 'var(--primary)' }
            }
          >
            {t.isActive
              ? <><ToggleRight className="w-4 h-4" /> Disable</>
              : <><ToggleLeft className="w-4 h-4" /> Enable</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
