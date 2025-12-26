// src/services/categories.ts
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Category, toSlug } from '../types';

export const fetchCategories = async (): Promise<Category[]> => {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'categories'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
  } catch (e) {
    console.error('fetchCategories error:', e);
    return [];
  }
};

export const addCategory = async (
  name: string,
  style?: { icon: string; color: string; bg: string }
) => {
  if (!db) return;
  await addDoc(collection(db, 'categories'), {
    name,
    slug: toSlug(name),
    ...(style || {}),
  });
};

export const updateCategory = async (
  id: string,
  name: string,
  style?: { icon: string; color: string; bg: string }
) => {
  if (!db) return;
  await updateDoc(doc(db, 'categories', id), {
    name,
    slug: toSlug(name),
    ...(style || {}),
  });
};

export const deleteCategory = async (id: string) => {
  if (!db) return;
  await deleteDoc(doc(db, 'categories', id));
};
