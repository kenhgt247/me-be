
import { GoogleGenAI, Type } from "@google/genai";

// Safe access helper to prevent "undefined is not an object" error
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

// Try standard VITE_API_KEY first, then specific VITE_GEMINI_API_KEY
const apiKey = getEnv('VITE_API_KEY') || getEnv('VITE_GEMINI_API_KEY');

// Initialize client safely
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey.trim() !== "") {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn(
    "⚠️ VITE_API_KEY is missing. Gemini AI features are disabled."
  );
}

/**
 * Trả lời câu hỏi bằng AI
 */
export const getAiAnswer = async (
  questionTitle: string,
  questionContent: string
): Promise<string> => {
  // Fallback if AI client is not initialized
  if (!ai) {
    return "Tính năng AI chưa được cấu hình Key (VITE_API_KEY). Vui lòng kiểm tra file .env hoặc Vercel Settings.";
  }

  try {
    const model = "gemini-2.5-flash";

    const prompt = `
      Bạn là một chuyên gia tư vấn nuôi dạy con cái và sức khỏe gia đình trên nền tảng Asking.vn.
      Hãy trả lời câu hỏi sau đây của một người mẹ Việt Nam.
      
      Câu hỏi: ${questionTitle}
      Chi tiết: ${questionContent}
      
      Yêu cầu:
      1. Trả lời bằng tiếng Việt, giọng điệu ân cần, thông cảm, như một người mẹ có kinh nghiệm chia sẻ với người mẹ khác.
      2. Câu trả lời ngắn gọn, súc tích (khoảng 150-200 từ), dễ đọc.
      3. Cuối câu trả lời, hãy thêm một dòng lưu ý: "Đây là gợi ý từ AI tham khảo, mẹ nên hỏi ý kiến bác sĩ chuyên khoa nếu bé có dấu hiệu bất thường nhé."
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    // Handle different SDK response structures
    const text = (response as any).text ?? (response as any).response?.text?.();
    return (
      text ||
      "Xin lỗi, hiện tại mình chưa thể trả lời câu hỏi này. Mẹ thử lại sau nhé!"
    );
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hệ thống đang bận, mẹ vui lòng thử lại sau nhé.";
  }
};

/**
 * Gợi ý tiêu đề hay hơn cho câu hỏi
 */
export const suggestTitles = async (
  title: string,
  content: string = ""
): Promise<string[]> => {
  if (!ai) return [];
  if (!title || title.length < 5) return [];

  try {
    const model = "gemini-2.5-flash";

    const prompt = `
      Người dùng đang đặt câu hỏi trên diễn đàn Mẹ & Bé. 
      Tiêu đề nháp: "${title}"
      ${content ? `Nội dung chi tiết: "${content}"` : ""}

      Hãy đóng vai một biên tập viên nội dung giỏi. Gợi ý 3 tiêu đề câu hỏi khác hay hơn, rõ ràng, ngắn gọn và thu hút sự chú ý của các mẹ bỉm sữa.
      Tiêu đề nên đánh vào trọng tâm vấn đề và gợi sự tò mò hoặc đồng cảm.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
        temperature: 0.7,
      },
    });

    const text = (response as any).text ?? (response as any).response?.text?.();
    if (!text) return [];

    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};

/**
 * AI Viết nội dung chi tiết cho câu hỏi
 */
export const generateQuestionContent = async (title: string): Promise<string> => {
  if (!ai) return "";

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Bạn là một người mẹ đang tham gia diễn đàn Asking.vn. Bạn đang có thắc mắc về vấn đề: "${title}".
      
      Hãy giúp tôi viết một đoạn nội dung chi tiết (khoảng 100-150 từ) để đăng kèm câu hỏi này.
      
      Yêu cầu:
      1. Giọng văn: Tự nhiên, gần gũi, chân thành (như lời tâm sự của mẹ bỉm sữa).
      2. Nội dung: Mô tả rõ hơn về tình huống, bối cảnh hoặc các triệu chứng liên quan đến tiêu đề.
      3. Kết thúc: Một lời nhờ vả hoặc mong nhận được lời khuyên từ các mẹ khác.
      4. KHÔNG dùng các câu chào máy móc kiểu "Chào mọi người, tôi là AI...". Hãy viết như người thật.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = (response as any).text ?? (response as any).response?.text?.();
    return text || "";
  } catch (error) {
    console.error("Generate Question Content Error:", error);
    return "";
  }
};

/**
 * Sinh bản nháp câu trả lời cho mẹ chỉnh sửa
 */
