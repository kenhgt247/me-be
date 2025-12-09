
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { AdConfig } from '../types';

const AD_CONFIG_DOC = 'ad_config/global';

const DEFAULT_CONFIG: AdConfig = {
  isEnabled: true,
  provider: 'adsense',
  adsenseClientId: '',
  adsenseSlotId: '',
  customBannerUrl: '',
  customTargetUrl: '',
  frequency: 5
};

export const getAdConfig = async (): Promise<AdConfig> => {
  if (!db) return DEFAULT_CONFIG;
  try {
    const snap = await getDoc(doc(db, AD_CONFIG_DOC));
    if (snap.exists()) {
      return snap.data() as AdConfig;
    }
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error("Error fetching ad config:", error);
    return DEFAULT_CONFIG;
  }
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
