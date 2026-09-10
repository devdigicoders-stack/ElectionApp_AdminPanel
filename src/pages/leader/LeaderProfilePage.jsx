import { useState, useEffect } from 'react'
import { LeaderAPI, UploadAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function LeaderProfilePage() {
  const { show, Toast } = useToast()
  const [form, setForm] = useState({ name: '', designation: '', bio: '', vision: '', mission: '', achievements: '', facebook: '', twitter: '', instagram: '', youtube: '', phone: '', email: '', address: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await LeaderAPI.get()
      const data = res?.data ?? res
      if (data) setForm(prev => ({ ...prev, ...data }))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try { await LeaderAPI.update(form); show('Profile saved!') }
    catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  const u = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  if (loading) return <Skeleton rows={4} />
  if (error) return <ApiError message={error} onRetry={load} />

  return (
    <div className="space-y-4 max-w-2xl">
      <Toast />
      <div><h1 className="text-xl font-black text-gray-900">Leader Profile</h1><p className="text-xs text-gray-400">Public profile manage karein</p></div>

      {/* Photo */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Profile Photo</h2>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center">
            {form.profileImage ? <img src={form.profileImage} alt="Leader" className="w-full h-full rounded-2xl object-cover" /> : <span className="text-orange-500 text-3xl font-black">{(form.name || 'L')[0]}</span>}
          </div>
          <div>
            <input type="file" accept="image/*" onChange={async (e) => {
              const files = Array.from(e.target.files)
              if (!files.length) return
              try {
                const res = await UploadAPI.uploadFiles('leader', files)
                if (res?.urls?.[0]) { u('profileImage', res.urls[0]); show('Photo uploaded!') }
              } catch (err) { show(err.message, 'error') }
            }} className="text-xs text-gray-500" />
            <p className="text-[10px] text-gray-400 mt-1">PNG, JPG max 5MB</p>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[['name', 'Full Name'], ['designation', 'Designation']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input value={form[k] || ''} onChange={e => u(k, e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-orange-400" />
            </div>
          ))}
        </div>
        {[['bio', 'Biography'], ['vision', 'Vision'], ['mission', 'Mission'], ['achievements', 'Key Achievements']].map(([k, label]) => (
          <div key={k}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
            <textarea rows={3} value={form[k] || ''} onChange={e => u(k, e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-orange-400" />
          </div>
        ))}
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Social Links</h2>
        <div className="grid grid-cols-2 gap-3">
          {[['facebook', 'Facebook'], ['twitter', 'Twitter'], ['instagram', 'Instagram'], ['youtube', 'YouTube']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input value={form[k] || ''} onChange={e => u(k, e.target.value)} placeholder={`https://${k}.com/...`} className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-orange-400" />
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Contact</h2>
        {[['phone', 'Phone'], ['email', 'Email']].map(([k, label]) => (
          <div key={k}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
            <input value={form[k] || ''} onChange={e => u(k, e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-orange-400" />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">Address</label>
          <textarea rows={2} value={form.address || ''} onChange={e => u('address', e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-orange-400" />
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl disabled:opacity-70 flex items-center justify-center gap-2">
        {saving ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</> : 'Save Profile'}
      </button>
    </div>
  )
}

