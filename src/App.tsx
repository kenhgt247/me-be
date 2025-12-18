
import React, { useState, useEffect } from 'react';
// @ts-ignore
import ScrollToTop from './components/ScrollToTop';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'; // Thêm Outlet
import { Layout } from './components/Layout';
import { AdminLayout } from './layouts/AdminLayout';

// User Pages
import { Home } from './pages/Home';
import { Ask } from './pages/Ask';
import QuestionDetail from './pages/QuestionDetail';
import { GameZone } from './pages/GameZone';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Messages } from './pages/Messages';
import { ChatDetail } from './pages/ChatDetail';
import { AiChat } from './pages/AiChat';
import { ExpertRegistration } from './pages/ExpertRegistration';
import { BlogList } from './pages/BlogList';
import { BlogDetail } from './pages/BlogDetail';
import { About, Terms, Privacy, Contact, FAQ } from './pages/StaticPages';
import { DocumentList } from './pages/DocumentList';
import { DocumentDetail } from './pages/DocumentDetail';

// Admin Pages
import { Dashboard } from './pages/admin/Dashboard'; // <--- THÊM IMPORT DASHBOARD
import { UserManagement } from './pages/admin/UserManagement';
import { ExpertApprovals } from './pages/admin/ExpertApprovals';
import { QuestionManagement } from './pages/admin/QuestionManagement';
import { SeedData } from './pages/admin/SeedData';
import { GameManagement } from './pages/admin/GameManagement';
import { GameDetail } from './pages/admin/GameDetail';
import { ReportManagement } from './pages/admin/ReportManagement';
import { AdSettings } from './pages/admin/AdSettings';
import { BlogAdmin } from './pages/admin/BlogAdmin';
import { DocumentAdmin } from './pages/admin/DocumentAdmin';

import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { Question, User, Answer, CATEGORIES } from './types';
import { subscribeToAuthChanges, logoutUser, loginWithGoogle, loginWithEmail, registerWithEmail } from './services/auth';
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
import { Loader2 } from 'lucide-react'; // Thêm icon loading
import { SpeedInsights } from "@vercel/speed-insights/react";
// ... (Giữ nguyên constant GUEST_USER)
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

