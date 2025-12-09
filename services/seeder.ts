
import { collection, writeBatch, doc, getDocs, query, where, DocumentReference } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, Answer, CATEGORIES } from '../types';

// --- DATASETS ---

const FIRST_NAMES = [
  "An", "Bình", "Chi", "Dũng", "Giang", "Hân", "Khánh", "Lan", "Minh", "Nam",
  "Nga", "Phúc", "Quân", "Thảo", "Tùng", "Uyên", "Vân", "Yến", "Hương", "Hòa"
];
const MIDDLE_NAMES = ["Thị", "Văn", "Đức", "Ngọc", "Minh", "Thu", "Hoàng", "Thanh", "Bảo", "Gia"];
const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng"];

const SAMPLE_TITLES: Record<string, string[]> = {
  "Mang thai": [
    "Mang thai 3 tháng đầu nên ăn gì?",
    "Bị nghén nặng quá phải làm sao các mẹ ơi?",
    "Dấu hiệu chuyển dạ sớm là gì?",
    "Có nên uống nước dừa khi mang thai tháng cuối?",
    "Lịch khám thai định kỳ chuẩn nhất"
  ],
  "Dinh dưỡng": [
    "Bé 6 tháng ăn dặm kiểu Nhật hay BLW?",
    "Thực đơn tăng cân cho bé suy dinh dưỡng",
    "Bé không chịu ăn rau, mẹ stress quá",
    "Cách nấu cháo yến mạch cho bé",
    "Sữa công thức nào tốt cho tiêu hóa?"
  ],
  "Sức khỏe": [
    "Bé bị sốt mọc răng, xử lý thế nào?",
    "Trẻ bị ho có đờm lâu ngày không khỏi",
    "Cách trị rôm sảy mùa hè cho bé",
    "Bé hay bị táo bón, xin kinh nghiệm",
    "Lịch tiêm chủng mở rộng cho trẻ dưới 1 tuổi"
  ],
  "Gia đình": [
    "Làm sao để cân bằng giữa công việc và chăm con?",
    "Chồng không phụ giúp việc nhà, buồn quá",
    "Mẹ chồng nàng dâu và chuyện chăm cháu",
    "Kinh nghiệm quản lý tài chính khi có con nhỏ",
    "Chuẩn bị tâm lý cho bé lớn khi có em"
  ]
};

const SAMPLE_CONTENTS = [
  "Như tiêu đề ạ, các mẹ có kinh nghiệm chia sẻ giúp em với. Em lo lắng quá.",
  "Em mới làm mẹ lần đầu nên bỡ ngỡ lắm. Mong các chị đi trước chỉ bảo.",
  "Bé nhà em dạo này cứ quấy khóc đêm, em mất ngủ mấy hôm nay rồi.",
  "Em đã thử nhiều cách mà không được, có mẹ nào từng gặp trường hợp này chưa?",
  "Xin review chân thực từ các mẹ ạ. Em cảm ơn nhiều."
];

const SAMPLE_ANSWERS = [
  "Mẹ đừng lo quá nhé, hồi mình cũng bị y hệt, tầm vài tuần là hết à.",
  "Mình hay dùng cách dân gian này thấy hiệu quả lắm, mom thử xem sao.",
  "Nên đi khám bác sĩ cho chắc mom ạ, đừng tự chữa ở nhà.",
  "Đồng cảm với mom, giai đoạn này vất vả lắm, cố lên nhé!",
  "Cái này tùy cơ địa từng bé nữa, mom theo dõi thêm xem sao.",
  "Mom inbox mình chỉ chỗ mua thuốc này tốt lắm.",
  "Chuẩn luôn, mình cũng nghĩ như bạn ở trên.",
  "Cảm ơn bài viết hữu ích của mom.",
  "Hóng kinh nghiệm từ các mẹ thông thái.",
  "Mình thấy uống nhiều nước ấm cũng đỡ đấy ạ."
];

// --- HELPERS ---

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateName = () => {
  return `${getRandomItem(LAST_NAMES)} ${getRandomItem(MIDDLE_NAMES)} ${getRandomItem(FIRST_NAMES)}`;
};

