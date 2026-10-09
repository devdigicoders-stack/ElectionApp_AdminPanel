import { useState, useEffect } from 'react'
import { Pencil, X, Save, User, MapPin, Phone, Mail, Globe, MessageCircle, CheckCircle, Building2, Camera, Image as ImageIcon } from 'lucide-react'
import { LeaderAPI, UploadAPI, BASE_URL } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

const resolveUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http') || url.startsWith('data:')) return url
  return `${BASE_URL}${url}`
}

const FbIcon = () => (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>)
const TwIcon = () => (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>)
const IgIcon = () => (<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>)
const YtIcon = () => (<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.96-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="white"/></svg>)

const SOCIAL_ICONS = {
  facebook: <FbIcon />, twitter: <TwIcon />, instagram: <IgIcon />,
  youtube: <YtIcon />, whatsapp: <MessageCircle className="w-4 h-4" />, website: <Globe className="w-4 h-4" />,
}

const INITIAL_FORM = {
  fullName: '', designation: '', party: '', constituency: '', bio: '', message: '',
  profileImageUrl: '', coverImageUrl: '', achievements: '',
  socialLinks: { facebook: '', twitter: '', instagram: '', youtube: '', whatsapp: '', website: '' },
  contactInfo: { phone: '', email: '', address: '', officeAddress: '' },
}

