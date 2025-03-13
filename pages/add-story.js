import { useState } from 'react';
import { useRouter } from 'next/router';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import Layout from '@/components/Layout';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function AddStory() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddStory = async () => {
    if (!imageFile) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const storage = getStorage();
      const storageRef = ref(storage, `stories/${imageFile.name}`);
      await uploadBytes(storageRef, imageFile);
      const mediaUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, 'stories'), {
        mediaUrl,
        text,
        userId: user.uid,
        userDisplayName: user.displayName,
        createdAt: serverTimestamp(),
      });
      router.push('/feet');
    } catch (error) {
      console.error('Error adding story:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold mb-4 dark:text-white">Add a Story</h2>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="w-full px-4 py-2 mb-4 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text"
            className="w-full px-4 py-2 mb-4 border rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={handleAddStory}
            className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Adding...' : 'Add Story'}
          </button>
        </div>
      </div>
    </Layout>
  );
}