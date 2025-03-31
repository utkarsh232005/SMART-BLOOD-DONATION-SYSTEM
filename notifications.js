import { auth, rtdb } from "./src/lib/firebase-config.js";
import { ref, onValue, update, remove, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

let notificationListeners = [];

// Initialize notification system
export function initializeNotifications() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            setupNotificationListeners(user.uid);
        } else {
            // Clean up listeners if user logs out
            removeNotificationListeners();
        }
    });
}

// Set up notification listeners
function setupNotificationListeners(userId) {
    // Clean previous listeners first
    removeNotificationListeners();

    // Listen for personal notifications
    const personalNotificationsRef = query(
        ref(rtdb, `notifications/personal/${userId}`),
        orderByChild('createdAt'),
        limitToLast(20)
    );

    const personalListener = onValue(personalNotificationsRef, (snapshot) => {
        const notifications = snapshot.val();
        if (!notifications) return;

        const notificationList = document.getElementById('notificationList');
        if (!notificationList) return;

        // Clear existing notifications in UI
        const existingPersonalNotifications = notificationList.querySelectorAll('.personal-notification');
        existingPersonalNotifications.forEach(el => el.remove());

        // Add notifications to UI
        Object.entries(notifications).forEach(([id, notification]) => {
            if (!notification.read) {
                addNotificationToUI(id, notification, 'personal');
            }
        });

        updateNotificationCounter();
    });

    notificationListeners.push(personalListener);

    // Also listen for blood type specific notifications
    getUserBloodType(userId).then(bloodType => {
        if (!bloodType) return;

        const bloodTypeNotificationsRef = query(
            ref(rtdb, `notifications/bloodType/${bloodType}`),
            orderByChild('createdAt'),
            limitToLast(10)
        );

        const bloodTypeListener = onValue(bloodTypeNotificationsRef, (snapshot) => {
            const notifications = snapshot.val();
            if (!notifications) return;

            const notificationList = document.getElementById('notificationList');
            if (!notificationList) return;

            // Add notifications to UI
            Object.entries(notifications).forEach(([id, notification]) => {
                // Only show notifications from the last 24 hours
                const isRecent = (Date.now() - notification.createdAt) < 24 * 60 * 60 * 1000;
                if (isRecent) {
                    addNotificationToUI(id, notification, 'bloodType');
                }
            });

            updateNotificationCounter();
        });

        notificationListeners.push(bloodTypeListener);
    });
}

// Get user's blood type
async function getUserBloodType(userId) {
    return new Promise((resolve) => {
        const userRef = ref(rtdb, `users/${userId}`);
        onValue(userRef, (snapshot) => {
            const userData = snapshot.val();
            resolve(userData?.bloodType || null);
        }, { onlyOnce: true });
    });
}

// Add notification to UI
function addNotificationToUI(id, notification, type) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;

    // Check if this notification is already in the list
    if (document.querySelector(`[data-notification-id="${id}"]`)) {
        return;
    }

    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${type}-notification ${notification.urgent ? 'urgent' : ''}`;
    notificationElement.dataset.notificationId = id;
    notificationElement.dataset.notificationType = type;

    notificationElement.innerHTML = `
        <div class="notification-header">
            <h4>${notification.title}</h4>
            <span class="notification-time">${formatTime(notification.createdAt)}</span>
        </div>
        <p>${notification.message}</p>
        <div class="notification-actions">
            ${notification.requestId ?
            `<button class="respond-btn" data-request-id="${notification.requestId}">Respond</button>` : ''}
            <button class="dismiss-btn">Dismiss</button>
        </div>
    `;

    notificationList.prepend(notificationElement);

    // Add event listeners
    if (notification.requestId) {
        notificationElement.querySelector('.respond-btn').addEventListener('click', () => {
            window.location.href = `donate.html?requestId=${notification.requestId}`;
        });
    }

    notificationElement.querySelector('.dismiss-btn').addEventListener('click', () => {
        dismissNotification(id, type);
        notificationElement.remove();
        updateNotificationCounter();
    });

    // Show notification badge/popup
    if (type === 'personal' && !notification.read) {
        showNotificationBadge();
        if (notification.urgent) {
            showNotificationPopup(notification);
        }
    }
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

// Dismiss a notification
function dismissNotification(id, type) {
    const user = auth.currentUser;
    if (!user) return;

    if (type === 'personal') {
        // Mark as read in database
        update(ref(rtdb, `notifications/personal/${user.uid}/${id}`), {
            read: true
        });
    } else if (type === 'bloodType') {
        // For blood type notifications, just remove from UI
        // We don't mark them as read in the database as they're shared
    }
}

// Show notification badge
function showNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.style.display = 'block';
    }
}

// Update notification counter
function updateNotificationCounter() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;

    const unreadCount = document.querySelectorAll('.notification-item:not(.read)').length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
}

// Show notification popup for urgent notifications
function showNotificationPopup(notification) {
    // Check if notifications are supported
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        return;
    }

    // Check if permission is already granted
    if (Notification.permission === 'granted') {
        createNotification(notification);
    }
    // Otherwise, ask for permission
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                createNotification(notification);
            }
        });
    }
}

// Create browser notification
function createNotification(notification) {
    const notif = new Notification(notification.title, {
        body: notification.message,
        icon: '/images/blood-drop-icon.png'
    });

    notif.onclick = () => {
        window.focus();
        if (notification.requestId) {
            window.location.href = `donate.html?requestId=${notification.requestId}`;
        }
    };
}

// Remove all notification listeners
function removeNotificationListeners() {
    notificationListeners.forEach(listener => {
        if (listener && typeof listener === 'function') {
            listener();
        }
    });
    notificationListeners = [];
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeNotifications);
