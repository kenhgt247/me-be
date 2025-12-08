
import React, { useState, useEffect } from 'react';
// @ts-ignore
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Ask } from './pages/Ask';
import { QuestionDetail } from './pages/QuestionDetail';
import { GameZone } from './pages/GameZone';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Messages } from './pages/Messages';
import { ChatDetail } from './pages/ChatDetail';
import { AiChat } from './pages/AiChat';
import { ExpertRegistration } from './pages/ExpertRegistration';
import { About, Terms, Privacy, Contact } from './pages/StaticPages';
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
  deleteAnswerFromDb 
} from './services/db';

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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [questions, setQuestions] = useState<Question[]>([]); 
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [authLoading, setAuthLoading] = useState(true);
  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);

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

  const handleLogout = async () => {
    await logoutUser();
  };

  const handleAddQuestion = async (q: Question) => {
    await addQuestionToDb(q);
  };

  const handleEditQuestion = async (id: string, title: string, content: string) => {
    await updateQuestionInDb(id, { title, content });
  };

  const handleDeleteQuestion = async (id: string) => {
    await deleteQuestionFromDb(id);
  };

  const handleHideQuestion = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (q) {
      await updateQuestionInDb(id, { isHidden: !q.isHidden });
    }
  };

  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
    }
  };

  const handleAddAnswer = async (qId: string, answer: Answer) => {
    const q = questions.find(i => i.id === qId);
    if (q) {
        await addAnswerToDb(q, answer);
    }
  };

  const handleEditAnswer = async (qId: string, aId: string, newContent: string) => {
    await updateAnswerInDb(qId, aId, { content: newContent });
  };

  const handleDeleteAnswer = async (qId: string, aId: string) => {
    await deleteAnswerFromDb(qId, aId);
  };

  const handleHideAnswer = async (qId: string, aId: string) => {
    const q = questions.find(q => q.id === qId);
    const a = q?.answers.find(ans => ans.id === aId);
    if (a) {
      await updateAnswerInDb(qId, aId, { isHidden: !a.isHidden });
    }
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
      if (a.id === answerId) {
        return { ...a, isExpertVerified: !a.isExpertVerified };
      }
      return a;
    });
    await updateQuestionInDb(questionId, { answers: updatedAnswers });
  };

  const handleExpertRegistration = (data: any) => {
    setCurrentUser({
      ...currentUser,
      expertStatus: 'pending',
      specialty: data.specialty,
      workplace: data.workplace
    });
  };

  const handleGlobalLogin = async (email: string, pass: string) => { await loginWithEmail(email, pass); };
  const handleGlobalRegister = async (email: string, pass: string, name: string) => { await registerWithEmail(email, pass, name); };
  const handleGlobalGoogle = async () => { await loginWithGoogle(); };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-cream text-primary font-bold">Đang tải dữ liệu...</div>;

  return (
    <HashRouter>
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
        <Route path="/" element={
          <Layout>
            <Home questions={questions} categories={categories} />
          </Layout>
        } />
        <Route path="/ask" element={
          <Layout>
            <Ask 
              onAddQuestion={handleAddQuestion} 
              currentUser={currentUser} 
              categories={categories}
              onAddCategory={handleAddCategory}
              onLogin={loginWithEmail}
              onRegister={registerWithEmail}
              onGoogleLogin={loginWithGoogle}
            />
          </Layout>
        } />
        <Route path="/notifications" element={
          <Layout>
            <Notifications 
              currentUser={currentUser}
              onOpenAuth={() => setShowGlobalAuthModal(true)}
            />
          </Layout>
        } />
        <Route path="/messages" element={
          <Layout>
            <Messages />
          </Layout>
        } />
        <Route path="/messages/:userId" element={
          <Layout>
            <ChatDetail currentUser={currentUser} onOpenAuth={() => setShowGlobalAuthModal(true)} />
          </Layout>
        } />
        <Route path="/ai-chat" element={
          <Layout>
            <AiChat />
          </Layout>
        } />
        <Route path="/question/:id" element={
          <Layout>
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
          </Layout>
        } />
        <Route path="/games" element={
          <Layout>
            <GameZone />
          </Layout>
        } />
        
        {/* User Self Profile */}
        <Route path="/profile" element={
          <Layout>
            <Profile 
              user={currentUser} 
              questions={questions} 
              onLogout={handleLogout}
              onOpenAuth={() => setShowGlobalAuthModal(true)}
            />
          </Layout>
        } />

        {/* Public Profile Route */}
        <Route path="/profile/:userId" element={
          <Layout>
            <Profile 
              user={currentUser} 
              questions={questions} 
              onLogout={handleLogout}
              onOpenAuth={() => setShowGlobalAuthModal(true)}
            />
          </Layout>
        } />
        
        <Route path="/expert-register" element={
          <Layout>
            <ExpertRegistration currentUser={currentUser} onSubmitApplication={handleExpertRegistration} />
          </Layout>
        } />
        
        <Route path="/about" element={<Layout><About /></Layout>} />
        <Route path="/terms" element={<Layout><Terms /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
