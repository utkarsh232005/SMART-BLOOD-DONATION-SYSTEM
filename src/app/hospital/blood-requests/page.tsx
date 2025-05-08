import { useState } from 'react';
import { Bell, MapPin, AlertCircle, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { donationAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';

export default function BloodRequests() {
  const { user } = useAuth();
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    bloodType: '',
    units: 1,
    urgency: 'normal',
    requiredBy: '',
    location: '',
    additionalNotes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await donationAPI.createBloodRequest({
        ...formData,
        hospitalId: user?.uid,
        status: 'active'
      });
      
      toast.success('Blood request created successfully');
      setShowRequestForm(false);
      setFormData({
        bloodType: '',
        units: 1,
        urgency: 'normal',
        requiredBy: '',
        location: '',
        additionalNotes: ''
      });
    } catch (error) {
      console.error('Error creating blood request:', error);
      toast.error('Failed to create blood request');
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Blood Requests</h1>
          
          <button
            onClick={() => setShowRequestForm(true)}
            className="bg-[#9C27B0] hover:bg-[#7B1FA2] text-white px-4 py-2 rounded-md flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Request
          </button>
        </div>

        {/* Request Form Modal */}
        {showRequestForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#1E1E1E] rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-semibold mb-4">Create Blood Request</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Blood Type
                  </label>
                  <select
                    value={formData.bloodType}
                    onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                    className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select Blood Type</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Units Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.units}
                    onChange={(e) => setFormData({...formData, units: parseInt(e.target.value)})}
                    className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={formData.urgency}
                    onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                    className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white"
                    required
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Required By
                  </label>
                  <input
                    type="date"
                    value={formData.requiredBy}
                    onChange={(e) => setFormData({...formData, requiredBy: e.target.value})}
                    className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="Hospital location"
                    className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                    className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white"
                    rows={3}
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowRequestForm(false)}
                    className="px-4 py-2 bg-[#333333] text-white rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#9C27B0] hover:bg-[#7B1FA2] text-white rounded-md"
                  >
                    Create Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}