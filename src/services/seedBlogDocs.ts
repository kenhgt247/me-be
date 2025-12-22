import { 
  collection, 
  writeBatch, 
  doc, 
  getDocs, 
  query, 
  where, 
  limit 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { db } from '../firebaseConfig'; 

// =========================================================================
// 1. NGÂN HÀNG CONTENT (BLOG & DOCS)
// =========================================================================

// Hàm sinh nội dung HTML "xịn" như bài báo thật
const generateArticleHTML = (title: string, topicKeyword: string) => {
  return `
    <p class="lead"><strong>${title}</strong> là vấn đề khiến nhiều cha mẹ đau đầu. Bài viết dưới đây được tham vấn y khoa bởi các bác sĩ hàng đầu tại Asking.vn.</p>
    
    <h2>1. Thực trạng và nguyên nhân</h2>
    <p>Gần đây, tỷ lệ trẻ gặp vấn đề này ngày càng tăng. Nguyên nhân chính thường đến từ môi trường, chế độ dinh dưỡng chưa hợp lý hoặc thay đổi thời tiết.</p>
    
    <figure class="image-container">
      <img src="https://source.unsplash.com/800x450/?${topicKeyword},health" alt="${title}" style="width:100%; border-radius: 8px; margin: 15px 0;"/>
      <figcaption style="text-align:center; color:#666; font-style:italic">Hình ảnh minh họa: ${title}</figcaption>
    </figure>

    <h2>2. Hướng dẫn chăm sóc tại nhà</h2>
    <ul>
      <li><strong>Theo dõi nhiệt độ:</strong> Kiểm tra thường xuyên 4 tiếng/lần.</li>
      <li><strong>Dinh dưỡng:</strong> Ưu tiên đồ ăn lỏng, dễ tiêu, giàu vitamin C.</li>
      <li><strong>Vệ sinh:</strong> Giữ không gian thoáng mát, sạch sẽ.</li>
    </ul>

    <h2>3. Khi nào cần gặp bác sĩ?</h2>
    <p>Nếu trẻ có biểu hiện lừ đừ, bỏ ăn kéo dài hoặc sốt cao không hạ, ba mẹ cần đưa bé đến cơ sở y tế gần nhất ngay lập tức.</p>
    
    <div style="background:#e0f2fe; padding:15px; border-radius:8px; border-left: 4px solid #0284c7; margin-top: 20px;">
      <strong>Lưu ý:</strong> Thông tin chỉ mang tính chất tham khảo.
    </div>
  `;
};

const BLOG_TOPICS = [
    { title: "Bí quyết giúp trẻ sơ sinh ngủ xuyên đêm (Easy 4)", topic: "baby,sleep", catId: "cat_blog_suckhoe", img: "https://images.unsplash.com/photo-1555252333-9f8e92e65df4?w=800&q=80" },
    { title: "Thực đơn ăn dặm kiểu Nhật cho bé 6 tháng", topic: "food,baby", catId: "cat_blog_dinhduong", img: "https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=800&q=80" },
    { title: "Dấu hiệu nhận biết sớm bệnh tay chân miệng", topic: "virus,child", catId: "cat_blog_suckhoe", img: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80" },
    { title: "Review 5 loại bỉm mỏng nhẹ cho mùa hè", topic: "diaper", catId: "cat_blog_mebe", img: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80" },
    { title: "Phương pháp giáo dục sớm Montessori tại nhà", topic: "toy,kid", catId: "cat_blog_giaoduc", img: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80" }
];

const DOC_TOPICS = [
    { title: "Ebook: Cẩm nang mẹ bầu 40 tuần thai kỳ", type: "pdf", size: "15.4 MB" },
    { title: "Bộ thẻ Flashcard Động vật (Song ngữ)", type: "pdf", size: "5.2 MB" },
    { title: "Album 50 bài hát ru con Bắc Bộ", type: "mp3", size: "120 MB" },
    { title: "Thực đơn Eat Clean 21 ngày sau sinh", type: "docx", size: "2.1 MB" },
    { title: "Tuyển tập đề thi thử vào lớp 10 môn Toán", type: "pdf", size: "8.5 MB" }
];

// =========================================================================
// 2. HELPERS
// =========================================================================
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const createSlug = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/[^0-9a-z-\s]/g, "").replace(/(\s+)/g, "-").replace(/^-+|-+$/g, "");
const safeLog = (logger: any, msg: string) => logger ? logger(msg) : console.log(msg);

// Lấy chuyên gia thật từ DB để làm tác giả (Author)
const fetchExperts = async () => {
    const q = query(collection(db, 'users'), where('isExpert', '==', true), limit(10));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    // Fallback nếu chưa có chuyên gia nào (tạo tạm object giả để không lỗi code)
    return [{
        id: "temp_expert_id", name: "BS. Admin (Tạm)", 
        avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Admin", 
        bio: "Chuyên gia hệ thống"
    }];
};

// =========================================================================
// 3. CORE FUNCTIONS
// =========================================================================

export const generateFakeBlogs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    const auth = getAuth();
    if (!auth.currentUser) { safeLog(onLog, "⚠️ Cần đăng nhập Admin để tạo Blog."); return; }

    safeLog(onLog, "🚀 Đang viết bài Blog chuẩn SEO (Real IDs)...");

    try {
        const batch = writeBatch(db);
        const experts = await fetchExperts();

        // 1. Categories
        const blogCats = [
            { id: 'cat_blog_suckhoe', name: "Sức khỏe", slug: "suc-khoe", iconEmoji: "💊" },
            { id: 'cat_blog_dinhduong', name: "Dinh dưỡng", slug: "dinh-duong", iconEmoji: "🥗" },
            { id: 'cat_blog_giaoduc', name: "Giáo dục", slug: "giao-duc", iconEmoji: "📚" },
            { id: 'cat_blog_mebe', name: "Mẹ và Bé", slug: "me-va-be", iconEmoji: "👶" }
        ];
        blogCats.forEach(c => batch.set(doc(db, 'blogCategories', c.id), { ...c, createdAt: new Date().toISOString() }));

        // 2. Posts
        for (let i = 0; i < 20; i++) {
            const template = getRandomItem(BLOG_TOPICS);
            const expert = getRandomItem(experts);
            const category = blogCats.find(c => c.id === template.catId) || blogCats[0];
            
            // ID THẬT
            const blogRef = doc(collection(db, 'blogPosts'));
            const blogId = blogRef.id;

            batch.set(blogRef, {
                id: blogId,
                title: template.title,
                slug: createSlug(template.title) + '-' + blogId.substring(0,4), // Slug Unique
                excerpt: template.title + ". " + "Đọc ngay bài viết chi tiết để hiểu rõ hơn.",
                coverImageUrl: template.img,
                content: generateArticleHTML(template.title, template.topic), // HTML xịn
                
                authorId: expert.id,
                authorName: expert.name,
                authorAvatar: expert.avatar,
                authorBio: expert.bio || "Chuyên gia y tế",
                
                categoryId: category.id,
                categoryName: category.name,
                
                status: 'published',
                views: getRandomInt(1500, 50000),
                likes: getRandomInt(50, 500),
                createdAt: new Date().toISOString(),
                isFake: true
            });
        }

        await batch.commit();
        safeLog(onLog, "✅ Đã xuất bản 20 bài Blog chất lượng cao.");
    } catch (error: any) { safeLog(onLog, `❌ Lỗi: ${error.message}`); }
};

export const generateFakeDocuments = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    safeLog(onLog, "🚀 Đang upload Tài liệu & Ebook...");

    try {
        const batch = writeBatch(db);
        const experts = await fetchExperts();

        const docCats = [
            { id: 'cat_doc_tailieu', name: "Tài liệu học tập", slug: "tai-lieu", iconEmoji: "📄" },
            { id: 'cat_doc_ebook', name: "Ebook - Sách", slug: "ebook", iconEmoji: "📖" },
            { id: 'cat_doc_media', name: "Âm nhạc & Video", slug: "media", iconEmoji: "🎵" }
        ];
        docCats.forEach(c => batch.set(doc(db, 'documentCategories', c.id), { ...c, createdAt: new Date().toISOString() }));

        for (let i = 0; i < 20; i++) {
            const template = getRandomItem(DOC_TOPICS);
            const expert = getRandomItem(experts);
            const cat = getRandomItem(docCats);
            
            // ID THẬT
            const docRef = doc(collection(db, 'documents'));
            const docId = docRef.id;

            batch.set(docRef, {
                id: docId,
                title: template.title,
                slug: createSlug(template.title) + '-' + docId.substring(0,4),
                description: `Tài liệu biên soạn bởi ${expert.name}. Phù hợp cho cộng đồng cha mẹ thông thái.`,
                
                fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                fileType: template.type,
                fileSize: template.size,
                coverImage: `https://source.unsplash.com/400x500/?book,cover,${template.type}`,
                
                authorId: expert.id,
                authorName: expert.name,
                authorAvatar: expert.avatar,
                categoryId: cat.id,

                downloads: getRandomInt(100, 8000),
                rating: 5,
                isApproved: true,
                createdAt: new Date().toISOString(),
                isFake: true
            });
        }
        await batch.commit();
        safeLog(onLog, "✅ Đã upload 20 Tài liệu.");
    } catch (error: any) { safeLog(onLog, `❌ Lỗi: ${error.message}`); }
};

export const clearFakeBlogDocs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    
    const deleteColl = async (collName: string) => {
        const q = query(collection(db, collName), where('isFake', '==', true));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach(doc => batch.delete(doc.ref));
        if (!snapshot.empty) await batch.commit();
        return snapshot.size;
    };

    safeLog(onLog, "🗑 Đang dọn dẹp Blog & Docs...");
    try {
        const b = await deleteColl('blogPosts');
        const d = await deleteColl('documents');
        await deleteColl('blogCategories');
        await deleteColl('documentCategories');
        safeLog(onLog, `✨ Đã xóa: ${b} Blog, ${d} Tài liệu.`);
    } catch (e:any) { safeLog(onLog, `❌ Lỗi: ${e.message}`); }
};