export const generateDraftAnswer = async (
  questionTitle: string,
  questionContent: string
): Promise<string> => {
  if (!ai) return "";

  try {
    const model = "gemini-2.5-flash";

    const prompt = `
      Bạn là một trợ lý AI giúp người dùng soạn thảo câu trả lời cho một câu hỏi trên diễn đàn Mẹ & Bé.
      
      Câu hỏi: "${questionTitle}"
      Nội dung: "${questionContent}"

      Hãy viết một bản nháp câu trả lời:
      1. Giọng điệu chia sẻ, đồng cảm, hữu ích (như người đi trước chia sẻ kinh nghiệm).
      2. Đi thẳng vào vấn đề, đưa ra lời khuyên thực tế.
      3. Ngắn gọn (dưới 150 từ) để người dùng có thể chỉnh sửa thêm.
      4. KHÔNG thêm các câu chào hỏi rườm rà kiểu "Chào bạn, mình là AI". Viết như một người dùng thật.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = (response as any).text ?? (response as any).response?.text?.();
    return text || "";
  } catch (error) {
    console.error("Gemini Draft Error:", error);
    return "";
  }
};

/**
 * Sinh dữ liệu câu hỏi Game cho trẻ em (JSON)
 */
export const generateGameContent = async (
  topic: string,
  ageRange: string,
  count: number,
  displayType: 'emoji' | 'text' | 'color'
): Promise<any[]> => {
  if (!ai) throw new Error("AI not initialized");

  const model = "gemini-2.5-flash";
  const prompt = `
    Tạo dữ liệu cho trò chơi giáo dục trẻ em (Quiz).
    - Chủ đề: "${topic}"
    - Độ tuổi: ${ageRange}
    - Số lượng: ${count} câu hỏi
    - Kiểu hiển thị đáp án: ${displayType}

    Yêu cầu JSON output strict:
    [
      {
        "q": "Câu hỏi ngắn gọn cho bé (Ví dụ: Quả táo là quả nào?)",
        "opts": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3"],
        "a": "Đáp án đúng (phải nằm trong opts)",
        "displayType": "${displayType}"
      }
    ]

    Quy tắc:
    1. Nếu displayType là 'emoji', opts phải là các emoji.
    2. Nếu displayType là 'color', opts phải là mã màu HEX hoặc tên tiếng Anh chuẩn.
    3. Ngôn ngữ câu hỏi: Tiếng Việt, dễ hiểu cho bé.
    4. opts không được trùng nhau.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        // Using Type.ARRAY directly from import
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

    const text = (response as any).text ?? (response as any).response?.text?.();
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
  const prompt = `
    Hãy sáng tác một câu chuyện cổ tích ngắn hoặc truyện ngụ ngôn cho trẻ em (3-6 tuổi).
    - Chủ đề/Nhân vật chính: "${topic}"
    ${moralLesson ? `- Bài học giáo dục: "${moralLesson}"` : ""}
    
    Yêu cầu:
    1. Ngôn ngữ Tiếng Việt trong sáng, dễ hiểu, đáng yêu.
    2. Độ dài khoảng 300-500 từ.
    3. Có tính giáo dục cao.
    
    Trả về định dạng JSON:
    {
      "title": "Tên câu chuyện",
      "content": "Nội dung câu chuyện..."
    }
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

    const text = (response as any).text ?? (response as any).response?.text?.();
    if (!text) return { title: "", content: "" };
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Generate Story Error:", error);
    throw error;
  }
};
/**
 * Sinh tiêu đề Blog hấp dẫn
 */
export const generateBlogTitle = async (topic: string): Promise<string> => {
  if (!ai) return "";
  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Bạn là một biên tập viên chuyên nghiệp cho blog Mẹ & Bé.
      Hãy viết 1 tiêu đề bài viết thật hấp dẫn, chuẩn SEO, thu hút người đọc click vào, dựa trên chủ đề: "${topic}".
      
      Yêu cầu:
      - Chỉ trả về duy nhất 1 tiêu đề hay nhất.
      - Không để trong ngoặc kép.
      - Độ dài dưới 70 ký tự.
    `;
    const response = await ai.models.generateContent({ model, contents: prompt });
    const text = (response as any).text ?? (response as any).response?.text?.();
    return text?.trim() || "";
  } catch (e) {
    console.error("AI Title Error:", e);
    return "";
  }
};

/**
 * Sinh nội dung bài viết Blog chuyên sâu
 */
export const generateBlogPost = async (title: string, outline: string = ""): Promise<string> => {
  if (!ai) return "";

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      Bạn là một chuyên gia viết content về Mẹ & Bé, Y khoa và Giáo dục sớm.
      Hãy viết một bài blog chi tiết, chuyên sâu và chuẩn SEO dựa trên tiêu đề: "${title}".
      ${outline ? `Dàn ý gợi ý: "${outline}"` : ""}
      
      Yêu cầu:
      1. Độ dài khoảng 800 - 1200 từ.
      2. Giọng văn: Chuyên gia nhưng gần gũi, dễ hiểu, đồng cảm với các mẹ.
      3. Cấu trúc bài viết rõ ràng: Mở bài, Thân bài (các mục lớn nhỏ), Kết bài.
      4. Định dạng: Sử dụng thẻ HTML cơ bản (<h3>, <p>, <ul>, <li>, <strong>) để trình bày đẹp mắt. KHÔNG dùng Markdown.
      5. Nội dung phải khoa học, chính xác, có giá trị thực tiễn.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    const text = (response as any).text ?? (response as any).response?.text?.();
    return text || "";
  } catch (error) {
    console.error("Generate Blog Post Error:", error);
    return "";
  }
};