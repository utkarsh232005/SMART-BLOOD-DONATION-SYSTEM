import { useState, useEffect } from 'react';
import { Bell, Calendar, Users, MapPin, Clock, AlertCircle, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { donationAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function HospitalDashboard() {
  const { user, userData } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingAppointments: 0,
    completedDonations: 0,
    activeRequests: 0
  });

  useEffect(() => {
    if (user?.role !== 'HOSPITAL') {
      toast.error('Access denied. Hospital access only.');
      // Redirect to home or appropriate page
      window.location.href = '/';
      return;
    }

    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch appointments
      const appointmentsData = await donationAPI.getHospitalAppointments(user.uid);
      setAppointments(appointmentsData);

      // Calculate stats
      setStats({
        pendingAppointments: appointmentsData.filter(a => a.status === 'pending').length,
        completedDonations: appointmentsData.filter(a => a.status === 'completed').length,
        activeRequests: appointmentsData.filter(a => a.status === 'active').length
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleAppointmentAction = async (appointmentId: string, action: 'accept' | 'reject') => {
    try {
      await donationAPI.updateAppointmentStatus(
        appointmentId, 
        action === 'accept' ? 'confirmed' : 'rejected'
      );
      toast.success(`Appointment ${action}ed successfully`);
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error(`Failed to ${action} appointment`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Hospital Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1E1E1E] p-6 rounded-lg border border-[#333333]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Pending Appointments</p>
                <h3 className="text-2xl font-bold">{stats.pendingAppointments}</h3>
              </div>
              <Calendar className="h-8 w-8 text-[#9C27B0]" />
            </div>
          </div>

          <div className="bg-[#1E1E1E] p-6 rounded-lg border border-[#333333]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Completed Donations</p>
                <h3 className="text-2xl font-bold">{stats.completedDonations}</h3>
              </div>
              <Users className="h-8 w-8 text-[#9C27B0]" />
            </div>
          </div>

          <div className="bg-[#1E1E1E] p-6 rounded-lg border border-[#333333]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400">Active Requests</p>
                <h3 className="text-2xl font-bold">{stats.activeRequests}</h3>
              </div>
              <Bell className="h-8 w-8 text-[#9C27B0]" />
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div className="bg-[#1E1E1E] rounded-lg border border-[#333333] p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Appointments</h2>
          
          <div className="space-y-4">
            {appointments.map((appointment: any) => (
              <div 
                key={appointment.id} 
                className="bg-[#262626] p-4 rounded-lg border border-[#333333]"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{appointment.donorName}</h3>
                    <div className="text-sm text-gray-400 space-y-1 mt-2">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {new Date(appointment.donationDate).toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-2" />
                        {appointment.location}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'accept')}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                    
                    {appointment.status === 'confirmed' && (
                      <span className="bg-green-900/50 text-green-400 px-2 py-1 rounded-md text-sm">
                        Confirmed
                      </span>
                    )}
                    
                    {appointment.status === 'rejected' && (
                      <span className="bg-red-900/50 text-red-400 px-2 py-1 rounded-md text-sm">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {appointments.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-500" />
                <p>No appointments found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}