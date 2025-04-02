import { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { donationAPI } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../lib/auth-context';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export interface DonationListingData {
  id: string;
  donorName: string;
  bloodType: string;
  contactNumber: string;
  availability: string;
  location: string;
  additionalInfo: string;
  listedOn: string;
  status: 'available' | 'pending' | 'completed';
  requesterId: string;
  recipientName?: string; // Add this property to store recipient name
}

interface DonationListingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DonationListingData) => void;
}

const DonationListingForm = ({ isOpen, onClose, onSubmit }: DonationListingFormProps) => {
  const { user, userData, updateUserRole } = useAuth(); // Get updateUserRole from useAuth
  const [formData, setFormData] = useState({
    bloodType: '',
    contactNumber: '',
    availability: '',
    location: '',
    additionalInfo: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.bloodType) newErrors.bloodType = 'Blood type is required';
    if (!formData.contactNumber) newErrors.contactNumber = 'Contact number is required';
    if (!formData.availability) newErrors.availability = 'Availability is required';
    if (!formData.location) newErrors.location = 'Location is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user edits the field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear API error when user makes any changes
    if (apiError) setApiError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Early return if already submitting to prevent double-submission
    if (isSubmitting) return;
    
    if (!validateForm()) return;
    
    // Set submitting state immediately
    setIsSubmitting(true);
    setApiError(null);
    
    // Make a local copy of form data that we'll use for the API call
    // This prevents any state updates during the submission process
    const submissionData = { ...formData };
    
    // Generate a submission ID for deduplication
    const submissionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const toastId = toast.loading('Creating donation listing...');
    
    try {
      // First make sure user has donor role
      if (!user) {
        throw new Error('You must be logged in to create a donation listing');
      }
      
      // First clear the form to prevent duplicate submissions if user clicks multiple times
      setFormData({
        bloodType: '',
        contactNumber: '',
        availability: '',
        location: '',
        additionalInfo: ''
      });
      
      // Close the modal immediately before API call
      onClose();
      
      // Call the API to create the donation
      console.log(`Submitting donation data (ID: ${submissionId}):`, submissionData);
      const response = await donationAPI.createDonation({
        ...submissionData,
        submissionId, // Pass the submission ID to help with deduplication
      });
      
      console.log('Donation created successfully:', response);
      
      // Format the data for the parent component
      const newDonation: DonationListingData = {
        id: `donation-${response.id}`,
        donorName: 'donorName' in response ? response.donorName : 'You',
        bloodType: submissionData.bloodType,
        contactNumber: submissionData.contactNumber,
        availability: submissionData.availability,
        location: submissionData.location,
        additionalInfo: submissionData.additionalInfo,
        listedOn: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        status: 'available',
        requesterId: '',
      };
      
      // Notify parent of success
      onSubmit(newDonation);
      
      // Show success message (parent component will now handle this)
      toast.success('Donation listed successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Error listing donation:', error);
      const errorMessage = error.message || 'Failed to list donation. Please try again.';
      setApiError(errorMessage);
      toast.error('Failed to list donation. Please try again', { id: toastId });
      
      // Don't re-open modal on error, just show the error toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1E1E1E] rounded-lg shadow-xl w-full max-w-lg border border-[#333333]">
        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
          <h2 className="text-xl font-semibold text-white">List Your Donation</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Display API errors */}
          {apiError && (
            <div className="bg-red-900/20 border border-red-800 rounded-md p-3 flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{apiError}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <label htmlFor="bloodType" className="block text-sm font-medium text-gray-400">
              Blood Type <span className="text-red-500">*</span>
            </label>
            <select
              id="bloodType"
              name="bloodType"
              value={formData.bloodType}
              onChange={handleChange}
              className={`w-full bg-[#262626] border ${errors.bloodType ? 'border-red-800' : 'border-[#333333]'} rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0] focus:border-[#9C27B0]`}
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
            {errors.bloodType && <p className="text-red-500 text-xs mt-1">{errors.bloodType}</p>}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-400">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <input
              id="contactNumber"
              name="contactNumber"
              type="tel"
              value={formData.contactNumber}
              onChange={handleChange}
              placeholder="Your contact number"
              className={`w-full bg-[#262626] border ${errors.contactNumber ? 'border-red-800' : 'border-[#333333]'} rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0] focus:border-[#9C27B0]`}
            />
            {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="availability" className="block text-sm font-medium text-gray-400">
              Availability <span className="text-red-500">*</span>
            </label>
            <input
              id="availability"
              name="availability"
              type="text"
              value={formData.availability}
              onChange={handleChange}
              placeholder="e.g., Weekdays after 5pm, Weekends only"
              className={`w-full bg-[#262626] border ${errors.availability ? 'border-red-800' : 'border-[#333333]'} rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0] focus:border-[#9C27B0]`}
            />
            {errors.availability && <p className="text-red-500 text-xs mt-1">{errors.availability}</p>}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="location" className="block text-sm font-medium text-gray-400">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="City, State or Hospital/Clinic Name"
              className={`w-full bg-[#262626] border ${errors.location ? 'border-red-800' : 'border-[#333333]'} rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0] focus:border-[#9C27B0]`}
            />
            {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
          </div>
          
          <div className="space-y-2">
            <label htmlFor="additionalInfo" className="block text-sm font-medium text-gray-400">
              Additional Information <span className="text-gray-500">(optional)</span>
            </label>
            <textarea
              id="additionalInfo"
              name="additionalInfo"
              value={formData.additionalInfo}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional details you want to share"
              className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0] focus:border-[#9C27B0]"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#333333] rounded-md text-white hover:bg-[#262626] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#9C27B0] hover:bg-[#7B1FA2] text-white rounded-md transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  List Donation
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DonationListingForm;