// src/services/stats.ts
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const getSystemStats = async () => {
  if (!db) return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };

  try {
    const usersCol = collection(db, 'users');
    const questionsCol = collection(db, 'questions');
    const blogsCol = collection(db, 'blogPosts');
    const docsCol = collection(db, 'documents');

    const [usersSnap, questionsSnap, blogsSnap, docsSnap] = await Promise.all([
      getCountFromServer(usersCol),
      getCountFromServer(questionsCol),
      getCountFromServer(blogsCol),
      getCountFromServer(docsCol),
    ]);

    return {
      totalUsers: usersSnap.data().count,
      totalQuestions: questionsSnap.data().count,
      totalBlogs: blogsSnap.data().count,
      totalDocuments: docsSnap.data().count,
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { totalUsers: 0, totalQuestions: 0, totalBlogs: 0, totalDocuments: 0 };
  }
};
