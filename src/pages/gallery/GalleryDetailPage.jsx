import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Image, Film, Camera, Trash2 } from 'lucide-react'
import { GalleryAPI } from '../../api/adminApis'
import { Skeleton, ApiError, useToast } from '../../hooks/useFetch.jsx'

export default function GalleryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { show, Toast } = useToast()
  const [item,    setItem]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [selImg,  setSelImg]  = useState(0)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await GalleryAPI.getOne(id)
      setItem(res?.data ?? res)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this gallery item?')) return
    try { await GalleryAPI.remove(id); show('Deleted!'); navigate(-1) }
    catch(e) { show(e.message,'error') }
  }

  if (loading) return <Skeleton rows={4}/>
  if (error)   return <ApiError message={error} onRetry={load}/>

  const g       = item || {}
  const isVideo = g.type === 'video'
  const images  = g.images || []

  return (
    <div className="space-y-4">
      <Toast/>
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm font-semibold" style={{color:'var(--primary)'}}>
        <ArrowLeft className="w-4 h-4" />
        Back to Gallery
      </button>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Main media */}
        {isVideo ? (
          <div className="aspect-video bg-black flex items-center justify-center">
            {g.youtubeUrl || g.videoUrl ? (
              <iframe
                src={(g.youtubeUrl||g.videoUrl).replace('watch?v=','embed/')}
                className="w-full h-full" allowFullScreen title={g.title}/>
            ) : (
              <div className="text-center text-white">
                <Play className="w-12 h-12 mb-3 mx-auto opacity-70" />
                <p className="text-sm opacity-70">Video URL not available</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {images.length > 0 ? (
              <>
                <div className="h-60 bg-gray-100">
                  <img src={images[selImg]} alt={g.title} className="w-full h-full object-cover"/>
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto no-scrollbar">
                    {images.map((img, i) => (
                      <button key={i} onClick={() => setSelImg(i)}
                        className={`shrink-0 w-16 h-12 rounded-xl overflow-hidden border-2 transition-all ${selImg===i?'border-[var(--primary)]':'border-transparent'}`}>
                        <img src={img} alt={`img ${i}`} className="w-full h-full object-cover"/>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="h-40 flex items-center justify-center" style={{background:'var(--primary-light)'}}>
                <Image className="w-12 h-12 text-primary" style={{ color: 'var(--primary)' }} />
              </div>
            )}
          </>
        )}

        {/* Info */}
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-gray-800">{g.title || '—'}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{g.category || '—'}</span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{background:'var(--primary-light)',color:'var(--primary)'}}>
                  {isVideo ? <Film className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
                  {isVideo ? 'Video' : 'Photo'}
                </span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${g.isPublished?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                  {g.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Area',    g.area?.name    || '—'],
              ['Event',   g.event?.title  || '—'],
              ['Added',   g.createdAt ? new Date(g.createdAt).toLocaleDateString('en-IN') : '—'],
              ['Photos',  isVideo ? '—' : `${images.length} images`],
            ].map(([l,v]) => (
              <div key={l} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400">{l}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{v}</p>
              </div>
            ))}
          </div>

          {g.description && (
            <div>
              <p className="text-xs font-bold text-gray-500 mb-1">Description</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3">{g.description}</p>
            </div>
          )}

          <button onClick={handleDelete} className="w-full h-10 bg-red-50 text-red-500 text-sm font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete this item
          </button>
        </div>
      </div>
    </div>
  )
}
