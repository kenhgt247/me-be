import { 
  collection, 
  writeBatch, 
  doc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 
import { db } from '../firebaseConfig'; 

// --- 1. DATASETS CAO CẤP (RICH DATASETS CHO BLOG & DOCS) ---

const BLOG_DATASET = [
  {
    title: "Bí quyết giúp trẻ sơ sinh ngủ xuyên đêm (Easy 3-4)",
    summary: "Phương pháp Easy và cách rèn nếp sinh hoạt cho bé từ 0-12 tháng giúp mẹ nhàn tênh.",
    content: "<p>Giấc ngủ của trẻ sơ sinh luôn là nỗi ám ảnh của các mẹ bỉm sữa. Để bé ngủ ngon, mẹ cần thiết lập môi trường ngủ an toàn, tiếng ồn trắng và lịch sinh hoạt phù hợp...</p>",
    tags: ["Giấc ngủ", "Trẻ sơ sinh", "Easy"]
  },
  {
    title: "Thực đơn ăn dặm kiểu Nhật cho bé 6 tháng",
    summary: "Gợi ý 30 món ăn dặm giàu dinh dưỡng, dễ làm, giúp bé làm quen với thô tốt.",
    content: "<p>Ăn dặm kiểu Nhật chú trọng vào việc giữ nguyên hương vị tự nhiên của thực phẩm. Mẹ nên bắt đầu với cháo rây tỉ lệ 1:10, sau đó tăng độ thô dần...</p>",
    tags: ["Ăn dặm", "Dinh dưỡng", "Kiểu Nhật"]
  },
  {
    title: "Dấu hiệu nhận biết sớm bệnh tay chân miệng cấp độ 1",
    summary: "Cách phân biệt ban tay chân miệng và thủy đậu, hướng dẫn chăm sóc tại nhà.",
    content: "<p>Bệnh tay chân miệng thường bùng phát vào mùa hè. Dấu hiệu điển hình là các vết loét ở miệng và phỏng nước ở lòng bàn tay, bàn chân, mông...</p>",
    tags: ["Sức khỏe", "Bệnh trẻ em"]
  },
  {
    title: "Review các loại bỉm mỏng, thấm hút tốt cho mùa hè",
    summary: "So sánh ưu nhược điểm của Merries, Moony, Bobby, Yubest.",
    content: "<p>Mùa hè nóng bức, việc chọn bỉm mỏng nhẹ là ưu tiên hàng đầu để tránh hăm tã. Sau đây là trải nghiệm thực tế của mình sau khi dùng thử 5 loại...</p>",
    tags: ["Review", "Mẹ và bé"]
  },
  {
    title: "Giáo dục sớm: Dạy trẻ học nói qua thẻ Flashcard",
    summary: "Phương pháp Glenn Doman có thực sự hiệu quả? Cách tráo thẻ đúng.",
    content: "<p>Flashcard là công cụ tuyệt vời để kích thích não phải. Tuy nhiên, mẹ cần tráo thẻ đúng tốc độ (1 giây/thẻ) và không ép con học khi con chán...</p>",
    tags: ["Giáo dục sớm", "Dạy con"]
  }
];

const DOC_DATASET = [
  {
    title: "Ebook: Cẩm nang chăm sóc mẹ bầu 40 tuần (PDF)",
    desc: "Tổng hợp kiến thức thai giáo, dinh dưỡng, lịch khám thai từng giai đoạn.",
    type: "pdf",
    pages: 120
  },
  {
    title: "Bộ thẻ Flashcard chủ đề Động vật (In màu)",
    desc: "File thiết kế chuẩn Glenn Doman, song ngữ Anh - Việt, hình ảnh sắc nét.",
    type: "pdf",
    pages: 50
  },
  {
    title: "Tuyển tập 50 bài hát ru con Bắc Bộ (Mp3)",
    desc: "File âm thanh chất lượng cao, giọng ru ngọt ngào giúp bé dễ đi vào giấc ngủ.",
    type: "mp3",
    pages: 0
  },
  {
    title: "Thực đơn Eat Clean cho mẹ sau sinh (Word)",
    desc: "Lộ trình ăn uống giúp mẹ về dáng nhanh mà vẫn đủ sữa cho con bú.",
    type: "docx",
    pages: 15
  },
  {
    title: "Đề thi thử Toán vào lớp 10 các trường Chuyên (Có đáp án)",
    desc: "Bộ đề tổng hợp từ các trường chuyên Hà Nội, TP.HCM năm 2024.",
    type: "pdf",
    pages: 10
  }
];

// --- 2. HELPERS ---

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Hàm tạo slug chuẩn SEO
const createSlug = (str: string) => {
  if (!str) return `no-title-${Date.now()}`;
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/([^0-9a-z-\s])/g, "")
    .replace(/(\s+)/g, "-")
    .replace(/^-+|-+$/g, "") + "-" + Date.now();
};

// Hàm Log an toàn (Chống lỗi 't is not a function')
const safeLog = (logger: ((msg: string) => void) | undefined, message: string) => {
    if (typeof logger === 'function') {
        logger(message);
    } else {
        console.log(message);
    }
};

// --- 3. CORE FUNCTIONS ---

// === HÀM 1: TẠO BLOG (Vào collection: blogPosts) ===
export const generateFakeBlogs = async (onLog?: (msg: string) => void) => {
  if (!db) return;
  
  // Kiểm tra Auth
  const auth = getAuth();
  if (!auth.currentUser) {
      safeLog(onLog, "❌ Lỗi: Bạn chưa đăng nhập Admin.");
      return;
  }

  safeLog(onLog, "🚀 Bắt đầu sinh Blog...");

  try {
      // 1. Lấy danh sách Expert thật từ DB
      const expertsQuery = query(collection(db, 'users'), where('isExpert', '==', true));
      const expertsSnapshot = await getDocs(expertsQuery);
      
      // Fallback: Nếu không có expert, dùng chính Admin
      const experts = expertsSnapshot.empty 
          ? [{ id: auth.currentUser.uid, name: auth.currentUser.displayName || "Admin", avatar: auth.currentUser.photoURL || "" }] 
          : expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // 2. Tạo Categories (blogCategories) - Cố định
      const batchCat = writeBatch(db);
      const catList = [
          { id: 'cat_blog_suckhoe', name: "Sức khỏe", slug: "suc-khoe" },
          { id: 'cat_blog_dinhduong', name: "Dinh dưỡng", slug: "dinh-duong" },
          { id: 'cat_blog_giaoduc', name: "Giáo dục", slug: "giao-duc" }
      ];
      
      for (const cat of catList) {
          batchCat.set(doc(db, 'blogCategories', cat.id), { ...cat, createdAt: serverTimestamp() });
      }
      await batchCat.commit();

      // 3. Tạo Blog Posts
      const batchData = writeBatch(db);
      for (let i = 0; i < 15; i++) {
        const expert = getRandomItem(experts);
        const template = getRandomItem(BLOG_DATASET);
        const cat = getRandomItem(catList);
        
        const blogId = `seed_blog_${Date.now()}_${i}`;
        const title = `${template.title} #${i + 1}`;

        batchData.set(doc(db, 'blogPosts', blogId), {
          id: blogId,
          title: title,
          slug: createSlug(title),
          summary: template.summary,
          content: template.content,
          thumbnail: `https://picsum.photos/seed/blog${i}/600/400`,
          
          // QUAN TRỌNG: Lưu đầy đủ object author để tránh trắng trang
          authorId: expert.id, 
          author: {
              id: expert.id,
              name: expert.name || "Chuyên gia",
              avatar: expert.avatar || "",
              isExpert: true
          },

          // QUAN TRỌNG: Lưu đầy đủ object category
          categoryId: cat.id,
          category: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug
          },

          views: getRandomInt(100, 5000),
          commentCount: getRandomInt(0, 20),
          tags: template.tags,
          isPublished: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          isFake: true
        });
      }

      await batchData.commit();
      safeLog(onLog, "✅ Đã tạo xong 15 bài Blog (Collection: blogPosts).");
      
  } catch (error: any) {
      safeLog(onLog, `❌ Lỗi Blog: ${error.message}`);
  }
};