const generateAvatar = (seed: string) => {
  // Using DiceBear for consistent avatars
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

// --- CORE FUNCTIONS ---

export const generateFakeUsers = async (count: number, onLog: (msg: string) => void): Promise<User[]> => {
  if (!db) return [];
  const users: User[] = [];
  const batchSize = 400; 
  let batch = writeBatch(db);
  let batchCount = 0;

  for (let i = 0; i < count; i++) {
    const uid = `fake_user_${Date.now()}_${i}`;
    const name = generateName();
    
    const user: User = {
      id: uid,
      name: name,
      avatar: generateAvatar(uid),
      email: `fake.${uid}@example.com`,
      isExpert: Math.random() > 0.9, // 10% chance to be expert
      expertStatus: 'none',
      isAdmin: false,
      isBanned: false,
      bio: "Tài khoản trải nghiệm (Demo)",
      points: getRandomInt(0, 500),
      joinedAt: new Date().toISOString(),
      isFake: true
    };

    if (user.isExpert) {
        user.expertStatus = 'approved';
        user.specialty = getRandomItem(["Bác sĩ Nhi", "Chuyên gia Dinh dưỡng", "Giáo dục sớm"]);
    }

    const ref = doc(db, 'users', uid);
    batch.set(ref, user);
    users.push(user);
    batchCount++;

    if (batchCount >= batchSize) {
      await batch.commit();
      onLog(`✅ Đã lưu ${i + 1}/${count} user...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  
  onLog(`🎉 Đã tạo xong ${users.length} user giả.`);
  return users;
};

export const generateFakeContent = async (
  fakeUsers: User[], 
  questionsPerCat: number, 
  answersPerQuestion: number,
  onLog: (msg: string) => void
) => {
  if (!db) return;
  if (fakeUsers.length === 0) {
      onLog("❌ Không có user giả để tạo nội dung.");
      return;
  }

  const batchSize = 400;
  let batch = writeBatch(db);
  let opCount = 0;
  let qCountTotal = 0;

  for (const cat of CATEGORIES) {
    onLog(`👉 Đang tạo dữ liệu cho chủ đề: ${cat}...`);
    
    // Fallback titles if specific category mapping missing
    const titles = SAMPLE_TITLES[cat] || SAMPLE_TITLES["Gia đình"]; 

    for (let i = 0; i < questionsPerCat; i++) {
      const author = getRandomItem(fakeUsers);
      const qId = `fake_q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create Answers first
      const answers: Answer[] = [];
      const numAnswers = getRandomInt(Math.floor(answersPerQuestion/2), answersPerQuestion);
      
      for (let j = 0; j < numAnswers; j++) {
        const ansAuthor = getRandomItem(fakeUsers);
        // Ensure answer author != question author (simple check)
        if (ansAuthor.id === author.id) continue;

        answers.push({
          id: `fake_a_${Date.now()}_${j}_${Math.random().toString(36).substr(2, 5)}`,
          questionId: qId,
          author: ansAuthor,
          content: getRandomItem(SAMPLE_ANSWERS),
          likes: getRandomInt(0, 50),
          isBestAnswer: false, // Could randomize this later
          isExpertVerified: ansAuthor.isExpert && Math.random() > 0.7,
          createdAt: new Date(Date.now() - getRandomInt(0, 86400000 * 30)).toISOString(), // Random time last 30 days
          isAi: false,
          isFake: true
        });
      }

      // Create Question
      const question: Question = {
        id: qId,
        title: getRandomItem(titles),
        content: getRandomItem(SAMPLE_CONTENTS),
        category: cat,
        author: author,
        answers: answers,
        likes: getRandomInt(0, 100),
        views: getRandomInt(100, 5000),
        createdAt: new Date(Date.now() - getRandomInt(86400000, 86400000 * 60)).toISOString(),
        isFake: true
      };

      const qRef = doc(db, 'questions', qId);
      batch.set(qRef, question);
      opCount++;
      qCountTotal++;

      if (opCount >= batchSize) {
        await batch.commit();
        onLog(`   💾 Đã lưu batch ${opCount} operations...`);
        batch = writeBatch(db);
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
  onLog(`✨ Hoàn tất! Tổng cộng ${qCountTotal} câu hỏi được tạo.`);
};

export const clearFakeData = async (onLog: (msg: string) => void) => {
  if (!db) return;
  const batchSize = 400;

  // 1. Delete Questions
  onLog("🗑 Đang xóa câu hỏi giả...");
  const qQuery = query(collection(db, 'questions'), where('isFake', '==', true));
  const qSnap = await getDocs(qQuery);
  
  const chunks = [];
  for (let i = 0; i < qSnap.docs.length; i += batchSize) {
      chunks.push(qSnap.docs.slice(i, i + batchSize));
  }

  for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      onLog(`   - Đã xóa ${chunk.length} câu hỏi.`);
  }

  // 2. Delete Users
  onLog("🗑 Đang xóa người dùng giả...");
  const uQuery = query(collection(db, 'users'), where('isFake', '==', true));
  const uSnap = await getDocs(uQuery);
  
  const uChunks = [];
  for (let i = 0; i < uSnap.docs.length; i += batchSize) {
      uChunks.push(uSnap.docs.slice(i, i + batchSize));
  }

  for (const chunk of uChunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      onLog(`   - Đã xóa ${chunk.length} user.`);
  }

  onLog("✨ Đã dọn dẹp sạch sẽ dữ liệu giả!");
};
