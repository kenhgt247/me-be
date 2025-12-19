import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Game, GameLevel, CategoryDef, DEFAULT_GAME_CATEGORIES } from "../types";

const GAMES_COLLECTION = "games";
const CATEGORIES_COLLECTION = "game_categories";

// =============================================================================
// HELPERS (AN TOÀN – KHÔNG PHÁ LOGIC)
// =============================================================================
const nowIso = () => new Date().toISOString();

const toIso = (v: any): string => {
  try {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (typeof v?.toDate === "function") return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
  } catch {}
  return "";
};

const ensureId = () => Math.random().toString(36).slice(2, 11);

const normalizeCategory = (c: any): CategoryDef => ({
  id: String(c?.id ?? "").trim(),
  label: String(c?.label ?? c?.name ?? "").trim(),
  icon: String(c?.icon ?? "🎮"),
  color: String(c?.color ?? "bg-indigo-400"),
  isDefault: Boolean(c?.isDefault),
});

const normalizeLevel = (lvl: any, fallbackOrder: number): GameLevel => {
  const levelId = String(lvl?.id ?? ensureId());

  const instruction = lvl?.instruction || {};
  const instId = String(instruction?.id ?? ensureId());

  const itemsRaw: any[] = Array.isArray(lvl?.items) ? lvl.items : [];
  const items = itemsRaw.map((it) => ({
    id: String(it?.id ?? ensureId()),
    text: it?.text ? String(it.text) : "",
    imageUrl: it?.imageUrl ? String(it.imageUrl) : "",
    audioUrl: it?.audioUrl ? String(it.audioUrl) : "",
    color: it?.color ? String(it.color) : "",
  }));

  return {
    id: levelId,
    instruction: {
      id: instId,
      text: instruction?.text ? String(instruction.text) : "",
      imageUrl: instruction?.imageUrl ? String(instruction.imageUrl) : "",
      audioUrl: instruction?.audioUrl ? String(instruction.audioUrl) : "",
      color: instruction?.color ? String(instruction.color) : "",
    },
    items,
    correctAnswerId: lvl?.correctAnswerId ? String(lvl.correctAnswerId) : "",
    pairs: Array.isArray(lvl?.pairs) ? lvl.pairs : undefined,
    dropZones: Array.isArray(lvl?.dropZones) ? lvl.dropZones : undefined,
    order: Number.isFinite(Number(lvl?.order)) ? Number(lvl.order) : fallbackOrder,
  };
};

const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of arr) {
    if (!x?.id) continue;
    if (seen.has(x.id)) continue;
    seen.add(x.id);
    out.push(x);
  }
  return out;
};

const sortLevels = (levels: GameLevel[]) =>
  [...levels].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

const normalizeGame = (id: string, data: any): Game => {
  const g: any = data || {};
  const levelsRaw: any[] = Array.isArray(g.levels) ? g.levels : [];
  const normalizedLevels = dedupeById(
    levelsRaw.map((lvl, idx) => normalizeLevel(lvl, idx + 1))
  );
  const levels = sortLevels(normalizedLevels);

  return {
    id,
    title: String(g.title ?? "").trim(),
    slug: String(g.slug ?? "").trim(),
    icon: String(g.icon ?? "🎮"),
    color: String(g.color ?? "bg-indigo-400"),
    gameType: g.gameType,
    category: String(g.category ?? "general"),
    orientation: g.orientation,
    minAge: Number(g.minAge ?? 2),
    maxAge: Number(g.maxAge ?? 7),
    isActive: Boolean(g.isActive ?? true),
    isPro: Boolean(g.isPro ?? false),
    order: Number(g.order ?? 0),
    gameUrl: g.gameUrl ? String(g.gameUrl) : "",
    storyContent: g.storyContent ? String(g.storyContent) : "",
    config: (g.config ?? {}) as any,
    levels,
    totalPlays: Number(g.totalPlays ?? 0),
    createdAt: toIso(g.createdAt) || nowIso(),
    updatedAt: toIso(g.updatedAt) || nowIso(),
    questionCount: g.questionCount,
  } as Game;
};

// =============================================================================
// 1) DANH MỤC GAME
// =============================================================================
export const fetchCategories = async (): Promise<CategoryDef[]> => {
  // Fallback không lỗi nếu db chưa init
  if (!db) return DEFAULT_GAME_CATEGORIES;

  try {
    const qRef = query(collection(db, CATEGORIES_COLLECTION), orderBy("label", "asc"));
    const snap = await getDocs(qRef);

    const cats = snap.docs
      .map((d) => normalizeCategory({ id: d.id, ...d.data() }))
      .filter((c) => c.id && c.label);

    // Nếu chưa có dữ liệu trên Firestore => trả default
    return cats.length > 0 ? cats : DEFAULT_GAME_CATEGORIES;
  } catch (error) {
    console.error("fetchCategories error:", error);
    return DEFAULT_GAME_CATEGORIES;
  }
};

export const addCategory = async (cat: CategoryDef) => {
  if (!db) return;
  const safe = normalizeCategory(cat);
  if (!safe.id || !safe.label) throw new Error("Category id/label is required");
  const ref = doc(db, CATEGORIES_COLLECTION, safe.id);
  await setDoc(ref, safe, { merge: true });
};

export const deleteCategory = async (categoryId: string) => {
  if (!db) return;
  if (!categoryId) return;
  await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
};

