import { 
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, getDoc, setDoc, arrayUnion 
} from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Đảm bảo đường dẫn này đúng với file config của bạn
import { Game, GameLevel, CategoryDef, DEFAULT_GAME_CATEGORIES } from '../types';

const GAMES_COLLECTION = 'games';
const CATEGORIES_COLLECTION = 'game_categories';

// =============================================================================
// 1. QUẢN LÝ DANH MỤC
// =============================================================================

export const fetchCategories = async (): Promise<CategoryDef[]> => {
  if (!db) return DEFAULT_GAME_CATEGORIES;
  try {
    const colRef = collection(db, CATEGORIES_COLLECTION);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) return DEFAULT_GAME_CATEGORIES;
    
    const dbCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CategoryDef));
    
    // Merge Categories
    const allCats = [...DEFAULT_GAME_CATEGORIES];
    dbCategories.forEach(dbCat => {
        if (!allCats.find(c => c.id === dbCat.id)) {
            allCats.push(dbCat);
        }
    });
    return allCats;
  } catch (error) {
    console.warn("Error fetching categories:", error);
    return DEFAULT_GAME_CATEGORIES;
  }
};

export const addCategory = async (cat: CategoryDef) => {
    if (!db) return;
    await setDoc(doc(db, CATEGORIES_COLLECTION, cat.id), cat);
};

export const deleteCategory = async (id: string) => {
    if (!db) return;
    await deleteDoc(doc(db, CATEGORIES_COLLECTION, id));
};

// =============================================================================
// 2. QUẢN LÝ GAME (CORE)
// =============================================================================

export const fetchAllGames = async (onlyActive = false): Promise<Game[]> => {
  if (!db) return [];
  try {
    const gamesRef = collection(db, GAMES_COLLECTION);
    const snapshot = await getDocs(gamesRef);
    let games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Game));
    
    if (onlyActive) {
      games = games.filter(g => g.isActive);
    }
    
    // Sắp xếp theo thứ tự order
    return games.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.error("Error fetching games:", error);
    return [];
  }
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  if (!db) return null;
  try {
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Game;
    }
    return null;
  } catch (error) {
    console.error("Error fetching game:", error);
    return null;
  }
};

export const createGame = async (data: Omit<Game, 'id'>) => {
  if (!db) return;
  try {
    await addDoc(collection(db, GAMES_COLLECTION), data);
  } catch (error) {
    console.error("Error creating game:", error);
    throw error;
  }
};

export const updateGame = async (id: string, updates: Partial<Game>) => {
  if (!db) return;
  try {
    const docRef = doc(db, GAMES_COLLECTION, id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error("Error updating game:", error);
    throw error;
  }
};

export const deleteGame = async (id: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, GAMES_COLLECTION, id));
  } catch (error) {
    console.error("Error deleting game:", error);
    throw error;
  }
};

// =============================================================================
// 3. QUẢN LÝ LEVEL (MÀN CHƠI) - ARRAY LOGIC
// =============================================================================

export const addLevelToGame = async (gameId: string, level: GameLevel) => {
  if (!db) return;
  try {
    const docRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(docRef, {
      levels: arrayUnion(level)
    });
  } catch (error) {
    console.error("Error adding level:", error);
    throw error;
  }
};

export const updateLevelInGame = async (gameId: string, updatedLevel: GameLevel) => {
  if (!db) return;
  try {
    // Firestore không update được 1 item trong mảng, phải đọc về -> sửa -> lưu đè
    const game = await getGameById(gameId);
    if (!game) throw new Error("Game not found");

    const newLevels = (game.levels || []).map(lvl => 
      lvl.id === updatedLevel.id ? updatedLevel : lvl
    );

    const docRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(docRef, { levels: newLevels });
  } catch (error) {
    console.error("Error updating level:", error);
    throw error;
  }
};

export const deleteLevelFromGame = async (gameId: string, levelId: string) => {
  if (!db) return;
  try {
    const game = await getGameById(gameId);
    if (!game) throw new Error("Game not found");

    const newLevels = (game.levels || []).filter(lvl => lvl.id !== levelId);

    const docRef = doc(db, GAMES_COLLECTION, gameId);
    await updateDoc(docRef, { levels: newLevels });
  } catch (error) {
    console.error("Error deleting level:", error);
    throw error;
  }
};

export const importLevelsBatch = async (gameId: string, levels: GameLevel[]) => {
    if (!db) return;
    try {
      const docRef = doc(db, GAMES_COLLECTION, gameId);
      await updateDoc(docRef, {
        levels: arrayUnion(...levels)
      });
    } catch (error) {
      console.error("Error importing batch levels:", error);
      throw error;
    }
};
