import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, BlogPost, Document } from '../types';

// --- 1. DATASET: BLOG CHẤT LƯỢNG CAO (Rich Content) ---
// Dữ liệu này chứa HTML để hiển thị đẹp mắt trên trang chi tiết
const BLOG_TEMPLATES = [
  {
    title: "Lịch tiêm chủng mở rộng và dịch vụ cho bé 0-24 tháng (Cập nhật 2024)",
    excerpt: "Tổng hợp chi tiết các mũi tiêm phòng lao, viêm gan B, 6 trong 1, phế cầu... Ba mẹ lưu lại ngay để không lỡ 'thời điểm vàng' phòng bệnh cho con.",
    category: "Sức khỏe",
    content: `
      <h2>1. Giai đoạn sơ sinh (0 - 1 tháng tuổi)</h2>
      <p>Ngay sau sinh, trẻ cần được tiêm phòng <strong>Lao (BCG)</strong> và <strong>Viêm gan B mũi 0</strong> càng sớm càng tốt (trong vòng 24h đầu sau sinh). Đây là hai mũi tiêm quan trọng khởi đầu hệ miễn dịch cho bé.</p>
      <h2>2. Giai đoạn 2 - 4 tháng tuổi</h2>
      <p>Đây là thời điểm quan trọng để tiêm mũi tổng hợp (6 trong 1 hoặc 5 trong 1) phòng các bệnh:</p>
      <ul>
        <li>Bạch hầu, Ho gà, Uốn ván</li>
        <li>Bại liệt</li>
        <li>Viêm gan B và các bệnh do Hib</li>
      </ul>
      <p>Ngoài ra, mẹ nên bổ sung uống vắc xin phòng tiêu chảy do Rota virus và tiêm Phế cầu khuẩn.</p>
      <h2>3. Lưu ý sau tiêm</h2>
      <p>Trẻ có thể sốt nhẹ 37.5 - 38 độ. Mẹ cần chườm ấm, cho bú nhiều hơn và theo dõi sát sao nhiệt độ của bé.</p>
    `,
    imageKeyword: "vaccination,baby,doctor",
    tags: ["Vắc xin", "Tiêm chủng", "Sức khỏe trẻ em"]
  },
  {
    title: "Phương pháp ăn dặm kiểu Nhật: Thực đơn 30 ngày đầu tiên",
    excerpt: "Ăn dặm kiểu Nhật giúp bé cảm nhận mùi vị nguyên bản, rèn kỹ năng nhai và tính tự lập. Hướng dẫn chi tiết cách nấu cháo rây 1:10.",
    category: "Dinh dưỡng",
    content: `
      <h2>Nguyên tắc cốt lõi</h2>
      <p>Khác với phương pháp truyền thống (nấu hỗn hợp), ăn dặm kiểu Nhật tôn trọng hương vị nguyên bản của thực phẩm. Các món ăn được chế biến riêng biệt (Tinh bột - Đạm - Vitamin).</p>
      <h2>Tuần 1: Làm quen với Cháo trắng</h2>
      <ul>
        <li><strong>Ngày 1-2:</strong> 1 thìa cháo rây tỉ lệ 1:10.</li>
        <li><strong>Ngày 3-4:</strong> Tăng lên 2 thìa.</li>
        <li><strong>Ngày 5-7:</strong> Thêm cà rốt nghiền hoặc bí đỏ nghiền.</li>
      </ul>
      <h2>Lưu ý quan trọng</h2>
      <p>Không ép bé ăn. Giai đoạn này sữa vẫn là chính, ăn dặm chỉ là tập làm quen với thìa và phản xạ nuốt.</p>
    `,
    imageKeyword: "baby,food,eating",
    tags: ["Ăn dặm", "Kiểu Nhật", "Thực đơn"]
  },
  {
    title: "Khủng hoảng ngủ (Sleep Regression) 4 tháng tuổi: Dấu hiệu và giải pháp",
    excerpt: "Con đang ngủ ngoan bỗng nhiên thức dậy nhiều lần trong đêm, gắt ngủ, khó dỗ? Có thể bé đang rơi vào tuần khủng hoảng (Wonder Weeks).",
    category: "Giáo dục",
    content: `
      <h2>Tại sao bé lại khủng hoảng ngủ?</h2>
      <p>Mốc 4 tháng tuổi đánh dấu sự phát triển vượt bậc về nhận thức. Bé bắt đầu nhận ra thế giới xung quanh thú vị hơn giấc ngủ, dẫn đến việc "ham chơi quên ngủ" hoặc sợ bỏ lỡ điều gì đó khi nhắm mắt.</p>
      <h2>Mẹ cần làm gì?</h2>
      <ul>
        <li><strong>Thiết lập trình tự ngủ (Bedtime Routine):</strong> Tắm nước ấm -> Massage -> Đọc truyện/Nghe nhạc -> Tắt đèn.</li>
        <li><strong>Không tạo thói quen xấu:</strong> Hạn chế bế rung hoặc cho bú để ngủ (ti mẹ). Hãy tập cho bé tự trấn an (nút chờ).</li>
        <li><strong>Kiên nhẫn:</strong> Giai đoạn này thường chỉ kéo dài 2-4 tuần.</li>
      </ul>
    `,
    imageKeyword: "baby,sleeping,night",
    tags: ["Giấc ngủ", "Wonder Weeks", "Nuôi dạy con"]
  },
  {
    title: "Trầm cảm sau sinh: Những dấu hiệu 'báo động đỏ' mẹ không nên phớt lờ",
    excerpt: "Mệt mỏi, chán ăn, hay khóc lóc, có suy nghĩ tiêu cực... là những dấu hiệu cần được hỗ trợ y tế ngay lập tức. Mẹ hãy nhớ, mẹ hạnh phúc thì con mới vui vẻ.",
    category: "Gia đình",
    content: `
      <h2>Dấu hiệu nhận biết sớm</h2>
      <p>Rất nhiều mẹ nhầm lẫn giữa "Hội chứng Baby Blues" (buồn chán thoáng qua) và Trầm cảm thực sự.</p>
      <ul>
        <li>Mất ngủ triền miên dù con đã ngủ.</li>
        <li>Cảm thấy tội lỗi, vô dụng, không đủ tốt để làm mẹ.</li>
        <li>Mất kết nối với con, không muốn gần gũi bé.</li>
        <li>Có suy nghĩ làm hại bản thân hoặc con.</li>
      </ul>
      <h2>Lời khuyên từ chuyên gia</h2>
      <p>Hãy chia sẻ ngay với chồng hoặc người thân. Đừng cố gắng gồng mình làm "siêu nhân". Tìm kiếm sự giúp đỡ từ bác sĩ tâm lý là điều cần thiết và dũng cảm.</p>
    `,
    imageKeyword: "mother,sad,depression",
    tags: ["Tâm lý", "Mẹ bỉm sữa", "Sức khỏe tinh thần"]
  },
  {
    title: "Bảng chiều cao cân nặng chuẩn WHO 2024 cho trẻ Việt Nam",
    excerpt: "Con mình có bị suy dinh dưỡng không? Có thừa cân không? Tra cứu ngay bảng chuẩn mới nhất từ Tổ chức Y tế Thế giới.",
    category: "Sức khỏe",
    content: `
      <h2>Cách đọc bảng chỉ số</h2>
      <p>Ba mẹ cần quan tâm đến 3 chỉ số chính: Cân nặng theo tuổi, Chiều cao theo tuổi và Cân nặng theo chiều cao.</p>
      <ul>
        <li><strong>TB (Trung bình):</strong> Bé phát triển bình thường.</li>
        <li><strong>-2SD (Suy dinh dưỡng):</strong> Bé nhẹ cân/thấp còi, cần đi khám dinh dưỡng.</li>
        <li><strong>+2SD (Thừa cân):</strong> Nguy cơ béo phì.</li>
      </ul>
      <p>Lưu ý: Không so sánh con mình với "con nhà người ta", hãy so sánh con với chính biểu đồ tăng trưởng của con qua từng tháng.</p>
    `,
    imageKeyword: "growth,chart,baby,scale",
    tags: ["Tăng trưởng", "WHO", "Chiều cao"]
  },
  {
    title: "Giáo dục sớm Montessori tại nhà cho trẻ 0-3 tuổi",
    excerpt: "Không cần dụng cụ đắt tiền, mẹ có thể áp dụng triết lý Montessori ngay tại nhà để giúp con tự lập và thông minh hơn.",
    category: "Giáo dục",
    content: `
      <h2>Tôn trọng đứa trẻ</h2>
      <p>Montessori tin rằng mỗi đứa trẻ là một cá thể độc lập. Hãy cho con quyền lựa chọn (mặc áo màu gì, chơi đồ chơi nào) trong giới hạn cho phép.</p>
      <h2>Môi trường đã chuẩn bị sẵn (Prepared Environment)</h2>
      <p>Hãy sắp xếp đồ đạc vừa tầm với của bé:</p>
      <ul>
        <li>Kệ sách thấp để bé tự lấy.</li>
        <li>Giường bệt để bé tự leo lên xuống an toàn.</li>
        <li>Góc quần áo để bé tự chọn đồ.</li>
      </ul>
      <p>Mục tiêu cuối cùng là: "Giúp con để con tự làm".</p>
    `,
    imageKeyword: "montessori,toy,playing,kid",
    tags: ["Giáo dục sớm", "Montessori", "Kỹ năng"]
  }
];