// === HÀM 2: TẠO DOCUMENTS (Vào collection: documents) ===
export const generateFakeDocuments = async (onLog?: (msg: string) => void) => {
  if (!db) return;
  const auth = getAuth();
  if (!auth.currentUser) {
      safeLog(onLog, "❌ Lỗi: Chưa đăng nhập Admin.");
      return;
  }

  safeLog(onLog, "🚀 Bắt đầu sinh Tài liệu...");

  try {
      // 1. Lấy Expert
      const expertsQuery = query(collection(db, 'users'), where('isExpert', '==', true));
      const expertsSnapshot = await getDocs(expertsQuery);
      const experts = expertsSnapshot.empty 
          ? [{ id: auth.currentUser.uid, name: auth.currentUser.displayName, avatar: auth.currentUser.photoURL }] 
          : expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // 2. Tạo Category (documentCategories)
      const batchCat = writeBatch(db);
      const catList = [
        { id: 'cat_doc_tailieu', name: "Tài liệu học tập", slug: "tai-lieu" },
        { id: 'cat_doc_ebook', name: "Ebook - Sách", slug: "ebook" },
        { id: 'cat_doc_media', name: "Âm nhạc & Video", slug: "media" }
      ];
      for (const cat of catList) {
          batchCat.set(doc(db, 'documentCategories', cat.id), { ...cat, createdAt: serverTimestamp() });
      }
      await batchCat.commit();

      // 3. Tạo Documents
      const batchData = writeBatch(db);
      for (let i = 0; i < 15; i++) {
        const expert = getRandomItem(experts);
        const template = getRandomItem(DOC_DATASET);
        const cat = getRandomItem(catList);
        
        const docId = `seed_doc_${Date.now()}_${i}`;
        const title = `${template.title} #${i + 1}`;

        batchData.set(doc(db, 'documents', docId), {
          id: docId,
          title: title,
          description: template.desc,
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          thumbnail: `https://picsum.photos/seed/doc${i}/300/400`,
          fileType: template.type,
          price: Math.random() > 0.7 ? getRandomInt(10, 50) : 0,
          
          // QUAN TRỌNG: Author Object đầy đủ
          authorId: expert.id,
          author: {
              id: expert.id,
              name: expert.name || "Expert",
              avatar: expert.avatar || "",
              isExpert: true
          },
          
          // QUAN TRỌNG: Category Object đầy đủ
          categoryId: cat.id,
          category: {
              id: cat.id,
              name: cat.name,
              slug: cat.slug
          },

          downloads: getRandomInt(10, 200),
          views: getRandomInt(50, 1000),
          rating: getRandomInt(4, 5),
          ratingCount: getRandomInt(1, 15),
          pages: template.pages,
          isApproved: true,
          createdAt: serverTimestamp(),
          isFake: true
        });
      }

      await batchData.commit();
      safeLog(onLog, "✅ Đã tạo xong 15 Tài liệu (Collection: documents).");

  } catch (error: any) {
      if (error.code === 'permission-denied') {
          safeLog(onLog, "❌ LỖI QUYỀN: Cần Admin để tạo tài liệu cho người khác.");
      } else {
          safeLog(onLog, `❌ Lỗi Docs: ${error.message}`);
      }
  }
};

// === HÀM 3: XÓA DỮ LIỆU ===
export const clearFakeBlogDocs = async (onLog?: (msg: string) => void) => {
  if (!db) return;

  try {
      safeLog(onLog, "🗑 Đang xóa Blog & Tài liệu giả...");
      const batch = writeBatch(db);
      let count = 0;

      // Xóa Blog
      const bQuery = query(collection(db, 'blogPosts'), where('isFake', '==', true));
      const bSnap = await getDocs(bQuery);
      bSnap.forEach(d => { batch.delete(d.ref); count++; });

      // Xóa Docs
      const dQuery = query(collection(db, 'documents'), where('isFake', '==', true));
      const dSnap = await getDocs(dQuery);
      dSnap.forEach(d => { batch.delete(d.ref); count++; });

      if (count > 0) {
          await batch.commit();
          safeLog(onLog, `✨ Đã xóa ${count} mục.`);
      } else {
          safeLog(onLog, "ℹ️ Không tìm thấy dữ liệu giả.");
      }
  } catch (error: any) {
      safeLog(onLog, `❌ Lỗi xóa: ${error.message}`);
  }
};
