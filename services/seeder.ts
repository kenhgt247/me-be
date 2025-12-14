import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, Answer } from '../types';

// --- 1. DATASETS CAO CẤP (RICH DATASETS) ---

// Danh sách chuyên gia uy tín, chức danh rõ ràng
const EXPERT_PROFILES = [
  { name: "BS.CKII Nguyễn Văn Chương", title: "Trưởng khoa Nhi - BV Nhi TW", bio: "25 năm kinh nghiệm điều trị bệnh lý hô hấp và tiêu hóa nhi.", seed: "Felix", gender: 'male' },
  { name: "ThS.BS Lê Thị Lan", title: "Viện Dinh dưỡng Quốc gia", bio: "Chuyên gia tư vấn xây dựng thực đơn, tháp dinh dưỡng cho trẻ biếng ăn, suy dinh dưỡng.", seed: "Aneka", gender: 'female' },
  { name: "BS. Trần Thu Hà", title: "Sản phụ khoa - BV Từ Dũ", bio: "Đồng hành cùng mẹ bầu thai kỳ an toàn, chuyên sâu về sàng lọc trước sinh.", seed: "Liliana", gender: 'female' },
  { name: "Cô giáo Minh Anh", title: "Chuyên gia Montessori", bio: "Hiệu trưởng hệ thống mầm non quốc tế, tư vấn tâm lý và giáo dục sớm.", seed: "Milo", gender: 'female' },
  { name: "DS. Phạm Thanh Bình", title: "Dược sĩ Lâm sàng", bio: "Tư vấn sử dụng thuốc an toàn, hạn chế kháng sinh cho mẹ và bé.", seed: "Jack", gender: 'male' },
  { name: "BS. Tâm lý Hoàng Anh", title: "Chuyên gia Tâm lý", bio: "Điều trị trầm cảm sau sinh và các rối loạn tâm lý ở trẻ nhỏ.", seed: "Bandit", gender: 'male' }
];

// Tên người dùng phong phú, chuẩn "mẹ bỉm sữa"
const MOM_NAMES = [
  "Mẹ Bắp 🌽", "Mẹ Sóc Nâu", "Mẹ Cua Càng", "Mẹ Gấu Béo", "Mẹ Xoài Non", 
  "Mẹ Cherry", "Mẹ Ken (2024)", "Mẹ Shin Bút Chì", "Mẹ Tép", "Mẹ Bống Bang", 
  "Thu Hà (Mẹ Hổ)", "Ngọc Mai", "Thanh Tâm", "Hồng Nhung", "Phương Thảo",
  "Bố Bỉm Sữa", "Ba Gạo", "Mẹ Sữa", "Mẹ Khoai Tây"
];

