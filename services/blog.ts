
import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, startAfter, Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BlogPost, BlogCategory, BlogComment, User } from '../types';

const BLOG_POSTS_COL = 'blogPosts';
const BLOG_CATS_COL = 'blogCategories';
const BLOG_COMMENTS_COL = 'blogComments';

// --- CATEGORIES ---
export const fetchBlogCategories = async (): Promise<BlogCategory[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, BLOG_CATS_COL), where('isActive', '==', true), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogCategory));
  } catch (e) {
    console.error("Error fetching blog categories", e);
    return [];
  }
};

export const createBlogCategory = async (data: Omit<BlogCategory, 'id'>) => {
  if (!db) return;
  try {
    await addDoc(collection(db, BLOG_CATS_COL), data);
  } catch (error) {
    console.error("Error creating blog category:", error);
    throw error;
  }
};

export const updateBlogCategory = async (id: string, updates: Partial<BlogCategory>) => {
  if (!db) return;
  try {
    const docRef = doc(db, BLOG_CATS_COL, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating blog category:", error);
    throw error;
  }
};

export const deleteBlogCategory = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, BLOG_CATS_COL, id));
  } catch (error) {
    console.error("Error deleting blog category:", error);
    throw error;
  }
};

// --- POSTS ---
export const fetchPublishedPosts = async (categoryId?: string, limitCount = 20): Promise<BlogPost[]> => {
  if (!db) return [];
  try {
    let constraints = [
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];

    if (categoryId && categoryId !== 'all') {
      constraints = [
        where('status', '==', 'published'),
        where('categoryId', '==', categoryId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      ];
    }

    const q = query(collection(db, BLOG_POSTS_COL), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
  } catch (e) {
    console.error("Error fetching blog posts", e);
    return [];
  }
};

export const fetchAllPostsAdmin = async (authorId?: string): Promise<BlogPost[]> => {
  if (!db) return [];
  try {
    let q;
    // If authorId is provided (Expert), filter by it. If undefined (Admin), fetch all.
    if (authorId) {
        q = query(collection(db, BLOG_POSTS_COL), where('authorId', '==', authorId), orderBy('createdAt', 'desc'));
    } else {
        q = query(collection(db, BLOG_POSTS_COL), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
  } catch (e) {
    console.error("Error fetching admin blog posts", e);
    return [];
  }
};

export const fetchPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  if (!db) return null;
  try {
    const q = query(collection(db, BLOG_POSTS_COL), where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
      // Increment views silently
      updateDoc(docData.ref, { views: (docData.data().views || 0) + 1 }).catch(()=>{});
      return { id: docData.id, ...docData.data() } as BlogPost;
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
    let q;
    if (categoryId) {
        q = query(
            collection(db, BLOG_POSTS_COL), 
            where('status', '==', 'published'),
            where('categoryId', '==', categoryId),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    } else {
        q = query(
            collection(db, BLOG_POSTS_COL), 
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(5)
        );
    }
    
    const snapshot = await getDocs(q);
    const posts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as BlogPost))
        .filter(p => p.id !== currentPostId)
        .slice(0, 3); // Take top 3
    
    return posts;
  } catch (e) {
    console.error("Error fetching related posts", e);
    return [];
  }
};

export const createBlogPost = async (data: Omit<BlogPost, 'id'>) => {
  if (!db) return;
  try {
    await addDoc(collection(db, BLOG_POSTS_COL), {
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error creating blog post:", error);
    throw error;
  }
};

export const updateBlogPost = async (id: string, updates: Partial<BlogPost>) => {
  if (!db) return;
  try {
    const docRef = doc(db, BLOG_POSTS_COL, id);
    await updateDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error updating blog post:", error);
    throw error;
  }
};

export const deleteBlogPost = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, BLOG_POSTS_COL, id));
  } catch (error) {
    console.error("Error deleting blog post:", error);
    throw error;
  }
};

// --- COMMENTS ---
export const fetchBlogComments = async (postId: string): Promise<BlogComment[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, BLOG_COMMENTS_COL), where('postId', '==', postId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogComment));
  } catch (e) {
    console.error("Error fetching comments", e);
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
