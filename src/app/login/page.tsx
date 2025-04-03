"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'react-hot-toast';

const LoginContent = () => {
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
    <>
      <Toaster position="top-right" />
      {/* Add your login form or other components here */}
    </>
  );
};

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
};

export default LoginPage;