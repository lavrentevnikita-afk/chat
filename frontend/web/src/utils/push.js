// Web Push notification utilities

let VAPID_PUBLIC_KEY = null;

async function getVapidKey() {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  
  try {
    const resp = await fetch('/api/v1/push/vapid-key');
    if (resp.ok) {
      const data = await resp.json();
      VAPID_PUBLIC_KEY = data.publicKey;
    }
  } catch (e) {
    console.warn('[Push] Failed to fetch VAPID key:', e);
  }
  return VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function getNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'denied';
  
  const permission = await Notification.requestPermission();
  return permission;
}

export async function subscribeToPush() {
  const vapidKey = await getVapidKey();
  if (!vapidKey) {
    console.warn('[Push] No VAPID key available');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }
    
    return subscription;
  } catch (error) {
    console.error('[Push] Subscribe failed:', error);
    return null;
  }
}

export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

export async function sendSubscriptionToServer(subscription) {
  const token = localStorage.getItem('access_token');
  if (!token || !subscription) return false;

  try {
    const response = await fetch('/api/v1/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
        },
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('[Push] Send subscription failed:', error);
    return false;
  }
}

export async function setupPushNotifications() {
  if (!(await isPushSupported())) {
    console.log('[Push] Not supported');
    return false;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.log('[Push] Permission denied');
    return false;
  }

  const subscription = await subscribeToPush();
  if (!subscription) {
    return false;
  }

  const sent = await sendSubscriptionToServer(subscription);
  console.log('[Push] Subscription sent:', sent);
  return sent;
}
