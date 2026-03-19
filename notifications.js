// ─── Notifications ────────────────────────────────────────────────────────────
// Wraps the Web Notifications API and service-worker-based notifications.
// All notification logic lives here so app.js stays focused on app logic.

const NOTIFICATION_ICON = './icon-192.png';
const NOTIFICATION_BADGE = './icon-192.png';

// ── Permission ────────────────────────────────────────────────────────────────

/**
 * Request notification permission from the user.
 * Safe to call on every init — does nothing if already granted/denied.
 * @returns {Promise<NotificationPermission>}
 */
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported in this browser.');
        return 'denied';
    }

    console.log('Notification.permission', Notification.permission);

    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';

    const result = await Notification.requestPermission();
    console.log('Notification permission:', result);
    return result;
}

/**
 * Returns true if notifications are currently permitted.
 */
function notificationsEnabled() {
    return 'Notification' in window && Notification.permission === 'granted';
}

// ── Core display ──────────────────────────────────────────────────────────────

/**
 * Show a notification. Uses the active service worker when available
 * (required for PWA / background delivery), otherwise falls back to
 * the Notification constructor (tab must be open).
 *
 * @param {string} title
 * @param {object} options  - body, icon, badge, tag, data, actions, …
 */
async function showNotification(title, options = {}) {
    if (!notificationsEnabled()) return;

    const opts = {
        icon: NOTIFICATION_ICON,
        badge: NOTIFICATION_BADGE,
        ...options,
    };

    const swReg = await getServiceWorkerRegistration();
    if (swReg) {
        swReg.showNotification(title, opts);
    } else {
        new Notification(title, opts);
    }
}

/**
 * Returns the active SW registration, or null if unavailable.
 */
async function getServiceWorkerRegistration() {
    if (!('serviceWorker' in navigator)) return null;
    try {
        return await navigator.serviceWorker.ready;
    } catch {
        return null;
    }
}

// ── App-specific helpers ──────────────────────────────────────────────────────

/**
 * Notify that a new dose was logged by another caregiver.
 * @param {string} childName
 * @param {string} medication  - e.g. 'paracetamol'
 * @param {string} givenBy     - display name / email of the other caregiver
 */
function notifyDoseLogged(childName, medication, givenBy) {
  console.log('notifyDoseLogged', { childName, medication, givenBy });
    const med = capitalize(medication);
    showNotification(`${med} logged for ${childName}`, {
        body: givenBy ? `Given by ${givenBy}` : 'A dose was just recorded.',
        tag: `dose-logged-${childName}`,   // replaces previous notification with same tag
        data: { type: 'dose_logged' },
    });
}

// ── Settings UI ───────────────────────────────────────────────────────────────

/**
 * Called when the user clicks "Enable Notifications" in settings.
 * Requests permission if needed, then updates the button state.
 */
async function handleEnableNotifications() {
  console.log('handle enable notifications');
    const permission = await requestNotificationPermission();
    // syncNotificationButton();
    console.log('Notification permission after request:', permission);
    
    if (permission === 'granted') {
        await subscribeToPush();
    }
    else if (permission === 'denied') {
        document.getElementById('notifications-status').textContent =
            'Notifications blocked. Please allow them in your browser settings.';
        document.getElementById('notifications-status').style.color = 'var(--error)';
    }
}

/**
 * Syncs the enable-notifications button label and disabled state
 * to match the current Notification.permission value.
 * Safe to call whenever the settings modal opens.
 */
// function syncNotificationButton() {
//     if (!('Notification' in window)) return;

//     const btn = document.getElementById('enable-notifications-btn');
//     const status = document.getElementById('notifications-status');
//     const permission = Notification.permission;

//     if (permission === 'granted') {
//         btn.textContent = 'Notifications Enabled';
//         btn.disabled = true;
//         status.textContent = "You'll be notified when another caregiver logs a dose.";
//         status.style.color = '';
//     } else if (permission === 'denied') {
//         btn.textContent = 'Notifications Blocked';
//         btn.disabled = true;
//         status.textContent = 'Allow notifications in your browser settings to enable this.';
//         status.style.color = 'var(--error)';
//     } else {
//         btn.textContent = 'Enable Notifications';
//         btn.disabled = false;
//         status.textContent = '';
//     }
// }

/**
 * Notify that a dose was deleted by another caregiver.
 * @param {string} childName
 * @param {string} medication
 */
function notifyDoseDeleted(childName, medication) {
    const med = capitalize(medication);
    showNotification(`Dose removed for ${childName}`, {
        body: `A ${med} dose was deleted by another caregiver.`,
        tag: `dose-deleted-${childName}`,
        data: { type: 'dose_deleted' },
    });
}

// ── Push subscription ─────────────────────────────────────────────────────────

const VAPID_PUBLIC_KEY = window.CONFIG?.VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
    const swReg = await getServiceWorkerRegistration();
    if (!swReg) return null;

    try {
        // Will return existing subscription if already subscribed
        let subscription = await swReg.pushManager.getSubscription();
        
        if (!subscription) {
            subscription = await swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
            });
        }

        // Save to Supabase
        await supabaseClient
            .from('push_subscriptions')
            .upsert({
                user_id: currentUser.id,
                subscription: subscription.toJSON(),
            }, { onConflict: 'user_id' });

        console.log('Push subscription saved.');
        return subscription;
    } catch (err) {
        console.error('Push subscription failed:', err);
        return null;
    }
}
