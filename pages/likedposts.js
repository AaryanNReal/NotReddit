import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useRouter } from 'next/router';
import { collection, getDocs, doc, getDoc, query, where, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import Layout from '@/components/Layout';
import { getTimeAgo } from '@/utils/date';
import { motion } from 'framer-motion';

export default function LikedPosts() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState([]);
  const [comments, setComments] = useState({});
  const [activeCommentId, setActiveCommentId] = useState(null);
  const [commentText, setCommentText] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push('/login');
      } else {
        setLoading(false);
        fetchLikedPosts(user.uid);
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchLikedPosts = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      if (!userData) {
        console.error("User data not found");
        return;
      }

      const likedPostsQuery = query(
        collection(db, 'theories'),
        where('likedBy', 'array-contains', userId)
      );
      const likedPostsSnapshot = await getDocs(likedPostsQuery);
      const likedPostsList = likedPostsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      setLikedPosts(likedPostsList);
    } catch (error) {
      console.error("Error fetching liked posts:", error);
    }
  };

  const handleLike = async (postId) => {
    const currentUserId = auth.currentUser.uid;
    try {
      const postRef = doc(db, 'theories', postId);
      const postDoc = await getDoc(postRef);
      const postData = postDoc.data();
      const likedBy = Array.isArray(postData.likedBy) ? postData.likedBy : [];
      const isLiked = likedBy.includes(currentUserId);

      // Update Firestore
      await updateDoc(postRef, {
        likes: isLiked ? postData.likes - 1 : postData.likes + 1,
        likedBy: isLiked ? arrayRemove(currentUserId) : arrayUnion(currentUserId),
      });

      // Update user's liked theories
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        likedTheories: isLiked ? arrayRemove(postId) : arrayUnion(postId),
      });

      // Update UI
      if (isLiked) {
        setLikedPosts(prevLikedPosts => prevLikedPosts.filter(post => post.id !== postId));
      } else {
        fetchLikedPosts(currentUserId);
      }
    } catch (error) {
      console.error('Error updating like:', error);
    }
  };

  const handleCommentSubmit = async (postId) => {
    if (!commentText) return;

    try {
      const commentRef = collection(db, 'theories', postId, 'comments');
      await addDoc(commentRef, {
        text: commentText,
        createdAt: new Date(),
        userId: auth.currentUser.uid,
      });
      setCommentText('');
      setActiveCommentId(null);
      fetchLikedPosts(auth.currentUser.uid);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleShare = (postId) => {
    const shareUrl = `${window.location.origin}/theory/${postId}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => alert('Shareable link copied to clipboard: ' + shareUrl))
      .catch((error) => console.error('Error copying shareable link:', error));
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
              {likedPosts.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  No liked posts yet.
                </div>
              ) : (
                likedPosts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700"
                  >
                    <div className="flex items-center p-4">
                      <img
                        src={post.userPhotoURL}
                        alt={post.userDisplayName}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-semibold dark:text-white">
                          {post.userDisplayName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getTimeAgo(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    {post.mediaUrl && (
                      <div className="relative">
                        <img
                          src={post.mediaUrl}
                          alt="Post content"
                          className="w-full aspect-auto object-cover max-h-[500px]"
                        />
                      </div>
                    )}

                    {post.description && (
                      <div className="p-4">
                        <p className="text-gray-800 dark:text-gray-200">
                          {post.description}
                        </p>
                      </div>
                    )}

                    <div className="p-4 border-t dark:border-gray-700">
                      <div className="flex items-center space-x-4">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center space-x-1.5 ${
                            post.likedBy?.includes(auth.currentUser?.uid)
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
                          <span>{post.likes}</span>
                        </motion.button>

                        <button
                          onClick={() => setActiveCommentId(activeCommentId === post.id ? null : post.id)}
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
                          <span>{comments[post.id]?.length || 0}</span>
                        </button>

                        <button
                          onClick={() => handleShare(post.id)}
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

                      {activeCommentId === post.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 space-y-4"
                        >
                          {comments[post.id]?.map((comment) => (
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
                              onClick={() => handleCommentSubmit(post.id)}
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