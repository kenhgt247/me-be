import { Story, User } from '../types';
import { db } from '../firebaseConfig'; 
import { uploadFile } from './storage';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  arrayUnion, 
  deleteDoc,
  arrayRemove,
  getDoc,
  serverTimestamp
} from 'firebase/firestore';

// --- 1. LẤY DANH SÁCH STORY ---
export const fetchStories = async (currentUser: User): Promise<Story[]> => {
  try {
    const now = new Date().toISOString();
    const storiesRef = collection(db, 'stories');
    
    // Lấy các story chưa hết hạn
    const q = query(
      storiesRef, 
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc') // Cần Index trong Firestore
    );

    const snapshot = await getDocs(q);
    
    const stories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Đảm bảo createdAt hiển thị đúng dù là Timestamp hay String
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt 
        } as Story;
    });

    // Sắp xếp client-side: Mới nhất lên đầu
    return stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Lỗi lấy stories:", error);
    return [];
  }
};

// --- 2. TẠO STORY MỚI (Đã thêm caption & author object) ---
export const createStory = async (user: User, file: File, caption: string = ''): Promise<Story> => {
  // Upload ảnh
  const path = `stories/${user.id}/${Date.now()}_${file.name}`;
  const mediaUrl = await uploadFile(file, path);

  // Tạo object Story chuẩn
  const newStoryData = {
    // Gom nhóm thông tin tác giả vào object 'author' để đồng bộ với Chat/Question
    author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isExpert: !!user.isExpert
    },
    mediaUrl: mediaUrl,
    mediaType: 'image',
    caption: caption, // Lưu lời dẫn
    createdAt: new Date().toISOString(), // Dùng string ISO cho dễ xử lý ở UI
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Hết hạn sau 24h
    viewers: [],
    likes: [],
    views: 0
  };

  // Lưu vào Firestore
  // @ts-ignore
  const docRef = await addDoc(collection(db, 'stories'), {
      ...newStoryData,
      createdAt: serverTimestamp() // Lưu serverTimestamp để sort chính xác
  });

  // Trả về dữ liệu để update UI ngay lập tức
  // @ts-ignore
  return { id: docRef.id, ...newStoryData };
};

// --- 3. ĐÁNH DẤU ĐÃ XEM ---
export const markStoryViewed = async (storyId: string, userId: string) => {
  if(!storyId || !userId) return;
  try {
    const storyRef = doc(db, 'stories', storyId);
    // Chỉ update nếu user chưa xem (tối ưu write)
    // Tuy nhiên arrayUnion tốn ít chi phí check nên có thể gọi trực tiếp
    await updateDoc(storyRef, { 
        viewers: arrayUnion(userId),
        // views: increment(1) // Nếu muốn đếm tổng view
    });
  } catch (error) { 
      // console.error("Lỗi mark view:", error); 
  }
};

// --- 4. THẢ TIM STORY (Mới) ---
export const toggleStoryLike = async (storyId: string, userId: string) => {
    if(!storyId || !userId) return;
    const storyRef = doc(db, 'stories', storyId);
    
    try {
        const snap = await getDoc(storyRef);
        if (snap.exists()) {
            const data = snap.data();
            const likes = data.likes || [];
            
            if (likes.includes(userId)) {
                await updateDoc(storyRef, { likes: arrayRemove(userId) });
            } else {
                await updateDoc(storyRef, { likes: arrayUnion(userId) });
            }
        }
    } catch (error) {
        console.error("Lỗi like story:", error);
    }
};

// --- 5. XÓA STORY (Mới) ---
export const deleteStory = async (storyId: string) => {
    if(!storyId) return;
    try {
        await deleteDoc(doc(db, 'stories', storyId));
    } catch (error) {
        console.error("Lỗi xóa story:", error);
        throw error;
    }
};
