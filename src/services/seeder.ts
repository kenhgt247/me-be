import { 
  collection, 
  writeBatch, 
  doc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
// Đảm bảo bạn có file types.ts hoặc thay thế bằng 'any' nếu lười
import { User, Question, Answer } from '../types'; 

// =========================================================================
// 1. NGÂN HÀNG DỮ LIỆU (RICH DATASETS) - CHUẨN VIỆT NAM
// =========================================================================

const EXPERT_PROFILES = [
  { name: "BS.CKII Nguyễn Văn Chương", title: "Trưởng khoa Nhi - BV Nhi TW", bio: "25 năm kinh nghiệm điều trị bệnh lý hô hấp và tiêu hóa nhi.", gender: 'male' },
  { name: "ThS.BS Lê Thị Lan", title: "Viện Dinh dưỡng Quốc gia", bio: "Chuyên gia tư vấn xây dựng thực đơn, tháp dinh dưỡng cho trẻ biếng ăn.", gender: 'female' },
  { name: "BS. Trần Thu Hà", title: "Sản phụ khoa - BV Từ Dũ", bio: "Đồng hành cùng mẹ bầu thai kỳ an toàn, chuyên sâu về sàng lọc trước sinh.", gender: 'female' },
  { name: "Cô giáo Minh Anh", title: "Chuyên gia Montessori", bio: "Hiệu trưởng hệ thống mầm non quốc tế, tư vấn tâm lý và giáo dục sớm.", gender: 'female' },
  { name: "DS. Phạm Thanh Bình", title: "Dược sĩ Lâm sàng", bio: "Tư vấn sử dụng thuốc an toàn, hạn chế kháng sinh cho mẹ và bé.", gender: 'male' }
];

const USER_NAMES = [
  "Mẹ Bắp 🌽", "Mẹ Sóc Nâu", "Mẹ Cua Càng", "Mẹ Gấu Béo", "Mẹ Xoài Non", 
  "Minh Thư (Mẹ Hổ)", "Ngọc Mai 9x", "Thanh Tâm", "Hồng Nhung", "Phương Thảo",
  "Bố Bỉm Sữa", "Ba Gạo", "Hoàng Bách", "Tuấn Hưng", "Mẹ Kem Dâu"
];

// Dữ liệu câu hỏi có chiều sâu
const RICH_CONTENT_DATABASE: Record<string, any[]> = {
  "Sức khỏe": [
    {
      titles: ["Bé sốt 39 độ, chân tay lạnh ngắt, đầu nóng ran phải làm sao?", "Sốt cao co giật: Dấu hiệu và cách sơ cứu gấp?"],
      contents: ["Các mẹ ơi cứu em với! Bé nhà em 18 tháng, sốt đùng đùng 39.5 độ đo nách. Trán và người thì nóng hầm hập mà chân tay lại tím tái, lạnh ngắt. Em sợ con co giật quá. Đã uống hạ sốt Hapacol được 30 phút mà chưa hạ. Giờ có nên ủ ấm chân hay chườm mát không ạ? Em rối quá!"],
      answers: {
        expert: [
          "Chào mẹ. Đây là hiện tượng sốt cao gây co mạch ngoại vi, là dấu hiệu báo trước nguy cơ sốt cao co giật.\n\n**HƯỚNG DẪN XỬ LÝ NGAY:**\n1. **Tuyệt đối KHÔNG ủ ấm**, không đi tất. Cần nới lỏng quần áo thoáng mát.\n2. Lấy khăn ấm (nhiệt độ 37 độ) lau vào 5 vị trí: Trán, 2 nách, 2 bẹn. Lau liên tục 15 phút.\n3. Nếu quá 1 tiếng không hạ hoặc bé lờ đờ, cần đưa bé đi viện ngay.\n\n*BS. Chương - Khoa Nhi.*"
        ],
        user: [
          "Nguy hiểm lắm mom ơi, chân tay lạnh là nhiệt độ bên trong đang tăng cao đấy. Lau nách bẹn ngay đi.",
          "Đi viện ngay đi, con mình hồi trước cũng y chang, suýt co giật."
        ]
      }
    },
    {
      titles: ["Bé bị nôn trớ liên tục sau khi ăn, có phải trào ngược không?", "Phân biệt nôn trớ sinh lý và bệnh lý"],
      contents: ["Bé nhà mình 2 tháng tuổi, cứ ăn xong là trớ ra sữa vón cục, đôi khi ộc ra cả đường mũi. Mình đã vỗ ợ hơi kỹ rồi mà vẫn bị. Bé vẫn tăng cân đều nhưng mình lo quá. Có cần đi siêu âm dạ dày không ạ?"],
      answers: {
        expert: [
          "Chào bạn. Nếu bé vẫn vui vẻ, tăng cân tốt thì khả năng cao là **Trào ngược dạ dày thực quản sinh lý**.\n\n**LỜI KHUYÊN:**\n- Chia nhỏ cữ bú.\n- Sau khi bú, bế đứng bé 20-30 phút, vỗ ợ hơi.\n- Kê cao đầu giường 30 độ khi ngủ.\n- Nếu bé nôn ra dịch xanh/vàng hoặc sụt cân thì mới cần đi viện nhé."
        ],
        user: [
          "Bé nhà mình hồi 3 tháng cũng thế, lớn lên tự hết thôi mom. Mua cái gối chống trào ngược cho con nằm đỡ hẳn đấy.",
          "Cẩn thận hẹp môn vị nha, mom để ý xem con có nôn vọt thành tia không."
        ]
      }
    }
  ],
  "Dinh dưỡng": [
    {
        titles: ["Bé 6 tháng nên ăn dặm kiểu Nhật hay BLW?", "Thực đơn ăn dặm cho bé mới bắt đầu"],
        contents: ["Bé nhà em sắp tròn 6 tháng, em đang phân vân giữa ăn dặm truyền thống, kiểu Nhật (ADKN) và Tự chỉ huy (BLW). Bà nội thì muốn cho ăn bột, nhưng em muốn con tự lập. Mẹ nào có kinh nghiệm chia sẻ ưu nhược điểm với ạ?"],
        answers: {
            expert: ["Mỗi phương pháp đều có ưu điểm. BLW giúp bé kỹ năng tốt nhưng dễ hóc. ADKN giúp bé cảm nhận mùi vị tốt. Bạn có thể kết hợp: Bữa chính ăn đút, bữa phụ ăn bốc."],
            user: ["Vote BLW nhé, con mình 8 tháng gặm đùi gà nhoay nhoáy, đi đâu cũng nhàn."]
        }
    }
  ]
};

// =========================================================================
// 2. HELPERS (TIỆN ÍCH)
// =========================================================================

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Tạo ngày ngẫu nhiên trong quá khứ (để timeline nhìn thật hơn)
const getRandomDate = (daysAgo: number) => {
    const date = new Date();
    date.setDate(date.getDate() - getRandomInt(0, daysAgo));
    date.setHours(getRandomInt(7, 22), getRandomInt(0, 59)); // Giờ hoạt động từ 7h sáng đến 10h tối
    return date.toISOString();
};

const generateAvatar = (gender: 'male' | 'female') => {
  const seed = Math.random().toString(36).substring(7);
  const style = gender === 'male' ? 'avataaars' : 'adventurer'; 
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffdfbf`;
};

// =========================================================================
// 3. CORE FUNCTIONS (HÀM XỬ LÝ CHÍNH)
// =========================================================================

export const generateFakeUsers = async (count: number, onLog: (msg: string) => void): Promise<User[]> => {
  if (!db) return [];
  const users: User[] = [];
  const batchSize = 400; 
  let batch = writeBatch(db);
  let batchCount = 0;

  onLog("🚀 Đang khởi tạo hồ sơ người dùng (Real IDs)...");

  // 1. TẠO EXPERT USERS (User Vip)
  for (const expert of EXPERT_PROFILES) {
    // TỰ SINH ID THẬT CỦA FIRESTORE
    const userRef = doc(collection(db, 'users'));
    const realId = userRef.id;

    const user: User = {
      id: realId,
      name: expert.name,
      avatar: generateAvatar(expert.gender as any),
      email: `expert.${realId.substring(0,5)}@asking.vn`,
      isExpert: true,
      expertStatus: 'approved',
      specialty: expert.title,
      isAdmin: false,
      isBanned: false,
      bio: expert.bio,
      points: getRandomInt(5000, 20000), // Điểm cao
      joinedAt: getRandomDate(365 * 2), // Tham gia từ 2 năm trước
      isFake: true, // Cờ ẩn để xóa sau này
      followers: [],
      following: []
    } as any;
    
    batch.set(userRef, user);
    users.push(user);
    batchCount++;
  }

  // 2. TẠO REGULAR USERS (User Thường)
  for (let i = 0; i < count; i++) {
    const userRef = doc(collection(db, 'users'));
    const realId = userRef.id;
    const nameSeed = getRandomItem(USER_NAMES);
    
    const user: User = {
      id: realId,
      name: `${nameSeed} ${getRandomInt(1, 99)}`, // Thêm số nhỏ để tránh trùng tên hoàn toàn
      avatar: generateAvatar('female'),
      email: `user.${realId.substring(0,6)}@gmail.com`,
      isExpert: false,
      expertStatus: 'none',
      isAdmin: false,
      isBanned: false,
      bio: "Mẹ bỉm sữa, yêu con và thích chia sẻ.",
      points: getRandomInt(10, 500),
      joinedAt: getRandomDate(180), // Tham gia trong 6 tháng gần đây
      isFake: true, // Cờ ẩn
      followers: [],
      following: []
    } as any;

    batch.set(userRef, user);
    users.push(user);
    batchCount++;

    if (batchCount >= batchSize) {
      await batch.commit();
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) await batch.commit();
  onLog(`✅ Đã tạo xong ${users.length} tài khoản (ID thật, Avatar xịn).`);
  return users;
};

export const generateFakeContent = async (
  fakeUsers: User[], 
  questionsPerCat: number, 
  answersPerQuestion: number,
  onLog: (msg: string) => void
) => {
  if (!db || fakeUsers.length === 0) {
      onLog("❌ Lỗi: Không có dữ liệu User để tạo nội dung.");
      return;
  }

  const experts = fakeUsers.filter(u => u.isExpert);
  const regularUsers = fakeUsers.filter(u => !u.isExpert);
  const batchSize = 400;
  let batch = writeBatch(db);
  let opCount = 0;

  onLog("📝 Đang viết câu hỏi và thảo luận...");

  for (const category of Object.keys(RICH_CONTENT_DATABASE)) {
    const topics = RICH_CONTENT_DATABASE[category];

    for (let i = 0; i < questionsPerCat; i++) {
      const topicTemplate = getRandomItem(topics);
      const author = getRandomItem(regularUsers);
      
      // ID THẬT
      const qRef = doc(collection(db, 'questions'));
      const qId = qRef.id;
      const qDate = getRandomDate(30); // Câu hỏi trong 30 ngày gần đây
      
      const question: Question = {
        id: qId,
        title: getRandomItem(topicTemplate.titles),
        content: getRandomItem(topicTemplate.contents),
        category: category,
        author: author,
        answers: [],
        likes: getRandomInt(5, 150),
        views: getRandomInt(100, 5000),
        createdAt: qDate,
        isFake: true,
        isExpertVerified: false
      } as any;

      // Tạo câu trả lời
      const answers: Answer[] = [];
      const numAnswers = getRandomInt(1, answersPerQuestion);
      const hasExpertAns = Math.random() > 0.4; // 40% cơ hội chuyên gia trả lời

      for (let j = 0; j < numAnswers; j++) {
        let ansAuthor = getRandomItem(regularUsers);
        let ansContent = getRandomItem(topicTemplate.user || topicTemplate.answers.user);
        let isExpertAns = false;

        // Câu trả lời đầu tiên ưu tiên Chuyên gia
        if (j === 0 && hasExpertAns && experts.length > 0) {
           ansAuthor = getRandomItem(experts);
           ansContent = getRandomItem(topicTemplate.expert || topicTemplate.answers.expert);
           isExpertAns = true;
           question.isExpertVerified = true;
        }

        // Tạo ID ngẫu nhiên cho câu trả lời
        const aId = doc(collection(db, 'dummy_coll')).id; 

        answers.push({
          id: aId,
          questionId: qId,
          author: ansAuthor,
          content: ansContent,
          likes: isExpertAns ? getRandomInt(50, 200) : getRandomInt(0, 20),
          isBestAnswer: isExpertAns,
          isExpertVerified: isExpertAns,
          createdAt: new Date(new Date(qDate).getTime() + getRandomInt(300000, 86400000)).toISOString(), // Trả lời sau câu hỏi vài tiếng
          isAi: false,
          isFake: true
        } as any);
      }

      // Sắp xếp: Best Answer lên đầu
      answers.sort((a, b) => (a.isBestAnswer === b.isBestAnswer ? 0 : a.isBestAnswer ? -1 : 1));
      question.answers = answers;

      batch.set(qRef, question);
      opCount++;

      if (opCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        opCount = 0;
      }
    }
  }

  if (opCount > 0) await batch.commit();
  onLog(`✨ HOÀN TẤT! Đã tạo hệ thống Hỏi - Đáp sống động.`);
};

export const clearFakeData = async (onLog: (msg: string) => void) => {
  if (!db) return;
  const batchSize = 400;
  onLog("🗑 Đang quét và xóa dữ liệu mẫu (dựa trên cờ ẩn)...");
  
  const deleteByQuery = async (coll: string) => {
      const q = query(collection(db, coll), where('isFake', '==', true));
      const snap = await getDocs(q);
      const chunks = [];
      for (let i = 0; i < snap.docs.length; i += batchSize) chunks.push(snap.docs.slice(i, i + batchSize));
      for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
      }
      return snap.size;
  }

  const qCount = await deleteByQuery('questions');
  const uCount = await deleteByQuery('users');
  onLog(`✨ Đã dọn dẹp sạch: ${qCount} câu hỏi và ${uCount} tài khoản.`);
};
