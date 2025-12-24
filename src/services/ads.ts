import { 
  doc, getDoc, setDoc, onSnapshot, 
  collection, addDoc, updateDoc, deleteDoc, query, where, getDocs 
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AdConfig, AdCampaign, AdPlacement } from '../types';

const AD_CONFIG_DOC = 'ad_config/global';
const ADS_COLLECTION = 'ad_campaigns';

const DEFAULT_CONFIG: AdConfig = {
  isEnabled: true,
  provider: 'adsense',
  adsenseClientId: '',
  adsenseSlotId: '',
  frequencies: { home: 5, blog: 4, document: 6 }
};

// 1. Lấy Config hệ thống (Bật/Tắt, Tần suất)
export const getAdConfig = async (): Promise<AdConfig> => {
  if (!db) return DEFAULT_CONFIG;
  try {
    const snap = await getDoc(doc(db, AD_CONFIG_DOC));
    return snap.exists() ? (snap.data() as AdConfig) : DEFAULT_CONFIG;
  } catch (error) {
    console.error("Error fetching ad config:", error);
    return DEFAULT_CONFIG;
  }
};

export const subscribeToAdConfig = (callback: (config: AdConfig) => void) => {
    if (!db) return () => {};
    return onSnapshot(doc(db, AD_CONFIG_DOC), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as AdConfig);
        } else {
            callback(DEFAULT_CONFIG);
        }
    });
};

export const updateAdConfig = async (config: AdConfig) => {
  if (!db) return;
  try {
    await setDoc(doc(db, AD_CONFIG_DOC), config, { merge: true });
  } catch (error) {
    console.error("Error updating ad config:", error);
    throw error;
  }
};

// 2. Quản lý Quảng cáo Random (Ad Campaigns)

// Lấy danh sách quảng cáo theo vị trí (VD: lấy hết quảng cáo 'home')
export const getAdsByPlacement = async (placement: AdPlacement): Promise<AdCampaign[]> => {
  if (!db) return [];
  try {
    const q = query(collection(db, ADS_COLLECTION), where("placement", "==", placement));
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdCampaign));
  } catch (error) {
    console.error("Error fetching ads:", error);
    return [];
  }
};

// Tạo quảng cáo mới
export const createAdCampaign = async (ad: Omit<AdCampaign, 'id'>) => {
  if (!db) return;
  await addDoc(collection(db, ADS_COLLECTION), {
    ...ad,
    createdAt: Date.now()
  });
};

// Cập nhật quảng cáo
export const updateAdCampaign = async (id: string, data: Partial<AdCampaign>) => {
  if (!db) return;
  await updateDoc(doc(db, ADS_COLLECTION, id), data);
};

// Xóa quảng cáo
export const deleteAdCampaign = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, ADS_COLLECTION, id));
};