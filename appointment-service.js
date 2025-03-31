(async () => {
    // Import Firebase modules dynamically
    const { db } = await import('./src/lib/firebase-config-browser.js');
    const { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, getDoc } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
    const notificationService = await import('./notification-service.js');

    class AppointmentService {
        constructor() {
            // Constructor implementation
        }

        // Create a new appointment
        async createAppointment(appointmentData) {
            try {
                const appointmentRef = await addDoc(collection(db, "appointments"), {
                    ...appointmentData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    status: appointmentData.status || "scheduled"
                });

                // Notify the recipient
                if (appointmentData.hospitalId) {
                    await notificationService.sendNotification({
                        type: 'personal',
                        recipientId: appointmentData.hospitalId,
                        title: 'New Donation Appointment',
                        message: `${appointmentData.donorName} has scheduled a donation for ${appointmentData.donationDate}.`,
                        urgent: false
                    });
                }

                return {
                    id: appointmentRef.id,
                    ...appointmentData
                };
            } catch (error) {
                console.error("Error creating appointment in Firebase:", error);
                throw error;
            }
        }

        // Get appointments for a user
        async getUserAppointments(userId) {
            try {
                const q = query(
                    collection(db, "appointments"),
                    where("donorId", "==", userId)
                );

                const querySnapshot = await getDocs(q);
                const appointments = [];

                querySnapshot.forEach((doc) => {
                    appointments.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                return appointments;
            } catch (error) {
                console.error("Error getting appointments from Firebase:", error);
                throw error;
            }
        }

        // Get appointments for a hospital
        async getHospitalAppointments(hospitalId) {
            try {
                const q = query(
                    collection(db, "appointments"),
                    where("hospitalId", "==", hospitalId)
                );

                const querySnapshot = await getDocs(q);
                const appointments = [];

                querySnapshot.forEach((doc) => {
                    appointments.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });

                return appointments;
            } catch (error) {
                console.error("Error getting hospital appointments from Firebase:", error);
                throw error;
            }
        }

        // Update appointment status
        async updateAppointmentStatus(appointmentId, status, notes = "") {
            try {
                const appointmentRef = doc(db, "appointments", appointmentId);
                const appointmentSnap = await getDoc(appointmentRef);

                if (!appointmentSnap.exists()) {
                    throw new Error("Appointment not found");
                }

                const appointmentData = appointmentSnap.data();

                await updateDoc(appointmentRef, {
                    status: status,
                    notes: notes,
                    updatedAt: new Date()
                });

                // Notify the donor about status change
                if (appointmentData.donorId) {
                    let message = "";

                    switch (status) {
                        case "confirmed":
                            message = `Your appointment at ${appointmentData.hospitalName} has been confirmed for ${new Date(appointmentData.donationDate).toLocaleDateString()}.`;
                            break;
                        case "completed":
                            message = `Thank you for your donation at ${appointmentData.hospitalName}! Your donation is complete.`;
                            break;
                        case "cancelled":
                            message = `Your appointment at ${appointmentData.hospitalName} for ${new Date(appointmentData.donationDate).toLocaleDateString()} has been cancelled.`;
                            break;
                        default:
                            message = `Your appointment status has been updated to: ${status}.`;
                    }

                    await notificationService.sendNotification({
                        type: 'personal',
                        recipientId: appointmentData.donorId,
                        title: 'Appointment Update',
                        message: message,
                        urgent: false
                    });
                }

                return {
                    id: appointmentId,
                    status: status,
                    notes: notes
                };
            } catch (error) {
                console.error("Error updating appointment status in Firebase:", error);
                throw error;
            }
        }

        // Cancel an appointment
        async cancelAppointment(appointmentId, reason = "") {
            return this.updateAppointmentStatus(appointmentId, "cancelled", reason);
        }
    }

    // Create and export a singleton instance
    const appointmentService = new AppointmentService();
    window.appointmentService = appointmentService; // Expose to global scope for other scripts
})();
