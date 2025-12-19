import { GoogleGenAI, Type } from "@google/genai";

// --- 1. HELPERS (BẢO TRÌ) ---
const getEnv = (key: string): string | undefined => {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    console.warn("Environment access failed", e);
  }
  return undefined;
};

const apiKey = getEnv('VITE_API_KEY') || getEnv('VITE_GEMINI_API_KEY');
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey.trim() !== "") {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn("⚠️ VITE_API_KEY is missing. Gemini AI features are disabled.");
}

// =============================================================================
//  SMALL UTILS (AN TOÀN, KHÔNG PHÁ LOGIC)
// =============================================================================
const safeText = (x: any) => String(x ?? "").trim();
const uniq = (arr: string[]) => Array.from(new Set(arr));
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const ensureAnswerInOpts = (opts: string[], a: string) => {
  const ans = safeText(a);
  if (!ans) return { opts, a: opts[0] || "" };
  const found = opts.find(o => safeText(o) === ans);
  if (found) return { opts, a: found };
  // fallback: nếu không có trong opts thì ép đáp án = opts[0]
  return { opts, a: opts[0] || ans };
};

// --- 2. CÁC HÀM CŨ (GIỮ NGUYÊN) ---

export const getAiAnswer = async (
  questionTitle: string,
  questionContent: string
): Promise<string> => {
  if (!ai) return "Tính năng AI chưa được cấu hình Key (VITE_API_KEY).";

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Bạn là một chuyên gia tư vấn nuôi dạy con cái trên Asking.vn.
      Câu hỏi: ${questionTitle}
      Chi tiết: ${questionContent}
      Yêu cầu: Trả lời bằng tiếng Việt, giọng điệu ân cần, ngắn gọn (150-200 từ).
      Cuối câu thêm lưu ý: "Đây là gợi ý từ AI tham khảo, mẹ nên hỏi ý kiến bác sĩ chuyên khoa nếu bé có dấu hiệu bất thường nhé."
    `;

    const response = await ai.models.generateContent({ model, contents: prompt });
    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    return text || "Xin lỗi, hiện tại mình chưa thể trả lời câu hỏi này. Mẹ thử lại sau nhé!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hệ thống đang bận, mẹ vui lòng thử lại sau nhé.";
  }
};

export const suggestTitles = async (
  title: string,
  content: string = ""
): Promise<string[]> => {
  if (!ai || !title || title.length < 5) return [];

  try {
    const model = "gemini-2.5-flash";
    const prompt = `Gợi ý 3 tiêu đề hay, rõ ràng, ngắn gọn cho câu hỏi: "${title}". ${content ? `Nội dung: ${content}` : ""}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } },
        temperature: 0.7,
      },
    });

    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    return text ? JSON.parse(text) : [];
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};

export const generateQuestionContent = async (title: string): Promise<string> => {
  if (!ai) return "";
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Bạn là một người mẹ bỉm sữa, hãy viết đoạn mô tả chi tiết khoảng 100 từ cho câu hỏi: "${title}". Giọng văn chân thành, gần gũi.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return ((response as any).text ?? (response as any).response?.text?.()) || "";
  } catch (error) {
    console.error("Generate Content Error:", error);
    return "";
  }
};

