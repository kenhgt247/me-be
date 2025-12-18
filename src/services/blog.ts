import { 
	collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, 
	query, where, orderBy, limit, startAfter, Timestamp, writeBatch 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { BlogPost, BlogCategory, BlogComment, User } from '../types';

const BLOG_POSTS_COL = 'blogPosts';
const BLOG_CATS_COL = 'blogCategories';
const BLOG_COMMENTS_COL = 'blogComments';

const PAGE_SIZE = 5; // <--- KHAI BÁO KÍCH THƯỚC TRANG CHO BÌNH LUẬN

// --- CATEGORIES (PUBLIC) ---
export const fetchBlogCategories = async (): Promise<BlogCategory[]> => {
	if (!db) return [];
	try {
		const q = query(collection(db, BLOG_CATS_COL));	
		const snapshot = await getDocs(q);
		const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogCategory));
		// Sort client-side
		return cats.sort((a, b) => a.order - b.order);
	} catch (e) {
		console.error("Error fetching blog categories", e);
		return [];
	}
};

// --- CATEGORIES (ADMIN) ---
export const createBlogCategory = async (data: Omit<BlogCategory, 'id'>) => {
	if (!db) return;
	try {
		await addDoc(collection(db, BLOG_CATS_COL), data);
	} catch (e) {
		console.error("Error creating blog category:", e);
		throw e;
	}
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
		let q;
		if (categoryId && categoryId !== 'all') {
			q = query(
				collection(db, BLOG_POSTS_COL),
				where('status', '==', 'published'),
				where('categoryId', '==', categoryId),
				orderBy('createdAt', 'desc'), 
				limit(limitCount)	
			);
		} else {
			q = query(
				collection(db, BLOG_POSTS_COL),
				where('status', '==', 'published'),
				orderBy('createdAt', 'desc'), 
				limit(limitCount)
			);
		}

		const snapshot = await getDocs(q);
		return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogPost));
	} catch (e) {
		console.error("Error fetching blog posts", e);
		return [];
	}
};

// --- POSTS (ADMIN) ---
export const fetchAllPostsAdmin = async (authorId?: string): Promise<BlogPost[]> => {
	if (!db) return [];
	try {
		let q;
		if (authorId) {
			q = query(
				collection(db, BLOG_POSTS_COL),	
				where('authorId', '==', authorId),
				orderBy('createdAt', 'desc')
			);
		} else {
			q = query(
				collection(db, BLOG_POSTS_COL),
				orderBy('createdAt', 'desc')
			);
		}
		const snapshot = await getDocs(q);
		return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogPost));
	} catch (e) {
		console.error("Error fetching admin blog posts", e);
		return [];
	}
};

export const createBlogPost = async (data: any) => {
	if (!db) return;
	const postData = {
		...data,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		views: 0
	};
	await addDoc(collection(db, BLOG_POSTS_COL), postData);
};

export const updateBlogPost = async (id: string, updates: Partial<BlogPost>) => {
	if (!db) return;
	const updateData = {
		...updates,
		updatedAt: new Date().toISOString(),
	};
	await updateDoc(doc(db, BLOG_POSTS_COL, id), updateData);
};

export const deleteBlogPost = async (id: string) => {
	if (!db) return;
	await deleteDoc(doc(db, BLOG_POSTS_COL, id));
};

// --- DETAIL & RELATED ---
export const fetchPostBySlug = async (slug: string): Promise<BlogPost | null> => {
	if (!db) return null;
	try {
		const q = query(collection(db, BLOG_POSTS_COL), where('slug', '==', slug), limit(1));
		const snapshot = await getDocs(q);
		if (!snapshot.empty) {
			const docData = snapshot.docs[0];
			// Tăng view không cần await để tránh chặn UI
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
		const q = query(
			collection(db, BLOG_POSTS_COL),	
			where('status', '==', 'published'),
			orderBy('createdAt', 'desc'),
			limit(10) // Lấy 10 bài mới nhất rồi lọc client-side
		);
		
		const snapshot = await getDocs(q);
		const posts = snapshot.docs
			.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogPost))
			.filter(p => p.id !== currentPostId) // Loại trừ bài hiện tại
			.filter(p => !categoryId || p.categoryId === categoryId) // Ưu tiên cùng danh mục
			.slice(0, 3); // Chỉ lấy 3 bài
		
		return posts;
	} catch (e) {
		console.error("Error fetching related posts", e);
		return [];
	}
};

// --- COMMENTS (ĐÃ SỬA: THÊM PHÂN TRANG LOAD MORE) ---
export const fetchBlogComments = async (postId: string, lastCommentId?: string): Promise<BlogComment[]> => {
	if (!db) return [];

	// Tạo truy vấn cơ bản: Lọc theo postId, Sắp xếp theo ngày, Giới hạn PAGE_SIZE
	let baseQuery = [
		where('postId', '==', postId),
		orderBy('createdAt', 'desc'),
	];

	try {
		let q;
		
		if (lastCommentId) {
			// Tải trang tiếp theo: Tìm DocumentSnapshot của bình luận cuối cùng
			const lastCommentRef = doc(db, BLOG_COMMENTS_COL, lastCommentId);
			const lastCommentSnap = await getDoc(lastCommentRef);
			
			if (lastCommentSnap.exists()) {
				q = query(
					collection(db, BLOG_COMMENTS_COL),
					...baseQuery,
					startAfter(lastCommentSnap), // Bắt đầu sau bình luận cuối cùng
					limit(PAGE_SIZE) // Giới hạn 5 bài
				);
			} else {
				return [];
			}
		} else {
			// Tải trang đầu tiên (5 bài mới nhất)
			q = query(
				collection(db, BLOG_COMMENTS_COL), 
				...baseQuery,
				limit(PAGE_SIZE) // Giới hạn 5 bài
			);
		}

		const snapshot = await getDocs(q);
		return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any } as BlogComment));
	} catch (e) {
		console.error("Error fetching blog comments (Pagination)", e);
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
