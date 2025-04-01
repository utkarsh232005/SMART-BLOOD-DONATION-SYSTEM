import { useState, useEffect } from 'react';
import { Heart, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

interface UserTypeSelectorProps {
  userType: 'donor' | 'recipient';
  setUserType: (type: 'donor' | 'recipient') => void;
}

const UserTypeSelector = ({ userType, setUserType }: UserTypeSelectorProps) => {
  const { user, updateUserRole, loading } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize userType from user role when component mounts
  useEffect(() => {
    if (user?.role) {
      const role = user.role.toLowerCase() as 'donor' | 'recipient';
      setUserType(role);
    }
  }, [user, setUserType]);
  
  const handleRoleChange = async (newRole: 'donor' | 'recipient') => {
    if (newRole === userType) return;
    
    setIsUpdating(true);
    setError(null);
    
    try {
      // First, update the role in Firestore directly
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            role: newRole.toUpperCase(),
            updatedAt: new Date()
          });
          
          console.log(`Role updated to ${newRole.toUpperCase()} in Firestore`);
        } catch (dbError) {
          console.error("Error updating role in Firestore:", dbError);
          throw dbError;
        }
      } else {
        throw new Error('User not authenticated');
      }
      
      // Then update role via auth context to update application state
      await updateUserRole(newRole);
      
      setUserType(newRole);
      toast.success(`Your role has been updated to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}.`);
      
      // Force a small delay and refresh component to ensure UI reflects the change
      setTimeout(() => {
        setUserType(newRole);
      }, 300);
    } catch (error: any) {
      setError(error.message || 'Failed to update role. Please try again.');
      toast.error('Failed to update role. Please try again.');
      console.error('Error updating role:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">I want to:</h3>
      
      {/* Show error message if any */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleRoleChange('donor')}
          disabled={isUpdating || loading}
          className={`p-4 rounded-lg border ${
            userType === 'donor'
              ? 'bg-[#9C27B0]/20 border-[#9C27B0] text-white'
              : 'bg-[#1E1E1E] border-[#333333] text-gray-400 hover:border-[#9C27B0]/50'
          } transition-colors flex items-center justify-center`}
        >
          <div className="flex flex-col items-center space-y-2">
            <Heart className={`h-6 w-6 ${userType === 'donor' ? 'text-[#9C27B0]' : 'text-gray-400'}`} />
            <span className="font-medium">Be a Donor</span>
            <p className="text-xs text-center">I want to donate blood to help others</p>
          </div>
        </button>
        
        <button
          onClick={() => handleRoleChange('recipient')}
          disabled={isUpdating || loading}
          className={`p-4 rounded-lg border ${
            userType === 'recipient'
              ? 'bg-[#9C27B0]/20 border-[#9C27B0] text-white'
              : 'bg-[#1E1E1E] border-[#333333] text-gray-400 hover:border-[#9C27B0]/50'
          } transition-colors flex items-center justify-center`}
        >
          <div className="flex flex-col items-center space-y-2">
            <User className={`h-6 w-6 ${userType === 'recipient' ? 'text-[#9C27B0]' : 'text-gray-400'}`} />
            <span className="font-medium">Need Blood</span>
            <p className="text-xs text-center">I'm looking for blood donors</p>
          </div>
        </button>
      </div>
      
      {isUpdating && (
        <div className="mt-4 flex justify-center">
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="h-4 w-4 border-2 border-[#9C27B0] border-t-transparent rounded-full animate-spin"></div>
            <span>Updating your role...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTypeSelector;