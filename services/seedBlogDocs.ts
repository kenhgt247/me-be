import { 
  collection, 
  writeBatch, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Đảm bảo đường dẫn đúng

// --- 1. DATASETS: CHỦ ĐỀ BLOG & TÀI LIỆU (RICH CONTENT) ---

const BLOG_DATASET = [
  {
    title: "Bí quyết giúp trẻ sơ sinh ngủ xuyên đêm",
    summary: "Phương pháp Easy và cách rèn nếp sinh hoạt cho bé từ 0-12 tháng.",
    content: "<p>Giấc ngủ của trẻ sơ sinh luôn là nỗi ám ảnh của các mẹ bỉm sữa. Để bé ngủ ngon, mẹ cần chú ý môi trường ngủ, nhiệt độ và tiếng ồn trắng...</p>",
    tags: ["Giấc ngủ", "Trẻ sơ sinh", "Kinh nghiệm"]
  },
  {
    title: "Thực đơn ăn dặm kiểu Nhật cho bé 6 tháng",
    summary: "Gợi ý 30 món ăn dặm giàu dinh dưỡng, dễ làm.",
    content: "<p>Ăn dặm kiểu Nhật chú trọng vào việc giữ nguyên hương vị tự nhiên của thực phẩm. Mẹ nên bắt đầu với cháo rây tỉ lệ 1:10...</p>",
    tags: ["Ăn dặm", "Dinh dưỡng", "Thực đơn"]
  },
  {
    title: "Dấu hiệu nhận biết sớm bệnh tay chân miệng",
    summary: "Cách phân biệt ban tay chân miệng và thủy đậu.",
    content: "<p>Bệnh tay chân miệng thường bùng phát vào mùa hè. Dấu hiệu điển hình là các vết loét ở miệng và phỏng nước ở lòng bàn tay, bàn chân...</p>",
    tags: ["Sức khỏe", "Bệnh trẻ em"]
  },
  {
    title: "Review các loại bỉm mỏng, thấm hút tốt mùa hè",
    summary: "So sánh ưu nhược điểm của Merries, Moony, Bobby.",
    content: "<p>Mùa hè nóng bức, việc chọn bỉm mỏng nhẹ là ưu tiên hàng đầu để tránh hăm tã. Sau đây là trải nghiệm thực tế của mình...</p>",
    tags: ["Review", "Mẹ và bé"]
  },
  {
    title: "Giáo dục sớm: Dạy trẻ học nói qua thẻ Flashcard",
    summary: "Phương pháp Glenn Doman có thực sự hiệu quả?",
    content: "<p>Flashcard là công cụ tuyệt vời để kích thích não phải. Tuy nhiên, mẹ cần tráo thẻ đúng tốc độ và không ép con học khi con chán...</p>",
    tags: ["Giáo dục sớm", "Dạy con"]
  }
];

const DOC_DATASET = [
  {
    title: "Ebook: Cẩm nang chăm sóc mẹ bầu 40 tuần",
    desc: "Tổng hợp kiến thức thai giáo, dinh dưỡng từng giai đoạn.",
    type: "pdf",
    pages: 120
  },
  {
    title: "Bộ thẻ Flashcard chủ đề Động vật (PDF)",
    desc: "File in màu sắc nét, song ngữ Anh - Việt.",
    type: "pdf",
    pages: 50
  },
  {
    title: "Tuyển tập 50 bài hát ru con Bắc Bộ",
    desc: "File Mp3 chất lượng cao giúp bé dễ ngủ.",
    type: "mp3",
    pages: 0
  },
  {
    title: "Thực đơn Eat Clean cho mẹ sau sinh",
    desc: "Giúp mẹ về dáng nhanh mà vẫn đủ sữa cho con.",
    type: "docx",
    pages: 15
  },
  {
    title: "Đề thi thử Toán vào lớp 10 (Có đáp án)",
    desc: "Bộ đề tổng hợp từ các trường chuyên Hà Nội.",
    type: "pdf",
    pages: 10
  }
];

// --- 2. HELPERS ---
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Hàm tạo slug từ tiêu đề
const createSlug = (str: string) => {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/([^0-9a-z-\s])/g, "")
    .replace(/(\s+)/g, "-")
    .replace(/^-+|-+$/g, "") + "-" + Date.now();
};

// --- 3. MAIN FUNCTION ---

export const seedBlogAndDocs = async (onLog: (msg: string) => void) => {
  if (!db) return;
  
  onLog("🚀 Bắt đầu quá trình tạo Blog & Tài liệu...");

  // BƯỚC 1: LẤY DANH SÁCH CHUYÊN GIA (EXPERTS) TỪ FIRESTORE
  // (Chúng ta lấy những user mà bạn đã tạo ở file trước với isExpert: true)
  onLog("🔍 Đang tìm kiếm hồ sơ Chuyên gia...");
  
  const expertsQuery = query(collection(db, 'users'), where('isExpert', '==', true));
  const expertsSnapshot = await getDocs(expertsQuery);

  if (expertsSnapshot.empty) {
    onLog("❌ LỖI: Không tìm thấy Chuyên gia nào! Vui lòng chạy seed User trước.");
    return;
  }

  const experts = expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  onLog(`✅ Tìm thấy ${experts.length} chuyên gia. Sẽ sử dụng họ làm tác giả.`);

  // BƯỚC 2: TẠO BLOG CATEGORIES & DOCUMENT CATEGORIES (Nếu chưa có)
  // Để đơn giản, ta gán cứng ID cho categories để dễ random
  const blogCatIds = ['cat_blog_suckhoe', 'cat_blog_dinhduong', 'cat_blog_giaoduc'];
  const docCatIds = ['cat_doc_tailieu', 'cat_doc_ebook', 'cat_doc_amnhac'];

  // Tạo Categories (Viết đè lên nếu chưa có để đảm bảo tồn tại)
  const batchCat = writeBatch(db);
  
  // Blog Categories
  batchCat.set(doc(db, 'blogCategories', 'cat_blog_suckhoe'), { name: "Sức khỏe", slug: "suc-khoe" });
  batchCat.set(doc(db, 'blogCategories', 'cat_blog_dinhduong'), { name: "Dinh dưỡng", slug: "dinh-duong" });
  batchCat.set(doc(db, 'blogCategories', 'cat_blog_giaoduc'), { name: "Giáo dục", slug: "giao-duc" });

  // Document Categories (Dùng đúng tên documentCategories như rules)
  batchCat.set(doc(db, 'documentCategories', 'cat_doc_tailieu'), { name: "Tài liệu học tập", slug: "tai-lieu" });
  batchCat.set(doc(db, 'documentCategories', 'cat_doc_ebook'), { name: "Ebook - Sách", slug: "ebook" });
  batchCat.set(doc(db, 'documentCategories', 'cat_doc_amnhac'), { name: "Âm nhạc & Video", slug: "media" });

  await batchCat.commit();
  onLog("✅ Đã khởi tạo danh mục Blog & Tài liệu.");

  // BƯỚC 3: TẠO 30 BÀI BLOG & 30 TÀI LIỆU
  const batchData = writeBatch(db);
  let count = 0;

  // --- Tạo 30 Blog ---
  for (let i = 0; i < 30; i++) {
    const expert = getRandomItem(experts);
    const template = getRandomItem(BLOG_DATASET);
    const blogId = `seed_blog_${Date.now()}_${i}`;
    const title = `${template.title} #${i + 1}`;

    const blogPost = {
      id: blogId,
      title: title,
      slug: createSlug(title),
      summary: template.summary,
      content: template.content,
      thumbnail: `https://picsum.photos/seed/blog${i}/600/400`,
      
      // Thông tin tác giả (Lấy từ Expert thật)
      authorId: expert.id,
      authorName: expert.name,
      authorAvatar: expert.avatar,
      
      categoryId: getRandomItem(blogCatIds),
      views: getRandomInt(100, 5000),
      commentCount: getRandomInt(0, 20),
      tags: template.tags,
      isPublished: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isFake: true // Đánh dấu để dễ xóa sau này
    };

    batchData.set(doc(db, 'blogPosts', blogId), blogPost);
    count++;
  }

  // --- Tạo 30 Tài liệu ---
  for (let i = 0; i < 30; i++) {
    const expert = getRandomItem(experts);
    const template = getRandomItem(DOC_DATASET);
    const docId = `seed_doc_${Date.now()}_${i}`;
    const title = `${template.title} #${i + 1}`;

    const document = {
      id: docId,
      title: title,
      description: template.desc,
      fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      thumbnail: `https://picsum.photos/seed/doc${i}/300/400`,
      fileType: template.type,
      
      price: Math.random() > 0.7 ? getRandomInt(10, 50) : 0, // 30% tài liệu có phí
      
      // Thông tin tác giả
      authorId: expert.id,
      authorName: expert.name,
      authorAvatar: expert.avatar,
      
      categoryId: getRandomItem(docCatIds),
      downloads: getRandomInt(10, 200),
      views: getRandomInt(50, 1000),
      rating: getRandomInt(4, 5),
      ratingCount: getRandomInt(1, 15),
      pages: template.pages,
      
      isApproved: true,
      createdAt: serverTimestamp(),
      isFake: true
    };

    batchData.set(doc(db, 'documents', docId), document);
    count++;
  }

  // Commit batch
  await batchData.commit();
  onLog(`✨ HOÀN TẤT! Đã tạo thêm 30 Blog & 30 Tài liệu từ các chuyên gia.`);
};

export const clearBlogAndDocs = async (onLog: (msg: string) => void) => {
    if (!db) return;
    const batchSize = 400;
    
    onLog("🗑 Đang xóa Blog & Tài liệu mẫu...");

    // Xóa Blog
    const bQuery = query(collection(db, 'blogPosts'), where('isFake', '==', true));
    const bSnap = await getDocs(bQuery);
    const batch = writeBatch(db);
    
    bSnap.forEach(d => batch.delete(d.ref));
    
    // Xóa Docs
    const dQuery = query(collection(db, 'documents'), where('isFake', '==', true));
    const dSnap = await getDocs(dQuery);
    dSnap.forEach(d => batch.delete(d.ref));

    await batch.commit();
    onLog("✨ Đã dọn dẹp sạch sẽ Blog & Tài liệu giả!");
}
