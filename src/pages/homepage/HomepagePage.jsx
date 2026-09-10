import { useState } from 'react'

const defaultSections = [
  { id: 1, key: 'hero_banner',      label: 'Hero Banner',       enabled: true  },
  { id: 2, key: 'promo_banner',     label: 'Promotional Banner',enabled: true  },
  { id: 3, key: 'leader_message',   label: 'Leader Message',    enabled: true  },
  { id: 4, key: 'quick_actions',    label: 'Quick Actions',     enabled: true  },
  { id: 5, key: 'latest_works',     label: 'Latest Works',      enabled: true  },
  { id: 6, key: 'events',           label: 'Events',            enabled: false },
  { id: 7, key: 'poll',             label: 'Active Poll',       enabled: true  },
  { id: 8, key: 'gallery',          label: 'Photo Gallery',     enabled: true  },
  { id: 9, key: 'announcements',    label: 'Announcements',     enabled: true  },
]

export default function HomepagePage() {
  const [sections, setSections] = useState(defaultSections)

  const toggle = (id) => setSections(sections.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Homepage Management</h1>
        <p className="text-sm text-gray-500 mt-0.5">Citizen app ke homepage ka content configure karein</p>
      </div>

      {/* Hero Banner Upload */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-800">Hero Banner Images</h2>
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3].map(i => (
            <div key={i} className="aspect-video bg-gray-100 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all">
              <svg className="w-6 h-6 text-gray-300 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span className="text-[10px] text-gray-400">Banner {i}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections Toggle */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-800 mb-4">Section Enable / Disable</h2>
        <p className="text-xs text-gray-400 mb-4">Sections ko enable/disable karein aur drag kar ke order change karein</p>
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl hover:bg-orange-50/30 transition-all">
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-300 cursor-grab" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                </svg>
                <span className="text-sm font-semibold text-gray-700">{s.label}</span>
              </div>
              <button
                onClick={() => toggle(s.id)}
                className={`relative w-10 h-5 rounded-full transition-all ${s.enabled ? 'bg-orange-500' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${s.enabled ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Leader Message */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-bold text-gray-800">Leader Message</h2>
        <textarea rows={4} defaultValue="Pyare Nagrik bhaiyon aur behno, hum milkar apne kshetra ka vikas karenge..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none" />
      </div>

      <button className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl">Save Changes</button>
    </div>
  )
}