export const generateDraftAnswer = async (
  questionTitle: string,
  questionContent: string
): Promise<string> => {
  if (!ai) return "";
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Viết một bản nháp câu trả lời ngắn gọn (dưới 150 từ) cho câu hỏi: "${questionTitle}". Nội dung: "${questionContent}". Giọng văn chia sẻ kinh nghiệm thực tế.`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return ((response as any).text ?? (response as any).response?.text?.()) || "";
  } catch (error) {
    return "";
  }
};

// =============================================================================
// 🚀 3. NÂNG CẤP LỚN: GENERATE GAME CONTENT (HẤP DẪN + ĐÚNG FORMAT)
// =============================================================================

type GameGenType = 'quiz' | 'flashcard' | 'drag-drop';

export const generateGameContent = async (
  topic: string,
  ageRange: string,
  count: number,
  displayType: 'emoji' | 'text' | 'color',
  category: string = "general",
  language: string = "Tiếng Việt",
  learningGoal: string = "",
  extraRequirement: string = "",
  gameTypeHint: GameGenType = "quiz" // ✅ thêm ở CUỐI để không phá call cũ
): Promise<any[]> => {
  if (!ai) throw new Error("AI not initialized");

  const model = "gemini-2.5-flash";
  const n = clamp(Number(count || 5), 1, 20);

  const commonRules = `
Bạn là GIÁO VIÊN MẦM NON & CHUYÊN GIA THIẾT KẾ GAME cho trẻ 2–7 tuổi trên Asking.vn.

Thông tin:
- Tiêu đề/chủ đề: "${topic}"
- Chuyên mục: "${category}" (english/math/logic/general/...)
- Độ tuổi: "${ageRange}"
- Ngôn ngữ: "${language}"
- Mục tiêu học tập (quan trọng): "${learningGoal}"
- Số lượng: ${n}
- Yêu cầu thêm: "${extraRequirement}"

QUY TẮC CHUNG CỰC KỲ QUAN TRỌNG:
- Nội dung SIÊU NGẮN + DỄ HIỂU cho trẻ.
- Mỗi câu hỏi có 3–4 lựa chọn.
- KHÔNG được trùng lựa chọn.
- Đáp án "a" PHẢI nằm trong "opts" (trùng chính xác).
- Ưu tiên sinh dữ liệu HẤP DẪN: có emoji ở đầu câu hỏi/đáp án (vd: "🍎 Apple", "🐶 Dog", "🚗 Car").
- Không dùng kiến thức quá khó; ưu tiên nhận diện, phân loại, đếm, so sánh đơn giản.
- CHỈ trả JSON thuần (không markdown, không giải thích).
`;

  // ==========================
  //  A) FLASHCARD MODE
  // ==========================
  if (gameTypeHint === 'flashcard') {
    const prompt = `
${commonRules}

CHẾ ĐỘ: FLASHCARD
Mục tiêu: mỗi thẻ là 1 cặp (mặt trước -> mặt sau). Format tối ưu cho trẻ.
- Trường "letter": mặt trước (nên bắt đầu bằng emoji + 1 từ/1 cụm từ ngắn). Ví dụ: "🍎 Apple", "🐱 Cat", "🔺 Triangle".
- Trường "word": mặt sau (từ/ý tương ứng ngắn gọn).
- Trường "vi": (nếu Song ngữ hoặc Tiếng Việt) ghi nghĩa tiếng Việt ngắn gọn.

QUY TẮC NGÔN NGỮ:
- Nếu language="Tiếng Anh" hoặc category="english": letter/word dùng tiếng Anh đơn giản.
- Nếu language="Song ngữ": letter/word là tiếng Anh, vi là tiếng Việt.
- Nếu language="Tiếng Việt": letter có thể là emoji + từ Việt, word là mô tả Việt ngắn.

OUTPUT JSON STRICT:
[
  { "letter": "🍎 Apple", "word": "Apple", "vi": "Quả táo", "displayType": "${displayType}" }
]
`;
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              letter: { type: Type.STRING },
              word: { type: Type.STRING },
              vi: { type: Type.STRING },
              displayType: { type: Type.STRING }
            },
            required: ["letter", "word", "displayType"]
          }
        },
        temperature: 0.75,
      },
    });

    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    if (!text) return [];

    const arr = Array.isArray(JSON.parse(text)) ? JSON.parse(text) : [];
    // Post-process chống bẩn
    const cleaned = arr
      .map((x: any) => ({
        letter: safeText(x?.letter),
        word: safeText(x?.word),
        vi: safeText(x?.vi),
        displayType: safeText(x?.displayType || displayType),
      }))
      .filter((x: any) => x.letter && x.word)
      .slice(0, n);

    return cleaned;
  }

  // ==========================
  //  B) QUIZ MODE (DEFAULT)
  // ==========================
  const prompt = `
${commonRules}

CHẾ ĐỘ: QUIZ (TRẮC NGHIỆM)
YÊU CẦU ĐẶC BIỆT ĐỂ GAME HAY HƠN:
- Mỗi câu hỏi "q" nên mở đầu bằng emoji + câu ngắn. Ví dụ: "🐶 Con nào là chó?"
- Mỗi lựa chọn trong "opts" nên bắt đầu bằng emoji + từ ngắn. Ví dụ: "🍎 Apple", "🍌 Banana", "🥕 Carrot"
- "a" phải đúng y hệt 1 phần tử trong opts (copy nguyên).

QUY TẮC NGÔN NGỮ & CHUYÊN MỤC:
- Nếu category="english" HOẶC language="Tiếng Anh": q/opts/a dùng tiếng Anh đơn giản.
- Nếu language="Song ngữ": q dùng tiếng Việt; opts & a dùng tiếng Anh (có emoji ở đầu).
- Nếu category="math": dùng số lượng/đếm/so sánh/hình khối cực đơn giản (có emoji minh họa).

OUTPUT JSON STRICT:
[
  {
    "q": "🐶 Con nào là chó?",
    "opts": ["🐶 Dog", "🐱 Cat", "🐰 Rabbit"],
    "a": "🐶 Dog",
    "displayType": "${displayType}"
  }
]
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              q: { type: Type.STRING },
              opts: { type: Type.ARRAY, items: { type: Type.STRING } },
              a: { type: Type.STRING },
              displayType: { type: Type.STRING }
            },
            required: ["q", "opts", "a", "displayType"]
          }
        },
        temperature: 0.75,
      },
    });

    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    if (!text) return [];

    const raw = JSON.parse(text);
    const safeArr: any[] = Array.isArray(raw) ? raw : [];

    const cleaned = safeArr
      .map((x: any) => {
        const q = safeText(x?.q);
        const opts = uniq((Array.isArray(x?.opts) ? x.opts : []).map((o: any) => safeText(o)).filter(Boolean))
          .slice(0, 4);
        const a = safeText(x?.a);

        if (!q || opts.length < 2) return null;

        const fixed = ensureAnswerInOpts(opts, a);
        return {
          q,
          opts: fixed.opts,
          a: fixed.a,
          displayType: safeText(x?.displayType || displayType)
        };
      })
      .filter(Boolean)
      .slice(0, n);

    return cleaned;
  } catch (error) {
    console.error("Generate Game Error:", error);
    throw error;
  }
};

