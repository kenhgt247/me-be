import { 
  collection, 
  writeBatch, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { db } from '../firebaseConfig'; 

// ==========================================
// 1. DATASETS (DỮ LIỆU MẪU)
// ==========================================

// 5 Chuyên gia mẫu
const EXPERT_SEEDS = [
    { name: "BS.CKII Nguyễn Văn Chương", title: "Trưởng khoa Nhi", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix" },
    { name: "ThS.BS Lê Thị Lan", title: "Viện Dinh dưỡng", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Aneka" },
    { name: "BS. Trần Thu Hà", title: "Sản phụ khoa", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Liliana" },
    { name: "Cô giáo Minh Anh", title: "Chuyên gia Montessori", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Milo" },
    { name: "DS. Phạm Thanh Bình", title: "Dược sĩ Lâm sàng", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Jack" }
];

const BLOG_TOPICS = [
    { title: "Bí quyết giúp trẻ sơ sinh ngủ xuyên đêm", summary: "Phương pháp Easy và cách rèn nếp sinh hoạt.", catId: "cat_blog_suckhoe" },
    { title: "Thực đơn ăn dặm kiểu Nhật 6 tháng", summary: "Gợi ý 30 món ăn dặm giàu dinh dưỡng.", catId: "cat_blog_dinhduong" },
    { title: "Dấu hiệu bệnh tay chân miệng", summary: "Cách phân biệt ban và hướng dẫn chăm sóc.", catId: "cat_blog_suckhoe" },
    { title: "Review bỉm mỏng thấm hút tốt", summary: "So sánh Merries, Moony, Bobby.", catId: "cat_blog_mebe" },
    { title: "Dạy trẻ nói qua Flashcard", summary: "Phương pháp Glenn Doman hiệu quả.", catId: "cat_blog_giaoduc" }
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

// Hàm log an toàn
const safeLog = (logger: ((msg: string) => void) | undefined, message: string) => {
    if (typeof logger === 'function') logger(message);
    else console.log(message);
};

// ==========================================
// 3. MAIN FUNCTION (CHẠY 1 LỆNH DUY NHẤT)
// ==========================================

export const generateFakeBlogs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    const auth = getAuth();
    
    // Yêu cầu quyền Admin để tạo dữ liệu cho người khác
    if (!auth.currentUser) {
        safeLog(onLog, "❌ Lỗi: Bạn chưa đăng nhập Admin.");
        return;
    }

    safeLog(onLog, "🚀 Bắt đầu quy trình sinh dữ liệu chuẩn...");

    try {
        const batch = writeBatch(db);

        // --- BƯỚC 1: TẠO 5 CHUYÊN GIA GIẢ (Vào collection users) ---
        safeLog(onLog, "creating 5 Experts...");
        const createdExperts = [];

        for (let i = 0; i < EXPERT_SEEDS.length; i++) {
            const seed = EXPERT_SEEDS[i];
            const expertId = `fake_expert_${i}`; // ID cố định để dễ quản lý
            
            const expertData = {
                id: expertId,
                name: seed.name,
                email: `expert${i}@asking.vn`,
                avatar: seed.avatar,
                bio: `Chuyên gia ${seed.title} với 10 năm kinh nghiệm.`,
                isExpert: true,
                expertStatus: 'approved',
                isAdmin: false,
                isFake: true, // Đánh dấu để dễ xóa
                createdAt: serverTimestamp()
            };

            // Lưu vào batch
            batch.set(doc(db, 'users', expertId), expertData);
            createdExperts.push(expertData);
        }

        // --- BƯỚC 2: TẠO DANH MỤC (Categories) ---
        safeLog(onLog, "creating Categories...");
        
        // Blog Categories
        const blogCats = [
            { id: 'cat_blog_suckhoe', name: "Sức khỏe", slug: "suc-khoe" },
            { id: 'cat_blog_dinhduong', name: "Dinh dưỡng", slug: "dinh-duong" },
            { id: 'cat_blog_giaoduc', name: "Giáo dục", slug: "giao-duc" },
            { id: 'cat_blog_mebe', name: "Mẹ và Bé", slug: "me-va-be" }
        ];
        blogCats.forEach(c => batch.set(doc(db, 'blogCategories', c.id), { ...c, createdAt: serverTimestamp() }));

        // Doc Categories
        const docCats = [
            { id: 'cat_doc_tailieu', name: "Tài liệu học tập", slug: "tai-lieu" },
            { id: 'cat_doc_ebook', name: "Ebook - Sách", slug: "ebook" },
            { id: 'cat_doc_media', name: "Âm nhạc & Video", slug: "media" }
        ];
        docCats.forEach(c => batch.set(doc(db, 'documentCategories', c.id), { ...c, createdAt: serverTimestamp() }));

        // --- BƯỚC 3: TẠO 20 BLOG POSTS ---
        safeLog(onLog, "creating 20 Blogs...");
        
        for (let i = 0; i < 20; i++) {
            const expert = getRandomItem(createdExperts);
            const template = getRandomItem(BLOG_TOPICS);
            const category = blogCats.find(c => c.id === template.catId) || blogCats[0];
            
            const blogId = `seed_blog_${Date.now()}_${i}`;
            const title = `${template.title} #${i + 1}`;

            batch.set(doc(db, 'blogPosts', blogId), {
                id: blogId,
                title: title,
                slug: createSlug(title),
                summary: template.summary,
                content: `<p>${template.summary}</p><p>Nội dung chi tiết bài viết...</p>`,
                thumbnail: `https://picsum.photos/seed/blog${i}/600/400`,
                
                // QUAN TRỌNG: Full Object Author & Category để KHÔNG TRẮNG TRANG
                authorId: expert.id,
                author: {
                    id: expert.id,
                    name: expert.name,
                    avatar: expert.avatar,
                    isExpert: true
                },
                
                categoryId: category.id,
                category: {
                    id: category.id,
                    name: category.name,
                    slug: category.slug
                },

                views: getRandomInt(100, 5000),
                commentCount: getRandomInt(0, 20),
                isPublished: true,
                createdAt: serverTimestamp(),
                isFake: true
            });
        }

        // --- BƯỚC 4: TẠO 20 DOCUMENTS ---
        safeLog(onLog, "creating 20 Documents...");

        for (let i = 0; i < 20; i++) {
            const expert = getRandomItem(createdExperts);
            const template = getRandomItem(DOC_TOPICS);
            const category = docCats.find(c => c.id === template.catId) || docCats[0];
            
            const docId = `seed_doc_${Date.now()}_${i}`;
            const title = `${template.title} #${i + 1}`;

            batch.set(doc(db, 'documents', docId), {
                id: docId,
                title: title,
                description: `Mô tả tài liệu: ${title}`,
                fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
                thumbnail: `https://picsum.photos/seed/doc${i}/300/400`,
                fileType: template.type,
                price: Math.random() > 0.7 ? 50 : 0,
                
                // QUAN TRỌNG: Full Object Author & Category
                authorId: expert.id,
                author: {
                    id: expert.id,
                    name: expert.name,
                    avatar: expert.avatar,
                    isExpert: true
                },
                
                categoryId: category.id,
                category: {
                    id: category.id,
                    name: category.name,
                    slug: category.slug
                },

                downloads: getRandomInt(10, 500),
                views: getRandomInt(50, 1000),
                rating: 5,
                ratingCount: getRandomInt(1, 10),
                pages: 10,
                isApproved: true,
                createdAt: serverTimestamp(),
                isFake: true
            });
        }

        // --- BƯỚC 5: GHI DỮ LIỆU (COMMIT) ---
        await batch.commit();
        safeLog(onLog, "✅ HOÀN TẤT! Đã tạo: 5 Chuyên gia + 20 Blog + 20 Tài liệu.");
        safeLog(onLog, "👉 Hãy F5 lại trang để xem kết quả.");

    } catch (error: any) {
        console.error(error);
        if (error.code === 'permission-denied') {
            safeLog(onLog, "❌ LỖI QUYỀN: Bạn phải là ADMIN mới chạy được script này.");
        } else {
            safeLog(onLog, `❌ Lỗi hệ thống: ${error.message}`);
        }
    }
};

// === HÀM XÓA DỮ LIỆU ===
export const clearFakeBlogDocs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    
    // Hàm xóa collection theo điều kiện
    const deleteCollection = async (collName: string) => {
        const q = query(collection(db, collName), where('isFake', '==', true));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        return snapshot.size;
    };

    safeLog(onLog, "🗑 Đang dọn dẹp dữ liệu giả...");
    
    try {
        const blogsDeleted = await deleteCollection('blogPosts');
        const docsDeleted = await deleteCollection('documents');
        const usersDeleted = await deleteCollection('users'); // Xóa luôn cả chuyên gia giả

        safeLog(onLog, `✨ Đã xóa: ${blogsDeleted} Blog, ${docsDeleted} Docs, ${usersDeleted} Fake Users.`);
    } catch (error: any) {
        safeLog(onLog, `❌ Lỗi xóa: ${error.message}`);
    }
};

// Giữ lại hàm cũ để tránh lỗi import nếu file khác đang gọi, nhưng để trống
export const generateFakeContent = async () => {}; 
export const generateFakeUsers = async () => {};
