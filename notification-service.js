(async () => {
    // Import Firebase modules dynamically
    const { rtdb, db } = await import('./src/lib/firebase-config-browser.js');
    const { ref, onValue, push, set, get } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

    class NotificationService {
        constructor() {
            // Constructor implementation
        }

        // Get notifications for a user
        async getNotifications(userId, bloodType) {
            return this.getNotificationsFromFirebase(userId, bloodType);
        }

        // Get notifications from Firebase
        async getNotificationsFromFirebase(userId, bloodType) {
            try {
                // Get personal notifications
                const personalRef = ref(rtdb, `notifications/personal/${userId}`);
                const personalSnapshot = await get(personalRef);
                const personalNotifications = personalSnapshot.val() || {};

                // Get blood type notifications
                const bloodTypeRef = ref(rtdb, `notifications/bloodType/${bloodType}`);
                const bloodTypeSnapshot = await get(bloodTypeRef);
                const bloodTypeNotifications = bloodTypeSnapshot.val() || {};

                // Combine and format notifications
                const combined = {
                    personal: Object.entries(personalNotifications).map(([id, data]) => ({
                        id,
                        ...data,
                        type: 'personal'
                    })),
                    bloodType: Object.entries(bloodTypeNotifications).map(([id, data]) => ({
                        id,
                        ...data,
                        type: 'bloodType'
                    }))
                };

                return combined;
            } catch (error) {
                console.error("Error getting notifications from Firebase:", error);
                return { personal: [], bloodType: [] };
            }
        }

        // Send a notification
        async sendNotification(notification) {
            return this.sendNotificationViaFirebase(notification);
        }

        // Send notification via Firebase
        async sendNotificationViaFirebase(notification) {
            try {
                if (notification.type === 'personal' && notification.recipientId) {
                    // Personal notification
                    const notifRef = ref(rtdb, `notifications/personal/${notification.recipientId}/${Date.now()}`);
                    await set(notifRef, {
                        title: notification.title,
                        message: notification.message,
                        createdAt: Date.now(),
                        read: false,
                        urgent: notification.urgent || false,
                        requestId: notification.requestId || null
                    });

                    return { success: true, id: notifRef.key };
                } else if (notification.bloodType) {
                    // Blood type notification
                    const notifRef = push(ref(rtdb, `notifications/bloodType/${notification.bloodType}`));
                    await set(notifRef, {
                        title: notification.title,
                        message: notification.message,
                        createdAt: Date.now(),
                        urgent: notification.urgent || false,
                        requestId: notification.requestId || null,
                        bloodType: notification.bloodType,
                        location: notification.location || null,
                        hospitalName: notification.hospitalName || null
                    });

                    return { success: true, id: notifRef.key };
                }

                throw new Error('Invalid notification type or missing required fields');
            } catch (error) {
                console.error("Error sending notification via Firebase:", error);
                return { success: false, error: error.message };
            }
        }

        // Mark a notification as read
        async markAsRead(userId, notificationId) {
            return this.markAsReadInFirebase(userId, notificationId);
        }

        // Mark notification as read in Firebase
        async markAsReadInFirebase(userId, notificationId) {
            try {
                const notifRef = ref(rtdb, `notifications/personal/${userId}/${notificationId}`);
                await set(notifRef, { read: true });
                return true;
            } catch (error) {
                console.error("Error marking notification as read in Firebase:", error);
                return false;
            }
        }
    }

    // Create and export a singleton instance
    const notificationService = new NotificationService();
    window.notificationService = notificationService; // Expose to global scope for other scripts
})();