// --- 2. DATASET: TÀI LIỆU (Ebooks, Audio) ---
const DOC_TEMPLATES = [
  {
    title: "Ebook: 50 công thức ăn dặm BLW (PDF)",
    description: "Tuyển tập các món ăn chế biến nhanh, đủ chất, trình bày đẹp mắt giúp bé hào hứng ăn thô.",
    fileType: "pdf",
    category: "Dinh dưỡng",
    downloads: 1250,
    link: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" // Link PDF mẫu
  },
  {
    title: "Audio: Tiếng ồn trắng (White Noise) - Tiếng mưa rơi",
    description: "Âm thanh chất lượng cao (320kbps) giúp trấn an trẻ sơ sinh, tái tạo môi trường trong bụng mẹ để bé ngủ sâu giấc.",
    fileType: "mp3",
    category: "Giáo dục",
    downloads: 3400,
    link: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" // Link MP3 mẫu
  },
  {
    title: "Flashcard: Bộ thẻ kích thích thị giác cho trẻ sơ sinh (Đen trắng)",
    description: "File ảnh chất lượng cao. Mẹ in ra giấy cứng và tráo thẻ cho bé nhìn mỗi ngày 3-5 phút để phát triển não phải.",
    fileType: "zip",
    category: "Giáo dục",
    downloads: 890,
    link: "https://file-examples.com/storage/fe555ad8126749bdc772291/2017/02/zip_2MB.zip"
  },
  {
    title: "Checklist: Giỏ đồ đi sinh (Cần chuẩn bị những gì?)",
    description: "Danh sách đầy đủ những vật dụng cần thiết cho Mẹ và Bé khi vào viện. Đừng mang cả thế giới, hãy mang đúng và đủ.",
    fileType: "xlsx",
    category: "Sức khỏe",
    downloads: 560,
    link: "https://file-examples.com/storage/fe555ad8126749bdc772291/2017/02/file_example_XLSX_10.xlsx"
  },
  {
    title: "Cẩm nang sơ cấp cứu trẻ em thường gặp (Bỏng, Hóc dị vật, Sốt cao)",
    description: "Tài liệu y khoa chính thống từ Bệnh viện Nhi. Mỗi gia đình nên in ra và dán ở nơi dễ thấy.",
    fileType: "pdf",
    category: "Sức khỏe",
    downloads: 2100,
    link: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
  }
];

