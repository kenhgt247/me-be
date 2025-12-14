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

// --- 1. DATASETS ---
const BLOG_DATASET = [
  {
    title: "Bí quyết giúp trẻ sơ sinh ngủ xuyên đêm",
    summary: "Phương pháp Easy và cách rèn nếp sinh hoạt cho bé từ 0-12 tháng.",
    content: "<p>Giấc ngủ của trẻ sơ sinh luôn là nỗi ám ảnh của các mẹ bỉm sữa...</p>",
    tags: ["Giấc ngủ", "Trẻ sơ sinh"]
  },
  {
    title: "Thực đơn ăn dặm kiểu Nhật cho bé 6 tháng",
    summary: "Gợi ý 30 món ăn dặm giàu dinh dưỡng, dễ làm.",
    content: "<p>Ăn dặm kiểu Nhật chú trọng vào việc giữ nguyên hương vị tự nhiên...</p>",
    tags: ["Ăn dặm", "Dinh dưỡng"]
  },
  {
    title: "Dấu hiệu nhận biết sớm bệnh tay chân miệng",
    summary: "Cách phân biệt ban tay chân miệng và thủy đậu.",
    content: "<p>Bệnh tay chân miệng thường bùng phát vào mùa hè...</p>",
    tags: ["Sức khỏe", "Bệnh trẻ em"]
  },
  {
    title: "Review các loại bỉm mỏng, thấm hút tốt",
    summary: "So sánh ưu nhược điểm của Merries, Moony, Bobby.",
    content: "<p>Mùa hè nóng bức, việc chọn bỉm mỏng nhẹ là ưu tiên hàng đầu...</p>",
    tags: ["Review", "Mẹ và bé"]
  },
  {
    title: "Giáo dục sớm: Dạy trẻ học nói qua thẻ Flashcard",
    summary: "Phương pháp Glenn Doman có thực sự hiệu quả?",
    content: "<p>Flashcard là công cụ tuyệt vời để kích thích não phải...</p>",
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

const createSlug = (str: string) => {
  if (!str) return `no-title-${Date.now()}`;
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d").replace(/([^0-9a-z-\s])/g, "").replace(/(\s+)/g, "-").replace(/^-+|-+$/g, "") + "-" + Date.now();
};

// --- 3. EXPORTED FUNCTIONS ---

// === HÀM 1: TẠO BLOG ===
export const generateFakeBlogs = async (onLog?: (msg: string) => void) => {
  // FIX LỖI T IS NOT A FUNCTION: Nếu onLog bị null/undefined, dùng console.log thay thế
  const log = (msg: string) => {
      if (typeof onLog === 'function') {
          onLog(msg);
      } else {
          console.log(msg);
      }
  };

  if (!db) {
      log("❌ Lỗi: Không kết nối được Firestore.");
      return;
  }
  
  const auth = getAuth();
  if (!auth.currentUser) {
      log("❌ Lỗi: Bạn chưa đăng nhập Admin!");
      return;
  }

  log("🚀 Bắt đầu sinh Blog...");

  try {
      const expertsQuery = query(collection(db, 'users'), where('isExpert', '==', true));
      const expertsSnapshot = await getDocs(expertsQuery);
      
      const experts = expertsSnapshot.empty 
          ? [{ id: auth.currentUser.uid, name: auth.currentUser.displayName, avatar: auth.currentUser.photoURL }] 
          : expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      const batchCat = writeBatch(db);
      const blogCatIds = ['cat_blog_suckhoe', 'cat_blog_dinhduong', 'cat_blog_giaoduc'];
      
      batchCat.set(doc(db, 'blogCategories', 'cat_blog_suckhoe'), { name: "Sức khỏe", slug: "suc-khoe" });
      batchCat.set(doc(db, 'blogCategories', 'cat_blog_dinhduong'), { name: "Dinh dưỡng", slug: "dinh-duong" });
      batchCat.set(doc(db, 'blogCategories', 'cat_blog_giaoduc'), { name: "Giáo dục", slug: "giao-duc" });
      await batchCat.commit();

      const batchData = writeBatch(db);
      for (let i = 0; i < 10; i++) {
        const expert = getRandomItem(experts);
        const template = getRandomItem(BLOG_DATASET);
        const blogId = `seed_blog_${Date.now()}_${i}`;
        const title = `${template.title} #${i + 1}`;

        batchData.set(doc(db, 'blogPosts', blogId), {
          id: blogId,
          title: title,
          slug: createSlug(title),
          summary: template.summary,
          content: template.content,
          thumbnail: `https://picsum.photos/seed/blog${i}/600/400`,
          authorId: expert.id,
          authorName: expert.name || "Chuyên gia",
          authorAvatar: expert.avatar || "",
          categoryId: getRandomItem(blogCatIds),
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
      log("✅ Đã tạo xong 10 bài Blog.");
      
  } catch (error: any) {
      log(`❌ Lỗi Blog: ${error.message}`);
  }
};

// === HÀM 2: TẠO DOCUMENTS ===
export const generateFakeDocuments = async (onLog?: (msg: string) => void) => {
  const log = (msg: string) => {
      if (typeof onLog === 'function') {
          onLog(msg);
      } else {
          console.log(msg);
      }
  };
  
  if (!db) return;
  const auth = getAuth();
  if (!auth.currentUser) {
      log("❌ Lỗi: Bạn chưa đăng nhập Admin!");
      return;
  }

  log("🚀 Bắt đầu sinh Tài liệu...");

  try {
      const expertsQuery = query(collection(db, 'users'), where('isExpert', '==', true));
      const expertsSnapshot = await getDocs(expertsQuery);
      
      const experts = expertsSnapshot.empty 
          ? [{ id: auth.currentUser.uid, name: auth.currentUser.displayName, avatar: auth.currentUser.photoURL }] 
          : expertsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      const batchCat = writeBatch(db);
      const docCatIds = ['cat_doc_tailieu', 'cat_doc_ebook', 'cat_doc_media'];
      
      const categories = [
        { id: 'cat_doc_tailieu', name: "Tài liệu học tập", slug: "tai-lieu" },
        { id: 'cat_doc_ebook', name: "Ebook - Sách", slug: "ebook" },
        { id: 'cat_doc_media', name: "Âm nhạc & Video", slug: "media" }
      ];

      categories.forEach(cat => {
          batchCat.set(doc(db, 'documentCategories', cat.id), cat);
      });
      await batchCat.commit();

      const batchData = writeBatch(db);
      for (let i = 0; i < 10; i++) {
        const expert = getRandomItem(experts);
        const template = getRandomItem(DOC_DATASET);
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
          authorId: expert.id,
          authorName: expert.name || "Expert",
          authorAvatar: expert.avatar || "",
          categoryId: getRandomItem(docCatIds),
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
      log("✅ Đã tạo xong 10 Tài liệu.");

  } catch (error: any) {
      if (error.code === 'permission-denied') {
          log("❌ LỖI QUYỀN: Cần Admin mới được tạo tài liệu cho người khác.");
      } else {
          log(`❌ Lỗi Docs: ${error.message}`);
      }
  }
};

// === HÀM 3: XÓA DỮ LIỆU ===
export const clearFakeBlogDocs = async (onLog?: (msg: string) => void) => {
  const log = (msg: string) => {
      if (typeof onLog === 'function') {
          onLog(msg);
      } else {
          console.log(msg);
      }
  };
  if (!db) return;

  try {
      log("🗑 Đang xóa...");
      const batch = writeBatch(db);
      let count = 0;

      const bQuery = query(collection(db, 'blogPosts'), where('isFake', '==', true));
      const bSnap = await getDocs(bQuery);
      bSnap.forEach(d => { batch.delete(d.ref); count++; });

      const dQuery = query(collection(db, 'documents'), where('isFake', '==', true));
      const dSnap = await getDocs(dQuery);
      dSnap.forEach(d => { batch.delete(d.ref); count++; });

      if (count > 0) {
          await batch.commit();
          log(`✨ Đã xóa ${count} mục.`);
      } else {
          log("ℹ️ Không có gì để xóa.");
      }
  } catch (error: any) {
      log(`❌ Lỗi xóa: ${error.message}`);
  }
};
