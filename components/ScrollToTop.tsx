import { useEffect } from "react";
// @ts-ignore
import { useLocation, useParams } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();
  const params = useParams();

  useEffect(() => {
    // Sử dụng window.scrollTo với tùy chọn behavior: 'instant'
    // Để ghi đè hiệu ứng 'smooth' của CSS
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant" // QUAN TRỌNG: Nhảy ngay lập tức, không trượt
    });
  }, [pathname, params]); // Chạy khi đổi link hoặc đổi tham số (slug)

  return null;
}
