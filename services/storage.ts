import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/firestore'; 
// LƯU Ý: Import đúng phải là từ 'firebase/storage' chứ không phải 'firestore'
// Tôi sẽ sửa lại import chuẩn ngay bên dưới:

import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { app } from '../firebaseConfig';

// Khởi tạo Storage instance
const storage = getStorage(app);

/**
 * Upload một file lên Firebase Storage
 * @param file - File object từ input
 * @param path - Đường dẫn lưu file (ví dụ: 'users/123/avatar.jpg')
 * @returns Promise<string> - Trả về Download URL
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!file) throw new Error("Không có file nào được chọn");

  try {
    // Tạo tham chiếu đến vị trí lưu
    const storageRef = ref(storage, path);

    // Thực hiện upload
    // uploadBytes phù hợp với file ảnh nhỏ/trung bình. 
    // Nếu upload video lớn, nên dùng uploadBytesResumable
    const snapshot = await uploadBytes(storageRef, file);

    // Lấy URL để hiển thị
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;

  } catch (error) {
    console.error("Lỗi upload file:", error);
    throw error;
  }
};

/**
 * Xóa file dựa trên đường dẫn (Path)
 * @param path - Ví dụ: 'stories/user123/anh_abc.jpg'
 */
export const deleteFile = async (path: string): Promise<void> => {
  if (!path) return;
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn("Lỗi xóa file (có thể file không tồn tại):", error);
  }
};

/**
 * Xóa file dựa trên Download URL (Hữu ích khi xóa avatar cũ/ảnh cũ)
 * @param url - Full URL của ảnh trên Firebase
 */
export const deleteFileFromUrl = async (url: string): Promise<void> => {
  if (!url) return;
  
  try {
    // Logic để lấy path từ URL của Firebase
    // URL thường có dạng: .../o/users%2F123%2Favatar.jpg?alt=...
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn("Lỗi xóa file từ URL:", error);
  }
};
