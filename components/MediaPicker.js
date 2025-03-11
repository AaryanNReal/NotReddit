import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GIPHY_API_KEY = "lP4OZ2naj4tAVONfzxkVw13erS5mD3n2";
const STICKER_CATEGORIES = ['love', 'happy', 'sad', 'angry', 'celebrate', 'greet'];

export default function MediaPicker({ onSelect, onClose }) {
    const [activeTab, setActiveTab] = useState('gifs'); // gifs, stickers
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]); // Initialize with an empty array
    const [loading, setLoading] = useState(true); // Start with loading true
    const [error, setError] = useState(null); // Add error state
    const [selectedCategory, setSelectedCategory] = useState('trending');
    const searchTimeout = useRef(null);

    useEffect(() => {
        fetchTrending();
    }, [activeTab]);

    useEffect(() => {
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (searchQuery) {
            searchTimeout.current = setTimeout(() => {
                searchMedia(searchQuery);
            }, 500);
        } else {
            fetchTrending();
        }

        return () => {
            if (searchTimeout.current) {
                clearTimeout(searchTimeout.current);
            }
        };
    }, [searchQuery, activeTab]);

    const fetchTrending = async () => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = activeTab === 'gifs' ? 'gifs' : 'stickers';
            console.log(`Fetching trending ${endpoint}...`);
            
            const response = await fetch(
                `https://api.giphy.com/v1/${endpoint}/trending?api_key=${GIPHY_API_KEY}&limit=20`
            );
            if (!response.ok) {
                throw new Error(`Failed to fetch trending ${endpoint}`);
            }
            const data = await response.json();
            console.log(`Received ${data.data.length} ${endpoint}`);
            setResults(data.data);
        } catch (error) {
            console.error('Error fetching trending:', error);
            setError(`Failed to load ${activeTab}. Please try again.`);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const searchMedia = async (query) => {
        setLoading(true);
        setError(null);
        try {
            const endpoint = activeTab === 'gifs' ? 'gifs' : 'stickers';
            console.log(`Searching ${endpoint} for "${query}"...`);

            const response = await fetch(
                `https://api.giphy.com/v1/${endpoint}/search?api_key=${GIPHY_API_KEY}&q=${query}&limit=20`
            );
            if (!response.ok) {
                throw new Error(`Failed to search ${endpoint}`);
            }
            const data = await response.json();
            console.log(`Received ${data.data.length} ${endpoint} for search "${query}"`);
            setResults(data.data);
        } catch (error) {
            console.error('Error searching:', error);
            setError(`Failed to search ${activeTab}. Please try again.`);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item) => {
        onSelect({
            type: activeTab,
            url: item.images.fixed_height.url,
            width: item.images.fixed_height.width,
            height: item.images.fixed_height.height
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[600px] flex flex-col"
            >
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('gifs')}
                            className={`px-4 py-2 rounded-lg ${
                                activeTab === 'gifs'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            GIFs
                        </button>
                        <button
                            onClick={() => setActiveTab('stickers')}
                            className={`px-4 py-2 rounded-lg ${
                                activeTab === 'stickers'
                                    ? 'bg-blue-500 text-white'
                                    : 'text-gray-600 dark:text-gray-300'
                            }`}
                        >
                            Stickers
                        </button>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-4">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTab}...`}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                {activeTab === 'stickers' && (
                    <div className="px-4 flex space-x-2 overflow-x-auto">
                        {STICKER_CATEGORIES.map((category) => (
                            <button
                                key={category}
                                onClick={() => {
                                    setSelectedCategory(category);
                                    setSearchQuery(category);
                                }}
                                className={`px-3 py-1 rounded-full text-sm ${
                                    selectedCategory === category
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                )}

<div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-3 flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                ) : error ? (
                    <div className="col-span-3 text-center text-red-500">{error}</div>
                ) : results.length === 0 ? (
                    <div className="col-span-3 text-center text-gray-500">No results found</div>
                ) : (
                    results.map((item) => (
                        <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                            <img
                                src={item.images.fixed_height.url}
                                alt={item.title}
                                className="w-full h-auto rounded-lg"
                                loading="lazy"
                            />
                        </div>
                    ))
                )}
            </div>
            </motion.div>
        </div>
    );
}