// =============================================================================
// 2) CRUD GAME
// =============================================================================
export const fetchAllGames = async (onlyActive: boolean = false): Promise<Game[]> => {
  if (!db) return [];

  try {
    const qRef = query(collection(db, GAMES_COLLECTION), orderBy("order", "asc"));
    const snap = await getDocs(qRef);

    const games = snap.docs.map((d) => normalizeGame(d.id, d.data()));
    return onlyActive ? games.filter((g) => g.isActive) : games;
  } catch (error) {
    console.error("fetchAllGames error:", error);
    return [];
  }
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  if (!db) return null;
  if (!gameId) return null;

  try {
    const ref = doc(db, GAMES_COLLECTION, gameId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;

    return normalizeGame(snap.id, snap.data());
  } catch (error) {
    console.error("getGameById error:", error);
    return null;
  }
};

export const createGame = async (gameData: Partial<Game>): Promise<string> => {
  if (!db) throw new Error("Firestore not initialized");

  const payload: any = {
    ...gameData,
    createdAt: (gameData.createdAt as any) || nowIso(),
    updatedAt: (gameData.updatedAt as any) || nowIso(),
    totalPlays: Number((gameData.totalPlays as any) ?? 0),
    levels: Array.isArray(gameData.levels) ? gameData.levels : [],
  };

  const docRef = await addDoc(collection(db, GAMES_COLLECTION), payload);
  return docRef.id;
};

export const updateGame = async (gameId: string, data: Partial<Game>) => {
  if (!db) return;
  if (!gameId) return;

  const payload: any = {
    ...data,
    updatedAt: nowIso(),
  };

  // Nếu cập nhật levels từ admin/service khác => normalize nhẹ để khỏi bẩn doc
  if (Array.isArray((data as any).levels)) {
    const lvls = (data as any).levels as any[];
    const normalized = dedupeById(lvls.map((l, idx) => normalizeLevel(l, idx + 1)));
    payload.levels = sortLevels(normalized);
  }

  await updateDoc(doc(db, GAMES_COLLECTION, gameId), payload);
};

export const deleteGame = async (gameId: string) => {
  if (!db) return;
  if (!gameId) return;
  await deleteDoc(doc(db, GAMES_COLLECTION, gameId));
};

// =============================================================================
// 3) LEVELS (MÀN CHƠI) – LOGIC ỔN ĐỊNH, KHÔNG DÙNG arrayUnion ĐỂ TRÁNH LỖI
// =============================================================================
export const addLevelToGame = async (gameId: string, level: GameLevel) => {
  if (!db) return;
  if (!gameId) return;

  const game = await getGameById(gameId);
  const current = Array.isArray(game?.levels) ? game!.levels : [];

  const nextOrder = current.length > 0 ? Math.max(...current.map((l) => l.order || 0)) + 1 : 1;
  const normalized = normalizeLevel(level, nextOrder);

  const merged = sortLevels(dedupeById([...current, normalized]));
  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    levels: merged,
    updatedAt: nowIso(),
  });
};

export const updateLevelInGame = async (gameId: string, level: GameLevel) => {
  if (!db) return;
  if (!gameId || !level?.id) return;

  const game = await getGameById(gameId);
  const current = Array.isArray(game?.levels) ? game!.levels : [];

  const updated = current.map((l) => (l.id === level.id ? normalizeLevel(level, l.order || 1) : l));
  const merged = sortLevels(dedupeById(updated));

  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    levels: merged,
    updatedAt: nowIso(),
  });
};

export const deleteLevelFromGame = async (gameId: string, levelId: string) => {
  if (!db) return;
  if (!gameId || !levelId) return;

  const game = await getGameById(gameId);
  const current = Array.isArray(game?.levels) ? game!.levels : [];

  const filtered = current.filter((l) => l.id !== levelId);
  // Re-order cho đẹp (không bắt buộc nhưng giúp admin dễ nhìn)
  const reordered = sortLevels(filtered).map((l, idx) => ({ ...l, order: idx + 1 }));

  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    levels: reordered,
    updatedAt: nowIso(),
  });
};

/**
 * Import batch levels từ AI:
 * - Không dùng arrayUnion(...levels) để tránh giới hạn & tránh trùng
 * - Auto order nối tiếp vào cuối
 * - Auto normalize (id/instruction/items/order)
 */
export const importLevelsBatch = async (gameId: string, incomingLevels: GameLevel[]) => {
  if (!db) return;
  if (!gameId) return;

  const game = await getGameById(gameId);
  const current = Array.isArray(game?.levels) ? game!.levels : [];

  const baseOrder =
    current.length > 0 ? Math.max(...current.map((l) => l.order || 0)) : 0;

  const safeIncoming = Array.isArray(incomingLevels) ? incomingLevels : [];
  const normalizedIncoming = safeIncoming
    .map((lvl, idx) => normalizeLevel(lvl, baseOrder + idx + 1))
    .filter((lvl) => {
      // lọc level rỗng để tránh “màn trắng”
      const hasInstruction =
        !!lvl.instruction?.text ||
        !!(lvl.instruction as any)?.imageUrl ||
        !!(lvl.instruction as any)?.audioUrl;
      const hasItems = Array.isArray(lvl.items) && lvl.items.length > 0;
      return hasInstruction && hasItems;
    });

  const merged = sortLevels(dedupeById([...current, ...normalizedIncoming]));

  await updateDoc(doc(db, GAMES_COLLECTION, gameId), {
    levels: merged,
    updatedAt: nowIso(),
  });
};
