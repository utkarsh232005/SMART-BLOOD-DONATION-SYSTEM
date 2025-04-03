'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';
import { authAPI } from '@/lib/api';

const RegisterPage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    bloodType: '',
    phone: '',
    address: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword || !formData.bloodType) {
      setError('Please fill in all required fields.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      // Add additional validation for required fields with defaults
      if (!formData.firstName.trim()) {
        formData.firstName = 'Anonymous';
      }
      
      if (!formData.lastName.trim()) {
        formData.lastName = 'User';
      }
      
      // Create user registration data with sanitized values
      const userData = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        // Explicitly create a name field from firstName and lastName
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        bloodType: formData.bloodType,
        role: 'DONOR',
        phone: formData.phone || '',
        address: formData.address || '',
        createdAt: new Date().toISOString(),
      };

      console.log('Submitting user data:', {
        ...userData,
        password: '[REDACTED]', // Don't log the password
      });

      const response = await authAPI.register(userData);

      console.log('Registration successful:', response);

      toast.success('Registration successful! Please log in.', {
        duration: 5000,
      });

      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        bloodType: '',
        phone: '',
        address: '',
      });

      // Redirect to login page after successful registration
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email or try logging in.');
      } else {
        setError(error.message || 'Failed to register. Please try again.');
      }

      toast.error(error.message || 'Registration failed. Please try again.', {
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
      <Toaster position="top-right" />
      <form onSubmit={handleSubmit} className="bg-[#1E1E1E] p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Register</h2>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <div className="space-y-4">
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="First Name"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Last Name"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
          <select
            name="bloodType"
            value={formData.bloodType}
            onChange={handleChange}
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
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
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone (optional)"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address (optional)"
            className="w-full bg-[#262626] border border-[#333333] rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#9C27B0]"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-[#9C27B0] hover:bg-[#7B1FA2] text-white py-2 rounded-md mt-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;