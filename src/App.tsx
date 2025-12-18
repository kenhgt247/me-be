import React, { useState, useEffect, Suspense, lazy } from 'react';
// @ts-ignore
import ScrollToTop from './components/ScrollToTop';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { Loader2 } from 'lucide-react';
import { SpeedInsights } from "@vercel/speed-insights/react";

// --- TYPES & SERVICES ---
import { Question, User, Answer, CATEGORIES } from './types';
import { 
  subscribeToAuthChanges, 
  logoutUser, 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail 
} from './services/auth';
import { 
  subscribeToQuestions, 
  addQuestionToDb, 
  updateQuestionInDb, 
  deleteQuestionFromDb, 
  addAnswerToDb, 
  updateAnswerInDb, 
  deleteAnswerFromDb,
  submitExpertApplication 
} from './services/db';

// --- LAZY LOADING PAGES (Giảm dung lượng 4.3 MB xuống mức tối thiểu) ---
// User Pages
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Ask = lazy(() => import('./pages/Ask').then(m => ({ default: m.Ask })));
const QuestionDetail = lazy(() => import('./pages/QuestionDetail'));
const GameZone = lazy(() => import('./pages/GameZone').then(m => ({ default: m.GameZone })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Messages = lazy(() => import('./pages/Messages').then(m => ({ default: m.Messages })));
const ChatDetail = lazy(() => import('./pages/ChatDetail').then(m => ({ default: m.ChatDetail })));
const AiChat = lazy(() => import('./pages/AiChat').then(m => ({ default: m.AiChat })));
const ExpertRegistration = lazy(() => import('./pages/ExpertRegistration').then(m => ({ default: m.ExpertRegistration })));
const BlogList = lazy(() => import('./pages/BlogList').then(m => ({ default: m.BlogList })));
const BlogDetail = lazy(() => import('./pages/BlogDetail').then(m => ({ default: m.BlogDetail })));
const DocumentList = lazy(() => import('./pages/DocumentList').then(m => ({ default: m.DocumentList })));
const DocumentDetail = lazy(() => import('./pages/DocumentDetail').then(m => ({ default: m.DocumentDetail })));
const StaticPages = lazy(() => import('./pages/StaticPages'));

// Admin Pages
const AdminLayout = lazy(() => import('./layouts/AdminLayout').then(m => ({ default: m.AdminLayout })));
const Dashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.Dashboard })));
const UserManagement = lazy(() => import('./pages/admin/UserManagement').then(m => ({ default: m.UserManagement })));
const ExpertApprovals = lazy(() => import('./pages/admin/ExpertApprovals').then(m => ({ default: m.ExpertApprovals })));
const QuestionManagement = lazy(() => import('./pages/admin/QuestionManagement').then(m => ({ default: m.QuestionManagement })));
const BlogAdmin = lazy(() => import('./pages/admin/BlogAdmin').then(m => ({ default: m.BlogAdmin })));
const DocumentAdmin = lazy(() => import('./pages/admin/DocumentAdmin').then(m => ({ default: m.DocumentAdmin })));
const GameManagement = lazy(() => import('./pages/admin/GameManagement').then(m => ({ default: m.GameManagement })));
const GameDetail = lazy(() => import('./pages/admin/GameDetail').then(m => ({ default: m.GameDetail })));
const ReportManagement = lazy(() => import('./pages/admin/ReportManagement').then(m => ({ default: m.ReportManagement })));
const AdSettings = lazy(() => import('./pages/admin/AdSettings').then(m => ({ default: m.AdSettings })));
const SeedData = lazy(() => import('./pages/admin/SeedData').then(m => ({ default: m.SeedData })));

const GUEST_USER: User = {
  id: 'guest',
  name: 'Khách',
  avatar: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png',
  isExpert: false,
  expertStatus: 'none',
  isAdmin: false,
  bio: "Người dùng ẩn danh",
  isGuest: true
};

const UserLayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

