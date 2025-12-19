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

// --- 2. CÁC HÀM CŨ (ĐÃ SỬA LỖI CÚ PHÁP) ---

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
    // FIX: Bọc ngoặc để sử dụng ?? và || cùng nhau
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
// 🚀 3. HÀM NÂNG CẤP: GENERATE GAME CONTENT (BẮT BUỘC ĐỦ NGỮ CẢNH)
// =============================================================================

export const generateGameContent = async (
  topic: string,
  ageRange: string,
  count: number,
  displayType: 'emoji' | 'text' | 'color',
  category: string = "general",
  language: string = "Tiếng Việt",
  learningGoal: string = "",
  extraRequirement: string = ""
): Promise<any[]> => {
  if (!ai) throw new Error("AI not initialized");

  const model = "gemini-2.5-flash";

  const prompt = `
Bạn là GIÁO VIÊN MẦM NON + GAME DESIGNER (2–7 tuổi) cho Asking.vn.
Mục tiêu: tạo dữ liệu level thật cuốn hút (mini-story, khen ngợi, emoji vui), nhưng vẫn DỄ cho bé.

INPUT:
- Chủ đề: "${topic}"
- Chuyên mục: "${category}" (english, math, logic, vietnamese, general...)
- Ngôn ngữ: "${language}" (Tiếng Việt / Tiếng Anh / Song ngữ)
- Độ tuổi: "${ageRange}"
- Mục tiêu học tập: "${learningGoal}"
- Số lượng level: ${count}
- Yêu cầu thêm: "${extraRequirement}"
- displayType: "${displayType}"

NGUYÊN TẮC SIÊU QUAN TRỌNG:
1) Không nội dung đáng sợ, bạo lực, nhạy cảm. Không thương hiệu/nhân vật bản quyền.
2) Mỗi level = 1 nhiệm vụ rõ ràng, câu ngắn, thân thiện.
3) Tăng dần độ khó rất nhẹ (level 1 dễ nhất).
4) "opts" phải 3 hoặc 4 lựa chọn. Không trùng nhau.
5) "a" phải TRÙNG CHÍNH XÁC 1 phần tử trong opts.
6) Nếu displayType="emoji": 
   - Mỗi option trong opts nên bắt đầu bằng 1 emoji liên quan, ví dụ: "🍎 Apple", "🐶 Dog"
   - Câu hỏi q cũng nên có emoji nhẹ (1-2 emoji).
7) Quy tắc ngôn ngữ:
   - Nếu category="english" hoặc language="Tiếng Anh": q/opts/a đều là tiếng Anh đơn giản.
   - Nếu language="Song ngữ": q bằng tiếng Việt, còn opts/a bằng tiếng Anh đơn giản.
   - Nếu category="math": ưu tiên đếm số, so sánh nhiều/ít, hình khối, phép cộng trừ rất nhỏ.
8) Style câu hỏi (để bé hứng thú): dùng mini-story 1 câu:
   Ví dụ: "🐰 Thỏ con muốn tìm quả táo. Quả nào là Apple?"
   hoặc "🚗 Xe con đang đếm bánh xe. 2 + 1 = ?"

OUTPUT JSON (STRICT):
[
  {
    "q": "câu hỏi",
    "opts": ["opt1", "opt2", "opt3"],
    "a": "opt đúng",
    "displayType": "${displayType}",
    "hint": "gợi ý cực ngắn (<= 10 từ, optional)"
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
              displayType: { type: Type.STRING },
              hint: { type: Type.STRING }
            },
            required: ["q", "opts", "a", "displayType"]
          }
        },
        temperature: 0.8,
      },
    });

    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    if (!text) return [];

    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];

    // Soft-validate để tránh AI trả bậy làm vỡ UI
    const cleaned = parsed
      .filter((x) => x && typeof x.q === 'string' && Array.isArray(x.opts) && typeof x.a === 'string')
      .map((x) => {
        const q = String(x.q || "").trim();
        let opts = (x.opts || []).map((o: any) => String(o || "").trim()).filter(Boolean);

        // đảm bảo 3-4 options
        opts = Array.from(new Set(opts)).slice(0, 4);
        if (opts.length < 3) {
          // bơm thêm option an toàn nếu thiếu
          const fillers = displayType === 'emoji'
            ? ["⭐", "🌈", "🎈", "🍀"].map(e => `${e} Option`)
            : ["Option A", "Option B", "Option C", "Option D"];
          for (const f of fillers) {
            if (opts.length >= 3) break;
            if (!opts.includes(f)) opts.push(f);
          }
        }

        let a = String(x.a || "").trim();

        // nếu đáp án không nằm trong opts -> ép về phần tử đầu
        if (!opts.includes(a)) a = opts[0];

        return {
          q,
          opts,
          a,
          displayType: String(x.displayType || displayType),
          hint: typeof x.hint === 'string' ? x.hint.trim() : ""
        };
      });

    return cleaned;
  } catch (error) {
    console.error("Generate Game Error:", error);
    throw error;
  }
};


/**
 * Sinh truyện kể cho bé (Storytelling)
 */
export const generateStory = async (
  topic: string,
  moralLesson: string = ""
): Promise<{ title: string; content: string }> => {
  if (!ai) return { title: "Lỗi AI", content: "Chưa cấu hình API Key." };

  const model = "gemini-2.5-flash";
  const prompt = `Sáng tác truyện cổ tích ngắn cho trẻ 3-6 tuổi. Chủ đề: "${topic}". Bài học: "${moralLesson}". Trả về JSON {title, content}.`;

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