/**
 * Sinh truyện kể cho bé (Storytelling) - nâng cấp nhẹ: yêu cầu truyện chia đoạn dễ đọc
 */
export const generateStory = async (
  topic: string,
  moralLesson: string = ""
): Promise<{ title: string; content: string }> => {
  if (!ai) return { title: "Lỗi AI", content: "Chưa cấu hình API Key." };

  const model = "gemini-2.5-flash";
  const prompt = `
Sáng tác truyện ngắn cho trẻ 3-7 tuổi.
- Chủ đề: "${topic}"
- Bài học: "${moralLesson}"
Yêu cầu:
- Có tiêu đề hấp dẫn.
- Nội dung 6-10 đoạn ngắn (mỗi đoạn 1-2 câu), dễ đọc trên điện thoại.
- Có emoji nhẹ nhàng (không quá nhiều).
- Kết thúc bằng 1 câu hỏi tương tác cho bé (ví dụ: "Nếu là con, con sẽ làm gì?").

Trả về JSON { "title": "...", "content": "..." } (content xuống dòng bằng \\n).
`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["title", "content"]
        }
      }
    });

    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    return text ? JSON.parse(text) : { title: "", content: "" };
  } catch (error) {
    console.error("Generate Story Error:", error);
    throw error;
  }
};

/**
 * Sinh tiêu đề Blog
 */
export const generateBlogTitle = async (topic: string): Promise<string> => {
  if (!ai) return "";
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Viết 1 tiêu đề blog chuẩn SEO, hấp dẫn cho mẹ bỉm sữa về chủ đề: "${topic}".`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return ((response as any).text ?? (response as any).response?.text?.()) || "";
  } catch (e) {
    return "";
  }
};

/**
 * Sinh nội dung bài viết Blog
 */
export const generateBlogPost = async (title: string, outline: string = ""): Promise<string> => {
  if (!ai) return "";
  try {
    const model = "gemini-2.5-flash";
    const prompt = `Viết bài blog chi tiết cho mẹ bỉm sữa. Tiêu đề: "${title}". ${outline ? `Dàn ý: ${outline}` : ""}. Định dạng HTML (h3, p, strong, ul, li).`;
    const response = await ai.models.generateContent({ model, contents: prompt });
    return ((response as any).text ?? (response as any).response?.text?.()) || "";
  } catch (error) {
    return "";
  }
};
