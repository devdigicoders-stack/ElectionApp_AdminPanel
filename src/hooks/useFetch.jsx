import { useState, useEffect, useCallback } from 'react'

// Generic reusable hook for API calls
export function useFetch(apiFn, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiFn()
      setData(res?.data ?? res)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// Loading skeleton component
export function Skeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 rounded-full w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Error component
export function ApiError({ message, onRetry }) {
  return (
    <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
      <svg className="w-10 h-10 text-red-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p className="text-sm font-semibold text-red-600 mb-1">Error</p>
      <p className="text-xs text-red-400 mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-bold text-white bg-red-400 px-4 py-2 rounded-xl">
          Retry
        </button>
      )}
    </div>
  )
}

// Toast notification
export function useToast() {
  const [toast, setToast] = useState(null)
  const show = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  const Toast = () => toast ? (
    <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2.5 rounded-2xl shadow-xl text-white text-sm font-semibold flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
      {toast.type === 'success'
        ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      }
      {toast.msg}
    </div>
  ) : null
  return { show, Toast }
}

