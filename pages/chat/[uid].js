import { useEffect, useRef, useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/router';
import CryptoJS from 'crypto-js';
import VideoCall from '../../components/VideoCall';
import MediaPicker from '../../components/MediaPicker';
import { motion, AnimatePresence } from 'framer-motion';

const ChatRoom = () => {
    const [user, setUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [formValue, setFormValue] = useState('');
    const [recipient, setRecipient] = useState(null);
    const [chatId, setChatId] = useState('');
    const [file, setFile] = useState(null);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [incomingCall, setIncomingCall] = useState(null);
    const [activeCall, setActiveCall] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const dummy = useRef();
    const router = useRouter();
    const { uid } = router.query;

    const secretKey = process.env.NEXT_PUBLIC_MESSAGE_ENCRYPTION_KEY || 'your-secret-key';

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user || !uid) return;

        const chatRoomId = [user.uid, uid].sort().join('_');
        setChatId(chatRoomId);

        // Create chat document if it doesn't exist
        const createChatDoc = async () => {
            const chatRef = doc(db, 'chats', chatRoomId);
            const chatDoc = await getDoc(chatRef);
            if (!chatDoc.exists()) {
                await setDoc(chatRef, {
                    participants: [user.uid, uid],
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    typing: null
                });
            }
        };
        createChatDoc();

        // Listen for messages
        const q = query(collection(db, `chats/${chatRoomId}/messages`), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messagesArray = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                let decryptedMessage = '';

                if (data.text) {
                    try {
                        const bytes = CryptoJS.AES.decrypt(data.text, secretKey);
                        decryptedMessage = bytes.toString(CryptoJS.enc.Utf8);
                    } catch (error) {
                        console.error('Decryption error:', error);
                        decryptedMessage = 'Message cannot be decrypted';
                    }
                }

                messagesArray.push({
                    id: doc.id,
                    ...data,
                    text: decryptedMessage,
                    timestamp: data.createdAt?.toDate()
                });
            });
            setMessages(messagesArray);
            
            // Scroll to bottom after messages load
            setTimeout(() => {
                dummy.current?.scrollIntoView({ behavior: 'auto' });
            }, 100);
        });

        // Listen for typing status
        const typingRef = doc(db, 'chats', chatRoomId);
        const typingUnsubscribe = onSnapshot(typingRef, (doc) => {
            const data = doc.data();
            if (data?.typing === uid) {
                setIsTyping(true);
            } else {
                setIsTyping(false);
            }
        });

        // Listen for incoming calls
        const unsubscribeCalls = onSnapshot(collection(db, 'calls'), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const call = change.doc.data();
                    // Check if this is a call for the current user and it's new
                    if (call.participants.includes(user.uid) && 
                        call.status === 'pending' && 
                        call.createdBy !== user.uid) {
                        setIncomingCall({
                            id: change.doc.id,
                            ...call
                        });
                    }
                }
            });
        });

        return () => {
            unsubscribe();
            typingUnsubscribe();
            unsubscribeCalls();
        };
    }, [user, uid]);

    useEffect(() => {
        if (!uid) return;

        const fetchRecipient = async () => {
            try {
                const userDoc = await getDoc(doc(db, 'users', uid));
                if (userDoc.exists()) {
                    setRecipient({ uid, ...userDoc.data() });
                } else {
                    console.error('Recipient not found');
                    router.push('/chat');
                }
            } catch (error) {
                console.error('Error fetching recipient:', error);
            }
        };

        fetchRecipient();
    }, [uid]);

    const handleTyping = async () => {
        if (!chatId) return;

        try {
            if (typingTimeout) clearTimeout(typingTimeout);

            const chatRef = doc(db, 'chats', chatId);
            const chatDoc = await getDoc(chatRef);
            
            if (!chatDoc.exists()) {
                await setDoc(chatRef, {
                    participants: [user.uid, uid],
                    createdAt: serverTimestamp(),
                    lastMessage: null,
                    typing: user.uid
                });
            } else {
                await updateDoc(chatRef, {
                    typing: user.uid
                });
            }

            const timeout = setTimeout(async () => {
                const updatedDoc = await getDoc(chatRef);
                if (updatedDoc.exists()) {
                    await updateDoc(chatRef, {
                        typing: null
                    });
                }
            }, 2000);

            setTypingTimeout(timeout);
        } catch (error) {
            console.error('Error updating typing status:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check if file is an image
            if (!file.type.startsWith('image/')) {
                alert('Please upload only image files.');
                return;
            }
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                alert('Please upload files smaller than 5MB.');
                return;
            }
            setFile(file);
        }
    };

    const uploadImage = async (file) => {
        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Upload failed');
            }

            const data = await response.json();
            // The upload endpoint returns an array of links, we take the first one
            return data.links[0];
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        } finally {
            setUploading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();

        if (!formValue.trim() && !file) return;

        try {
            let imageUrl = '';
            if (file) {
                imageUrl = await uploadImage(file);
            }

            const encryptedMessage = CryptoJS.AES.encrypt(formValue || '', secretKey).toString();

            await addDoc(collection(db, `chats/${chatId}/messages`), {
                text: encryptedMessage,
                createdAt: serverTimestamp(),
                uid: user.uid,
                photoURL: user.photoURL,
                displayName: user.displayName,
                imageUrl: imageUrl
            });

            setFormValue('');
            setFile(null);
            dummy.current.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message: ' + (error.message || 'Unknown error'));
        }
    };

    const initiateCall = async () => {
        if (!user || !recipient) return;

        try {
            const callId = `${Date.now()}_${user.uid}_${uid}`;
            setActiveCall({
                id: callId,
                participants: [user.uid, uid]
            });
        } catch (err) {
            console.error("Error initiating call:", err);
        }
    };

    const handleAcceptCall = () => {
        if (!incomingCall) return;
        setActiveCall(incomingCall);
        setIncomingCall(null);
    };

    const handleRejectCall = async () => {
        if (!incomingCall) return;
        try {
            const callDoc = doc(db, 'calls', incomingCall.id);
            await updateDoc(callDoc, {
                status: 'rejected',
                endedAt: new Date()
            });
            setIncomingCall(null);
        } catch (err) {
            console.error("Error rejecting call:", err);
        }
    };

    const handleEndCall = () => {
        setActiveCall(null);
    };

    const handleMediaSelect = async (media) => {
        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                createdAt: serverTimestamp(),
                uid: user.uid,
                photoURL: user.photoURL,
                displayName: user.displayName,
                mediaType: media.type,
                mediaUrl: media.url,
                mediaWidth: media.width,
                mediaHeight: media.height
            });

            dummy.current.scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error('Error sending media:', error);
            alert('Failed to send media: ' + (error.message || 'Unknown error'));
        }
    };

    if (!user || !recipient) return null;

    return (
        <div className="flex flex-col h-screen max-h-screen overflow-hidden">
            <header className="bg-black text-white p-4 shadow-md flex items-center">
                <button onClick={() => router.push('/chat')} className="text-blue-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                </button>
                <div className="flex flex-col items-center flex-grow">
                    {recipient.photoURL && (
                        <img src={recipient.photoURL} alt="Profile" className="w-12 h-12 rounded-full mb-2" />
                    )}
                    <h2 className="text-xl font-sans">{recipient.displayName}</h2>
                    {isTyping && (
                        <p className="text-sm text-gray-400">typing...</p>
                    )}
                </div>
                <div className="flex space-x-6 mr-4">
                    <button 
                        onClick={initiateCall}
                        className="text-blue-500 hover:text-blue-500 transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                        </svg>
                    </button>
                    <button className="text-blue-500 hover:text-blue-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className="flex-1 p-4 bg-gray-800 overflow-y-auto">
                <div className="max-w-6xl mx-auto space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={msg.id}
                            className={`flex ${
                                msg.uid === user.uid ? 'justify-end' : 'justify-start'
                            }`}
                        >
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`max-w-[70%] flex ${
                                    msg.uid === user.uid ? 'flex-row-reverse' : 'flex-row'
                                } items-end space-x-2`}
                            >
                                <img
                                    src={msg.photoURL || '/default-avatar.png'}
                                    alt={msg.displayName}
                                    className="w-8 h-8 rounded-full"
                                />
                                <div
                                    className={`rounded-lg p-3 ${
                                        msg.uid === user.uid
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-700 text-white'
                                    }`}
                                >
                                    {msg.mediaType && msg.mediaUrl ? (
                                        <div className="rounded-lg overflow-hidden">
                                            <img
                                                src={msg.mediaUrl}
                                                alt={msg.mediaType}
                                                className="max-w-full h-auto"
                                                style={{
                                                    maxHeight: '200px',
                                                    width: 'auto'
                                                }}
                                            />
                                        </div>
                                    ) : msg.imageUrl ? (
                                        <img
                                            src={msg.imageUrl}
                                            alt="Shared image"
                                            className="max-w-full h-auto rounded-lg"
                                            style={{ maxHeight: '200px' }}
                                        />
                                    ) : (
                                        <p className="whitespace-pre-wrap break-words">
                                            {CryptoJS.AES.decrypt(
                                                msg.text,
                                                secretKey
                                            ).toString(CryptoJS.enc.Utf8)}
                                        </p>
                                    )}
                                    <div className="text-xs opacity-75 mt-1">
                                        {msg.createdAt?.toDate().toLocaleTimeString()}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    ))}
                    <div ref={dummy}></div>
                </div>
            </main>

            <form onSubmit={sendMessage} className="flex items-center gap-2 p-4 bg-gray-800">
                {file && (
                    <div className="relative">
                        <img
                            src={URL.createObjectURL(file)}
                            alt="Upload preview"
                            className="h-10 w-10 object-cover rounded"
                        />
                        <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs"
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="flex space-x-2">
                    <label className="cursor-pointer text-blue-500 hover:text-blue-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                        </svg>
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowMediaPicker(true)}
                        className="text-blue-500 hover:text-blue-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" />
                        </svg>
                    </button>
                </div>
                <input
                    value={formValue}
                    onChange={(e) => {
                        setFormValue(e.target.value);
                        handleTyping();
                    }}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={!formValue.trim() && !file || uploading}
                    className={`bg-blue-500 text-white rounded-lg px-6 py-2 ${
                        (!formValue.trim() && !file) || uploading
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-blue-600'
                    }`}
                >
                    {uploading ? 'Sending...' : 'Send'}
                </button>
            </form>

            <AnimatePresence>
                {showMediaPicker && (
                    <MediaPicker
                        onSelect={handleMediaSelect}
                        onClose={() => setShowMediaPicker(false)}
                    />
                )}
            </AnimatePresence>

            {/* Incoming Call Dialog */}
            {incomingCall && (
                <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg">
                    <p className="text-white mb-2">Incoming call from {incomingCall.createdBy}</p>
                    <div className="flex justify-end space-x-2">
                        <button onClick={handleRejectCall} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                            Reject
                        </button>
                        <button onClick={handleAcceptCall} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                            Accept
                        </button>
                    </div>
                </div>
            )}

            {/* Active Call */}
            {activeCall && (
                <VideoCall
                    callId={activeCall.id}
                    localUser={user}
                    remoteUser={recipient}
                    onEndCall={handleEndCall}
                />
            )}
        </div>
    );
};

export default ChatRoom;