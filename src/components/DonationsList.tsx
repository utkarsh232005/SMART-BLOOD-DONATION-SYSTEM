import { useState } from 'react';
import { Heart, CheckCircle, XCircle, MapPin, Calendar, User, Clock, Info, Phone, Mail } from 'lucide-react';
import { DonationListingData as BaseDonationListingData } from './DonationListingForm';

// Extend the imported type with requesterId
interface DonationListingData extends BaseDonationListingData {
  requesterId?: string;
}

interface DonationsListProps {
  donations: DonationListingData[];
  userType: 'donor' | 'recipient';
  onStatusChange: (donationId: string, newStatus: 'available' | 'pending' | 'completed') => void;
  onRequestDonation: (donationId: string) => void;
  onAcceptRequest?: (donationId: string, recipientId: string) => void; // Add new prop for accepting requests
}

const DonationsList = ({ 
  donations, 
  userType, 
  onStatusChange, 
  onRequestDonation,
  onAcceptRequest 
}: DonationsListProps) => {
  const [expandedDonation, setExpandedDonation] = useState<string | null>(null);
  
  const toggleExpand = (id: string) => {
    if (expandedDonation === id) {
      setExpandedDonation(null);
    } else {
      setExpandedDonation(id);
    }
  };
  
  // Check if there are no donations to display
  if (donations.length === 0) {
    return (
      <div className="p-8 text-center bg-[#1E1E1E] border border-[#333333] rounded-lg">
        <Heart className="h-12 w-12 mx-auto text-[#9C27B0] mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">No donations available</h3>
        <p className="text-gray-400">
          {userType === 'donor' 
            ? 'You have not listed any donations yet. Click the "List Donation" button to get started.'
            : 'There are no blood donations available at the moment. Please check back later.'}
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {donations.map((donation) => (
        <div 
          key={donation.id} 
          className={`border ${
            donation.status === 'pending' 
              ? 'border-yellow-600 bg-yellow-900/10' 
              : donation.status === 'completed' 
                ? 'border-green-600 bg-green-900/10' 
                : 'border-[#333333] bg-[#1E1E1E]'
          } rounded-lg overflow-hidden transition-all duration-300 ease-in-out`}
        >
          {/* Donation Header */}
          <div 
            className="p-4 flex justify-between items-center cursor-pointer"
            onClick={() => toggleExpand(donation.id)}
          >
            <div className="flex items-center space-x-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                donation.status === 'pending' 
                  ? 'bg-yellow-900/20 text-yellow-500' 
                  : donation.status === 'completed' 
                    ? 'bg-green-900/20 text-green-500' 
                    : 'bg-[#9C27B0]/20 text-[#9C27B0]'
              }`}>
                {donation.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : donation.status === 'pending' ? (
                  <Clock className="h-5 w-5" />
                ) : (
                  <Heart className="h-5 w-5" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {donation.bloodType} Blood Type
                </h3>
                <p className="text-sm text-gray-400">
                  {userType === 'donor' ? 'Listed by you' : `Donor: ${donation.donorName}`} • {donation.listedOn}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                donation.status === 'pending' 
                  ? 'bg-yellow-900/50 text-yellow-400' 
                  : donation.status === 'completed' 
                    ? 'bg-green-900/50 text-green-400' 
                    : 'bg-blue-900/50 text-blue-400'
              }`}>
                {donation.status === 'pending' ? 'Pending Request' : donation.status === 'completed' ? 'Completed' : 'Available'}
              </span>
              
              <button 
                className="h-8 w-8 rounded-full bg-[#262626] hover:bg-[#333333] flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(donation.id);
                }}
              >
                <svg 
                  className={`h-5 w-5 text-white transition-transform ${expandedDonation === donation.id ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Expanded Details */}
          {expandedDonation === donation.id && (
            <div className="px-4 pb-4 pt-2 border-t border-[#333333]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-[#9C27B0] mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Location</p>
                      <p className="text-white">{donation.location}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Calendar className="h-5 w-5 text-[#9C27B0] mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Availability</p>
                      <p className="text-white">{donation.availability}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <User className="h-5 w-5 text-[#9C27B0] mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Donor</p>
                      <p className="text-white">{donation.donorName}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-[#9C27B0] mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Contact</p>
                      <p className="text-white">{donation.contactNumber}</p>
                    </div>
                  </div>
                  
                  {donation.additionalInfo && (
                    <div className="flex items-start">
                      <Info className="h-5 w-5 text-[#9C27B0] mr-2 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-400">Additional Information</p>
                        <p className="text-white">{donation.additionalInfo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="mt-6 flex space-x-3">
                {userType === 'donor' ? (
                  <>
                    {donation.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => onAcceptRequest && onAcceptRequest(donation.id, donation.requesterId || '')}
                          className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors flex items-center justify-center"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Accept Request
                        </button>
                        <button 
                          onClick={() => onStatusChange(donation.id, 'available')}
                          className="flex-1 py-2 px-4 bg-transparent border border-red-600 text-red-400 hover:bg-red-900/20 rounded-md transition-colors flex items-center justify-center"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Decline Request
                        </button>
                      </>
                    )}
                    {donation.status === 'available' && (
                      <button 
                        onClick={() => onStatusChange(donation.id, 'completed')}
                        className="flex-1 py-2 px-4 bg-[#9C27B0] hover:bg-[#7B1FA2] text-white rounded-md transition-colors flex items-center justify-center"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {donation.status === 'available' ? (
                      <button 
                        onClick={() => onRequestDonation(donation.id)}
                        className="flex-1 py-2 px-4 bg-[#9C27B0] hover:bg-[#7B1FA2] text-white rounded-md transition-colors flex items-center justify-center"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Request Donation
                      </button>
                    ) : donation.status === 'pending' ? (
                      <button 
                        onClick={() => onStatusChange(donation.id, 'available')}
                        className="flex-1 py-2 px-4 border border-red-600 text-red-400 hover:bg-red-900/20 rounded-md transition-colors flex items-center justify-center"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Request
                      </button>
                    ) : (
                      <div className="flex-1 py-2 px-4 bg-green-900/20 text-green-400 rounded-md flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Donation Completed
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DonationsList;