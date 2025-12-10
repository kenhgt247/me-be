import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, increment, QuerySnapshot, DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Document, DocumentCategory, DocumentReview, User } from '../types';

// --- COLLECTION NAMES ---
const DOCS_COL = 'documents';
const DOC_CATS_COL = 'documentCategories';
const DOC_REVIEWS_COL = 'documentReviews';

// --- TYPE HELPERS ---

// Định nghĩa kiểu dữ liệu cho dữ liệu đầu vào khi tạo Document
export type CreateDocumentData = Omit<Document, 
  'id' | 'views' | 'downloads' | 'rating' | 'ratingCount' | 'createdAt' | 'updatedAt'
>;

/**
 * Chuyển đổi Firestore DocumentData thành DocumentCategory
 */
const toDocumentCategory = (data: DocumentData, id: string): DocumentCategory => ({
  id,
  name: data.name || '',
  slug: data.slug || '',
  iconEmoji: data.iconEmoji || '📁',
  order: data.order || 0,
  isActive: data.isActive ?? true,
} as DocumentCategory); 

/**
 * Chuyển đổi Firestore DocumentData thành Document
 */
const toDocument = (data: DocumentData, id: string): Document => {
  // Chuẩn hóa thời gian từ Timestamp (nếu có) sang ISO string
  const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
  const updatedAt = (data.updatedAt instanceof Timestamp) ? data.updatedAt.toDate().toISOString() : data.updatedAt;

  return {
    id,
    title: data.title || '',
    slug: data.slug || '',
    description: data.description || '',
    categoryId: data.categoryId || '',
    authorId: data.authorId || '',
    authorName: data.authorName || '',
    authorAvatar: data.authorAvatar || '',
    isExpert: data.isExpert ?? false,
    fileType: data.fileType || 'other',
    views: data.views || 0,
    downloads: data.downloads || 0,
    rating: data.rating || 0,
    ratingCount: data.ratingCount || 0,
    tags: data.tags || [],
    isExternal: data.isExternal ?? false,
    externalLink: data.externalLink || '',
    fileUrl: data.fileUrl || '',
    fileName: data.fileName || '',
    fileSize: data.fileSize || 0,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: updatedAt || new Date().toISOString(),
  } as Document;
};

/**
 * Chuyển đổi Firestore Snapshot thành mảng các đối tượng T
 */
const mapSnapshot = <T>(snapshot: QuerySnapshot<DocumentData>, converter: (data: DocumentData, id: string) => T): T[] => {
  return snapshot.docs.map(doc => converter(doc.data(), doc.id));
};

// =================================================================
// --- CATEGORIES ---
// =================================================================

export const fetchDocumentCategories = async (): Promise<DocumentCategory[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, DOC_CATS_COL), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return mapSnapshot(snapshot, toDocumentCategory);
  } catch (e) {
    console.error("Error fetching doc categories:", e);
    return [];
  }
};

export const createDocumentCategory = async (data: Omit<DocumentCategory, 'id'>) => {
  if (!db) return;
  try {
    await addDoc(collection(db, DOC_CATS_COL), data);
  } catch (e) {
    console.error("Error creating doc category:", e);
  }
};

export const updateDocumentCategory = async (id: string, data: Partial<DocumentCategory>) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, DOC_CATS_COL, id), data);
  } catch (e) {
    console.error("Error updating doc category:", e);
  }
};

export const deleteDocumentCategory = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, DOC_CATS_COL, id));
  } catch (e) {
    console.error("Error deleting doc category:", e);
  }
};

// =================================================================
// --- DOCUMENTS ---
// =================================================================

export const fetchAllDocumentsAdmin = async (authorId?: string): Promise<Document[]> => {
  if (!db) return [];
  try {
    const conditions = [];
    if (authorId) {
      conditions.push(where('authorId', '==', authorId));
    }
    
    const q = query(
      collection(db, DOCS_COL), 
      ...conditions,
      orderBy('createdAt', 'desc') // Sắp xếp trên server
    );
    
    const snapshot = await getDocs(q);
    return mapSnapshot(snapshot, toDocument);
  } catch (e) {
    console.error("Error fetching admin documents:", e);
    return [];
  }
};

export const createDocument = async (data: CreateDocumentData) => {
  if (!db) return;
  try {
    const timestamp = new Date().toISOString(); 

    await addDoc(collection(db, DOCS_COL), {
      ...data,
      views: 0,
      downloads: 0,
      rating: 0,
      ratingCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  } catch (e) {
    console.error("Error creating document:", e);
  }
};

export const updateDocument = async (id: string, data: Partial<Document>) => {
  if (!db) return;
  try {
    await updateDoc(doc(db, DOCS_COL, id), {
      ...data,
      updatedAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error updating document:", e);
  }
};

export const deleteDocument = async (id: string) => {
    if (!db) return;
    try {
        await deleteDoc(doc(db, DOCS_COL, id));
    } catch (e) {
        console.error("Error deleting document:", e);
    }
};

export const incrementDownload = async (id: string) => {
    if (!db) return;
    try {
        await updateDoc(doc(db, DOCS_COL, id), { downloads: increment(1) });
    } catch (e) {
        console.error("Error incrementing download count:", e);
    }
};

// =================================================================
// --- REVIEWS ---
// (Giữ nguyên các hàm Reviews nếu bạn đã có, hoặc bổ sung nếu cần)
// =================================================================
