"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

const LoginPage = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const justRegistered = searchParams?.get('registered');
    if (justRegistered === 'true') {
      toast.success('Registration successful! Please log in with your new account.', {
        duration: 5000
      });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
      <Toaster position="top-right" />
      {/* Add your login form or other components here */}
    </div>
  );
};

export default LoginPage;