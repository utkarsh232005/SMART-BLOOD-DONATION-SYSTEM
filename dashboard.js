(async () => {
    // Import Firebase modules dynamically
    const { auth, db, rtdb } = await import('./src/lib/firebase-config-browser.js');
    const { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, addDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const { onAuthStateChanged, signOut } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    const { ref, onValue, off, update, onDisconnect, serverTimestamp, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');

    // Check if user is logged in
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // User is signed in
            // Update user online status in Realtime Database
            const userStatusRef = ref(rtdb, `users/${user.uid}`);
            update(userStatusRef, {
                online: true,
                lastActive: serverTimestamp()
            });

            // Set up disconnect handler
            onDisconnect(userStatusRef).update({
                online: false,
                lastActive: serverTimestamp()
            });

            // Display user info
            document.getElementById("userEmail").textContent = user.email;
            document.getElementById("userName").textContent = user.displayName || "User";

            // Get detailed user profile data from Firestore
            const userDoc = doc(db, "users", user.uid);
            getDoc(userDoc)
                .then((docSnap) => {
                    if (docSnap.exists()) {
                        const userData = docSnap.data();
                        document.getElementById("userBloodType").textContent = userData.bloodType;

                        // Store blood type in session for notification filtering
                        sessionStorage.setItem("userBloodType", userData.bloodType);
                    }
                });

            // Fetch blood donation requests from Firestore
            loadDonationRequests();

            // Set up listener for urgent notifications from Realtime DB
            setupUrgentNotifications(user.uid);
        } else {
            // User is signed out, redirect to login
            window.location.href = "login.html";
        }
    });

    // Handle logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        const user = auth.currentUser;
        if (user) {
            // Update online status before signing out
            update(ref(rtdb, `users/${user.uid}`), {
                online: false,
                lastActive: serverTimestamp()
            }).then(() => {
                return signOut(auth);
            }).then(() => {
                window.location.href = "login.html";
            });
        }
    });

    // Load donation requests
    function loadDonationRequests() {
        const requestsCollection = collection(db, "donationRequests");

        getDocs(requestsCollection)
            .then((querySnapshot) => {
                const requestsContainer = document.getElementById("donationRequests");
                requestsContainer.innerHTML = "";

                querySnapshot.forEach((doc) => {
                    const request = doc.data();
                    const requestElement = document.createElement("div");
                    requestElement.className = "request-card";
                    requestElement.innerHTML = `
            <h3>Request from ${request.hospitalName}</h3>
            <p>Blood Type: ${request.bloodType}</p>
            <p>Urgency: ${request.urgency}</p>
            <p>Location: ${request.location}</p>
            <button class="respond-btn" data-id="${doc.id}">Respond</button>
          `;
                    requestsContainer.appendChild(requestElement);
                });

                // Add event listeners to respond buttons
                document.querySelectorAll(".respond-btn").forEach(button => {
                    button.addEventListener("click", (e) => {
                        const requestId = e.target.getAttribute("data-id");
                        respondToDonationRequest(requestId);
                    });
                });
            });
    }

    // Set up urgent notification listener
    function setupUrgentNotifications(userId) {
        const userBloodType = sessionStorage.getItem("userBloodType");
        if (!userBloodType) return;

        // Listen for notifications targeted to this blood type
        const notificationsRef = ref(rtdb, `notifications/bloodType/${userBloodType}`);

        // Remove any existing listener
        off(notificationsRef);

        // Add new listener
        onValue(notificationsRef, (snapshot) => {
            const notifications = snapshot.val();
            if (!notifications) return;

            // Display new notifications
            Object.keys(notifications).forEach(notificationId => {
                const notification = notifications[notificationId];

                // Only show notifications that are newer than user's last session
                if (notification.createdAt > (sessionStorage.getItem("lastSessionTime") || 0)) {
                    showNotification(notification);
                }
            });
        });

        // Also listen for personal notifications
        const personalNotificationsRef = ref(rtdb, `notifications/personal/${userId}`);
        onValue(personalNotificationsRef, (snapshot) => {
            const notifications = snapshot.val();
            if (!notifications) return;

            Object.keys(notifications).forEach(notificationId => {
                const notification = notifications[notificationId];
                showNotification(notification);

                // Mark as read
                update(ref(rtdb, `notifications/personal/${userId}/${notificationId}`), {
                    read: true
                });
            });
        });

        // Update last session time
        sessionStorage.setItem("lastSessionTime", Date.now());
    }

    // Display notification
    function showNotification(notification) {
        // Create notification element
        const notifContainer = document.getElementById("notifications") || createNotificationContainer();

        const notifElement = document.createElement("div");
        notifElement.className = `notification ${notification.urgent ? 'urgent' : ''}`;
        notifElement.innerHTML = `
      <h4>${notification.title}</h4>
      <p>${notification.message}</p>
      <span class="notification-time">${new Date(notification.createdAt).toLocaleTimeString()}</span>
      ${notification.urgent ? '<span class="urgent-badge">URGENT</span>' : ''}
      <button class="close-notification">✕</button>
    `;

        notifContainer.appendChild(notifElement);

        // Handle close button
        notifElement.querySelector(".close-notification").addEventListener("click", () => {
            notifElement.remove();
        });

        // Auto-remove after 10 seconds if not urgent
        if (!notification.urgent) {
            setTimeout(() => {
                notifElement.classList.add("fade-out");
                setTimeout(() => notifElement.remove(), 500);
            }, 10000);
        }
    }

    // Create notification container if it doesn't exist
    function createNotificationContainer() {
        const container = document.createElement("div");
        container.id = "notifications";
        container.className = "notifications-container";
        document.body.appendChild(container);
        return container;
    }

    // Respond to donation request
    function respondToDonationRequest(requestId) {
        const user = auth.currentUser;
        if (!user) return;

        // Get the request details first
        getDoc(doc(db, "donationRequests", requestId))
            .then(docSnap => {
                if (!docSnap.exists()) {
                    throw new Error("Request not found");
                }

                const requestData = docSnap.data();

                // Add user as donor to the request in Firestore
                const requestRef = doc(db, "donationRequests", requestId);
                return updateDoc(requestRef, {
                    donors: arrayUnion({
                        userId: user.uid,
                        name: user.displayName || "Anonymous",
                        timestamp: new Date().toISOString(),
                        status: "pending" // pending, confirmed, completed, cancelled
                    })
                }).then(() => {
                    // Also create an appointment record
                    return addDoc(collection(db, "appointments"), {
                        requestId: requestId,
                        donorId: user.uid,
                        donorName: user.displayName || "Anonymous",
                        hospitalName: requestData.hospitalName,
                        bloodType: requestData.bloodType,
                        requestedAt: requestData.createdAt,
                        respondedAt: new Date(),
                        status: "scheduled",
                        location: requestData.location
                    });
                }).then(() => {
                    // Notify the requester via Realtime Database
                    const requesterNotificationRef = ref(rtdb, `notifications/personal/${requestData.createdBy}/${Date.now()}`);
                    return set(requesterNotificationRef, {
                        title: "Donation Response",
                        message: `${user.displayName || "Someone"} has responded to your blood request!`,
                        createdAt: Date.now(),
                        read: false
                    });
                });
            })
            .then(() => {
                alert("You have successfully responded to this donation request!");
            })
            .catch((error) => {
                console.error("Error responding to request:", error);
                alert("There was an error. Please try again.");
            });
    }
})();
