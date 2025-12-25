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

/* ========================================================================
   1. LẤY DANH SÁCH STORY (FETCH)
   ======================================================================== */
export const fetchStories = async (currentUser: User): Promise<Story[]> => {
  try {
    const now = new Date().toISOString();
    const storiesRef = collection(db, 'stories');
    
    // Query: Lấy các story chưa hết hạn
    const q = query(
      storiesRef, 
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc') // LƯU Ý: Cần tạo Index trong Firestore (xem Console nếu báo lỗi)
    );

    const snapshot = await getDocs(q);
    
    const stories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Xử lý timestamp an toàn
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString())
        } as Story;
    });

    // Sắp xếp client-side: Mới nhất lên đầu
    return stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.error("Lỗi lấy stories:", error);
    return [];
  }
};

/* ========================================================================
   2. TẠO STORY MỚI (CREATE)
   ======================================================================== */
export const createStory = async (user: User, file: File, caption: string = ''): Promise<Story> => {
  // 1. Upload ảnh
  const path = `stories/${user.id}/${Date.now()}_${file.name}`;
  const mediaUrl = await uploadFile(file, path);

  // 2. Chuẩn bị dữ liệu (Dùng ISO string cho UI hiển thị ngay)
  const nowISO = new Date().toISOString();
  const expiresISO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Tạo object khớp với Interface Story trong types.ts
  const newStoryBase = {
    author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isExpert: !!user.isExpert
    },
    mediaUrl: mediaUrl,
    mediaType: 'image' as const,
    caption: caption,
    createdAt: nowISO, 
    expiresAt: expiresISO,
    viewers: [],
    likes: [],
    views: 0
  };

  // 3. Lưu vào Firestore (Dùng serverTimestamp cho chính xác server)
  const docRef = await addDoc(collection(db, 'stories'), {
      ...newStoryBase,
      createdAt: serverTimestamp() 
  });

  // 4. Trả về dữ liệu UI (Kèm ID vừa tạo)
  return { 
      id: docRef.id, 
      ...newStoryBase 
  } as Story;
};

/* ========================================================================
   3. ĐÁNH DẤU ĐÃ XEM (VIEW)
   ======================================================================== */
export const markStoryViewed = async (storyId: string, userId: string) => {
  if(!storyId || !userId) return;
  try {
    const storyRef = doc(db, 'stories', storyId);
    await updateDoc(storyRef, { 
        viewers: arrayUnion(userId)
    });
  } catch (error) { 
      console.warn("Lỗi mark view:", error); 
  }
};

/* ========================================================================
   4. THẢ TIM / BỎ TIM (LIKE)
   ======================================================================== */
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

/* ========================================================================
   5. XÓA STORY (DELETE)
   ======================================================================== */
export const deleteStory = async (storyId: string) => {
    if(!storyId) return;
    try {
        await deleteDoc(doc(db, 'stories', storyId));
    } catch (error) {
        console.error("Lỗi xóa story:", error);
        throw error;
    }
};