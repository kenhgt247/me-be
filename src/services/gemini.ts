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
    Bối cảnh: Bạn là GIÁO VIÊN MẦM NON & CHUYÊN GIA THIẾT KẾ GAME cho trẻ 2–6 tuổi trên Asking.vn.
    Nhiệm vụ: Sinh dữ liệu cho trò chơi giáo dục. KHÔNG ĐƯỢC TỰ ĐOÁN ngoài thông tin sau:

    1. Tiêu đề: "${topic}"
    2. Chuyên mục: "${category}" (Ví dụ: english, math, logic...)
    3. Ngôn ngữ: "${language}" (Quan trọng: Tiếng Việt / Tiếng Anh / Song ngữ)
    4. Độ tuổi: "${ageRange}"
    5. Mục tiêu học tập: "${learningGoal}"
    6. Số lượng: ${count} câu hỏi
    7. Yêu cầu thêm: "${extraRequirement}"

    QUY TẮC NGÔN NGỮ & CHUYÊN MỤC CỰC KỲ QUAN TRỌNG:
    - Nếu category="english" HOẶC language="Tiếng Anh": Toàn bộ nội dung 'q', 'opts', 'a' PHẢI dùng tiếng Anh đơn giản (cat, dog, apple...).
    - Nếu language="Song ngữ": Câu hỏi 'q' dùng Tiếng Việt, nhưng các lựa chọn 'opts' và đáp án 'a' PHẢI dùng Tiếng Anh.
    - Nếu category="math": Tập trung vào nhận biết số lượng, hình khối, phép tính đơn giản.
    - Câu hỏi 'q' phải ngắn gọn, dễ hiểu cho trẻ nhỏ.

    ĐỊNH DẠNG JSON OUTPUT (STRICT):
    [
      {
        "q": "Câu hỏi rõ ràng",
        "opts": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3"],
        "a": "Đáp án đúng (phải nằm trong opts)",
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
        temperature: 0.7,
      },
    });

    // FIX: Bọc ngoặc để tránh lỗi Build
    const text = ((response as any).text ?? (response as any).response?.text?.()) || "";
    
    if (!text) return [];
    return JSON.parse(text);
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