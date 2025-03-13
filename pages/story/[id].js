import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import Layout from '@/components/Layout';

export default function ViewStory() {
  const router = useRouter();
  const { id } = router.query;
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const fetchStory = async () => {
        try {
          const storyDoc = await getDoc(doc(db, 'stories', id));
          if (storyDoc.exists()) {
            setStory(storyDoc.data());
          } else {
            console.error('Story not found');
          }
        } catch (error) {
          console.error('Error fetching story:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchStory();
    }
  }, [id]);

  if (loading) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!story) {
    return (
      <Layout>
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-gray-500 dark:text-gray-400">Story not found</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <img
              src={story.mediaUrl}
              alt={story.userDisplayName}
              className="w-full h-full object-cover rounded-lg"
            />
            <p className="mt-4 text-gray-800 dark:text-gray-200">{story.userDisplayName}</p>
            {story.text && (
              <p className="mt-2 text-gray-600 dark:text-gray-300">{story.text}</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}