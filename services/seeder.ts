import { collection, writeBatch, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { User, Question, Answer, CATEGORIES } from '../types';

// --- 1. DATASETS CAO CẤP (RICH DATASETS) ---

// Danh sách chuyên gia "VIP" định danh trước để tạo uy tín
const EXPERT_PROFILES = [
  { name: "BS. Nguyễn Văn Chương", title: "Trưởng khoa Nhi", bio: "20 năm kinh nghiệm điều trị Nhi khoa tại BV Nhi TW.", seed: "Felix" },
  { name: "ThS. Dinh dưỡng Lê Lan", title: "Chuyên gia Dinh dưỡng", bio: "Tư vấn thực đơn & phát triển thể chất cho trẻ em Việt Nam.", seed: "Aneka" },
  { name: "BS. Trần Thu Hà", title: "Sản phụ khoa", bio: "Đồng hành cùng mẹ bầu thai kỳ an toàn, vượt cạn nhẹ nhàng.", seed: "Liliana" },
  { name: "Cô giáo Minh Anh", title: "Giáo dục sớm", bio: "Founder trường mầm non Montessori, chuyên gia tâm lý trẻ em.", seed: "Milo" },
  { name: "Dược sĩ Thanh Bình", title: "Dược sĩ lâm sàng", bio: "Tư vấn sử dụng thuốc an toàn cho mẹ và bé.", seed: "Jack" }
];

// Tên người dùng thông thường phong phú hơn
const MOM_NAMES = ["Mẹ Bắp", "Mẹ Sóc", "Mẹ Cua", "Mẹ Gấu", "Mẹ Xoài", "Mẹ Cherry", "Mẹ Ken", "Mẹ Shin", "Mẹ Tép", "Mẹ Bống", "Thu Hà", "Ngọc Mai", "Thanh Tâm", "Hồng Nhung", "Phương Thảo"];

// Ngân hàng câu hỏi & câu trả lời theo CHỦ ĐỀ (Để tránh râu ông nọ cắm cằm bà kia)
const TOPIC_DATA = {
  "Mang thai": [
    {
      titles: [
        "Thai 12 tuần độ mờ da gáy 2.8mm có sao không các mẹ?",
        "Kết quả Double Test nguy cơ cao, em lo quá huhu",
        "Có mẹ nào làm NIPT chưa cho em xin review với ạ?"
      ],
      contents: [
        "Em vừa đi siêu âm mốc 12 tuần về, bác sĩ bảo độ mờ da gáy hơi dày (2.8mm). Bác sĩ hẹn làm thêm xét nghiệm nhưng em lo mất ăn mất ngủ. Có mẹ nào chỉ số cao mà sinh con vẫn khỏe mạnh không ạ cho em xin động lực với.",
        "Hôm nay nhận kết quả mà rụng rời tay chân các mom ơi. Em tập đầu nên chưa có kinh nghiệm gì, giờ nên chọc ối hay làm NIPT ạ? Chi phí thế nào các mẹ tư vấn giúp em."
      ],
      answers: {
        expert: [
          "Chào mẹ, độ mờ da gáy 2.8mm là ngưỡng cần theo dõi sát, nhưng chưa khẳng định bé bị dị tật. Mẹ nên bình tĩnh làm thêm xét nghiệm NIPT để có kết quả chính xác 99% nhé. Chúc mẹ và bé bình an.",
          "Chỉ số này được coi là nguy cơ trung bình - cao. Tuy nhiên rất nhiều trường hợp sau khi kiểm tra chuyên sâu vẫn cho kết quả bình thường. Mẹ cần giữ tinh thần thoải mái, stress sẽ ảnh hưởng không tốt đến thai nhi."
        ],
        user: [
          "Mẹ đừng lo quá, tập 1 mình cũng 3.0mm đây, làm NIPT âm tính, giờ bé 3 tuổi thông minh lanh lợi lắm.",
          "Cứ làm NIPT cho yên tâm mom ạ, đắt xắt ra miếng nhưng giải tỏa tâm lý. Đừng chọc ối vội nguy cơ sảy cao hơn.",
          "Huhu thương mom, cố lên nhé, cầu mong con bình an. Mẹ ăn uống nghỉ ngơi đi đừng suy nghĩ nhiều."
        ]
      }
    },
    {
      titles: [
        "Bầu 3 tháng cuối bị chuột rút ban đêm đau điếng người",
        "Đau lưng hông không ngủ được, cứu em với",
        "Dấu hiệu thiếu canxi ở bà bầu?"
      ],
      contents: [
        "Dạo này đêm nào em cũng bị chuột rút cứng đơ bắp chân, chồng phải dậy xoa bóp mãi mới đỡ. Em đang uống Canxi Corbiere rồi mà vẫn bị. Có phải do thiếu Magie không ạ?",
        "Em bầu 32 tuần, đau lưng lan xuống mông không đi nổi. Nằm nghiêng trái cũng đau, nghiêng phải cũng đau. Các mẹ có bài tập hay mẹo nào không chỉ em với."
      ],
      answers: {
        expert: [
          "Chuột rút ban đêm thường do thiếu Canxi, Magie hoặc do tử cung chèn ép tĩnh mạch. Mẹ nên bổ sung thêm thực phẩm giàu Magie (chuối, bơ, hạt) và ngâm chân nước ấm trước khi ngủ.",
          "Giai đoạn này khung chậu giãn nở để chuẩn bị sinh nên đau là bình thường. Mẹ có thể tập Yoga bầu nhẹ nhàng và dùng gối chữ U để kê đỡ bụng khi ngủ nhé."
        ],
        user: [
          "Mom mua lọ Magie B6 về uống thêm đi, mình uống 3 hôm là hết hẳn chuột rút.",
          "Đi massage bầu đi sướng lắm mom, hoặc bảo chồng chịu khó massage chân mỗi tối.",
          "Trộm vía mình uống canxi hữu cơ mát nên không bị, mom thử đổi loại canxi xem sao."
        ]
      }
    }
  ],
  "Dinh dưỡng": [
    {
      titles: [
        "Bé 6 tháng không chịu ăn dặm, cứ đút là khóc",
        "Con biếng ăn sinh lý hay do mẹ nấu không ngon?",
        "Thực đơn ăn dặm BLW cho bé mới bắt đầu"
      ],
      contents: [
        "Bé nhà em được 6m10d, em tập cho ăn dặm kiểu Nhật mà bé cứ ngậm chặt miệng hoặc phun ra. Em stress quá các mẹ ơi, sợ con thiếu chất.",
        "Nhìn con nhà người ta ăn thun thút mà ham, con mình thì như đánh vật. Em đã đổi món liên tục, không ép ăn mà con vẫn sợ thìa. Cầu cứu các cao nhân ạ."
      ],
      answers: {
        expert: [
          "Giai đoạn 6 tháng là tập làm quen, mẹ không nên đặt nặng số lượng. Nếu bé sợ thìa, mẹ có thể thử phương pháp BLW (ăn dặm tự chỉ huy) để bé tự khám phá thức ăn.",
          "Tuyệt đối không ép bé ăn, không ăn rong, không xem TV. Mẹ hãy tạo không khí vui vẻ, cho bé ngồi ghế ăn đàng hoàng. Con đói sẽ tự ăn, mẹ đừng lo lắng quá."
        ],
        user: [
          "Bé nhà mình cũng thế, mình cho nghỉ 1 tuần rồi tập lại, giờ hợp tác lắm. Mom kiên nhẫn nhé.",
          "Thử đổi sang BLW đi mom, con mình ăn thô tốt lắm, cầm nắm vui vẻ chứ không áp lực như ăn cháo.",
          "Đừng ép mom ơi, càng ép càng sợ đấy. Quan trọng là sữa vẫn đủ lượng là được."
        ]
      }
    }
  ],
  "Sức khỏe": [
    {
      titles: [
        "Bé sốt 39 độ chân tay lạnh ngắt thì phải làm sao?",
        "Con bị co giật do sốt cao, em sợ quá",
        "Cách xử lý khi bé sốt virus tại nhà"
      ],
      contents: [
        "Gấp gấp các mẹ ơi! Bé nhà em sốt 39.5 độ, trán nóng hổi mà chân tay lại lạnh ngắt, tím tái. Em đã cho uống hạ sốt rồi mà chưa hạ. Có cần ủ ấm hay chườm mát không ạ?",
        "Bé sốt cao khó hạ, em lau người nước ấm mà bé khóc thét lên. Giờ làm sao để con dễ chịu hơn ạ? Em rối quá."
      ],
      answers: {
        expert: [
          "Trường hợp sốt cao chân tay lạnh là do co mạch ngoại vi -> nguy cơ sốt cao co giật rất lớn. Mẹ TUYỆT ĐỐI KHÔNG ủ ấm, mặc thoáng, chườm ấm nách bẹn và đưa đi viện ngay nếu không hạ.",
          "Nếu đã uống hạ sốt 1 tiếng không đỡ, mẹ có thể dùng kết hợp Paracetamol và Ibuprofen (cần chỉ định bác sĩ). Chú ý bù nước điện giải Oresol cho bé liên tục."
        ],
        user: [
          "Chân tay lạnh là sắp sốt cao thêm đấy, mom đi tất vào cho con nhưng người thì mặc thoáng thôi. Đừng chườm lạnh nhé.",
          "Đi viện ngay đi mom ơi, sốt cao co giật nguy hiểm lắm đừng ở nhà hỏi nữa.",
          "Cho uống hạ sốt xong lau nách bẹn thôi, đừng lau toàn thân con lạnh con sợ đấy."
        ]
      }
    },
    {
      titles: [
        "Bé ho đờm, khò khè cả tháng không khỏi",
        "Rửa mũi nhiều cho con có hại niêm mạc không?",
        "Review các loại siro ho thảo dược hiệu quả"
      ],
      contents: [
        "Cu Bon nhà em ho đờm 3 tuần nay, đi khám phổi bình thường, bác sĩ kê kháng sinh uống 5 ngày đỡ xong lại bị lại. Nhìn con ho đỏ mặt mà xót quá.",
        "Các mẹ có kinh nghiệm vỗ rung long đờm không chỉ em với? Em rửa mũi hút mũi ngày 3 lần mà cảm giác đờm vẫn đầy cổ."
      ],
      answers: {
        expert: [
          "Ho là phản xạ tống đờm của cơ thể. Nếu phổi sạch, mẹ nên hạn chế kháng sinh. Tăng cường vệ sinh mũi họng, giữ ẩm không khí và vỗ rung long đờm đúng cách vào buổi sáng.",
          "Việc lạm dụng rửa mũi bằng xilanh áp lực cao có thể gây viêm tai giữa. Mẹ chỉ nên nhỏ nước muối sinh lý và hút nhẹ nhàng khi mũi quá đặc."
        ],
        user: [
          "Mom thử chưng quất đường phèn mật ong xem, bé nhà mình uống 3 hôm long đờm hẳn.",
          "Đừng lạm dụng kháng sinh mom ơi, cho con uống Prospan hoặc Ích Nhi xem sao.",
          "Phải kiên trì rửa mũi mom ạ, mũi sạch thì họng mới hết viêm được."
        ]
      }
    }
  ],
  "Gia đình": [
    {
      titles: [
        "Trầm cảm sau sinh vì chồng vô tâm, mẹ chồng xét nét",
        "Làm sao để cân bằng tài chính khi lương chồng 10 triệu?",
        "Vợ chồng cãi nhau suốt ngày từ khi có con"
      ],
      contents: [
        "Em mệt mỏi quá các chị ạ. Chăm con cả ngày rã rời, chồng đi làm về chỉ ôm điện thoại chơi game. Nhờ pha bình sữa thì nhăn nhó. Em muốn buông xuôi tất cả...",
        "Từ ngày đẻ xong em xấu tính hay cáu gắt, chồng thì không hiểu cứ bảo em sướng quá hóa rồ. Có ai hiểu cảm giác ở nhà chăm con nó stress thế nào không?"
      ],
      answers: {
        expert: [
          "Chào bạn, những cảm xúc tiêu cực sau sinh là rất phổ biến do thay đổi hormone. Bạn hãy thẳng thắn chia sẻ với chồng về nhu cầu được giúp đỡ. Đừng ôm đồm hết việc một mình.",
          "Nếu cảm thấy bế tắc kéo dài, mất ngủ, chán ăn, bạn cần gặp bác sĩ tâm lý ngay. Trầm cảm sau sinh cần được điều trị sớm để đảm bảo an toàn cho cả mẹ và bé."
        ],
        user: [
          "Thương mom, đàn ông họ vô tâm lắm. Mom cứ vứt con cho chồng giữ 1 ngày là lão sợ ngay.",
          "Cố lên mom, giai đoạn này ai cũng thế thôi. Mom tranh thủ lúc con ngủ mà ngủ bù, kệ việc nhà đi.",
          "Học cách yêu bản thân đi mom, mua sắm, làm đẹp chút cho đỡ stress. Đừng hy sinh quá người ta không trân trọng đâu."
        ]
      }
    }
  ]
};

// --- HELPERS ---

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Hàm tạo Avatar ngẫu nhiên nhưng cố định theo seed để không bị đổi mỗi lần load
const generateAvatar = (seed: string, gender: 'male' | 'female' = 'female') => {
  const style = gender === 'male' ? 'micah' : 'personalities'; // Style khác nhau cho nam/nữ
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,ffdfbf`;
};

// --- CORE FUNCTIONS ---

export const generateFakeUsers = async (count: number, onLog: (msg: string) => void): Promise<User[]> => {
  if (!db) return [];
  const users: User[] = [];
  const batchSize = 400; 
  let batch = writeBatch(db);
  let batchCount = 0;

  // 1. TẠO EXPERT USERS (Cố định, chất lượng cao)
  for (const expert of EXPERT_PROFILES) {
    const uid = `expert_${expert.seed}`; // ID cố định để dễ quản lý
    const user: User = {
      id: uid,
      name: expert.name,
      avatar: generateAvatar(expert.seed, 'female'), // Giả sử đa số là nữ hoặc dùng seed fix
      email: `contact.${expert.seed.toLowerCase()}@asking.vn`,
      isExpert: true,
      expertStatus: 'approved',
      specialty: expert.title,
      isAdmin: false,
      isBanned: false,
      bio: expert.bio,
      points: getRandomInt(1000, 5000), // Expert nhiều điểm
      joinedAt: new Date(Date.now() - getRandomInt(86400000 * 365, 86400000 * 730)).toISOString(), // Tham gia 1-2 năm trước
      isFake: true
    };
    
    const ref = doc(db, 'users', uid);
    batch.set(ref, user);
    users.push(user);
    batchCount++;
  }

  // 2. TẠO REGULAR USERS (Các mẹ bỉm sữa)
  for (let i = 0; i < count; i++) {
    const uid = `fake_user_${Date.now()}_${i}`;
    const nameSeed = getRandomItem(MOM_NAMES);
    const fullName = `${nameSeed} ${getRandomInt(10, 99)}`; // Ví dụ: Mẹ Bắp 89
    
    const user: User = {
      id: uid,
      name: fullName,
      avatar: generateAvatar(uid, 'female'),
      email: `fake.${uid}@example.com`,
      isExpert: false,
      expertStatus: 'none',
      isAdmin: false,
      isBanned: false,
      bio: "Mẹ bỉm sữa yêu con, thích chia sẻ kinh nghiệm chăm sóc gia đình.",
      points: getRandomInt(0, 300),
      joinedAt: new Date(Date.now() - getRandomInt(0, 86400000 * 180)).toISOString(),
      isFake: true
    };

    const ref = doc(db, 'users', uid);
    batch.set(ref, user);
    users.push(user);
    batchCount++;

    if (batchCount >= batchSize) {
      await batch.commit();
      onLog(`✅ Đã lưu ${users.length} user...`);
      batch = writeBatch(db);
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }
  
  onLog(`🎉 Đã tạo xong ${users.length} user (bao gồm ${EXPERT_PROFILES.length} chuyên gia).`);
  return users;
};

export const generateFakeContent = async (
  fakeUsers: User[], 
  questionsPerCat: number, // Số lượng câu hỏi muốn tạo mỗi loại chủ đề
  answersPerQuestion: number,
  onLog: (msg: string) => void
) => {
  if (!db) return;
  if (fakeUsers.length === 0) {
      onLog("❌ Không có user giả để tạo nội dung.");
      return;
  }

  const experts = fakeUsers.filter(u => u.isExpert);
  const regularUsers = fakeUsers.filter(u => !u.isExpert);

  const batchSize = 400;
  let batch = writeBatch(db);
  let opCount = 0;
  let qCountTotal = 0;

  // Duyệt qua từng Category có trong TOPIC_DATA
  for (const [category, topics] of Object.entries(TOPIC_DATA)) {
    onLog(`👉 Đang tạo nội dung chủ đề: ${category}...`);

    // Lặp để tạo đủ số lượng yêu cầu
    for (let i = 0; i < questionsPerCat; i++) {
      // 1. Chọn ngẫu nhiên 1 Topic template
      const topicTemplate = getRandomItem(topics);
      
      const author = getRandomItem(regularUsers); // Người hỏi thường là mẹ bỉm
      const qId = `fake_q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 2. Tạo Câu Hỏi
      const question: Question = {
        id: qId,
        title: getRandomItem(topicTemplate.titles),
        content: getRandomItem(topicTemplate.contents),
        category: category,
        author: author,
        answers: [], // Sẽ điền sau
        likes: getRandomInt(5, 100),
        views: getRandomInt(100, 5000),
        createdAt: new Date(Date.now() - getRandomInt(86400000, 86400000 * 30)).toISOString(),
        isFake: true
      };

      // 3. Tạo Câu Trả Lời (Mix giữa Expert và User)
      const answers: Answer[] = [];
      const numAnswers = getRandomInt(2, answersPerQuestion);
      
      // -> Luôn cố gắng có ít nhất 1 câu trả lời từ chuyên gia nếu topic khó
      const hasExpertAns = Math.random() > 0.4; // 60% cơ hội có chuyên gia trả lời

      for (let j = 0; j < numAnswers; j++) {
        let ansAuthor: User;
        let ansContent: string;
        let isExpertAns = false;

        // Logic chọn người trả lời và nội dung phù hợp
        if (j === 0 && hasExpertAns && experts.length > 0) {
           // Câu trả lời đầu tiên là Chuyên gia (để lên top)
           ansAuthor = getRandomItem(experts);
           ansContent = getRandomItem(topicTemplate.answers.expert);
           isExpertAns = true;
        } else {
           // Các câu sau là User thường
           ansAuthor = getRandomItem(regularUsers);
           // Tránh người hỏi tự trả lời
           if (ansAuthor.id === author.id) continue;
           ansContent = getRandomItem(topicTemplate.answers.user);
        }

        answers.push({
          id: `fake_a_${Date.now()}_${j}_${Math.random().toString(36).substr(2, 5)}`,
          questionId: qId,
          author: ansAuthor,
          content: ansContent,
          likes: isExpertAns ? getRandomInt(50, 200) : getRandomInt(0, 20),
          isBestAnswer: false,
          isExpertVerified: isExpertAns, // Nếu là expert thì auto verified
          createdAt: new Date(new Date(question.createdAt).getTime() + getRandomInt(60000, 86400000)).toISOString(), // Trả lời sau câu hỏi 1 chút
          isAi: false,
          isFake: true
        });
      }

      // Sort answer: Expert lên đầu
      answers.sort((a, b) => (b.isExpertVerified ? 1 : 0) - (a.isExpertVerified ? 1 : 0));
      question.answers = answers; // Gán lại vào câu hỏi (cho NoSQL structure)

      // Lưu câu hỏi (đã chứa answers bên trong nếu cấu trúc DB của bạn lưu lồng nhau)
      // Nếu bạn lưu answers ở collection riêng, hãy sửa đoạn này để save vào collection 'answers'
      const qRef = doc(db, 'questions', qId);
      batch.set(qRef, question);
      
      opCount++;
      qCountTotal++;

      if (opCount >= batchSize) {
        await batch.commit();
        onLog(`   💾 Đã lưu batch ${opCount} câu hỏi...`);
        batch = writeBatch(db);
        opCount = 0;
      }
    }
  }

  if (opCount > 0) {
    await batch.commit();
  }
  onLog(`✨ Hoàn tất! Tổng cộng ${qCountTotal} chủ đề thảo luận sôi nổi được tạo.`);
};

// Hàm xóa dữ liệu cũ (Giữ nguyên logic của bạn)
export const clearFakeData = async (onLog: (msg: string) => void) => {
  if (!db) return;
  const batchSize = 400;

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
