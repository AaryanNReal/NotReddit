import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, setDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import Layout from '../components/Layout';
import { motion } from 'framer-motion';
import { getTimeAgo } from '../utils/helpers';

export default function UserDashboard() {
    const router = useRouter();
    const { id } = router.query;
    const [currentUser] = useAuthState(auth);
    const [user, setUser] = useState(null);
   ({
        
    });
    const [activities, setActivities] = useState([]);
    const [selectedTab, setSelectedTab] = useState('theories');
    const [loading, setLoading] = useState(true);
 

    // Fetch initial user data and set up real-time listeners
    useEffect(() => {
        if (!id) return;

        const fetchInitialData = async () => {
            try {
                // Fetch user profile
                const userDoc = await getDoc(doc(db, 'users', id));
                if (!userDoc.exists()) {
                    console.error("User not found");
                    return;
                }
                setUser(userDoc.data());

                // Initialize stats if they don't exist
                const statsDoc = await getDoc(doc(db, 'userStats', id));
                if (!statsDoc.exists()) {
                    const initialStats = {
                        theories: 0,
                    
                    };
                    await setDoc(doc(db, 'userStats', id), initialStats);
                }

                // Fetch user's theories
                const theoriesQuery = query(
                    collection(db, 'theories'),
                    where('userId', '==', id)
                );
                const theoriesSnapshot = await getDocs(theoriesQuery);
                const theories = theoriesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setActivities(theories);
                setUserStats(prev => ({ ...prev, theories: theories.length }));
            } catch (error) {
                console.error("Error fetching initial data:", error);
            } finally {
                setLoading(false);
            }
        };

        // Set up real-time listener for user stats
        const unsubscribeStats = onSnapshot(doc(db, 'userStats', id), (doc) => {
            if (doc.exists()) {
                const stats = doc.data();
               ;
            }
        });

        fetchInitialData();

        return () => {
            unsubscribeStats();
        };
    }, [id]);

    const handleFollow = async () => {
        if (!currentUser) {
            router.push('/login');
            return;
        }

        setFollowLoading(true);

        try {
            const userStatsRef = doc(db, 'userStats', id);
            const currentUserStatsRef = doc(db, 'userStats', currentUser.uid);
            const isFollowing = userStats.followers.includes(currentUser.uid);

            // First, ensure current user's stats document exists
            const currentUserStats = await getDoc(currentUserStatsRef);
            if (!currentUserStats.exists()) {
                await setDoc(currentUserStatsRef, {
                    theories: 0,
                    followers: [],
                    following: []
                });
            }

            // Update target user's followers
            await updateDoc(userStatsRef, {
                followers: isFollowing ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid)
            });

            // Update current user's following
            await updateDoc(currentUserStatsRef, {
                following: isFollowing ? arrayRemove(id) : arrayUnion(id)
            });
        } catch (err) {
            console.error('Error updating follow status:', err);
            alert('An error occurred while updating follow status. Please try again.');
        } finally {
            setFollowLoading(false);
        }
    };

    const handleCopyProfileLink = () => {
        const profileLink = `${window.location.origin}/UserDashboard?id=${id}`;
        navigator.clipboard.writeText(profileLink);
        alert('Profile link copied to clipboard!');
    };

    if (loading) {
        return (
            <Layout>
                <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            </Layout>
        );
    }

    

    return (
        <Layout>
        
            <div className="min-h-screen ml-2 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl ml-12 mx-auto px-4 py-8">
                    {/* Profile Header */}
                    
<div className="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg">
  <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <img
        src={user?.photoURL || '/default-avatar.png'}
        alt={user?.displayName || 'User'}
        className="w-32 h-32 rounded-full border-4 border-purple-500 shadow-lg object-cover"
      />
    </motion.div>

    <div className="flex-1 text-center md:text-left">
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-2"
      >
        {user?.displayName}
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-gray-400 mb-4 max-w-2xl"
      >
        {user?.bio || 'No bio available'}
      </motion.p>
    </div>
  
</div>
                       
                    </div>

                 
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
  {activities.length === 0 ? (
    <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl">
      <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <p className="text-gray-400 text-lg">{user?.displayName} hasn't posted any theories yet</p>
    </div>
  ) : (
    activities.map((activity, index) => (
      <motion.div
        key={activity.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="bg-gray-800 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col"
      >
        {activity.mediaUrl && (
          <div className="relative aspect-video">
            <img
              src={activity.mediaUrl}
              alt="Theory media"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-5 flex-1">
          <h3 className="text-xl font-semibold text-white mb-2">
            {activity.title}
          </h3>
          <p className="text-gray-400 mb-4">
            {activity.description}
          </p>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{getTimeAgo(activity.createdAt)}</span>
            <button 
              onClick={() => router.push(`/theory/${activity.id}`)}
              className="text-purple-500 hover:text-purple-400"
            >
              Read More
            </button>
          </div>
        </div>
      </motion.div>
    ))
  )}
</div>

                    {/* Following Tab */}
                    {selectedTab === 'following' && (
                        <div className="bg-gray-800 rounded-xl p-6">
                            {userStats.following.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    Not following anyone yet
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Add following list here when implementing */}
                                    <div className="text-center py-8 text-gray-400">
                                        Following list coming soon
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}