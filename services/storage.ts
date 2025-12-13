import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// SỬA DÒNG NÀY: Dùng ../firebase
import { storage } from "../firebase"; 

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 */
export const uploadFile = async (file: File, folder: string): Promise<string> => {
  if (!storage) {
    console.error("Storage not initialized");
    return "";
  }

  try {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
    const uniqueName = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${sanitizedName}`;
    
    const storageRef = ref(storage, `${folder}/${uniqueName}`);
    
    // Thêm metadata để hiển thị tốt trên trình duyệt
    const metadata = {
      contentType: file.type,
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

/**
 * Upload multiple files concurrently
 */
export const uploadMultipleFiles = async (files: File[], folder: string): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  
  try {
    const uploadPromises = files.map(file => uploadFile(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls.filter(url => url !== "");
  } catch (error) {
    console.error("Error uploading multiple files:", error);
    throw error;
  }
};
