import { 
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, startAfter, Timestamp, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BlogPost, BlogCategory, BlogComment, User } from '../types';

const BLOG_POSTS_COL = 'blogPosts';
const BLOG_CATS_COL = 'blogCategories';
const BLOG_COMMENTS_COL = 'blogComments';

// --- CATEGORIES (PUBLIC) ---
export const fetchBlogCategories = async (): Promise<BlogCategory[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, BLOG_CATS_COL), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogCategory));
  } catch (e) {
    console.error("Error fetching blog categories", e);
    return [];
  }
};

// --- CATEGORIES (ADMIN) ---
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

// --- POSTS (PUBLIC) ---
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

export const fetchPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  if (!db) return null;
  try {
    const q = query(collection(db, BLOG_POSTS_COL), where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docData = snapshot.docs[0];
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
        .slice(0, 3);
    
    return posts;
  } catch (e) {
    console.error("Error fetching related posts", e);
    return [];
  }
};

// --- POSTS (ADMIN) ---
export const fetchAllPostsAdmin = async (authorId?: string): Promise<BlogPost[]> => {
  if (!db) return [];
  try {
    let q;
    if (authorId) {
      q = query(collection(db, BLOG_POSTS_COL), where('authorId', '==', authorId), orderBy('createdAt', 'desc'));
    } else {
      q = query(collection(db, BLOG_POSTS_COL), orderBy('createdAt', 'desc'));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
  } catch (e) {
    console.error("Error fetching admin posts", e);
    return [];
  }
};

export const createBlogPost = async (data: Omit<BlogPost, 'id'>) => {
  if (!db) return;
  await addDoc(collection(db, BLOG_POSTS_COL), {
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
};

export const updateBlogPost = async (id: string, data: Partial<BlogPost>) => {
  if (!db) return;
  await updateDoc(doc(db, BLOG_POSTS_COL, id), {
    ...data,
    updatedAt: new Date().toISOString()
  });
};

export const deleteBlogPost = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, BLOG_POSTS_COL, id));
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