import { GoogleGenAI, Type } from "@google/genai";

// Lấy API key từ biến môi trường Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

// Khởi tạo client một cách an toàn (không có key thì không crash)
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey.trim() !== "") {
  ai = new GoogleGenAI({ apiKey });
} else {
  console.warn(
    "⚠️ VITE_GEMINI_API_KEY is missing. Gemini AI features are disabled on this build."
  );
}

/**
 * Trả lời câu hỏi bằng AI
 */
export const getAiAnswer = async (
  questionTitle: string,
  questionContent: string
): Promise<string> => {
  // Nếu không có AI client -> trả lời fallback, KHÔNG throw để tránh trắng trang
  if (!ai) {
    return "Tính năng AI đang được bảo trì hoặc chưa cấu hình Key. Mẹ vui lòng quay lại sau nhé!";
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

    // Tuỳ SDK, đôi khi là response.text(), đôi khi là response.text
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
