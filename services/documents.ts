import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, increment 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Document, DocumentCategory, DocumentReview, User } from '../types';

const DOCS_COL = 'documents';
const DOC_CATS_COL = 'documentCategories';
const DOC_REVIEWS_COL = 'documentReviews';

// --- CATEGORIES ---
export const fetchDocumentCategories = async (): Promise<DocumentCategory[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, DOC_CATS_COL), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentCategory));
  } catch (e) {
    console.error("Error fetching doc categories", e);
    return [];
  }
};

export const createDocumentCategory = async (data: Omit<DocumentCategory, 'id'>) => {
  if (!db) return;
  await addDoc(collection(db, DOC_CATS_COL), data);
};

export const updateDocumentCategory = async (id: string, data: Partial<DocumentCategory>) => {
  if (!db) return;
  await updateDoc(doc(db, DOC_CATS_COL, id), data);
};

export const deleteDocumentCategory = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, DOC_CATS_COL, id));
};

// --- DOCUMENTS (Đã sửa logic lấy mới nhất) ---
export const fetchDocuments = async (categoryId?: string, limitCount = 20): Promise<Document[]> => {
  if (!db) return [];
  try {
    let q;
    if (categoryId && categoryId !== 'all') {
        // Lọc theo danh mục + Sắp xếp mới nhất
        q = query(
            collection(db, DOCS_COL),
            where('categoryId', '==', categoryId),
            orderBy('createdAt', 'desc'), // <--- QUAN TRỌNG: Mới nhất lên đầu
            limit(limitCount)
        );
    } else {
        // Lấy tất cả + Sắp xếp mới nhất
        q = query(
            collection(db, DOCS_COL),
            orderBy('createdAt', 'desc'), // <--- QUAN TRỌNG
            limit(limitCount)
        );
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
  } catch (e) {
    console.error("Error fetching documents", e);
    return [];
  }
};

export const fetchAllDocumentsAdmin = async (authorId?: string): Promise<Document[]> => {
    if (!db) return [];
    try {
      let q;
      if (authorId) {
        q = query(
            collection(db, DOCS_COL), 
            where('authorId', '==', authorId),
            orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
            collection(db, DOCS_COL),
            orderBy('createdAt', 'desc')
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document));
    } catch (e) {
      console.error("Error fetching admin documents", e);
      return [];
    }
};

export const fetchDocumentBySlug = async (slug: string): Promise<Document | null> => {
    if (!db) return null;
    try {
        const q = query(collection(db, DOCS_COL), where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docData = snapshot.docs[0];
            // Tăng view (không cần await để mượt UI)
            updateDoc(docData.ref, { views: increment(1) }).catch(()=>{});
            return { id: docData.id, ...docData.data() } as Document;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const createDocument = async (data: any) => {
    if (!db) return;
    await addDoc(collection(db, DOCS_COL), {
        ...data,
        views: 0,
        downloads: 0,
        rating: 0,
        ratingCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
};

export const updateDocument = async (id: string, data: Partial<Document>) => {
    if (!db) return;
    await updateDoc(doc(db, DOCS_COL, id), {
        ...data,
        updatedAt: new Date().toISOString()
    });
};

export const deleteDocument = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, DOCS_COL, id));
};

export const incrementDownload = async (id: string) => {
    if (!db) return;
    await updateDoc(doc(db, DOCS_COL, id), { downloads: increment(1) });
};

// --- REVIEWS ---
export const fetchDocumentReviews = async (docId: string): Promise<DocumentReview[]> => {
    if (!db) return [];
    try {
        const q = query(
            collection(db, DOC_REVIEWS_COL), 
            where('documentId', '==', docId),
            orderBy('createdAt', 'desc') // Sắp xếp review mới nhất lên đầu
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentReview));
    } catch (e) {
        return [];
    }
};

export const addDocumentReview = async (user: User, docId: string, rating: number, comment: string, currentRating: number, currentCount: number) => {
    if (!db) return;
    
    // Add review
    await addDoc(collection(db, DOC_REVIEWS_COL), {
        documentId: docId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating,
        comment,
        createdAt: new Date().toISOString()
    });

    // Update document average rating
    const newCount = currentCount + 1;
    const newRating = ((currentRating * currentCount) + rating) / newCount;

    await updateDoc(doc(db, DOCS_COL, docId), {
        rating: newRating,
        ratingCount: newCount
    });
};
