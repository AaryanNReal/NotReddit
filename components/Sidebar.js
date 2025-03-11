import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleViewLikedPosts = () => {
    router.push('/likedposts');
  };

  const handleviewsavedposts = () => {
    router.push('/save');
  };

  return (
    <div className="relative">
      <button
        onClick={toggleSidebar}
        className="text-white focus:outline-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg z-50">
          <button
            onClick={handleViewLikedPosts}
            className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          >
            Liked Posts
          </button>
          <button
            onClick={handleSignOut}
            className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          >
            Sign Out
          </button>
          <button
            onClick={handleviewsavedposts}
            className="block w-full px-4 py-2 text-left text-white hover:bg-gray-700"
          >
            Saved Posts
          </button>
        </div>
      )}
    </div>
  );
}