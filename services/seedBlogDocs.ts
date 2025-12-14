import { 
  collection, 
  writeBatch, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { db } from '../firebaseConfig'; 

// ==========================================
// 1. RICH DATASETS (DỮ LIỆU MẪU CAO CẤP)
// ==========================================

// --- 1.1 CHUYÊN GIA UY TÍN (Ảnh đẹp, chức danh rõ ràng) ---
const EXPERT_SEEDS = [
    { name: "BS.CKII Nguyễn Văn Chương", title: "Trưởng khoa Nhi - BV Nhi TW", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=faces&q=80" },
    { name: "ThS.BS Dinh dưỡng Lê Lan", title: "Viện Dinh dưỡng Quốc gia", avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=faces&q=80" },
    { name: "Cô giáo Minh Anh", title: "Chuyên gia Giáo dục sớm Montessori", avatar: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&h=400&fit=crop&crop=faces&q=80" },
    { name: "BS. Tâm lý Trần Thu Hà", title: "Chuyên gia tâm lý mẹ và bé", avatar: "https://images.unsplash.com/photo-1607990281513-2c110a25bd8c?w=400&h=400&fit=crop&crop=faces&q=80" },
    { name: "DS. Phạm Thanh Bình", title: "Dược sĩ Lâm sàng", avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop&crop=faces&q=80" }
];

// --- 1.2 BÀI VIẾT BLOG "THẬT" (Nội dung dài, ảnh đẹp theo chủ đề) ---
const RICH_BLOG_DATASET = [
  {
    title: "Bí quyết luyện ngủ EASY 4: Giúp bé ngủ xuyên đêm 10-12 tiếng",
    summary: "Áp dụng lịch sinh hoạt EASY 4 cho bé từ 3-4 tháng tuổi để cả mẹ và con đều được ngủ ngon giấc.",
    // Nội dung HTML dài, nhìn như thật
    content: `<p>Giấc ngủ của trẻ sơ sinh luôn là bài toán khó với nhiều bà mẹ. Khi bé được khoảng 3 tháng tuổi và đạt cân nặng trên 6kg, mẹ có thể cân nhắc chuyển sang lịch EASY 4.</p><h3>Lịch trình mẫu EASY 4:</h3><ul><li>7h00: Dậy, ăn, vệ sinh.</li><li>9h00 - 11h00: Ngủ giấc 1 (2 tiếng).</li><li>11h00: Ăn, chơi vận động.</li><li>13h00 - 15h00: Ngủ giấc 2 (2 tiếng).</li><li>15h00: Ăn nhẹ.</li><li>17h00 - 17h45: Ngủ giấc ngắn (Catnap).</li><li>19h00: Tắm, ăn cữ cuối và đi ngủ đêm.</li></ul><p>Quan trọng nhất là tạo môi trường ngủ lý tưởng: tối hoàn toàn, nhiệt độ mát (22-24 độ) và sử dụng tiếng ồn trắng.</p>`,
    tags: ["Giấc ngủ", "Easy", "Kinh nghiệm chăm con"],
    catId: "cat_blog_suckhoe",
    image: "https://images.unsplash.com/photo-1555252333-9f8e92e65df4?w=800&q=80" // Ảnh em bé ngủ
  },
  {
    title: "Thực đơn ăn dặm kiểu Nhật giai đoạn 1 (5-6 tháng): 30 ngày không trùng lặp",
    summary: "Gợi ý chi tiết thực đơn ăn dặm, cách chế biến nước dashi và cháo rây chuẩn Nhật cho bé bắt đầu tập ăn.",
    content: `<p>Ăn dặm kiểu Nhật chú trọng vào việc giữ nguyên hương vị tự nhiên của thực phẩm và giúp bé làm quen với độ thô tăng dần.</p><h3>Nguyên tắc vàng:</h3><ol><li><strong>Tỉ lệ cháo:</strong> Bắt đầu với cháo rây tỉ lệ 1:10.</li><li><strong>Chất đạm:</strong> Bổ sung đậu hũ non từ tuần thứ 2, lòng đỏ trứng từ tuần thứ 3.</li><li><strong>Rau củ:</strong> Ưu tiên các loại củ có vị ngọt tự nhiên như cà rốt, bí đỏ, khoai lang.</li></ol><p>Mẹ nên chuẩn bị sẵn nước dùng Dashi (từ rong biển và cá bào) để nấu cháo và rau củ, giúp tăng hương vị mà không cần gia vị.</p>`,
    tags: ["Ăn dặm", "Dinh dưỡng", "Kiểu Nhật"],
    catId: "cat_blog_dinhduong",
    image: "https://images.unsplash.com/photo-1576867757603-05b134ebc379?w=800&q=80" // Ảnh đồ ăn dặm
  },
  {
    title: "Cảnh báo: Dấu hiệu bệnh tay chân miệng đang bùng phát mạnh",
    summary: "Cách phân biệt ban tay chân miệng và thủy đậu, hướng dẫn chăm sóc tại nhà để tránh biến chứng.",
    content: `<p>Bệnh tay chân miệng do virus đường ruột gây ra, thường bùng phát vào mùa hè thu. Bệnh rất dễ lây lan qua đường tiêu hóa và tiếp xúc trực tiếp.</p><h3>Dấu hiệu nhận biết điển hình:</h3><ul><li><strong>Sốt:</strong> Thường sốt nhẹ hoặc sốt cao. Sốt cao liên tục > 39 độ là dấu hiệu cảnh báo nặng.</li><li><strong>Loét miệng:</strong> Các vết loét đỏ hay phỏng nước ở niêm mạc miệng, lợi, lưỡi gây đau, khiến trẻ biếng ăn, chảy dãi.</li><li><strong>Phát ban dạng phỏng nước:</strong> Ở lòng bàn tay, lòng bàn chân, gối, mông. Đặc điểm là ấn vào không đau, không ngứa.</li></ul><p>Khi trẻ có dấu hiệu giật mình chới với, run chi, đi loạng choạng, cần đưa đi cấp cứu ngay lập tức.</p>`,
    tags: ["Sức khỏe", "Bệnh trẻ em", "Cảnh báo"],
    catId: "cat_blog_suckhoe",
    image: "https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&q=80" // Ảnh bác sĩ khám cho bé
  },
  {
    title: "Review chân thực 5 loại bỉm mỏng, thấm hút tốt nhất cho mùa hè 2024",
    summary: "So sánh ưu nhược điểm của Merries, Moony Natural, Bobby, Yubest và Applecrumby sau 3 tháng sử dụng.",
    content: `<p>Mùa hè nóng bức, việc chọn bỉm mỏng nhẹ là ưu tiên hàng đầu để tránh hăm tã. Dưới đây là trải nghiệm thực tế của mình:</p><h3>1. Merries (Nhật Bản)</h3><p>Ưu điểm: Cực kỳ mềm mại, form ôm dáng, lưng chun co giãn tốt. Nhược điểm: Giá thành hơi cao, dễ bị ẩm mông nếu bé tè nhiều vào ban đêm.</p><h3>2. Moony Natural (Nhật Bản)</h3><p>Ưu điểm: Bề mặt Organic cotton an toàn cho da nhạy cảm, có rãnh rốn cho size Newborn. Nhược điểm: Form hơi nhỏ hơn Merries một chút.</p><p>Nếu ưu tiên kinh tế, các mẹ có thể chọn Yubest, tuy nhiên độ thấm hút chỉ ở mức trung bình.</p>`,
    tags: ["Review", "Mẹ và bé", "Kinh nghiệm mua sắm"],
    catId: "cat_blog_mebe",
    image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=800&q=80" // Ảnh em bé đeo bỉm
  },
  {
    title: "Giáo dục sớm Montessori tại nhà: Những trò chơi phát triển giác quan cho trẻ 1-3 tuổi",
    summary: "Không cần đồ chơi đắt tiền, mẹ có thể tự tạo môi trường Montessori giúp con tự lập và thông minh hơn.",
    content: `<p>Montessori nhấn mạnh vào việc "để trẻ tự làm" và tôn trọng sự phát triển tự nhiên của trẻ.</p><h3>Gợi ý hoạt động tại nhà:</h3><ul><li><strong>Hoạt động thực hành cuộc sống:</strong> Tập tự đi giày, tự rót nước, nhặt rau giúp mẹ, lau bàn ghế.</li><li><strong>Hoạt động giác quan:</strong> Chơi với các loại hạt (đậu, gạo) để xúc giác phát triển (cần giám sát kỹ), phân biệt màu sắc qua các khối gỗ.</li><li><strong>Góc đọc sách:</strong> Bố trí kệ sách thấp vừa tầm với của trẻ, chỉ để 3-5 cuốn sách và thay đổi hàng tuần.</li></ul><p>Hãy nhớ nguyên tắc: "Quan sát, chờ đợi và lắng nghe" trước khi can thiệp giúp trẻ.</p>`,
    tags: ["Giáo dục sớm", "Montessori", "Dạy con"],
    catId: "cat_blog_giaoduc",
    image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&q=80" // Ảnh trẻ chơi đồ chơi gỗ
  }
];

// --- 1.3 TÀI LIỆU "THẬT" (Link PDF hoạt động, đa dạng) ---
const RICH_DOC_DATASET = [
  { 
    title: "Ebook: Cẩm nang dinh dưỡng 1000 ngày đầu đời (Viện Dinh dưỡng)", 
    type: "pdf", catId: "cat_doc_ebook", 
    url: "https://iris.who.int/bitstream/handle/10665/331659/9789240002454-vie.pdf", // Link thật của WHO/Viện dinh dưỡng
    image: "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=400&q=80"
  },
  { 
    title: "Bộ thẻ Flashcard chủ đề Động vật (File in chuẩn)", 
    type: "pdf", catId: "cat_doc_tailieu", 
    url: "https://file-examples.com/storage/fe500705996644557773128/2017/10/file-sample_150kB.pdf", // Link PDF mẫu
    image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80"
  },
  { 
    title: "Tuyển tập 50 bài hát ru con Bắc Bộ (File Mp3 chất lượng cao)", 
    type: "mp3", catId: "cat_doc_media", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Link MP3 mẫu
    image: "https://images.unsplash.com/photo-1445985543470-410296695397?w=400&q=80"
  },
  { 
    title: "Thực đơn Eat Clean 21 ngày cho mẹ sau sinh (File Word)", 
    type: "docx", catId: "cat_doc_tailieu", 
    url: "https://file-examples.com/storage/fe500705996644557773128/2017/02/file-sample_100kB.docx", // Link DOCX mẫu
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80"
  },
  { 
    title: "Đề cương ôn tập Toán vào lớp 10 (Các trường chuyên)", 
    type: "pdf", catId: "cat_doc_tailieu", 
    url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf", // Link PDF mẫu 2
    image: "https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&q=80"
  }
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

// Hàm nội bộ: Tạo hoặc lấy danh sách chuyên gia giả
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
            bio: `Chuyên gia ${seed.title} với nhiều năm kinh nghiệm trong ngành.`,
            isExpert: true,
            expertStatus: 'approved',
            isAdmin: false,
            isFake: true,
            createdAt: new Date().toISOString()
        };
        batch.set(doc(db, 'users', expertId), expertData);
        experts.push(expertData);
    }
    return experts;
};

// ==========================================
// 3. EXPORTED FUNCTIONS
// ==========================================

// --- HÀM 1: SINH BLOG (PREMIUM) ---
export const generateFakeBlogs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    const auth = getAuth();
    if (!auth.currentUser) {
        safeLog(onLog, "❌ Lỗi: Bạn chưa đăng nhập Admin.");
        return;
    }

    safeLog(onLog, "🚀 Đang sinh Blog PREMIUM (Nội dung thật, ảnh đẹp)...");

    try {
        const batch = writeBatch(db);

        // 1. Đảm bảo có chuyên gia uy tín
        const createdExperts = ensureExperts(batch);

        // 2. Tạo Blog Categories chuẩn
        const blogCats = [
            { id: 'cat_blog_suckhoe', name: "Sức khỏe", slug: "suc-khoe", order: 1 },
            { id: 'cat_blog_dinhduong', name: "Dinh dưỡng", slug: "dinh-duong", order: 2 },
            { id: 'cat_blog_giaoduc', name: "Giáo dục", slug: "giao-duc", order: 3 },
            { id: 'cat_blog_mebe', name: "Mẹ và Bé", slug: "me-va-be", order: 4 }
        ];
        blogCats.forEach(c => batch.set(doc(db, 'blogCategories', c.id), { ...c, createdAt: new Date().toISOString() }));

        // 3. Tạo 20 Blog Posts chất lượng cao
        for (let i = 0; i < 20; i++) {
            // Lấy nội dung "thật" từ dataset thay vì random lung tung
            // Dùng toán tử % để lặp lại danh sách 5 bài mẫu cho đủ 20 bài
            const template = RICH_BLOG_DATASET[i % RICH_BLOG_DATASET.length];
            const expert = getRandomItem(createdExperts);
            const category = blogCats.find(c => c.id === template.catId) || blogCats[0];
            
            const blogId = `seed_blog_${Date.now()}_${i}`;
            // Thêm số thứ tự vào tiêu đề để khác biệt một chút
            const title = `${template.title}${i >= RICH_BLOG_DATASET.length ? ` (Bài ${i+1})` : ''}`;

            batch.set(doc(db, 'blogPosts', blogId), {
                id: blogId,
                title: title,
                slug: createSlug(title),
                summary: template.summary,
                content: template.content, // Nội dung HTML dài
                thumbnail: template.image, // Ảnh đẹp, liên quan chủ đề
                
                authorId: expert.id,
                authorName: expert.name,
                authorAvatar: expert.avatar,
                
                categoryId: category.id,
                
                status: 'published',
                views: getRandomInt(500, 10000), // View cao nhìn cho uy tín
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isFake: true
            });
        }

        await batch.commit();
        safeLog(onLog, "✅ Đã tạo xong: 5 Chuyên gia uy tín + 20 Blog chất lượng cao.");

    } catch (error: any) {
        if (error.code === 'permission-denied') safeLog(onLog, "❌ LỖI QUYỀN: Cần Admin.");
        else safeLog(onLog, `❌ Lỗi: ${error.message}`);
    }
};

// --- HÀM 2: SINH TÀI LIỆU (PREMIUM) ---
export const generateFakeDocuments = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    const auth = getAuth();
    if (!auth.currentUser) {
        safeLog(onLog, "❌ Lỗi: Bạn chưa đăng nhập Admin.");
        return;
    }

    safeLog(onLog, "🚀 Đang sinh Tài liệu PREMIUM (Link chuẩn, ảnh đẹp)...");

    try {
        const batch = writeBatch(db);

        // 1. Đảm bảo có chuyên gia
        const createdExperts = ensureExperts(batch);

        // 2. Tạo Doc Categories chuẩn
        const docCats = [
            { id: 'cat_doc_tailieu', name: "Tài liệu học tập", slug: "tai-lieu", order: 1 },
            { id: 'cat_doc_ebook', name: "Ebook - Sách", slug: "ebook", order: 2 },
            { id: 'cat_doc_media', name: "Âm nhạc & Video", slug: "media", order: 3 }
        ];
        docCats.forEach(c => batch.set(doc(db, 'documentCategories', c.id), { ...c, createdAt: new Date().toISOString() }));

        // 3. Tạo 20 Documents chuẩn
        for (let i = 0; i < 20; i++) {
             // Lấy nội dung "thật" từ dataset
            const template = RICH_DOC_DATASET[i % RICH_DOC_DATASET.length];
            const expert = getRandomItem(createdExperts);
            const category = docCats.find(c => c.id === template.catId) || docCats[0];
            
            const docId = `seed_doc_${Date.now()}_${i}`;
            const title = `${template.title}${i >= RICH_DOC_DATASET.length ? ` (Bản ${i+1})` : ''}`;

            batch.set(doc(db, 'documents', docId), {
                id: docId,
                title: title,
                slug: createSlug(title),
                description: `Tài liệu được biên soạn bởi ${expert.name}. ${template.title}. Phù hợp cho các mẹ đang tìm hiểu về chủ đề này.`,
                
                fileUrl: template.url, // Link PDF/MP3 hoạt động thật
                thumbnail: template.image, // Ảnh bìa đẹp
                fileType: template.type,
                price: Math.random() > 0.8 ? 50 : 0, // 80% miễn phí
                
                authorId: expert.id,
                authorName: expert.name,
                authorAvatar: expert.avatar,
                
                categoryId: category.id,

                downloads: getRandomInt(100, 5000),
                views: getRandomInt(200, 10000),
                rating: parseFloat((Math.random() * (5 - 4) + 4).toFixed(1)), // Rating cao từ 4.0 - 5.0
                ratingCount: getRandomInt(10, 100),
                pages: template.pages,
                isApproved: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isFake: true
            });
        }

        await batch.commit();
        safeLog(onLog, "✅ Đã tạo xong: 5 Chuyên gia uy tín + 20 Tài liệu chuẩn.");

    } catch (error: any) {
        if (error.code === 'permission-denied') safeLog(onLog, "❌ LỖI QUYỀN: Cần Admin.");
        else safeLog(onLog, `❌ Lỗi: ${error.message}`);
    }
};

// --- HÀM 3: XÓA DỮ LIỆU ---
export const clearFakeBlogDocs = async (onLog?: (msg: string) => void) => {
    if (!db) return;
    
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
        // const usersDeleted = await deleteCollection('users'); // Tùy chọn: xóa cả chuyên gia giả

        safeLog(onLog, `✨ Đã xóa: ${blogsDeleted} Blog, ${docsDeleted} Docs.`);
    } catch (error: any) {
        safeLog(onLog, `❌ Lỗi xóa: ${error.message}`);
    }
};
