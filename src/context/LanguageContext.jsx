import React, { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext({
  language: 'en',
  toggleLanguage: () => {},
  setLanguage: () => {},
})

export const useLanguage = () => useContext(LanguageContext)

function getStoredLanguage() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/)
    if (match) {
      const val = decodeURIComponent(match[1])
      if (val.includes('/hi')) return 'hi'
      if (val.includes('/en')) return 'en'
    }
    return localStorage.getItem('app_language') || 'en'
  } catch {
    return 'en'
  }
}

function setGoogtransCookie(lang) {
  try {
    const cookieVal = `/en/${lang}`
    const host = window.location.hostname

    // Path /
    document.cookie = `googtrans=${cookieVal}; path=/; max-age=31536000; SameSite=Lax`

    // Host domain
    if (host && host !== 'localhost') {
      document.cookie = `googtrans=${cookieVal}; path=/; domain=${host}; max-age=31536000; SameSite=Lax`
      const parts = host.split('.')
      if (parts.length > 1) {
        const rootDomain = '.' + parts.slice(-2).join('.')
        document.cookie = `googtrans=${cookieVal}; path=/; domain=${rootDomain}; max-age=31536000; SameSite=Lax`
      }
    }
  } catch (e) {
    console.error('Failed to set translation cookie', e)
  }
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(getStoredLanguage)

  useEffect(() => {
    // 1. Add hidden element for Google Translate
    let elem = document.getElementById('google_translate_element')
    if (!elem) {
      elem = document.createElement('div')
      elem.id = 'google_translate_element'
      elem.style.display = 'none'
      document.body.appendChild(elem)
    }

    // 2. Define callback
    window.googleTranslateElementInit = () => {
      try {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            {
              pageLanguage: 'en',
              includedLanguages: 'en,hi',
              autoDisplay: false,
            },
            'google_translate_element'
          )
        }
      } catch (err) {
        console.warn('Google Translate init warning:', err)
      }
    }

    // 3. Inject Google Translate script if missing
    const SCRIPT_ID = 'google-translate-script'
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.type = 'text/javascript'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    }

    // 4. Inject styles to suppress ugly Google top bars, banners & layout shifts
    const STYLE_ID = 'google-translate-custom-styles'
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style')
      style.id = STYLE_ID
      style.innerHTML = `
        .goog-te-banner-frame.skiptranslate,
        .goog-te-banner-frame,
        iframe.goog-te-banner-frame {
          display: none !important;
          visibility: hidden !important;
          height: 0 !important;
        }
        body {
          top: 0px !important;
          position: static !important;
        }
        #goog-gt-tt,
        .goog-te-balloon-frame {
          display: none !important;
        }
        .goog-text-highlight {
          background: none !important;
          box-shadow: none !important;
        }
        #google_translate_element {
          display: none !important;
        }
        .skiptranslate iframe {
          display: none !important;
        }
        .goog-te-gadget {
          display: none !important;
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  const changeLanguage = (newLang) => {
    const target = newLang === 'hi' ? 'hi' : 'en'
    setLanguageState(target)
    localStorage.setItem('app_language', target)
    setGoogtransCookie(target)

    // Dispatch change to google translate select element if present
    const combo = document.querySelector('.goog-te-combo')
    if (combo) {
      combo.value = target
      combo.dispatchEvent(new Event('change'))
      // If switching back to English, reload to fully clear Google translated DOM nodes cleanly
      if (target === 'en') {
        setTimeout(() => {
          window.location.reload()
        }, 150)
      }
    } else {
      window.location.reload()
    }
  }

  const toggleLanguage = () => {
    const next = language === 'en' ? 'hi' : 'en'
    changeLanguage(next)
  }

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setLanguage: changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
