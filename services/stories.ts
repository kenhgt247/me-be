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
   - Lọc các story chưa hết hạn (expiresAt > now)
   - Sắp xếp theo thời gian tạo
   ======================================================================== */
export const fetchStories = async (currentUser: User): Promise<Story[]> => {
  try {
    const now = new Date().toISOString();
    const storiesRef = collection(db, 'stories');
    
    // Query: Lấy các story có thời gian hết hạn lớn hơn hiện tại
    const q = query(
      storiesRef, 
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'asc') // Cần tạo Index trong Firestore nếu bị lỗi
    );

    const snapshot = await getDocs(q);
    
    const stories = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
            id: doc.id, 
            ...data,
            // Chuẩn hóa dữ liệu thời gian để tránh lỗi React render object
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
   - Upload ảnh lên Storage
   - Lưu metadata vào Firestore với cấu trúc 'author' chuẩn
   ======================================================================== */
export const createStory = async (user: User, file: File, caption: string = ''): Promise<Story> => {
  // 1. Upload ảnh
  const path = `stories/${user.id}/${Date.now()}_${file.name}`;
  const mediaUrl = await uploadFile(file, path);

  // 2. Tạo object dữ liệu
  // Quan trọng: Sử dụng object 'author' lồng nhau để đồng bộ với tính năng Chat
  const newStoryData = {
    author: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        isExpert: !!user.isExpert
    },
    mediaUrl: mediaUrl,
    mediaType: 'image' as const,
    caption: caption, // Lưu caption người dùng nhập
    createdAt: new Date().toISOString(), // Dùng string ISO cho UI hiển thị ngay lập tức
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Hết hạn sau 24h
    viewers: [],
    likes: [],
    views: 0
  };

  // 3. Lưu vào Firestore
  // Sử dụng serverTimestamp cho trường createdAt trong DB để sort chính xác
  const docRef = await addDoc(collection(db, 'stories'), {
      ...newStoryData,
      createdAt: serverTimestamp() 
  });

  // 4. Trả về dữ liệu để UI cập nhật ngay (Optimistic UI)
  // @ts-ignore
  return { id: docRef.id, ...newStoryData };
};

/* ========================================================================
   3. ĐÁNH DẤU ĐÃ XEM (VIEW)
   - Thêm ID người xem vào mảng 'viewers'
   ======================================================================== */
export const markStoryViewed = async (storyId: string, userId: string) => {
  if(!storyId || !userId) return;
  try {
    const storyRef = doc(db, 'stories', storyId);
    // arrayUnion chỉ thêm nếu chưa tồn tại (tránh trùng lặp)
    await updateDoc(storyRef, { 
        viewers: arrayUnion(userId)
    });
  } catch (error) { 
      // Lỗi view không quá nghiêm trọng, có thể log hoặc bỏ qua
      console.warn("Lỗi mark view:", error); 
  }
};

/* ========================================================================
   4. THẢ TIM / BỎ TIM (LIKE)
   - Kiểm tra user đã like chưa để Add hoặc Remove
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
                // Đã like -> Bỏ like
                await updateDoc(storyRef, { likes: arrayRemove(userId) });
            } else {
                // Chưa like -> Thêm like
                await updateDoc(storyRef, { likes: arrayUnion(userId) });
            }
        }
    } catch (error) {
        console.error("Lỗi like story:", error);
    }
};

/* ========================================================================
   5. XÓA STORY (DELETE)
   - Cho phép người dùng xóa story của chính mình
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
