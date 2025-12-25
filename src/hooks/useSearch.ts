// src/hooks/useSearch.ts
import { useMemo } from 'react';
import { Question, BlogPost, Document, User } from '../types';
import { removeVietnameseTones } from '../utils/textUtils';

export const useSearch = (query: string, data: { questions: Question[], blogs: BlogPost[], docs: Document[] }) => {
  const results = useMemo(() => {
    if (!query.trim()) return { questions: [], blogs: [], docs: [], users: [] };

    const tokens = removeVietnameseTones(query).toLowerCase().split(" ").filter(t => t.length > 0);
    
    const isMatch = (text: string | undefined | null) => {
      if (!text) return false;
      const normalized = removeVietnameseTones(text).toLowerCase();
      return tokens.every(token => normalized.includes(token));
    };

    const matchedQuestions = data.questions.filter(q => isMatch(q.title) || isMatch(q.content));
    const matchedBlogs = data.blogs.filter(p => isMatch(p.title) || isMatch(p.excerpt));
    const matchedDocs = data.docs.filter(d => isMatch(d.title));
    
    // Gom nhóm User từ câu hỏi (sau này có thể fetch thêm từ DB)
    const usersMap = new Map<string, User>();
    matchedQuestions.forEach(q => usersMap.set(q.author.id, q.author));

    return { 
      questions: matchedQuestions, 
      blogs: matchedBlogs, 
      docs: matchedDocs, 
      users: Array.from(usersMap.values()) 
    };
  }, [query, data]);

  return results;
};