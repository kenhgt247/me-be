import { 
    collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
    query, where, orderBy, limit, startAfter, Timestamp, writeBatch,
    QueryDocumentSnapshot, DocumentData 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BlogPost, BlogCategory, BlogComment, User } from '../types';

const BLOG_POSTS_COL = 'blogPosts';
const BLOG_CATS_COL = 'blogCategories';
const BLOG_COMMENTS_COL = 'blogComments';

const PAGE_SIZE_COMMENTS = 5; 

// --- CATEGORIES ---
export const fetchBlogCategories = async (): Promise<BlogCategory[]> => {
    if (!db) return [];
    try {
        const q = query(collection(db, BLOG_CATS_COL)); 
        const snapshot = await getDocs(q);
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogCategory));
        return cats.sort((a, b) => a.order - b.order);
    } catch (e) {
        console.error("Error fetching blog categories", e);
        return [];
    }
};

// --- POSTS (PUBLIC & PAGINATED) ---
// Hàm này dùng để lấy bài viết có phân trang (Infinite Scroll)
export const fetchPostsPaginated = async (categoryId: string = 'all', lastDoc: QueryDocumentSnapshot<DocumentData> | null = null, pageSize: number = 10) => {
    try {
      const postsRef = collection(db, BLOG_POSTS_COL);
      
      // 1. Query cơ bản
      let q = query(
        postsRef, 
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
  
      // 2. Lọc theo danh mục
      if (categoryId !== 'all') {
        q = query(q, where('categoryId', '==', categoryId));
      }
  
      // 3. Phân trang (Bắt đầu sau bài cuối cùng đã tải)
      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }
  
      const snapshot = await getDocs(q);
      
      // 4. Map dữ liệu
      const posts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
  
      // 5. Lấy con trỏ mới
      const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;
  
      return { 
        posts, 
        lastDoc: lastVisible, 
        hasMore: snapshot.docs.length === pageSize 
      };
    } catch (error) {
      console.error("Lỗi lấy bài viết phân trang:", error);
      return { posts: [], lastDoc: null, hasMore: false };
    }
  };

// Hàm cũ (Vẫn giữ lại để dùng cho Trending / Related Posts)
export const fetchPublishedPosts = async (categoryId?: string, limitCount = 20): Promise<BlogPost[]> => {
    if (!db) return [];
    try {
        let q = query(
                collection(db, BLOG_POSTS_COL),
                where('status', '==', 'published'),
                orderBy('createdAt', 'desc'), 
                limit(limitCount)
            );
        
        if (categoryId && categoryId !== 'all') {
             q = query(q, where('categoryId', '==', categoryId));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogPost));
    } catch (e) {
        console.error("Error fetching blog posts", e);
        return [];
    }
};

// --- DETAIL & RELATED ---
export const fetchPostBySlug = async (slug: string): Promise<BlogPost | null> => {
    if (!db) return null;
    try {
        const q = query(collection(db, BLOG_POSTS_COL), where('slug', '==', slug), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docData = snapshot.docs[0];
            updateDoc(docData.ref, { views: (docData.data().views || 0) + 1 }).catch(()=>{});
            return { id: docData.id, ...docData.data() as any } as BlogPost;
        }
        return null;
    } catch (e) {
        console.error("Error fetching post by slug", e);
        return null;
    }
};

export const fetchRelatedPosts = async (currentPostId: string, categoryId?: string): Promise<BlogPost[]> => {
    if (!db) return [];
    try {
        // Lấy 10 bài mới nhất rồi lọc client-side (Tạm thời)
        const q = query(
            collection(db, BLOG_POSTS_COL), 
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(10) 
        );
        
        const snapshot = await getDocs(q);
        const posts = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() as any } as BlogPost))
            .filter(p => p.id !== currentPostId)
            .filter(p => !categoryId || p.categoryId === categoryId)
            .slice(0, 3);
        
        return posts;
    } catch (e) {
        console.error("Error fetching related posts", e);
        return [];
    }
};

// --- COMMENTS (PAGINATED) ---
export const fetchBlogComments = async (postId: string, lastCommentId?: string): Promise<BlogComment[]> => {
    if (!db) return [];

    let baseQuery = [
        where('postId', '==', postId),
        orderBy('createdAt', 'desc'),
    ];

    try {
        let q;
        if (lastCommentId) {
            const lastCommentRef = doc(db, BLOG_COMMENTS_COL, lastCommentId);
            const lastCommentSnap = await getDoc(lastCommentRef);
            
            if (lastCommentSnap.exists()) {
                q = query(
                    collection(db, BLOG_COMMENTS_COL),
                    ...baseQuery,
                    startAfter(lastCommentSnap), 
                    limit(PAGE_SIZE_COMMENTS)
                );
            } else {
                return [];
            }
        } else {
            q = query(
                collection(db, BLOG_COMMENTS_COL), 
                ...baseQuery,
                limit(PAGE_SIZE_COMMENTS)
            );
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogComment));
    } catch (e) {
        console.error("Error fetching blog comments", e);
        return [];
    }
};

export const addBlogComment = async (user: User, postId: string, content: string) => {
    if (!db) return;
    const comment: Omit<BlogComment, 'id'> = {
        postId,
        content,
        authorId: user.id,
        authorName: user.name,
        authorAvatar: user.avatar,
        isExpert: user.isExpert,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await addDoc(collection(db, BLOG_COMMENTS_COL), comment);
};

// --- ADMIN FUNCTIONS ---
export const createBlogCategory = async (data: Omit<BlogCategory, 'id'>) => {
    if (!db) return;
    await addDoc(collection(db, BLOG_CATS_COL), data);
};
export const updateBlogCategory = async (id: string, data: Partial<BlogCategory>) => {
    if (!db) return;
    await updateDoc(doc(db, BLOG_CATS_COL, id), data);
};
export const deleteBlogCategory = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, BLOG_CATS_COL, id));
};
export const createBlogPost = async (data: any) => {
    if (!db) return;
    const postData = { ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), views: 0 };
    await addDoc(collection(db, BLOG_POSTS_COL), postData);
};
export const updateBlogPost = async (id: string, updates: Partial<BlogPost>) => {
    if (!db) return;
    const updateData = { ...updates, updatedAt: new Date().toISOString() };
    await updateDoc(doc(db, BLOG_POSTS_COL, id), updateData);
};
export const deleteBlogPost = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, BLOG_POSTS_COL, id));
};
export const fetchAllPostsAdmin = async (authorId?: string): Promise<BlogPost[]> => {
    if (!db) return [];
    try {
        let q = authorId 
            ? query(collection(db, BLOG_POSTS_COL), where('authorId', '==', authorId), orderBy('createdAt', 'desc'))
            : query(collection(db, BLOG_POSTS_COL), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogPost));
    } catch (e) { return []; }
};