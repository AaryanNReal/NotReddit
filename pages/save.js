import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, arrayRemove } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import Layout from '@/components/Layout';
import { getTimeAgo } from '@/utils/date';
import { motion } from 'framer-motion';

export default function SavedPosts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savedTheories, setSavedTheories] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
      } else {
        fetchSavedTheories(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchSavedTheories = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      if (userData && userData.savedTheories) {
        const theoriesQuery = query(
          collection(db, 'theories'),
          where('__name__', 'in', userData.savedTheories)
        );
        const theoriesSnapshot = await getDocs(theoriesQuery);
        const theoriesList = theoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSavedTheories(theoriesList);
      }
    } catch (error) {
      console.error("Error fetching saved theories:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (theoryId) => {
    const currentUserId = auth.currentUser.uid;

    try {
      const theoryRef = doc(db, 'theories', theoryId);
      await updateDoc(theoryRef, {
        savedBy: arrayRemove(currentUserId),
      });

      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        savedTheories: arrayRemove(theoryId),
      });

      setSavedTheories(prevTheories => prevTheories.filter(theory => theory.id !== theoryId));
    } catch (error) {
      console.error('Error unsaving theory:', error);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          <p className="text-gray-400">Loading saved posts...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
 
      <div className="min-h-screen bg-gray-900 px-4 sm:px-6 lg:px-8 ml-5">
      
<div className="max-w-7xl mx-auto px-4 py-8">
  <h1 className="text-3xl font-bold text-white mb-6">Saved Posts</h1>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {savedTheories.length === 0 ? (
      <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl">
        <p className="text-gray-400 text-lg">No saved posts yet</p>
      </div>
    ) : (
      savedTheories.map((theory, index) => (
        <motion.div
          key={theory.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col group hover:-translate-y-1"
        >
          {theory.mediaUrl ? (
            <div className="relative aspect-[4/3]">
              <img
                src={theory.mediaUrl}
                alt="Theory media"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <div className="relative aspect-[4/3] bg-gradient-to-br from-purple-600/20 to-blue-500/20 flex items-center justify-center">
              <svg className="w-12 h-12 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
          <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white line-clamp-1">
                {theory.title || 'Untitled Theory'}
              </h3>
              <span className="text-sm text-gray-400">
                {getTimeAgo(theory.createdAt)}
              </span>
            </div>
            <p className="text-gray-300 mb-4 line-clamp-2">
              {theory.description}
            </p>
            <div className="mt-auto flex items-center justify-between text-gray-400 text-sm">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleUnsave(theory.id)}
                  className="text-red-400 hover:text-red-300 transition-colors duration-200"
                >
                  Unsave
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ))
    )}
  </div>
</div>
</div>
    </Layout>
  );
}