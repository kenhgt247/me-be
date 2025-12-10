import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, increment, QuerySnapshot, DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Đảm bảo đường dẫn này chính xác
import { Document, DocumentCategory, DocumentReview, User } from '../types'; // Đảm bảo các Types này là chính xác

// --- COLLECTION NAMES ---
const DOCS_COL = 'documents';
const DOC_CATS_COL = 'documentCategories';
const DOC_REVIEWS_COL = 'documentReviews';

// --- UTILITY FUNCTIONS ---

/**
 * Chuyển đổi Firestore DocumentData thành DocumentCategory
 * @param data Dữ liệu từ Firestore
 * @param id ID của tài liệu
 */
const toDocumentCategory = (data: DocumentData, id: string): DocumentCategory => ({
  id,
  name: data.name || '',
  slug: data.slug || '',
  iconEmoji: data.iconEmoji || '📄',
  order: data.order || 0,
  isActive: data.isActive ?? true,
} as DocumentCategory); // Ép kiểu cuối cùng vì đã biết cấu trúc

/**
 * Chuyển đổi Firestore DocumentData thành Document
 * @param data Dữ liệu từ Firestore
 * @param id ID của tài liệu
 */
const toDocument = (data: DocumentData, id: string): Document => {
  // Chuẩn hóa thời gian (Nếu bạn lưu trữ createdAt/updatedAt dưới dạng Firestore Timestamp)
  // Nếu bạn lưu dưới dạng string ISO, bỏ qua bước này.
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
 * Chuyển đổi Firestore Snapshot thành mảng các Document/Category/Review
 * @param snapshot Snapshot từ Firestore
 * @param converter Hàm chuyển đổi (toDocument, toDocumentCategory,...)
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

export const fetchDocuments = async (categoryId?: string, limitCount = 20): Promise<Document[]> => {
  if (!db) return [];
  try {
    const conditions = [];
    if (categoryId && categoryId !== 'all') {
      conditions.push(where('categoryId', '==', categoryId));
    }
    // Gợi ý: Nếu bạn muốn sort theo createdAt, bạn nên thêm orderBy vào đây 
    // và tạo Index trong Firebase. Việc sort client-side (như code cũ) 
    // chỉ nên dùng cho tập dữ liệu nhỏ.

    const q = query(
      collection(db, DOCS_COL),
      ...conditions,
      orderBy('createdAt', 'desc'), // Thêm orderBy để tránh sort client-side
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return mapSnapshot(snapshot, toDocument);
    
    // Bỏ sort client-side nếu đã có orderBy trên query
    // return docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Error fetching documents:", e);
    return [];
  }
};

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
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return mapSnapshot(snapshot, toDocument);
  } catch (e) {
    console.error("Error fetching admin documents:", e);
    return [];
  }
};

export const fetchDocumentBySlug = async (slug: string): Promise<Document | null> => {
  if (!db) return null;
  try {
    // Nên lấy ID từ slug trước để truy vấn theo ID doc(db, DOCS_COL, getIdFromSlug(slug)) 
    // để tránh query theo trường 'slug'
    // Tuy nhiên, nếu bạn phải query theo 'slug', code dưới đây là hợp lý
    
    const q = query(collection(db, DOCS_COL), where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      
      // Tăng lượt xem (không cần await để không chặn luồng chính)
      updateDoc(docData.ref, { views: increment(1) }).catch((e) => {
        console.warn("Failed to increment view count:", e);
      });
      
      return toDocument(docData.data(), docData.id);
    }
    return null;
  } catch (e) {
    console.error("Error fetching document by slug:", e);
    return null;
  }
};

export const createDocument = async (data: Omit<Document, 'id' | 'views' | 'downloads' | 'rating' | 'ratingCount' | 'createdAt' | 'updatedAt'>) => {
  if (!db) return;
  try {
    const timestamp = new Date().toISOString(); // Hoặc dùng Timestamp.now()

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

// ... (Các hàm deleteDoc, incrementDownload giữ nguyên)
// ...

// =================================================================
// --- REVIEWS ---
// =================================================================

const toDocumentReview = (data: DocumentData, id: string): DocumentReview => {
  const createdAt = (data.createdAt instanceof Timestamp) ? data.createdAt.toDate().toISOString() : data.createdAt;
  
  return {
    id,
    documentId: data.documentId || '',
    userId: data.userId || '',
    userName: data.userName || '',
    userAvatar: data.userAvatar || '',
    rating: data.rating || 0,
    comment: data.comment || '',
    createdAt: createdAt || new Date().toISOString(),
  } as DocumentReview;
};

export const fetchDocumentReviews = async (docId: string): Promise<DocumentReview[]> => {
    if (!db) return [];
    try {
        const q = query(
          collection(db, DOC_REVIEWS_COL), 
          where('documentId', '==', docId),
          orderBy('createdAt', 'desc') // Sắp xếp trên server
        );
        const snapshot = await getDocs(q);
        return mapSnapshot(snapshot, toDocumentReview);
    } catch (e) {
        console.error("Error fetching document reviews:", e);
        return [];
    }
};

// ... (Hàm addDocumentReview giữ nguyên logic cập nhật Rating)
// ...
