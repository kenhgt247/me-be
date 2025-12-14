import { useEffect } from "react";
// @ts-ignore
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Mỗi khi đường dẫn (pathname) thay đổi -> Cuộn lên đầu (0, 0)
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
