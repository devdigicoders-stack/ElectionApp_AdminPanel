import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging'
import { NotificationsAPI } from './api/adminApis'

export const VAPID_KEY = 'BPERg2BAS_k4Bq2pvQc4CWQq0RJNn_OSPv-qXNSkiYnqi15qWctR8Ha8cBxki22nE7NQi5J2rL1LzDNHHT8Cf3M'

export const firebaseConfig = {
  apiKey: 'AIzaSyDAk7btG-dpz1dZiUVQbTBQJJHr07LPn-E',
  authDomain: 'device-streaming-3d1aacd5.firebaseapp.com',
  projectId: 'device-streaming-3d1aacd5',
  storageBucket: 'device-streaming-3d1aacd5.firebasestorage.app',
  messagingSenderId: '726097401892',
  appId: '1:726097401892:web:3271125037d83381d260b1',
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
