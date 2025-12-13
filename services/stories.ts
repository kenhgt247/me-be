import { Story, User } from '../types';
import { db } from './firebase'; 
import { uploadFile } from './storage';
import { 
  collection, addDoc, getDocs, query, where, orderBy, doc, updateDoc, arrayUnion 
} from 'firebase/firestore';

// 1. Lấy danh sách Story từ Firebase
export const fetchStories = async (currentUser: User): Promise<Story[]> => {
  try {
    const now = new Date().toISOString();
    const storiesRef = collection(db, 'stories');
    
    // Lấy các story chưa hết hạn (expiresAt > bây giờ)
    // Lưu ý: Nếu Firebase báo lỗi Index, hãy check console và bấm vào link để tạo Index
    const q = query(
      storiesRef, 
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc') // Firestore bắt buộc sort field filter trước
    );

    const snapshot = await getDocs(q);
    
    // Map dữ liệu và sort lại theo thời gian tạo (Mới nhất lên đầu)
    const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Story));
    return stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Lỗi lấy stories:", error);
    return [];
  }
};

// 2. Đăng Story mới lên Firebase
export const createStory = async (user: User, file: File): Promise<Story> => {
  // Upload ảnh lên Storage
  const path = `stories/${user.id}/${Date.now()}_${file.name}`;
  const mediaUrl = await uploadFile(file, path);

  const newStoryData = {
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userIsExpert: !!user.isExpert,
    mediaUrl: mediaUrl,
    mediaType: 'image' as const, // Ép kiểu string thành literal type
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
    viewers: [],
    likes: []
  };

  // Lưu thông tin vào Firestore
  const docRef = await addDoc(collection(db, 'stories'), newStoryData);
  
  return { id: docRef.id, ...newStoryData };
};

// 3. Đánh dấu đã xem (Realtime Update)
export const markStoryViewed = async (storyId: string, userId: string) => {
  try {
    const storyRef = doc(db, 'stories', storyId);
    // Dùng arrayUnion để thêm userId vào mảng viewers (không bị trùng lặp)
    await updateDoc(storyRef, {
      viewers: arrayUnion(userId)
    });
  } catch (error) {
    console.error("Lỗi mark view:", error);
  }
};
