import { useEffect } from 'react'
import { useBranding } from '../context/BrandingContext'

export default function SplashScreen({ onDone }) {
  const { branding, loading } = useBranding()

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(onDone, 2000)
      return () => clearTimeout(t)
    }
  }, [loading, onDone])

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: `linear-gradient(160deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 70%, #000) 100%)` }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-4 animate-pulse">
        {branding?.logoUrl ? (
          <img src={branding.logoUrl} alt="Logo" className="w-24 h-24 rounded-3xl object-contain bg-white/20 p-2 shadow-2xl" />
        ) : (
          <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center shadow-2xl backdrop-blur-sm">
            <span className="text-white text-3xl font-black">
              {(branding?.leaderName || 'LA')[0]}
            </span>
          </div>
        )}

        {/* App Name */}
        <div className="text-center">
          <h1 className="text-white text-2xl font-black tracking-tight">
            {branding?.leaderName || 'Leader Admin'}
          </h1>
          <p className="text-white/70 text-sm mt-1 font-medium">
            {branding?.tagline || 'Manage • Connect • Serve'}
          </p>
        </div>
      </div>

      {/* Loading dots */}
      <div className="absolute bottom-16 flex gap-2">
        {[0,1,2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-white/60 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>

      {/* Powered by */}
      <p className="absolute bottom-6 text-white/40 text-xs font-medium">
        Powered by Madiyayu
      </p>
    </div>
  )
}