// --- 2. NGÂN HÀNG DỮ LIỆU CHUẨN Y KHOA (RICH CONTENT DATABASE) ---
const RICH_CONTENT_DATABASE: Record<string, any[]> = {
  "Sức khỏe": [
    {
      titles: ["Bé sốt 39 độ, chân tay lạnh ngắt, đầu nóng ran phải làm sao?", "Sốt cao co giật: Dấu hiệu và cách sơ cứu gấp?"],
      contents: ["Các mẹ ơi cứu em với! Bé nhà em 18 tháng, sốt đùng đùng 39.5 độ đo nách. Trán và người thì nóng hầm hập mà chân tay lại tím tái, lạnh ngắt. Em sợ con co giật quá. Đã uống hạ sốt Hapacol được 30 phút mà chưa hạ. Giờ có nên ủ ấm chân hay chườm mát không ạ? Em rối quá!"],
      answers: {
        expert: [
          "Chào mẹ. Đây là hiện tượng sốt cao gây co mạch ngoại vi, là dấu hiệu báo trước nguy cơ sốt cao co giật. \n\n**HƯỚNG DẪN XỬ LÝ:**\n1. **Tuyệt đối KHÔNG ủ ấm**, không đắp chăn, không đi tất dày. Cần nới lỏng quần áo để cơ thể tỏa nhiệt.\n2. Lấy khăn ấm (nhúng nước ấm bằng nhiệt độ cơ thể) lau vào 5 vị trí: Trán, 2 nách, 2 bẹn. Lau liên tục đến khi chân tay ấm trở lại.\n3. Nếu đã uống hạ sốt (Paracetamol liều 10-15mg/kg) quá 1 tiếng không hạ, mẹ cần đưa bé đi viện ngay.\n4. Tích cực cho bé bú hoặc uống Oresol để bù nước.\n\n*Nguồn tham khảo: Phác đồ điều trị Nhi khoa - Bộ Y Tế.*"
        ],
        user: [
          "Nguy hiểm lắm mom ơi, chân tay lạnh là nhiệt độ bên trong đang tăng cao đấy. Mom lấy khăn ấm lau nách bẹn ngay đi, đừng lau toàn thân bé sợ lạnh.",
          "Đi viện ngay đi, con mình hồi trước cũng y chang, vào viện bác sĩ mắng cho vì để ở nhà lâu quá suýt co giật.",
          "Bình tĩnh mom nhé, uống hạ sốt phải tầm 45p-1 tiếng mới ngấm. Quan trọng là bù nước, con háo nước sẽ càng sốt cao."
        ]
      }
    },
    {
      titles: ["Phân biệt cúm A và sốt xuất huyết ở trẻ nhỏ?", "Bé sốt li bì, nôn trớ, nghi ngờ viêm màng não"],
      contents: ["Mùa này đang dịch Cúm A và Sốt xuất huyết. Bé nhà mình sốt ngày thứ 2, sốt cao khó hạ, mắt lờ đờ, mệt mỏi, ăn gì cũng nôn. Mình thấy trên người có vài chấm đỏ li ti không biết là ban hay muỗi đốt. Các mẹ có kinh nghiệm phân biệt không ạ? Khi nào cần xét nghiệm máu?"],
      answers: {
        expert: [
          "Chào mẹ. Hai bệnh này giai đoạn đầu khá giống nhau. Tuy nhiên:\n- **Cúm A:** Thường kèm hắt hơi, sổ mũi, ho, đau họng, đau nhức cơ bắp dữ dội.\n- **Sốt xuất huyết:** Da sung huyết (đỏ ửng), chấm xuất huyết dưới da, chảy máu cam/chân răng, thường không có viêm đường hô hấp trên.\n\nVới tình trạng bé lờ đờ, nôn trớ nhiều, đây là **DẤU HIỆU CẢNH BÁO NẶNG**. Mẹ không nên tự đoán bệnh ở nhà mà cần đưa bé đến viện xét nghiệm công thức máu và test nhanh ngay lập tức.\n\n*Tham vấn y khoa: BS.CKII Nguyễn Văn Chương.*"
        ],
        user: [
          "Test cúm thì test dịch mũi, test sốt xuất huyết thì lấy máu. Tốt nhất ra viện làm combo cho chắc mom ạ.",
          "Nếu chấm đỏ căng da ra mà không biến mất thì là xuất huyết đấy. Mom đưa con đi khám đi, mùa này dịch kinh lắm."
        ]
      }
    }
  ],
  "Mang thai": [
    {
      titles: ["Độ mờ da gáy 2.8mm ở tuần 12: Có cần chọc ối không?", "Review làm xét nghiệm NIPT hay Double Test?"],
      contents: ["Em tập 1, hôm nay đi siêu âm mốc 12 tuần bác sĩ báo độ mờ da gáy (ĐMDG) 2.8mm. Bác sĩ bảo là ngưỡng nguy cơ cao, tư vấn làm NIPT hoặc chọc ối. Em hoang mang quá, khóc nấc cả lên. Có mẹ nào chỉ số cao mà sinh con vẫn khỏe mạnh không cho em xin động lực với ạ?"],
      answers: {
        expert: [
          "Chào mẹ bầu. ĐMDG > 2.5mm được xếp vào nhóm nguy cơ, nhưng **chưa phải là kết luận dị tật**.\n\n- Chỉ số 2.8mm: Tỷ lệ bé bình thường vẫn rất cao (trên 90%).\n- **Lời khuyên:** Mẹ nên làm xét nghiệm **NIPT (sàng lọc không xâm lấn)** trước. Độ chính xác của NIPT với hội chứng Down lên tới >99%. Nếu NIPT nguy cơ cao mới cần chọc ối (vì chọc ối có 0.5-1% nguy cơ rò ối/sảy thai).\n\nHãy giữ tinh thần lạc quan, stress ảnh hưởng không tốt đến em bé nhé.\n\n*Nguồn: Hiệp hội Sản phụ khoa Hoa Kỳ (ACOG)*"
        ],
        user: [
          "Mình đây, 3.2mm luôn nhé. Lúc đó suy sụp lắm, nhưng làm NIPT kết quả bình thường. Giờ bé 2 tuổi thông minh lanh lợi. Mẹ đừng lo quá.",
          "Tiền nào của nấy mom ơi, làm NIPT gói 3-5 triệu cho yên tâm hẳn. Double Test tỉ lệ dương tính giả cao lắm, làm xong lại lo thêm."
        ]
      }
    },
    {
      titles: ["Bầu 3 tháng cuối bị tiểu đường thai kỳ, thực đơn nào ổn?", "Chỉ số đường huyết bao nhiêu là tiểu đường thai kỳ?"],
      contents: ["Hôm nay em làm nghiệm pháp dung nạp đường, kết quả sau 1h và 2h đều vượt ngưỡng. Bác sĩ kết luận tiểu đường thai kỳ và bắt ăn kiêng. Em thèm trà sữa, thèm cơm trắng quá. Các mẹ có thực đơn nào giúp con to mà mẹ không tăng đường không ạ?"],
      answers: {
        expert: [
          "Tiểu đường thai kỳ nếu không kiểm soát tốt dễ gây đa ối, thai to, hạ đường huyết sau sinh.\n\n**NGUYÊN TẮC ĂN UỐNG:**\n1. **Chia nhỏ bữa ăn:** 3 bữa chính + 3 bữa phụ.\n2. **Tinh bột:** Cắt giảm cơm trắng, bún, phở. Thay bằng gạo lứt, khoai lang, yến mạch, ngũ cốc nguyên hạt.\n3. **Tuyệt đối tránh:** Đường tinh luyện, bánh kẹo, nước ngọt, trái cây quá ngọt (sầu riêng, mít, vải).\n4. **Ưu tiên:** Rau xanh (ăn trước khi ăn cơm), đạm, chất béo tốt.\n\n*Tư vấn bởi: ThS.BS Dinh dưỡng Lê Lan.*"
        ],
        user: [
          "Ăn khoai lang đi mom, mình ăn khoai lang trừ bữa mà con sinh ra 3.8kg, mẹ thì mi nhon.",
          "Nhớ đi bộ sau ăn 15-20p nhé, giảm đường cực hiệu quả. Kiêng khem chút vì con khỏe mạnh mom ạ."
        ]
      }
    }
  ],
  "Dinh dưỡng": [
    {
      titles: ["Bé 6 tháng ăn dặm kiểu Nhật hay BLW tốt hơn?", "Thực đơn ăn dặm cho bé mới bắt đầu"],
      contents: ["Bé nhà em sắp tròn 6 tháng, em đang phân vân giữa ăn dặm truyền thống, kiểu Nhật (ADKN) và Tự chỉ huy (BLW). Bà nội thì muốn cho ăn bột, nhưng em muốn con tự lập. Mẹ nào có kinh nghiệm chia sẻ ưu nhược điểm với ạ? Bé mới tập ăn thì nên bắt đầu từ món gì?"],
      answers: {
        expert: [
          "Chào mẹ. Không có phương pháp nào là tốt nhất, chỉ có phương pháp phù hợp với bé và hoàn cảnh gia đình.\n\n1. **ADKN:** Tốt cho việc cảm nhận mùi vị riêng biệt, tập ăn thô theo giai đoạn. Nhược điểm: Mẹ tốn công chế biến.\n2. **BLW:** Bé tự lập, kỹ năng tay mắt tốt, ăn thô sớm. Nhược điểm: Dễ hóc (cần trang bị kiến thức sơ cứu), bừa bộn.\n3. **Truyền thống:** Bé dễ tăng cân. Nhược điểm: Dễ biếng ăn tâm lý, kỹ năng nhai kém.\n\n**Lời khuyên:** Có thể kết hợp (Ví dụ: Bữa chính ăn đút, bữa phụ ăn bốc). Khởi đầu nên dùng cháo rây 1:10 hoặc củ quả hấp mềm.\n\n*Nguồn: Viện Dinh dưỡng Quốc gia.*"
        ],
        user: [
          "Mình vote BLW nhé, nhìn con gặm đùi gà thích lắm. Nhưng mẹ phải 'thần kinh thép' vì con sẽ ọe đấy.",
          "Nếu bà trông cháu thì nên ADKN hoặc truyền thống thôi, BLW bà không chịu được cảnh cháu bôi trét đâu mom ơi :))"
        ]
      }
    }
  ],
  "Gia đình": [
    {
      titles: ["Khủng hoảng tuổi lên 2, con hay ăn vạ, đập đầu xuống đất", "Dạy con không đòn roi: Làm sao khi con bướng?"],
      contents: ["Bé nhà mình 22 tháng, dạo này thay đổi tính nết kinh khủng. Đòi gì không được là lăn ra đất gào khóc, thậm chí đập đầu vào tường. Mình xót con lại bực mình, nhiều lúc không kìm được đã đánh vào mông con. Làm sao để vượt qua giai đoạn này đây ạ?"],
      answers: {
        expert: [
          "Chào mẹ. Đây là giai đoạn 'Terrible Two' (Khủng hoảng tuổi lên 2) - mốc phát triển tâm lý bình thường khi bé muốn khẳng định cái 'Tôi'.\n\n**CHIẾN THUẬT XỬ LÝ:**\n1. **Phớt lờ (Ignore):** Khi con ăn vạ để đòi hỏi vô lý, hãy đảm bảo con an toàn và lờ đi. Khán giả đi vắng, diễn viên sẽ ngừng diễn.\n2. **Chuyển hướng (Distract):** Đánh lạc hướng bé sang món đồ chơi khác.\n3. **Không thỏa hiệp:** Nếu mẹ nhượng bộ 1 lần, lần sau bé sẽ gào to hơn.\n4. **Ôm con khi đã bình tĩnh:** Giải thích ngắn gọn tại sao con không được làm vậy.\n\n*Tư vấn bởi: Cô giáo Minh Anh - Chuyên gia Montessori.*"
        ],
        user: [
          "Đồng cảm với mom, nhà mình cũng thế. Mình áp dụng Time-out (Góc bình yên), cho ngồi 2 phút suy nghĩ, trộm vía giờ ngoan hơn hẳn.",
          "Đừng đánh con mom ơi, đánh xong mình ân hận mà con lại càng lì lợm."
        ]
      }
    }
  ]
};