// --- HELPERS ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- HÀM TẠO BLOG (CHỈ DÀNH CHO EXPERT) ---
export const generateFakeBlogs = async (fakeUsers: User[], count: number, onLog: (msg: string) => void) => {
  if (!db) return;
  
  // 1. Lọc chỉ lấy Chuyên gia để làm tác giả
  const experts = fakeUsers.filter(u => u.isExpert);
  if (experts.length === 0) {
    onLog("❌ LỖI: Không tìm thấy Chuyên gia nào. Vui lòng tạo User giả trước!");
    return;
  }

  let batch = writeBatch(db);
  let batchCount = 0;
  let totalCreated = 0;

  for (let i = 0; i < count; i++) {
    const template = getRandomItem(BLOG_TEMPLATES);
    const author = getRandomItem(experts);
    
    // Tạo ID ngẫu nhiên
    const blogId = `seed_blog_${Date.now()}_${i}`;
    
    // Tạo dữ liệu bài viết
    const post: BlogPost = {
      id: blogId,
      title: template.title, // Có thể thêm variation nếu muốn
      slug: `bai-viet-${Date.now()}-${i}`, 
      excerpt: template.excerpt,
      content: template.content, // Nội dung HTML
      // Lấy ảnh ngẫu nhiên đẹp từ LoremFlickr theo từ khóa
      coverImageUrl: `https://loremflickr.com/800/500/${template.imageKeyword}?random=${i}`, 
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatar,
      // Lưu ý: categoryId nên map đúng với danh mục trong hệ thống của bạn (vd: 'suc-khoe', 'dinh-duong')
      // Ở đây ta tạm dùng tên danh mục làm ID hoặc slug hóa nó
      categoryId: template.category, 
      tags: template.tags,
      views: getRandomInt(500, 15000), // View ảo cho đẹp
      isPublished: true,
      createdAt: new Date(Date.now() - getRandomInt(0, 86400000 * 90)).toISOString(), // 90 ngày gần đây
      updatedAt: new Date().toISOString(),
      isFake: true // Cờ đánh dấu để xóa sau này
    };

    const ref = doc(db, 'blog_posts', blogId);
    batch.set(ref, post);
    batchCount++;
    totalCreated++;

    // Firestore giới hạn batch 500 ops, ta để an toàn là 400
    if (batchCount >= 400) {
      await batch.commit();
      onLog(`📝 Đã viết xong ${totalCreated} bài blog chuyên sâu...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  onLog(`✅ HOÀN TẤT: Đã tạo ${totalCreated} bài Blog uy tín bởi các Bác sĩ/Chuyên gia.`);
};

// --- HÀM TẠO TÀI LIỆU (CHỈ DÀNH CHO EXPERT) ---
export const generateFakeDocuments = async (fakeUsers: User[], count: number, onLog: (msg: string) => void) => {
  if (!db) return;

  const experts = fakeUsers.filter(u => u.isExpert);
  if (experts.length === 0) {
    onLog("❌ LỖI: Không tìm thấy Chuyên gia để chia sẻ tài liệu.");
    return;
  }

  let batch = writeBatch(db);
  let batchCount = 0;
  let totalCreated = 0;

  for (let i = 0; i < count; i++) {
    const template = getRandomItem(DOC_TEMPLATES);
    const author = getRandomItem(experts);
    
    const docId = `seed_doc_${Date.now()}_${i}`;

    // Tạo ảnh bìa giả trông giống File Preview
    // Màu nền thay đổi theo loại file
    const bgColor = template.fileType === 'pdf' ? 'e11d48' : template.fileType === 'xlsx' ? '16a34a' : '2563eb';
    const coverUrl = `https://placehold.co/400x560/${bgColor}/ffffff?text=${template.fileType.toUpperCase()}+FILE\n${encodeURIComponent(template.title.substring(0, 10))}...&font=roboto`;

    const document: Document = {
      id: docId,
      title: template.title,
      slug: `tai-lieu-${Date.now()}-${i}`,
      description: template.description,
      fileType: template.fileType as 'pdf' | 'docx' | 'xlsx' | 'mp3' | 'zip',
      fileUrl: template.link, 
      coverUrl: coverUrl,
      categoryId: template.category,
      uploaderId: author.id,
      uploaderName: author.name,
      downloads: template.downloads + getRandomInt(0, 500),
      views: template.downloads * 3 + getRandomInt(100, 1000),
      rating: Number((Math.random() * (5 - 4) + 4).toFixed(1)), // Rating cao 4.0 - 5.0
      isExternal: true,
      createdAt: new Date(Date.now() - getRandomInt(0, 86400000 * 120)).toISOString(),
      isFake: true
    };

    const ref = doc(db, 'documents', docId);
    batch.set(ref, document);
    batchCount++;
    totalCreated++;

    if (batchCount >= 400) {
      await batch.commit();
      onLog(`📚 Đã upload ${totalCreated} tài liệu...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  onLog(`✅ HOÀN TẤT: Đã tạo ${totalCreated} tài liệu chia sẻ từ Chuyên gia.`);
};

// --- HÀM DỌN DẸP (XÓA DATA GIẢ) ---
export const clearFakeBlogDocs = async (onLog: (msg: string) => void) => {
    if (!db) return;
    const batchSize = 400;
  
    // 1. Xóa Blog
    onLog("🗑 Đang xóa Blog giả...");
    const bQuery = query(collection(db, 'blog_posts'), where('isFake', '==', true));
    const bSnap = await getDocs(bQuery);
    
    if (bSnap.empty) {
        onLog("ℹ️ Không tìm thấy Blog giả nào.");
    } else {
        const bChunks = [];
        for (let i = 0; i < bSnap.docs.length; i += batchSize) bChunks.push(bSnap.docs.slice(i, i + batchSize));
        for (const chunk of bChunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            onLog(`   - Đã xóa ${chunk.length} bài viết.`);
        }
    }

    // 2. Xóa Tài liệu
    onLog("🗑 Đang xóa Tài liệu giả...");
    const dQuery = query(collection(db, 'documents'), where('isFake', '==', true));
    const dSnap = await getDocs(dQuery);
    
    if (dSnap.empty) {
        onLog("ℹ️ Không tìm thấy Tài liệu giả nào.");
    } else {
        const dChunks = [];
        for (let i = 0; i < dSnap.docs.length; i += batchSize) dChunks.push(dSnap.docs.slice(i, i + batchSize));
        for (const chunk of dChunks) {
            const batch = writeBatch(db);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            onLog(`   - Đã xóa ${chunk.length} tài liệu.`);
        }
    }

    onLog("✨ Đã dọn sạch Blog & Tài liệu giả!");
};
