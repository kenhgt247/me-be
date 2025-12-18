import { 
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
    query, where, orderBy, limit, increment, startAfter 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Document, DocumentCategory, DocumentReview, User } from '../types';

const DOCS_COL = 'documents';
const DOC_CATS_COL = 'documentCategories';
const DOC_REVIEWS_COL = 'documentReviews';
const PAGE_SIZE = 5; // Đặt kích thước trang cố định tại đây

// ============================================================================
// CATEGORIES  ✅ FIX CHÍNH Ở ĐÂY
// ============================================================================
export const fetchDocumentCategories = async (): Promise<DocumentCategory[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, DOC_CATS_COL), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(d => {
            const data = d.data() as any;

            // 🔥 FIX QUAN TRỌNG:
            // Nếu trong Firestore có field `id` thì xoá nó
            // tránh ghi đè documentId thật
            if ('id' in data) {
                delete data.id;
            }

            return {
                id: d.id,
                ...data
            } as DocumentCategory;
        });

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

// ============================================================================
// DOCUMENTS (GIỮ NGUYÊN)
// ============================================================================
export const fetchDocuments = async (categoryId?: string, limitCount = 20): Promise<Document[]> => {
    if (!db) return [];
    try {
        let q;
        if (categoryId && categoryId !== 'all') {
            q = query(
                collection(db, DOCS_COL),
                where('categoryId', '==', categoryId),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
        } else {
            q = query(
                collection(db, DOCS_COL),
                orderBy('createdAt', 'desc'),
                limit(limitCount)
            );
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Document));
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
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Document));
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
            updateDoc(docData.ref, { views: increment(1) }).catch(() => {});
            return { id: docData.id, ...docData.data() } as Document;
        }
        return null;
    } catch {
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

// ============================================================================
// REVIEWS (GIỮ NGUYÊN)
// ============================================================================
export const fetchDocumentReviews = async (docId: string, lastReviewId?: string): Promise<DocumentReview[]> => {
    if (!db) return [];

    const baseQuery = [
        where('documentId', '==', docId),
        orderBy('createdAt', 'desc'),
    ];

    try {
        let q;
        if (lastReviewId) {
            const lastReviewRef = doc(db, DOC_REVIEWS_COL, lastReviewId);
            const lastReviewSnap = await getDoc(lastReviewRef);

            if (!lastReviewSnap.exists()) return [];

            q = query(
                collection(db, DOC_REVIEWS_COL),
                ...baseQuery,
                startAfter(lastReviewSnap),
                limit(PAGE_SIZE)
            );
        } else {
            q = query(
                collection(db, DOC_REVIEWS_COL),
                ...baseQuery,
                limit(PAGE_SIZE)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentReview));
    } catch (e) {
        console.error("FIREBASE FETCH REVIEWS ERROR (PAGINATION):", e);
        return [];
    }
};

export const addDocumentReview = async (
    user: User,
    docId: string,
    rating: number,
    comment: string,
    currentRating: number,
    currentCount: number
) => {
    if (!db) return;

    await addDoc(collection(db, DOC_REVIEWS_COL), {
        documentId: docId,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar,
        rating,
        comment,
        createdAt: new Date().toISOString()
    });

    const newCount = currentCount + 1;
    const newRating = ((currentRating * currentCount) + rating) / newCount;

    await updateDoc(doc(db, DOCS_COL, docId), {
        rating: newRating,
        ratingCount: newCount
    });
};