// --- HELPERS ---

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Hàm tạo Avatar (URL an toàn)
const generateAvatar = (seed: string, gender: 'male' | 'female' = 'female') => {
  const safeSeed = encodeURIComponent(seed);
  const style = gender === 'male' ? 'avataaars' : 'adventurer'; 
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${safeSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};

// --- CORE FUNCTIONS ---

export const generateFakeUsers = async (count: number, onLog: (msg: string) => void): Promise<User[]> => {
  if (!db) return [];
  const users: User[] = [];
  const batchSize = 400; 
  let batch = writeBatch(db);
  let batchCount = 0;

  // 1. TẠO EXPERT USERS (Dữ liệu cứng, chất lượng cao)
  for (const expert of EXPERT_PROFILES) {
    const uid = `expert_${expert.seed}`;
    const user: User = {
      id: uid,
      name: expert.name,
      avatar: generateAvatar(expert.seed, expert.gender as any), 
      email: `contact.${expert.seed.toLowerCase()}@asking.vn`,
      isExpert: true,
      expertStatus: 'approved',
      specialty: expert.title,
      isAdmin: false,
      isBanned: false,
      bio: expert.bio,
      points: getRandomInt(5000, 15000), // Điểm uy tín cao
      joinedAt: new Date(Date.now() - getRandomInt(86400000 * 365 * 2, 86400000 * 365 * 5)).toISOString(),
      isFake: true,
      followers: [],
      following: []
    };
    
    const ref = doc(db, 'users', uid);
    batch.set(ref, user);
    users.push(user);
    batchCount++;
  }

  // 2. TẠO REGULAR USERS (Người dùng thường)
  for (let i = 0; i < count; i++) {
    const uid = `fake_user_${Date.now()}_${i}`;
    const nameSeed = getRandomItem(MOM_NAMES);
    const fullName = `${nameSeed}`; 
    
    const user: User = {
      id: uid,
      name: fullName,
      avatar: generateAvatar(uid, 'female'),
      email: `fake.${uid}@example.com`,
      isExpert: false,
      expertStatus: 'none',
      isAdmin: false,
      isBanned: false,
      bio: "Mẹ bỉm sữa yêu con, thích chia sẻ kinh nghiệm nuôi dạy con cái.",
      points: getRandomInt(10, 500),
      joinedAt: new Date(Date.now() - getRandomInt(0, 86400000 * 180)).toISOString(),
      isFake: true,
      followers: [],
      following: []
    };

    const ref = doc(db, 'users', uid);
    batch.set(ref, user);
    users.push(user);
    batchCount++;

    if (batchCount >= batchSize) {
      await batch.commit();
      onLog(`✅ Đã khởi tạo ${users.length} hồ sơ người dùng...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  
  onLog(`🎉 Đã tạo xong hệ thống user (Gồm ${EXPERT_PROFILES.length} Chuyên gia & ${count} Thành viên).`);
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
      onLog("❌ Lỗi: Không tìm thấy dữ liệu user giả.");
      return;
  }

  const experts = fakeUsers.filter(u => u.isExpert);
  const regularUsers = fakeUsers.filter(u => !u.isExpert);

  const batchSize = 400;
  let batch = writeBatch(db);
  let opCount = 0;
  let qCountTotal = 0;

  const availableCategories = Object.keys(RICH_CONTENT_DATABASE);

  // Vòng lặp qua từng danh mục để tạo câu hỏi
  for (const category of availableCategories) {
    onLog(`👉 Đang xây dựng nội dung chuyên mục: ${category}...`);
    const topics = RICH_CONTENT_DATABASE[category];

    // Tạo số lượng câu hỏi theo yêu cầu
    for (let i = 0; i < questionsPerCat; i++) {
      // Chọn ngẫu nhiên 1 topic trong danh mục (để đa dạng hóa, có thể lặp lại nhưng ID khác nhau)
      const topicTemplate = getRandomItem(topics);
      
      const author = getRandomItem(regularUsers);
      const qId = `fake_q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const createdAt = new Date(Date.now() - getRandomInt(86400000, 86400000 * 60)).toISOString(); // 1-60 ngày trước
      
      // Tạo Question
      const question: Question = {
        id: qId,
        title: getRandomItem(topicTemplate.titles), // Chọn tiêu đề ngẫu nhiên trong nhóm
        content: getRandomItem(topicTemplate.contents),
        category: category,
        author: author,
        answers: [],
        likes: getRandomInt(10, 300),
        views: getRandomInt(200, 10000), // View cao cho giống thật
        createdAt: createdAt,
        isFake: true,
        isExpertVerified: false
      };

      // Tạo Answers
      const answers: Answer[] = [];
      const numAnswers = getRandomInt(2, answersPerQuestion);
      
      // 80% câu hỏi sẽ có chuyên gia trả lời để tăng uy tín site
      const hasExpertAns = Math.random() > 0.2; 

      for (let j = 0; j < numAnswers; j++) {
        let ansAuthor: User;
        let ansContent: string;
        let isExpertAns = false;
        let isBest = false;

        // Ưu tiên câu trả lời đầu tiên là của Chuyên gia (nếu có)
        if (j === 0 && hasExpertAns && experts.length > 0) {
           ansAuthor = getRandomItem(experts);
           ansContent = getRandomItem(topicTemplate.answers.expert);
           isExpertAns = true;
           isBest = true; // Chuyên gia thường là Best Answer
           question.isExpertVerified = true; // Đánh dấu câu hỏi đã được verify
        } else {
           ansAuthor = getRandomItem(regularUsers);
           // Tránh người tự hỏi tự trả lời
           if (ansAuthor.id === author.id) continue;
           ansContent = getRandomItem(topicTemplate.answers.user);
        }

        // Thời gian trả lời phải sau thời gian hỏi
        const ansTime = new Date(new Date(createdAt).getTime() + getRandomInt(300000, 86400000 * 2)).toISOString();

        answers.push({
          id: `fake_a_${Date.now()}_${j}_${Math.random().toString(36).substr(2, 5)}`,
          questionId: qId,
          author: ansAuthor,
          content: ansContent,
          likes: isExpertAns ? getRandomInt(100, 500) : getRandomInt(0, 50),
          isBestAnswer: isBest,
          isExpertVerified: isExpertAns,
          createdAt: ansTime,
          isAi: false,
          isFake: true
        });
      }

      // Sắp xếp: Chuyên gia lên đầu, sau đó đến like
      answers.sort((a, b) => {
          if (a.isBestAnswer) return -1;
          if (b.isBestAnswer) return 1;
          return b.likes - a.likes;
      });
      
      question.answers = answers;

      const qRef = doc(db, 'questions', qId);
      batch.set(qRef, question);
      
      opCount++;
      qCountTotal++;

      if (opCount >= batchSize) {
        await batch.commit();
        onLog(`   💾 Đã lưu ${opCount} thảo luận vào CSDL...`);
        batch = writeBatch(db);
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
  onLog(`✨ HOÀN TẤT! Tổng cộng ${qCountTotal} chủ đề chất lượng cao đã được tạo.`);
};

export const clearFakeData = async (onLog: (msg: string) => void) => {
  if (!db) return;
  const batchSize = 400;

  onLog("🗑 Đang xóa dữ liệu mẫu...");
  
  // Xóa Questions
  const qQuery = query(collection(db, 'questions'), where('isFake', '==', true));
  const qSnap = await getDocs(qQuery);
  const qChunks = [];
  for (let i = 0; i < qSnap.docs.length; i += batchSize) qChunks.push(qSnap.docs.slice(i, i + batchSize));
  
  for (const chunk of qChunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      onLog(`   - Đã xóa ${chunk.length} câu hỏi.`);
  }

  // Xóa Users
  const uQuery = query(collection(db, 'users'), where('isFake', '==', true));
  const uSnap = await getDocs(uQuery);
  const uChunks = [];
  for (let i = 0; i < uSnap.docs.length; i += batchSize) uChunks.push(uSnap.docs.slice(i, i + batchSize));

  for (const chunk of uChunks) {
      const batch = writeBatch(db);
      chunk.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      onLog(`   - Đã xóa ${chunk.length} tài khoản ảo.`);
  }

  onLog("✨ Đã dọn dẹp sạch sẽ dữ liệu mẫu!");
};