// --- COMPONENT WRAPPER CHO USER LAYOUT ---
// Giúp code gọn hơn và tối ưu hiệu suất render
const UserLayoutWrapper = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [questions, setQuestions] = useState<Question[]>([]); 
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [authLoading, setAuthLoading] = useState(true);
  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);

  // ... (Giữ nguyên các useEffect subscribeToAuthChanges và subscribeToQuestions)
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(GUEST_USER);
      }
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

  // ... (Giữ nguyên các hàm handler: handleLogout, CRUD functions...)
  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(GUEST_USER); 
  };
  // (Tôi rút gọn phần này để dễ nhìn, bạn giữ nguyên logic cũ của bạn ở đây)
  const handleAddQuestion = async (q: Question) => await addQuestionToDb(q);
  const handleEditQuestion = async (id: string, title: string, content: string) => await updateQuestionInDb(id, { title, content });
  const handleDeleteQuestion = async (id: string) => await deleteQuestionFromDb(id);
  const handleHideQuestion = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (q) await updateQuestionInDb(id, { isHidden: !q.isHidden });
  };
  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) setCategories([...categories, newCategory]);
  };
  const handleAddAnswer = async (qId: string, answer: Answer) => {
    const q = questions.find(i => i.id === qId);
    if (q) await addAnswerToDb(q, answer);
  };
  const handleEditAnswer = async (qId: string, aId: string, newContent: string) => await updateAnswerInDb(qId, aId, { content: newContent });
  const handleDeleteAnswer = async (qId: string, aId: string) => await deleteAnswerFromDb(qId, aId);
  const handleHideAnswer = async (qId: string, aId: string) => {
    const q = questions.find(q => q.id === qId);
    const a = q?.answers.find(ans => ans.id === aId);
    if (a) await updateAnswerInDb(qId, aId, { isHidden: !a.isHidden });
  };
  const handleMarkBestAnswer = async (questionId: string, answerId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (!q) return;
    const updatedAnswers = q.answers.map(a => ({
      ...a,
      isBestAnswer: a.id === answerId ? !a.isBestAnswer : false
    }));
    await updateQuestionInDb(questionId, { answers: updatedAnswers });
  };
  const handleVerifyAnswer = async (questionId: string, answerId: string) => {
    const q = questions.find(item => item.id === questionId);
    if (!q) return;
    const updatedAnswers = q.answers.map(a => {
      if (a.id === answerId) return { ...a, isExpertVerified: !a.isExpertVerified };
      return a;
    });
    await updateQuestionInDb(questionId, { answers: updatedAnswers });
  };

  const handleExpertRegistration = async (data: any) => {
    try {
        if (currentUser.isGuest) {
            setShowGlobalAuthModal(true);
            return;
        }
        await submitExpertApplication(currentUser, data);
        setCurrentUser({
            ...currentUser,
            expertStatus: 'pending',
            specialty: data.specialty,
            workplace: data.workplace
        });
    } catch (e) {
        console.error("Failed to submit application", e);
        alert("Có lỗi xảy ra khi gửi hồ sơ. Vui lòng thử lại.");
    }
  };

  const handleGlobalLogin = async (email: string, pass: string) => { await loginWithEmail(email, pass); };
  const handleGlobalRegister = async (email: string, pass: string, name: string) => { await registerWithEmail(email, pass, name); };
  const handleGlobalGoogle = async () => { await loginWithGoogle(); };

  // --- LOADING UI ĐẸP HƠN ---
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
        onLogin={handleGlobalLogin}
        onRegister={handleGlobalRegister}
        onGoogleLogin={handleGlobalGoogle}
        onGuestContinue={() => setShowGlobalAuthModal(false)}
      />

      <Routes>
        {/* --- ADMIN ROUTES --- */}
        <Route path="/admin" element={<AdminLayout currentUser={currentUser} onLogout={handleLogout} />}>
            {/* THAY THẾ DIV BẰNG COMPONENT DASHBOARD */}
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
        {/* Sử dụng UserLayoutWrapper để code gọn hơn */}
        <Route element={<UserLayoutWrapper />}>
            <Route path="/" element={<Home questions={questions} categories={categories} currentUser={currentUser} />} />
            
            <Route path="/ask" element={
                <Ask 
                  onAddQuestion={handleAddQuestion} 
                  currentUser={currentUser} 
                  categories={categories}
                  onAddCategory={handleAddCategory}
                  onLogin={loginWithEmail}
                  onRegister={registerWithEmail}
                  onGoogleLogin={loginWithGoogle}
                />
            } />
            <Route path="/notifications" element={<Notifications currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/messages" element={<Messages currentUser={currentUser} />} />
            <Route path="/messages/:userId" element={<ChatDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/ai-chat" element={<AiChat />} />
            
            <Route path="/question/:slug" element={
                <QuestionDetail 
                  questions={questions} 
                  currentUser={currentUser} 
                  onAddAnswer={handleAddAnswer} 
                  onMarkBestAnswer={handleMarkBestAnswer}
                  onVerifyAnswer={handleVerifyAnswer}
                  onOpenAuth={() => setShowGlobalAuthModal(true)} 
                  onEditQuestion={handleEditQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onHideQuestion={handleHideQuestion}
                  onEditAnswer={handleEditAnswer}
                  onDeleteAnswer={handleDeleteAnswer}
                  onHideAnswer={handleHideAnswer}
                />
            } />
            
            <Route path="/games" element={<GameZone />} />
            
            <Route path="/profile" element={<Profile user={currentUser} questions={questions} onLogout={handleLogout} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            <Route path="/profile/:userId" element={<Profile user={currentUser} questions={questions} onLogout={handleLogout} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />
            
            <Route path="/expert-register" element={<ExpertRegistration currentUser={currentUser} onSubmitApplication={handleExpertRegistration} />} />
            
            <Route path="/blog" element={<BlogList />} />
            <Route path="/blog/:slug" element={<BlogDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />

            <Route path="/documents" element={<DocumentList />} />
            <Route path="/documents/:slug" element={<DocumentDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />} />

            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
