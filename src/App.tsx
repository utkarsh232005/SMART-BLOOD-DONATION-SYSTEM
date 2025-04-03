import React, { useState, useEffect } from 'react';
import { Bell, Droplet, Heart, Search, Users, LogOut, User, Calendar, MapPin, Clock } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from './contexts/AuthContext';
import { donationAPI, bloodRequestAPI } from './lib/api';

type BloodRequest = {
  id: string;
  bloodType: string;
  location: string;
  urgency: 'normal' | 'emergency';
  timestamp: string;
};

type Donation = {
  id: string;
  bloodType: string;
  contactNumber: string;
  availability: string;
  location: string;
  status: 'available' | 'requested' | 'completed';
  createdAt: any;
  notes?: string;
};

function App() {
  const [activeTab, setActiveTab] = useState<'donate' | 'request'>('donate');
  const { user, userData, loading, login, register, logout } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showDonationForm, setShowDonationForm] = useState(false);
  const [myDonations, setMyDonations] = useState<Donation[]>([]);
  const [loadingDonations, setLoadingDonations] = useState(false);
  const [loginFormData, setLoginFormData] = useState({ email: '', password: '' });
  const [registerFormData, setRegisterFormData] = useState({
    name: '',
    email: '',
    password: '',
    bloodType: '',
    phoneNumber: '',
    address: ''
  });
  const [donationFormData, setDonationFormData] = useState({
    bloodType: '',
    contactNumber: '',
    availability: '',
    location: '',
    notes: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [donationError, setDonationError] = useState<string | null>(null);
  const [donationSuccess, setDonationSuccess] = useState<string | null>(null);
  
  // Fetch user's donations when logged in
  useEffect(() => {
    if (user) {
      fetchMyDonations();
    } else {
      setMyDonations([]);
    }
  }, [user]);

  const fetchMyDonations = async () => {
    try {
      setLoadingDonations(true);
      console.log("Fetching donations for user:", user?.uid);
      const donations = await donationAPI.getMyDonations();
      console.log("Received donations:", donations);
      
      if (Array.isArray(donations)) {
        setMyDonations(donations as Donation[]);
      } else {
        console.error("Received invalid donations data:", donations);
        setMyDonations([]);
      }
    } catch (error) {
      console.error('Error fetching donations:', error);
      setMyDonations([]);
    } finally {
      setLoadingDonations(false);
    }
  };
  
  const emergencyRequests: BloodRequest[] = [
    {
      id: '1',
      bloodType: 'A+',
      location: 'Central Hospital',
      urgency: 'emergency',
      timestamp: '10 minutes ago'
    },
    {
      id: '2',
      bloodType: 'O-',
      location: 'City Medical Center',
      urgency: 'emergency',
      timestamp: '15 minutes ago'
    }
  ];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      await login(loginFormData.email, loginFormData.password);
      setShowLoginForm(false);
      setLoginFormData({ email: '', password: '' });
    } catch (error: any) {
      setAuthError(error.message || 'Login failed');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    try {
      const { email, password, name, ...otherData } = registerFormData;
      
      // Ensure name is properly formatted and split into firstName and lastName
      // This prevents the "undefined in property 'users.USER_ID.name'" error
      const nameParts = (name || '').trim().split(' ');
      const firstName = nameParts[0] || 'Anonymous';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      const userData = {
        ...otherData,
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,  // Explicitly set name field
      };
      
      await register(email, password, userData);
      setIsRegistering(false);
      setShowLoginForm(false);
    } catch (error: any) {
      console.error('Registration error:', error);
      setAuthError(error.message || 'Registration failed');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDonationError(null);
    setDonationSuccess(null);
    
    try {
      // Validate form
      if (!donationFormData.bloodType) {
        throw new Error('Blood type is required');
      }
      
      if (!donationFormData.contactNumber) {
        throw new Error('Contact number is required');
      }
      
      if (!donationFormData.availability) {
        throw new Error('Availability is required');
      }
      
      if (!donationFormData.location) {
        throw new Error('Preferred donation location is required');
      }
      
      console.log("Submitting donation data:", donationFormData);
      
      // Check if user is authenticated
      if (!user) {
        throw new Error('You must be logged in to list a donation');
      }
      
      // Create the donation object with minimal fields to reduce potential errors
      const donationToSave = {
        bloodType: donationFormData.bloodType,
        contactNumber: donationFormData.contactNumber,
        availability: donationFormData.availability,
        location: donationFormData.location,
        notes: donationFormData.notes || "",
        status: 'available'
      };
      
      console.log("Formatted donation data:", donationToSave);
      
      try {
        // Use the donationAPI to create a new donation
        const result = await donationAPI.createDonation(donationToSave);
        console.log("Donation created successfully:", result);
        
        // Refresh donations list
        await fetchMyDonations();
        
        // Clear form and show success message
        setDonationFormData({
          bloodType: '',
          contactNumber: '',
          availability: '',
          location: '',
          notes: ''
        });
        
        setDonationSuccess('Donation listed successfully! Thank you for your contribution.');
        
        // Close the form after 2 seconds
        setTimeout(() => {
          setShowDonationForm(false);
          setDonationSuccess(null);
        }, 2000);
      } catch (innerError: any) {
        console.error("Firebase error:", innerError);
        setDonationError(`Firebase error: ${innerError.message}`);
      }
    } catch (error: any) {
      console.error('Donation submission error:', error);
      setDonationError(error.message || 'Failed to create donation listing');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'requested':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black shadow-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Droplet className="h-8 w-8 text-purple-500" />
            <h1 className="text-2xl font-bold text-white">BloodConnect</h1>
          </div>
          <nav className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-white">
              <Bell className="h-6 w-6" />
            </button>
            
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 rounded-full bg-purple-900 flex items-center justify-center">
                    <User className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-white">{userData?.name || user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-sm text-gray-400 hover:text-purple-500"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginForm(true)}
                className="text-sm font-medium text-purple-500 hover:text-purple-400"
              >
                Login / Register
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-6">Welcome to Your <span className="text-purple-500">Dashboard</span></h1>
          
          <div className="flex space-x-4 mb-6">
            <button className="px-4 py-3 bg-purple-600 rounded-md flex items-center space-x-2">
              <Droplet className="h-5 w-5" />
              <span>Donor Dashboard</span>
            </button>
            <button className="px-4 py-3 bg-gray-800 rounded-md flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Recipient Dashboard</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-400 mb-1">Total Donations</p>
              <div className="flex items-center">
                <Heart className="h-6 w-6 text-purple-500 mr-2" />
                <span className="text-3xl font-bold">0</span>
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-400 mb-1">Lives Impacted</p>
              <div className="flex items-center">
                <Users className="h-6 w-6 text-purple-500 mr-2" />
                <span className="text-3xl font-bold">0</span>
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-400 mb-1">Next Appointment</p>
              <div className="flex items-center">
                <Calendar className="h-6 w-6 text-purple-500 mr-2" />
                <span className="text-3xl font-bold">None</span>
              </div>
            </div>
            <div className="bg-gray-900 p-4 rounded-lg">
              <p className="text-gray-400 mb-1">Listed Donations</p>
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-purple-500 mr-2" />
                <span className="text-3xl font-bold">{myDonations.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login/Register Modal */}
        {showLoginForm && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">
                  {isRegistering ? 'Create an Account' : 'Login to Your Account'}
                </h2>
                <button 
                  onClick={() => setShowLoginForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              
              {authError && (
                <div className="bg-red-900 text-red-200 p-3 rounded-md mb-4">
                  {authError}
                </div>
              )}
              
              {isRegistering ? (
                <form onSubmit={handleRegisterSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Full Name</label>
                      <input
                        type="text"
                        value={registerFormData.name}
                        onChange={(e) => setRegisterFormData({...registerFormData, name: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Email</label>
                      <input
                        type="email"
                        value={registerFormData.email}
                        onChange={(e) => setRegisterFormData({...registerFormData, email: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Password</label>
                      <input
                        type="password"
                        value={registerFormData.password}
                        onChange={(e) => setRegisterFormData({...registerFormData, password: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Blood Type</label>
                      <select
                        value={registerFormData.bloodType}
                        onChange={(e) => setRegisterFormData({...registerFormData, bloodType: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
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
                      <label className="block text-sm font-medium text-gray-300">Phone Number</label>
                      <input
                        type="tel"
                        value={registerFormData.phoneNumber}
                        onChange={(e) => setRegisterFormData({...registerFormData, phoneNumber: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Address</label>
                      <textarea
                        value={registerFormData.address}
                        onChange={(e) => setRegisterFormData({...registerFormData, address: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        rows={2}
                      ></textarea>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setIsRegistering(false)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Login Instead
                    </button>
                    <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Register
                  </button>
                </div>
                </form>
              ) : (
                <form onSubmit={handleLoginSubmit}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Email</label>
                      <input
                        type="email"
                        value={loginFormData.email}
                        onChange={(e) => setLoginFormData({...loginFormData, email: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
              </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300">Password</label>
                      <input
                        type="password"
                        value={loginFormData.password}
                        onChange={(e) => setLoginFormData({...loginFormData, password: e.target.value})}
                        className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                        required
                      />
          </div>
        </div>

                  <div className="mt-6 flex items-center justify-between">
              <button
                      type="button"
                      onClick={() => setIsRegistering(true)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Create Account
              </button>
              <button
                      type="submit"
                      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                      Sign In
              </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Donation Form Modal */}
        {showDonationForm && (
          <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full border border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">List Donation</h2>
                <button 
                  onClick={() => setShowDonationForm(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {donationError && (
                <div className="bg-red-900 text-red-200 p-3 rounded-md mb-4">
                  {donationError}
                </div>
              )}
              
              {donationSuccess && (
                <div className="bg-green-900 text-green-200 p-3 rounded-md mb-4">
                  {donationSuccess}
                </div>
              )}
              
              <form onSubmit={handleDonationSubmit}>
              <div className="space-y-6">
                  <div>
                    <div className="flex items-center mb-2">
                      <Droplet className="h-5 w-5 text-purple-500 mr-2" />
                      <label className="text-sm font-medium text-gray-300">Blood Type</label>
                    </div>
                    <select
                      value={donationFormData.bloodType}
                      onChange={(e) => setDonationFormData({...donationFormData, bloodType: e.target.value})}
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
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
                    <div className="flex items-center mb-2">
                      <Bell className="h-5 w-5 text-purple-500 mr-2" />
                      <label className="text-sm font-medium text-gray-300">Contact Number</label>
                    </div>
                    <input
                      type="tel"
                      value={donationFormData.contactNumber}
                      onChange={(e) => setDonationFormData({...donationFormData, contactNumber: e.target.value})}
                      placeholder="e.g. 1234567890"
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <Calendar className="h-5 w-5 text-purple-500 mr-2" />
                      <label className="text-sm font-medium text-gray-300">Availability</label>
                    </div>
                    <input
                      type="text"
                      value={donationFormData.availability}
                      onChange={(e) => setDonationFormData({...donationFormData, availability: e.target.value})}
                      placeholder="e.g. MON-FRI 4:00 PM"
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>

                    <div>
                    <div className="flex items-center mb-2">
                      <MapPin className="h-5 w-5 text-purple-500 mr-2" />
                      <label className="text-sm font-medium text-gray-300">Preferred Donation Location</label>
                    </div>
                    <input
                      type="text"
                      value={donationFormData.location}
                      onChange={(e) => setDonationFormData({...donationFormData, location: e.target.value})}
                      placeholder="e.g. City Hospital"
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      required
                    />
                  </div>

                    <div>
                    <div className="flex items-center mb-2">
                      <Clock className="h-5 w-5 text-purple-500 mr-2" />
                      <label className="text-sm font-medium text-gray-300">Additional Information (Optional)</label>
                    </div>
                    <textarea
                      value={donationFormData.notes}
                      onChange={(e) => setDonationFormData({...donationFormData, notes: e.target.value})}
                      placeholder="Any additional information"
                      className="mt-1 block w-full rounded-md bg-gray-800 border-gray-700 text-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
                      rows={3}
                    ></textarea>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setShowDonationForm(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center"
                    onClick={(e) => {
                      console.log("Submit button clicked");
                      // Form submission is handled by onSubmit on the form
                    }}
                  >
                    <span className="mr-2">+</span> List Donation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* User's Donations Section */}
        {user && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Your Listed Donations</h2>
              <button 
                onClick={() => setShowDonationForm(true)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <span className="mr-2">+</span> List Donation
                </button>
            </div>
            
            {loadingDonations ? (
              <div className="flex justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : myDonations.length > 0 ? (
              <div className="bg-gray-900 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-800">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Blood Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Availability</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-gray-900 divide-y divide-gray-800">
                      {myDonations.map((donation) => (
                        <tr key={donation.id} className="hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-purple-900 flex items-center justify-center mr-3">
                                <span className="font-bold text-purple-400">{donation.bloodType}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <div className="flex items-center">
                              <Bell className="h-4 w-4 text-gray-400 mr-1" />
                              {donation.contactNumber}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {donation.availability}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                              {donation.location}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                              {donation.status.charAt(0).toUpperCase() + donation.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-lg shadow-md p-6 text-center border border-gray-800">
                <div className="mb-4">
                  <Droplet className="h-12 w-12 text-purple-500 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No donations found</h3>
                <p className="text-gray-400 mb-6">You haven't listed any blood donations yet. Click "List Donation" to get started.</p>
                <button 
                  onClick={() => setShowDonationForm(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <span className="mr-2">+</span> List Donation
                </button>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="bg-purple-600 text-white p-4 rounded-lg flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                <span>Schedule Donation</span>
              </button>
              <button className="bg-gray-800 text-white p-4 rounded-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                <span>Update Profile</span>
              </button>
          </div>
        </div>

          <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
            <h2 className="text-xl font-bold text-white mb-4">Notifications</h2>
            <div className="space-y-4">
              <div className="bg-red-900 text-white p-3 rounded-lg flex items-start">
                <Bell className="h-5 w-5 text-red-300 mr-2 mt-0.5" />
                <p>Urgent need for O- blood type in City Hospital</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;