import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/router';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import { getTimeAgo } from '@/utils/date';
import { motion } from 'framer-motion';

export default function ForYou() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [recommendedTheories, setRecommendedTheories] = useState([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
      } else {
        setLoading(false);
        fetchRecommendedTheories();
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchRecommendedTheories = async () => {
    try {
      const currentUserId = auth.currentUser.uid;
      console.log("Current User ID:", currentUserId);

      // Fetch theories liked by the user
      const likedTheoriesQuery = query(
        collection(db, 'theories'),
        where('likedBy', 'array-contains', currentUserId)
      );
      const likedTheoriesSnapshot = await getDocs(likedTheoriesQuery);
      const likedTheories = likedTheoriesSnapshot.docs.map(doc => doc.data());
      console.log("Liked Theories:", likedTheories);

      // Fetch theories similar to those liked by the user
      const similarTheoriesQuery = query(
        collection(db, 'theories'),
        where('tags', 'array-contains-any', likedTheories.flatMap(theory => theory.tags || [])),
        orderBy('createdAt', 'desc')
      );
      const similarTheoriesSnapshot = await getDocs(similarTheoriesQuery);
      const similarTheories = similarTheoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("Similar Theories:", similarTheories);

      setRecommendedTheories(similarTheories);
    } catch (error) {
      console.error("Error fetching recommended theories:", error);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {recommendedTheories.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400">No recommendations available.</p>
              ) : (
                recommendedTheories.map((theory) => (
                  <motion.div
                    key={theory.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700"
                  >
                    {/* User Header */}
                    <div className="flex items-center p-4">
                      <img
                        src={theory.userPhotoURL}
                        alt={theory.userDisplayName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-semibold dark:text-white">
                          {theory.userDisplayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getTimeAgo(theory.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Media Content */}
                    {theory.mediaUrl && (
                      <div className="relative">
                        <img
                          src={theory.mediaUrl}
                          alt="Post content"
                          className="w-full aspect-auto object-cover max-h-[500px]"
                        />
                      </div>
                    )}

                    {/* Description */}
                    {theory.description && (
                      <div className="p-4">
                        <p className="text-gray-800 dark:text-gray-200">
                          {theory.description}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="p-4 border-t dark:border-gray-700">
                      <div className="flex items-center space-x-4">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleLike(theory.id)}
                          className={`flex items-center space-x-1.5 ${
                            theory.likedBy?.includes(auth.currentUser?.uid)
                              ? 'text-purple-500'
                              : 'text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400'
                          }`}
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                            />
                          </svg>
                          <span>{theory.likes}</span>
                        </motion.button>

                        <button
                          onClick={() => setActiveCommentId(activeCommentId === theory.id ? null : theory.id)}
                          className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400"
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          <span>{comments[theory.id]?.length || 0}</span>
                        </button>

                        <button
                          onClick={() => handleShare(theory.id)}
                          className="flex items-center space-x-1.5 text-gray-600 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400"
                        >
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                            />
                          </svg>
                        </button>
                      </div>

                      {/* Comments Section */}
                      {activeCommentId === theory.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 space-y-4"
                        >
                          {comments[theory.id]?.map((comment) => (
                            <div
                              key={comment.id}
                              className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-semibold dark:text-white">
                                  {comment.userDisplayName}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {getTimeAgo(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">
                                {comment.text}
                              </p>
                            </div>
                          ))}

                          <div className="flex space-x-2 mt-4">
                            <input
                              type="text"
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder="Add a comment..."
                              className="flex-1 rounded-lg px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCommentSubmit(theory.id)}
                              className="px-4 py-2 text-sm font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              Post
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}