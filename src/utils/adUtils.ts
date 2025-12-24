import { getAdsByPlacement } from '../services/ads';
import { AdCampaign, AdPlacement } from '../types';

/**
 * Hàm này sẽ:
 * 1. Gọi API lấy danh sách quảng cáo theo vị trí (Home, Blog...)
 * 2. Lọc bỏ những quảng cáo đang TẮT (isActive = false)
 * 3. Chọn ngẫu nhiên 1 quảng cáo trong số còn lại
 */
export const getRandomAd = async (placement: AdPlacement): Promise<AdCampaign | null> => {
  try {
    const ads = await getAdsByPlacement(placement);
    
    // Chỉ lấy quảng cáo đang BẬT (isActive = true)
    const activeAds = ads.filter(ad => ad.isActive);
    
    // Nếu không có quảng cáo nào bật thì trả về null (không hiển thị)
    if (activeAds.length === 0) return null;
    
    // Thuật toán random: Chọn ngẫu nhiên 1 số từ 0 đến độ dài danh sách
    const randomIndex = Math.floor(Math.random() * activeAds.length);
    
    return activeAds[randomIndex];
  } catch (error) {
    console.error("Lỗi random ad:", error);
    return null;
  }
};