import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { NotificationsAPI } from './api/adminApis'

export const VAPID_KEY =
  import.meta.env.VITE_FIREBASE_VAPID_KEY ||
  'BLqi31E2ot1ukfkmxam2dqCGptT3PnthMyuHkt6NQstph0dAYUk7MN5LsJhRR3_7fPW0XPfyviUHQ4NcfBRpP9Q'

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDAk7btG-dpz1dZiUVQbTBQJJHr07LPn-E',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'device-streaming-3d1aacd5.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'device-streaming-3d1aacd5',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'device-streaming-3d1aacd5.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '726097401892',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:726097401892:web:3271125037d83381d260b1',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Messaging instance getter (browser check)
let messagingInstance = null
export const getMessagingInstance = async () => {
  if (typeof window === 'undefined') return null
  const supported = await isSupported().catch(() => false)
  if (!supported) return null
  if (!messagingInstance) {
    messagingInstance = getMessaging(app)
  }
  return messagingInstance
}

/**
 * Request notification permission from browser & register FCM device token
 */
export const requestNotificationPermission = async () => {
  try {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications.')
      return { success: false, reason: 'unsupported' }
    }

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return { success: false, reason: 'denied', permission }
    }

    // Register service worker if not already registered
    let registration
    if ('serviceWorker' in navigator) {
      registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
      await navigator.serviceWorker.ready
    }

    const messaging = await getMessagingInstance()
    if (!messaging) {
      return { success: false, reason: 'messaging_unsupported' }
    }

    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    })

    if (currentToken) {
      localStorage.setItem('fcm_token', currentToken)
      // Send token to backend
      await NotificationsAPI.registerFcmToken(currentToken).catch((err) => {
        console.warn('Failed to register token with backend:', err)
      })
      return { success: true, token: currentToken }
    } else {
      return { success: false, reason: 'no_token_generated' }
    }
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return { success: false, reason: error.message }
  }
}

/**
 * Listen for foreground push notifications while the Admin panel tab is open
 */
export const onMessageListener = (callback) => {
  getMessagingInstance().then((messaging) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        console.log('[Foreground Push Received]:', payload)
        if (callback) callback(payload)
      })
    }
  })
}