// ─────────────────────────────────────────────────
// VIEW MODE
// ─────────────────────────────────────────────────
function ProfileView({ data, onEdit }) {
  const achievements = Array.isArray(data.achievements)
    ? data.achievements
    : (data.achievements || '').split('\n').filter(Boolean)
  const socialEntries = Object.entries(data.socialLinks || {}).filter(([, v]) => v)
  const hasContact = data.contactInfo?.phone || data.contactInfo?.email ||
    data.contactInfo?.address || data.contactInfo?.officeAddress

  if (!data.fullName && !data.bio) {
    return (
      <div className="max-w-2xl pb-8">
        <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-14 text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-orange-300" />
          </div>
          <p className="text-base font-bold text-gray-500">Profile abhi empty hai</p>
          <p className="text-xs text-gray-400 mt-1 mb-5">Edit Profile dabao aur apni info fill karo</p>
          <button onClick={onEdit} className="px-6 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors cursor-pointer inline-flex items-center gap-2">
            <Pencil className="w-3.5 h-3.5" /> Setup Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl pb-8 space-y-3">
      {/* Hero Card */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Cover */}
        <div className="relative h-44 bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 overflow-hidden">
          {data.coverImageUrl ? (
            <img src={resolveUrl(data.coverImageUrl)} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0">
              <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-white/20" />
              <div className="absolute top-8 -left-8 w-32 h-32 rounded-full bg-white/15" />
              <div className="absolute bottom-0 right-16 w-24 h-24 rounded-full bg-white/20" />
            </div>
          )}
          <button onClick={onEdit} className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-orange-600 text-xs font-bold rounded-xl shadow hover:bg-white transition-all cursor-pointer z-10">
            <Pencil className="w-3 h-3" /> Edit Profile
          </button>
        </div>

        {/* Info */}
        <div className="px-5 pb-5">
          <div className="-mt-8 mb-3">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
              {data.profileImageUrl
                ? <img src={resolveUrl(data.profileImageUrl)} alt={data.fullName} className="w-full h-full object-cover" />
                : <span className="text-orange-500 text-2xl font-black">{(data.fullName || 'L')[0].toUpperCase()}</span>}
            </div>
          </div>
          <h1 className="text-xl font-black text-gray-900">{data.fullName}</h1>
          {data.designation && <p className="text-sm font-bold text-orange-500 mt-0.5">{data.designation}</p>}
          {(data.party || data.constituency) && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {data.party && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                  🏛️ {data.party}
                </span>
              )}
              {data.constituency && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                  <MapPin className="w-3 h-3" /> {data.constituency}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {data.bio && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1"><User className="w-3 h-3" /> About</p>
          <p className="text-sm text-gray-700 leading-relaxed">{data.bio}</p>
        </div>
      )}

      {/* Message */}
      {data.message && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border border-orange-100 p-5">
          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest mb-2">💬 Message to Citizens</p>
          <p className="text-sm text-gray-700 leading-relaxed italic">"{data.message}"</p>
        </div>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Key Achievements</p>
          <div className="space-y-2.5">
            {achievements.map((a, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-3 h-3 text-orange-500" />
                </div>
                <p className="text-sm text-gray-700 font-medium">{a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Social Links */}
      {socialEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3">Social Links</p>
          <div className="flex flex-wrap gap-2">
            {socialEntries.map(([k, v]) => (
              <a key={k} href={k === 'whatsapp' ? `https://wa.me/${v.replace(/\D/g, '')}` : v}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all capitalize">
                {SOCIAL_ICONS[k]} {k}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {hasContact && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-1"><Phone className="w-3 h-3" /> Contact</p>
          <div className="space-y-2.5">
            {data.contactInfo?.phone && (
              <a href={`tel:${data.contactInfo.phone}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center shrink-0"><Phone className="w-3.5 h-3.5 text-green-600" /></div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-500">{data.contactInfo.phone}</span>
              </a>
            )}
            {data.contactInfo?.email && (
              <a href={`mailto:${data.contactInfo.email}`} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0"><Mail className="w-3.5 h-3.5 text-blue-600" /></div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-orange-500">{data.contactInfo.email}</span>
              </a>
            )}
            {data.contactInfo?.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 mt-0.5"><MapPin className="w-3.5 h-3.5 text-orange-500" /></div>
                <span className="text-sm text-gray-700 font-medium">{data.contactInfo.address}</span>
              </div>
            )}
            {data.contactInfo?.officeAddress && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 mt-0.5"><Building2 className="w-3.5 h-3.5 text-purple-500" /></div>
                <span className="text-sm text-gray-700 font-medium">{data.contactInfo.officeAddress}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────
// EDIT MODE
// ─────────────────────────────────────────────────
function ProfileEditForm({ form, setForm, onSave, onCancel, saving }) {
  const { show } = useToast()
  const u = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const uN = (g, k, v) => setForm(prev => ({ ...prev, [g]: { ...prev[g], [k]: v } }))

  const uploadPhoto = async (e, field) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    try {
      const res = await UploadAPI.uploadFiles('leader', files)
      if (res?.urls?.[0]) { u(field, res.urls[0]); show('Photo uploaded!') }
    } catch (err) { show(err.message, 'error') }
  }

  return (
    <div className="space-y-4 max-w-2xl pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900">Edit Profile</h1>
          <p className="text-xs text-gray-400">Save karne ke baad reflect hoga</p>
        </div>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 cursor-pointer">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>

      {/* Photos */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2"><Camera className="w-4 h-4 text-orange-400" /> Photos</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 border-2 border-dashed border-orange-200 flex items-center justify-center overflow-hidden shrink-0">
            {form.profileImageUrl
              ? <img src={resolveUrl(form.profileImageUrl)} alt="" className="w-full h-full object-cover" />
              : <span className="text-orange-400 text-xl font-black">{(form.fullName || 'L')[0]}</span>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1">Profile Photo</p>
            <input type="file" accept="image/*" onChange={e => uploadPhoto(e, 'profileImageUrl')} className="text-xs text-gray-500 cursor-pointer" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1"><ImageIcon className="w-3.5 h-3.5" /> Cover / Banner Image</p>
          {form.coverImageUrl && <img src={resolveUrl(form.coverImageUrl)} alt="" className="w-full h-20 object-cover rounded-xl mb-2" />}
          <input type="file" accept="image/*" onChange={e => uploadPhoto(e, 'coverImageUrl')} className="text-xs text-gray-500 cursor-pointer" />
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[['fullName','Full Name *'],['designation','Designation'],['party','Political Party'],['constituency','Constituency / Ward']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input value={form[k] || ''} onChange={e => u(k, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-orange-400" />
            </div>
          ))}
        </div>
        {[['bio','Bio / Introduction',3],['message','Message to Citizens',3]].map(([k, label, rows]) => (
          <div key={k}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
            <textarea rows={rows} value={form[k] || ''} onChange={e => u(k, e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-orange-400" />
          </div>
        ))}
        <div>
          <label className="text-xs font-semibold text-gray-500 mb-1 block">
            Key Achievements <span className="text-gray-400 font-normal">(ek line = ek point)</span>
          </label>
          <textarea rows={4} value={form.achievements} onChange={e => u('achievements', e.target.value)}
            placeholder={"Road construction completed\nSchool renovation done\n100 houses electrified"}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-orange-400 font-mono" />
        </div>
      </div>

      {/* Social Links */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Social Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[['facebook','Facebook'],['twitter','Twitter/X'],['instagram','Instagram'],['youtube','YouTube'],['whatsapp','WhatsApp'],['website','Website']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-orange-400">
                <span className="px-2.5 text-gray-400">{SOCIAL_ICONS[k]}</span>
                <input value={form.socialLinks[k] || ''} onChange={e => uN('socialLinks', k, e.target.value)}
                  placeholder={k === 'whatsapp' ? '+91 9876543210' : 'https://...'}
                  className="flex-1 h-10 text-sm outline-none pr-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[['phone','Phone'],['email','Email']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
              <input value={form.contactInfo[k] || ''} onChange={e => uN('contactInfo', k, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 h-10 text-sm outline-none focus:border-orange-400" />
            </div>
          ))}
        </div>
        {[['address','Home Address'],['officeAddress','Office / Constituency Address']].map(([k, label]) => (
          <div key={k}>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">{label}</label>
            <textarea rows={2} value={form.contactInfo[k] || ''} onChange={e => uN('contactInfo', k, e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none resize-none focus:border-orange-400" />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={onSave} disabled={saving}
          className="flex-1 h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl disabled:opacity-70 flex items-center justify-center gap-2 transition-colors cursor-pointer">
          {saving
            ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving...</>
            : <><Save className="w-4 h-4" /> Save Profile</>}
        </button>
        <button onClick={onCancel} className="px-6 h-12 border border-gray-200 text-sm font-bold rounded-2xl hover:bg-gray-50 cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────
export default function LeaderProfilePage() {
  const { show, Toast } = useToast()
  const [data, setData] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await LeaderAPI.get()
      const d = res?.data ?? res
      if (d) {
        setData(d)
        setForm({
          fullName: d.fullName || '',
          designation: d.designation || '',
          party: d.party || '',
          constituency: d.constituency || '',
          bio: d.bio || '',
          message: d.message || '',
          profileImageUrl: d.profileImageUrl || '',
          coverImageUrl: d.coverImageUrl || '',
          achievements: Array.isArray(d.achievements) ? d.achievements.join('\n') : (d.achievements || ''),
          socialLinks: { facebook: d.socialLinks?.facebook || '', twitter: d.socialLinks?.twitter || '', instagram: d.socialLinks?.instagram || '', youtube: d.socialLinks?.youtube || '', whatsapp: d.socialLinks?.whatsapp || '', website: d.socialLinks?.website || '' },
          contactInfo: { phone: d.contactInfo?.phone || '', email: d.contactInfo?.email || '', address: d.contactInfo?.address || '', officeAddress: d.contactInfo?.officeAddress || '' },
        })
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        achievements: form.achievements
          ? form.achievements.split('\n').map(s => s.trim()).filter(Boolean)
          : [],
      }
      await LeaderAPI.update(payload)
      setData(prev => ({ ...prev, ...payload }))
      setEditMode(false)
      show('Profile saved successfully!')
    } catch (e) { show(e.message, 'error') }
    finally { setSaving(false) }
  }

  if (loading) return <Skeleton rows={5} />
  if (error) return <ApiError message={error} onRetry={load} />

  return (
    <>
      <Toast />
      {editMode
        ? <ProfileEditForm form={form} setForm={setForm} onSave={handleSave} onCancel={() => setEditMode(false)} saving={saving} />
        : <ProfileView data={data || {}} onEdit={() => setEditMode(true)} />
      }
    </>
  )
}
