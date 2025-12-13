import { Story, User } from '../types';
// SỬA DÒNG NÀY: Dùng ../firebase
import { db } from '../firebase'; 
import { uploadFile } from './storage';
import { 
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';

// 1. Lấy danh sách Story từ Firebase
export const fetchStories = async (currentUser: User): Promise<Story[]> => {
  try {
    const now = new Date().toISOString();
    const storiesRef = collection(db, 'stories');
    
    const q = query(
      storiesRef, 
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc')
    );

    const snapshot = await getDocs(q);
    
    const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
    return stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Lỗi lấy stories:", error);
    return [];
  }
};

// 2. Đăng Story mới lên Firebase
export const createStory = async (user: User, file: File): Promise<Story> => {
  const path = `stories/${user.id}/${Date.now()}_${file.name}`;
  const mediaUrl = await uploadFile(file, path);

  const newStoryData = {
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userIsExpert: !!user.isExpert,
    mediaUrl: mediaUrl,
    mediaType: 'image' as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    viewers: [],
    likes: []
  };

  const docRef = await addDoc(collection(db, 'stories'), newStoryData);
  
  return { id: docRef.id, ...newStoryData };
};

// 3. Đánh dấu đã xem
export const markStoryViewed = async (storyId: string, userId: string) => {
  try {
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, {
      viewers: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Lỗi mark view:", error);
  }
};
