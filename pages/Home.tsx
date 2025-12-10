import React, { useState, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import { Link } from 'react-router-dom';
import {
  Search, MessageCircle, Heart, HelpCircle, Clock, Flame,
  MessageSquareOff, ShieldCheck, ChevronRight, Sparkles,
  X, User as UserIcon, CornerDownRight, BookOpen,
  FileText, Download
} from 'lucide-react';

import { Question, User, toSlug, BlogPost, Document } from '../types';
import { AdBanner } from '../components/AdBanner';
import { subscribeToAdConfig } from '../services/ads';
import { fetchPublishedPosts } from '../services/blog';
import { fetchDocuments } from '../services/documents';
import { fetchQuestionsPage } from '../services/db';

/* =========================
   IMAGE GRID (GIỮ NGUYÊN)
========================= */
const FBImageGrid: React.FC<{ images: string[] }> = ({ images }) => {
  if (!images || images.length === 0) return null;
  const count = images.length;

  if (count === 1) {
    return (
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50">
        <img src={images[0]} className="w-full h-64 object-cover" loading="lazy" />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
        <img src={images[0]} className="w-full h-full object-cover" loading="lazy" />
        <img src={images[1]} className="w-full h-full object-cover" loading="lazy" />
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
        <img src={images[0]} className="w-full h-full object-cover row-span-2" loading="lazy" />
        <div className="grid grid-rows-2 gap-1 h-full">
          <img src={images[1]} className="w-full h-full object-cover" loading="lazy" />
          <img src={images[2]} className="w-full h-full object-cover" loading="lazy" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-64">
      <img src={images[0]} className="w-full h-full object-cover" loading="lazy" />
      <div className="grid grid-rows-2 gap-1 h-full">
        <img src={images[1]} className="w-full h-full object-cover" loading="lazy" />
        <div className="relative w-full h-full">
          <img src={images[2]} className="w-full h-full object-cover" loading="lazy" />
          {count > 3 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-bold">
              +{count - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================
   HOME COMPONENT
========================= */
export const Home: React.FC<{ categories: string[] }> = ({ categories }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [activeCategory, setActiveCategory] = useState('Tất cả');
  const [viewFilter, setViewFilter] = useState<'newest' | 'active' | 'unanswered'>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [adFrequency, setAdFrequency] = useState(5);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  /* ===== INITIAL LOAD ===== */
  useEffect(() => {
    const loadInitial = async () => {
      setLoadingMore(true);
      const res = await fetchQuestionsPage();
      setQuestions(res.items);
      setLastDoc(res.lastDoc);
      setHasMore(!!res.lastDoc);
      setLoadingMore(false);
    };
    loadInitial();

    const unsub = subscribeToAdConfig(config => setAdFrequency(config.frequency));

    Promise.all([
      fetchPublishedPosts('all', 4),
      fetchDocuments('all', 4)
    ]).then(([blogs, docs]) => {
      if (blogs) setBlogPosts(blogs);
      if (docs) setDocuments(docs);
    });

    return () => unsub();
  }, []);

  /* ===== LOAD MORE ===== */
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore || loadingMore) return;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '200px' });

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [lastDoc, hasMore, loadingMore]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    const res = await fetchQuestionsPage(lastDoc);
    setQuestions(prev => [...prev, ...res.items]);
    setLastDoc(res.lastDoc);
    setHasMore(!!res.lastDoc);

    setLoadingMore(false);
  };

  /* ===== FILTER + SEARCH (GIỮ LOGIC CŨ) ===== */
  let displayQuestions = [...questions];

  if (activeCategory !== 'Tất cả') {
    displayQuestions = displayQuestions.filter(q => q.category === activeCategory);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    displayQuestions = displayQuestions.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q)
    );
  }

  if (viewFilter === 'active') {
    displayQuestions.sort((a, b) => (b.answers.length + b.likes) - (a.answers.length + a.likes));
  }

  if (viewFilter === 'unanswered') {
    displayQuestions = displayQuestions.filter(q => q.answers.length === 0);
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="space-y-4 animate-fade-in">

      {/* ===== QUESTIONS LIST (GIỮ JSX) ===== */}
      <div className="px-4 md:px-0 space-y-4 pb-10">
        {displayQuestions.map((q, index) => (
          <React.Fragment key={q.id}>
            {index > 0 && index % adFrequency === 0 && (
              <AdBanner className="mx-4 md:mx-0" />
            )}

            <Link to={`/question/${toSlug(q.title, q.id)}`} className="block group">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <img src={q.author.avatar} className="w-8 h-8 rounded-full" />
                  <div>
                    <p className="text-xs font-bold">
                      {q.author.name}
                      {q.author.isExpert && <ShieldCheck size={12} className="inline ml-1 text-blue-500" />}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(q.createdAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <h3 className="font-bold mb-1">{q.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{q.content}</p>

                <FBImageGrid images={q.images || []} />

                <div className="flex justify-between mt-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Heart size={14}/> {q.likes}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={14}/> {q.answers.length}</span>
                </div>
              </div>
            </Link>
          </React.Fragment>
        ))}

        {/* LOAD MORE MARKER */}
        {hasMore && (
          <div ref={loadMoreRef} className="text-center py-6 text-sm text-gray-400">
            {loadingMore ? 'Đang tải thêm...' : ''}
          </div>
        )}
      </div>
    </div>
  );
};
