import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
// SỬA ĐÚNG TÊN FILE CẤU HÌNH
import { storage } from "../firebaseConfig"; 

export const uploadFile = async (file: File, folder: string): Promise<string> => {
  if (!storage) { console.error("Storage not initialized"); return ""; }

  try {
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
    const uniqueName = `${Date.now()}_${Math.floor(Math.random() * 1000)}_${sanitizedName}`;
    const storageRef = ref(storage, `${folder}/${uniqueName}`);
    
    const metadata = { contentType: file.type };
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
};

export const uploadMultipleFiles = async (files: File[], folder: string): Promise<string[]> => {
  if (!files || files.length === 0) return [];
  try {
    const uploadPromises = files.map(file => uploadFile(file, folder));
    const urls = await Promise.all(uploadPromises);
    return urls.filter(url => url !== "");
  } catch (error) { console.error("Error uploading multiple files:", error); throw error; }
};