// Component Loading cho từng trang khi chuyển mạch
const PageLoader = () => (
  <div className="flex items-center justify-center p-20">
    <Loader2 className="animate-spin text-primary" size={32} />
  </div>
);

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [questions, setQuestions] = useState<Question[]>([]); 
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [authLoading, setAuthLoading] = useState(true);
  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user || GUEST_USER);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToQuestions((fetchedQuestions) => {
      setQuestions(fetchedQuestions);
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS (Giữ nguyên logic của bạn) ---
  const handleLogout = async () => { await logoutUser(); setCurrentUser(GUEST_USER); };
  const handleAddQuestion = async (q: Question) => await addQuestionToDb(q);
  const handleEditQuestion = async (id: string, t: string, c: string) => await updateQuestionInDb(id, { title: t, content: c });
  const handleDeleteQuestion = async (id: string) => await deleteQuestionFromDb(id);
  const handleHideQuestion = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (q) await updateQuestionInDb(id, { isHidden: !q.isHidden });
  };
  const handleAddCategory = (newCat: string) => {
    if (!categories.includes(newCat)) setCategories([...categories, newCat]);
  };
  const handleAddAnswer = async (qId: string, answer: Answer) => {
    const q = questions.find(i => i.id === qId);
    if (q) await addAnswerToDb(q, answer);
  };
  const handleEditAnswer = async (qId: string, aId: string, content: string) => await updateAnswerInDb(qId, aId, { content });
  const handleDeleteAnswer = async (qId: string, aId: string) => await deleteAnswerFromDb(qId, aId);
  const handleHideAnswer = async (qId: string, aId: string) => {
    const q = questions.find(q => q.id === qId);
    const a = q?.answers.find(ans => ans.id === aId);
    if (a) await updateAnswerInDb(qId, aId, { isHidden: !a.isHidden });
  };
  const handleMarkBestAnswer = async (qId: string, aId: string) => {
    const q = questions.find(i => i.id === qId);
    if (!q) return;
    const updated = q.answers.map(a => ({ ...a, isBestAnswer: a.id === aId ? !a.isBestAnswer : false }));
    await updateQuestionInDb(qId, { answers: updated });
  };
  const handleVerifyAnswer = async (qId: string, aId: string) => {
    const q = questions.find(i => i.id === qId);
    if (!q) return;
    const updated = q.answers.map(a => a.id === aId ? { ...a, isExpertVerified: !a.isExpertVerified } : a);
    await updateQuestionInDb(qId, { answers: updated });
  };

  const handleExpertRegistration = async (data: any) => {
    try {
      if (currentUser.isGuest) { setShowGlobalAuthModal(true); return; }
      await submitExpertApplication(currentUser, data);
      setCurrentUser({ ...currentUser, expertStatus: 'pending', specialty: data.specialty, workplace: data.workplace });
    } catch (e) { alert("Có lỗi xảy ra khi gửi hồ sơ."); }
  };

  if (authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F7F5]">
      <Loader2 size={48} className="animate-spin text-primary mb-4" />
      <p className="text-gray-500 font-medium">Đang tải dữ liệu Asking.vn...</p>
    </div>
  );

  return (
    <BrowserRouter>
      <SpeedInsights />
      <ScrollToTop />
      <PWAInstallPrompt />
      
      <AuthModal 
        isOpen={showGlobalAuthModal}
        onClose={() => setShowGlobalAuthModal(false)}
        onLogin={loginWithEmail}
        onRegister={registerWithEmail}
        onGoogleLogin={loginWithGoogle}
        onGuestContinue={() => setShowGlobalAuthModal(false)}
      />

      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* --- ADMIN ROUTES --- */}
          <Route path="/admin" element={<AdminLayout currentUser={currentUser} onLogout={handleLogout} />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="experts" element={<ExpertApprovals />} />
            <Route path="questions" element={<QuestionManagement />} />
            <Route path="blog" element={<BlogAdmin />} />
            <Route path="documents" element={<DocumentAdmin />} />
            <Route path="games" element={<GameManagement />} />
            <Route path="games/:gameId" element={<GameDetail />} />
            <Route path="reports" element={<ReportManagement />} />
            <Route path="ads" element={<AdSettings />} />
            <Route path="seed" element={<SeedData />} />
          </Route>

          {/* --- USER ROUTES --- */}
          <Route element={<UserLayoutWrapper />}>
            <Route path="/" element={<Home questions={questions} categories={categories} currentUser={currentUser} />} />
            <Route path="/ask" element={
              <Ask onAddQuestion={handleAddQuestion} currentUser={currentUser} categories={categories} 
                   onAddCategory={handleAddCategory} onLogin={loginWithEmail} onRegister={registerWithEmail} onGoogleLogin={loginWithGoogle} />
            } />
            <Route path="/notifications" element={<Notifications currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/messages" element={<Messages currentUser={currentUser} />} />
            <Route path="/messages/:userId" element={<ChatDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/ai-chat" element={<AiChat />} />
            <Route path="/question/:slug" element={
              <QuestionDetail questions={questions} currentUser={currentUser} onAddAnswer={handleAddAnswer} 
                              onMarkBestAnswer={handleMarkBestAnswer} onVerifyAnswer={handleVerifyAnswer}
                              onOpenAuth={() => setShowGlobalAuthModal(true)} onEditQuestion={handleEditQuestion}
                              onDeleteQuestion={handleDeleteQuestion} onHideQuestion={handleHideQuestion}
                              onEditAnswer={handleEditAnswer} onDeleteAnswer={handleDeleteAnswer} onHideAnswer={handleHideAnswer} />
            } />
            <Route path="/games" element={<GameZone />} />
            <Route path="/profile" element={<Profile user={currentUser} questions={questions} onLogout={handleLogout} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/profile/:userId" element={<Profile user={currentUser} questions={questions} onLogout={handleLogout} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/expert-register" element={<ExpertRegistration currentUser={currentUser} onSubmitApplication={handleExpertRegistration} />} />
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/documents" element={<DocumentList />} />
            <Route path="/documents/:slug" element={<DocumentDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            
            {/* Static Pages */}
            <Route path="/about" element={<import('./pages/StaticPages').then(m => <m.About />)} />
            <Route path="/terms" element={<import('./pages/StaticPages').then(m => <m.Terms />)} />
            <Route path="/privacy" element={<import('./pages/StaticPages').then(m => <m.Privacy />)} />
            <Route path="/contact" element={<import('./pages/StaticPages').then(m => <m.Contact />)} />
            <Route path="/faq" element={<import('./pages/StaticPages').then(m => <m.FAQ />)} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
