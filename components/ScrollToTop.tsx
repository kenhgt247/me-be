import { useEffect } from "react";
// @ts-ignore
import { useLocation, useParams } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const params = useParams(); // Lấy tham số (ví dụ slug thay đổi)

  useEffect(() => {
    // 1. Cuộn thẻ #root (QUAN TRỌNG NHẤT VỚI DỰ ÁN CỦA BẠN)
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" // Nhảy bụp phát lên đầu, không trượt từ từ gây lỗi
      });
    }

    // 2. Cuộn cả window và body (Phòng hờ trường hợp bạn đổi CSS sau này)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.body.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.documentElement.scrollTo({ top: 0, left: 0, behavior: "instant" });

  }, [pathname, params]); // Chạy lại mỗi khi đổi Link hoặc đổi Slug

  return null;
}
