import { 
  collection, 
  writeBatch, 
  doc, 
  serverTimestamp,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { db } from '../firebaseConfig'; 

// ==========================================
// 1. RICH DATASETS (DỮ LIỆU MẪU)
// ==========================================

const EXPERT_SEEDS = [
    { name: "BS.CKII Nguyễn Văn Chương", title: "Trưởng khoa Nhi", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" },
    { name: "ThS.BS Lê Thị Lan", title: "Viện Dinh dưỡng", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka" },
    { name: "BS. Trần Thu Hà", title: "Sản phụ khoa", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Liliana" },
    { name: "Cô giáo Minh Anh", title: "Chuyên gia Montessori", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Milo" },
    { name: "DS. Phạm Thanh Bình", title: "Dược sĩ Lâm sàng", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jack" }
];

// Blog dùng: title, excerpt, coverImageUrl, authorName, authorAvatar, status='published'
const BLOG_TOPICS = [
    { 
        title: "Bí quyết giúp trẻ sơ sinh ngủ xuyên đêm (Easy 4)", 
        excerpt: "Phương pháp Easy và cách rèn nếp sinh hoạt cho bé từ 0-12 tháng giúp mẹ nhàn tênh.", 
        catId: "cat_blog_suckhoe",
        image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df4?w=800&q=80" 
    },
    { 
        title: "Thực đơn ăn dặm kiểu Nhật cho bé 6 tháng", 
        excerpt: "Gợi ý 30 món ăn dặm giàu dinh dưỡng, dễ làm, giúp bé làm quen với thô tốt.", 
        catId: "cat_blog_dinhduong",
        image: "https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=800&q=80"
    },
    { 
        title: "Dấu hiệu nhận biết sớm bệnh tay chân miệng", 
        excerpt: "Cách phân biệt ban tay chân miệng và thủy đậu, hướng dẫn chăm sóc tại nhà.", 
        catId: "cat_blog_suckhoe",
        image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80"
    },
    { 
        title: "Review các loại bỉm mỏng, thấm hút tốt cho mùa hè", 
        excerpt: "So sánh ưu nhược điểm của Merries, Moony, Bobby, Yubest.", 
        catId: "cat_blog_mebe",
        image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80"
    },
    { 
        title: "Giáo dục sớm: Dạy trẻ học nói qua thẻ Flashcard", 
        excerpt: "Phương pháp Glenn Doman có thực sự hiệu quả? Cách tráo thẻ đúng.", 
        catId: "cat_blog_giaoduc",
        image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80"
    }
];

const DOC_TOPICS = [
    { title: "Ebook: Cẩm nang mẹ bầu 40 tuần", type: "pdf", catId: "cat_doc_ebook" },
    { title: "Bộ thẻ Flashcard Động vật", type: "pdf", catId: "cat_doc_tailieu" },
    { title: "50 bài hát ru con Bắc Bộ", type: "mp3", catId: "cat_doc_media" },
    { title: "Thực đơn Eat Clean sau sinh", type: "docx", catId: "cat_doc_tailieu" },
    { title: "Đề thi thử Toán vào 10", type: "pdf", catId: "cat_doc_tailieu" }
];

// ==========================================
// 2. HELPERS
// ==========================================
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const createSlug = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/[^0-9a-z-\s]/g, "").replace(/(\s+)/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now();

const safeLog = (logger: ((msg: string) => void) | undefined, message: string) => {
    if (typeof logger === 'function') logger(message);
    else console.log(message);
};

// Hàm tạo chuyên gia giả để đảm bảo luôn có author
const ensureExperts = (batch: any) => {
    const experts = [];
    for (let i = 0; i < EXPERT_SEEDS.length; i++) {
        const seed = EXPERT_SEEDS[i];
        const expertId = `fake_expert_${i}`;
        const expertData = {
            id: expertId,
            name: seed.name,
            email: `expert${i}@asking.vn`,
            avatar: seed.avatar,
            bio: `Chuyên gia ${seed.title}`,
            isExpert: true,
            isAdmin: false,
            isFake: true,
            createdAt: serverTimestamp()
        };
        batch.set(doc(db, 'users', expertId), expertData);
        experts.push(expertData);
    }
    return experts;
};

// ==========================================
// 3. EXPORTED FUNCTIONS
// ==========================================

// --- HÀM 1: SINH BLOG ---
export const generateFakeBlogs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    const auth = getAuth();
    if (!auth.currentUser) {
        safeLog(onLog, "❌ Lỗi: Bạn chưa đăng nhập Admin.");
        return;
    }

    safeLog(onLog, "🚀 Đang sinh Blog (Chuẩn cấu trúc Frontend)...");

    try {
        const batch = writeBatch(db);
        const createdExperts = ensureExperts(batch);

        // 1. Tạo Blog Categories
        const blogCats = [
            { id: 'cat_blog_suckhoe', name: "Sức khỏe", slug: "suc-khoe", iconEmoji: "💊", order: 1 },
            { id: 'cat_blog_dinhduong', name: "Dinh dưỡng", slug: "dinh-duong", iconEmoji: "🥗", order: 2 },
            { id: 'cat_blog_giaoduc', name: "Giáo dục", slug: "giao-duc", iconEmoji: "📚", order: 3 },
            { id: 'cat_blog_mebe', name: "Mẹ và Bé", slug: "me-va-be", iconEmoji: "👶", order: 4 }
        ];
        blogCats.forEach(c => batch.set(doc(db, 'blogCategories', c.id), { ...c, createdAt: new Date().toISOString() }));

        // 2. Tạo Blog Posts
        for (let i = 0; i < 20; i++) {
            const expert = getRandomItem(createdExperts);
            const template = getRandomItem(BLOG_TOPICS);
            const category = blogCats.find(c => c.id === template.catId) || blogCats[0];
            
            const blogId = `seed_blog_${Date.now()}_${i}`;
            const title = `${template.title} #${i+1}`;

            batch.set(doc(db, 'blogPosts', blogId), {
                id: blogId,
                title: title,
                slug: createSlug(title),
                
                // --- QUAN TRỌNG: KHỚP VỚI BlogList.tsx ---
                excerpt: template.excerpt,       // Frontend dùng 'excerpt'
                coverImageUrl: template.image,   // Frontend dùng 'coverImageUrl'
                authorName: expert.name,         // Frontend dùng 'authorName' trực tiếp
                authorAvatar: expert.avatar,     // Frontend dùng 'authorAvatar' trực tiếp
                // ------------------------------------------

                content: `<p>${template.excerpt}</p><p>Nội dung chi tiết bài viết...</p>`,
                authorId: expert.id,
                categoryId: category.id,
                
                status: 'published', // BẮT BUỘC để hiện ra
                views: getRandomInt(100, 5000),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isFake: true
            });
        }

        await batch.commit();
        safeLog(onLog, "✅ Đã tạo xong Blog & Chuyên gia.");

    } catch (error: any) {
        if (error.code === 'permission-denied') safeLog(onLog, "❌ LỖI QUYỀN: Cần Admin.");
        else safeLog(onLog, `❌ Lỗi: ${error.message}`);
    }
};

// --- HÀM 2: SINH TÀI LIỆU ---
export const generateFakeDocuments = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    const auth = getAuth();
    if (!auth.currentUser) {
        safeLog(onLog, "❌ Lỗi: Bạn chưa đăng nhập Admin.");
        return;
    }

    safeLog(onLog, "🚀 Đang sinh Tài liệu...");

    try {
        const batch = writeBatch(db);
        const createdExperts = ensureExperts(batch);

        // 1. Tạo Doc Categories
        const docCats = [
            { id: 'cat_doc_tailieu', name: "Tài liệu học tập", slug: "tai-lieu", iconEmoji: "📄", order: 1 },
            { id: 'cat_doc_ebook', name: "Ebook - Sách", slug: "ebook", iconEmoji: "📖", order: 2 },
            { id: 'cat_doc_media', name: "Âm nhạc & Video", slug: "media", iconEmoji: "🎵", order: 3 }
        ];
        docCats.forEach(c => batch.set(doc(db, 'documentCategories', c.id), { ...c, createdAt: new Date().toISOString() }));

        // 2. Tạo Documents
        for (let i = 0; i < 20; i++) {
            const expert = getRandomItem(createdExperts);
            const template = getRandomItem(DOC_TOPICS);
            const category = docCats.find(c => c.id === template.catId) || docCats[0];
            
            const docId = `seed_doc_${Date.now()}_${i}`;
            const title = `${template.title} #${i+1}`;

            batch.set(doc(db, 'documents', docId), {
                id: docId,
                title: title,
                slug: createSlug(title),
                
                // --- KHỚP VỚI DocumentList.tsx ---
                description: `Tài liệu biên soạn bởi ${expert.name}. ${title}`, // Frontend dùng 'description'
                fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                fileType: template.type,
                isExternal: false,
                // ---------------------------------

                authorId: expert.id,
                authorName: expert.name,
                authorAvatar: expert.avatar,
                categoryId: category.id,

                downloads: getRandomInt(10, 500),
                views: getRandomInt(50, 1000),
                rating: 5,
                ratingCount: getRandomInt(1, 10),
                pages: 10,
                isApproved: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isFake: true
            });
        }

        await batch.commit();
        safeLog(onLog, "✅ Đã tạo xong Tài liệu.");

    } catch (error: any) {
        if (error.code === 'permission-denied') safeLog(onLog, "❌ LỖI QUYỀN: Cần Admin.");
        else safeLog(onLog, `❌ Lỗi: ${error.message}`);
    }
};

// --- HÀM 3: XÓA DỮ LIỆU ---
export const clearFakeBlogDocs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    
    const deleteCollection = async (collName: string) => {
        try {
            const q = query(collection(db, collName), where('isFake', '==', true));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return 0;
            const batch = writeBatch(db);
            snapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            return snapshot.size;
        } catch (e) {
            console.error(e); 
            return 0;
        }
    };

    safeLog(onLog, "🗑 Đang dọn dẹp...");
    
    try {
        const blogs = await deleteCollection('blogPosts');
        const docs = await deleteCollection('documents');
        // Không xóa user để tránh ảnh hưởng logic login nếu lỡ dùng user giả
        safeLog(onLog, `✨ Đã xóa: ${blogs} Blog, ${docs} Docs.`);
    } catch (error: any) {
        safeLog(onLog, `❌ Lỗi xóa: ${error.message}`);
    }
};
