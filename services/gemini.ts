import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiAnswer = async (questionTitle: string, questionContent: string): Promise<string> => {
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
      model: model,
      contents: prompt,
    });

    return response.text || "Xin lỗi, hiện tại mình chưa thể trả lời câu hỏi này. Mẹ thử lại sau nhé!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hệ thống đang bận, mẹ vui lòng thử lại sau nhé.";
  }
};

export const suggestTitles = async (title: string, content: string = ""): Promise<string[]> => {
  try {
    // Only suggest if we have enough context
    if (!title || title.length < 5) return [];
    
    const model = "gemini-2.5-flash";
    const prompt = `
      Người dùng đang đặt câu hỏi trên diễn đàn Mẹ & Bé. 
      Tiêu đề nháp: "${title}"
      ${content ? `Nội dung chi tiết: "${content}"` : ''}

      Hãy đóng vai một biên tập viên nội dung giỏi. Gợi ý 3 tiêu đề câu hỏi khác hay hơn, rõ ràng, ngắn gọn và thu hút sự chú ý của các mẹ bỉm sữa.
      Tiêu đề nên đánh vào trọng tâm vấn đề và gợi sự tò mò hoặc đồng cảm.
      
      Trả về kết quả CHỈ là một JSON Array chứa các chuỗi string. Ví dụ: ["Tiêu đề 1", "Tiêu đề 2", "Tiêu đề 3"].
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        temperature: 0.7 
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    return [];
  }
};

export const generateDraftAnswer = async (questionTitle: string, questionContent: string): Promise<string> => {
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
      model: model,
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Gemini Draft Error:", error);
    return "";
  }
};