(async () => {
    // Import Firebase modules dynamically
    const { auth, db, rtdb } = await import('./src/lib/firebase-config-browser.js');
    const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    const { ref, set, push } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');

    // Check if user is logged in
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // User is not signed in, redirect to login
            window.location.href = "login.html";
        }
    });

    // Handle donation request form submission
    document.getElementById("donationRequestForm").addEventListener("submit", function (event) {
        event.preventDefault();

        const hospitalName = document.getElementById("hospitalName").value;
        const bloodType = document.getElementById("bloodType").value;
        const urgency = document.getElementById("urgency").value;
        const location = document.getElementById("location").value;
        const details = document.getElementById("details").value;

        const isUrgent = urgency === "urgent" || urgency === "high";
        const timestamp = new Date();

        // First add donation request to Firestore for persistent storage
        addDoc(collection(db, "donationRequests"), {
            hospitalName: hospitalName,
            bloodType: bloodType,
            urgency: urgency,
            location: location,
            details: details,
            createdAt: timestamp,
            createdBy: auth.currentUser.uid,
            status: "open"
        })
            .then((docRef) => {
                const requestId = docRef.id;
                console.log("Donation request added with ID: ", requestId);

                // If urgent, send real-time notifications to matching donors
                if (isUrgent) {
                    // Create notification in Realtime Database for real-time delivery
                    const notificationData = {
                        title: `Urgent ${bloodType} Blood Required`,
                        message: `${hospitalName} urgently needs ${bloodType} blood donors at ${location}. Please respond if you can help.`,
                        createdAt: Date.now(),
                        requestId: requestId,
                        bloodType: bloodType,
                        hospitalName: hospitalName,
                        location: location,
                        urgent: true
                    };

                    // Add to blood type specific notification channel
                    return push(ref(rtdb, `notifications/bloodType/${bloodType}`), notificationData);
                }

                return Promise.resolve();
            })
            .then(() => {
                alert("Donation request created successfully!");
                // Reset form or redirect
                document.getElementById("donationRequestForm").reset();
            })
            .catch((error) => {
                console.error("Error adding donation request: ", error);
                alert("Error creating donation request. Please try again.");
            });
    });

    // Add event listener for urgency field to show warning for urgent requests
    document.getElementById("urgency").addEventListener("change", function (event) {
        const urgencyValue = event.target.value;
        const warningContainer = document.getElementById("urgencyWarning") ||
            createWarningElement();

        if (urgencyValue === "urgent") {
            warningContainer.textContent = "Urgent requests will send immediate notifications to all matching donors!";
            warningContainer.style.display = "block";
        } else if (urgencyValue === "high") {
            warningContainer.textContent = "High urgency requests will notify nearby matching donors.";
            warningContainer.style.display = "block";
        } else {
            warningContainer.style.display = "none";
        }
    });

    function createWarningElement() {
        const warning = document.createElement("div");
        warning.id = "urgencyWarning";
        warning.className = "warning-message";
        warning.style.color = "red";
        warning.style.marginTop = "5px";

        const urgencyField = document.getElementById("urgency");
        urgencyField.parentNode.insertBefore(warning, urgencyField.nextSibling);

        return warning;
    }
})();
