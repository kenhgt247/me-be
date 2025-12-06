
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Ask } from './pages/Ask';
import { QuestionDetail } from './pages/QuestionDetail';
import { GameZone } from './pages/GameZone';
import { Profile } from './pages/Profile';
import { ExpertRegistration } from './pages/ExpertRegistration';
import { About, Terms, Privacy, Contact } from './pages/StaticPages';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthModal } from './components/AuthModal';
import { Question, User, Answer, CATEGORIES } from './types';
import { subscribeToAuthChanges, logoutUser, loginWithGoogle, loginWithEmail, registerWithEmail } from './services/auth';

// Default Guest User
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

const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    title: 'Bé 2 tuổi biếng ăn phải làm sao?',
    content: 'Bé nhà mình dạo này cứ đến bữa là khóc, không chịu ăn cháo. Mình đã đổi món liên tục nhưng không cải thiện. Các mẹ có kinh nghiệm gì không ạ?',
    category: '1-3 tuổi',
    author: { id: 'u2', name: 'Mẹ Sóc', avatar: 'https://picsum.photos/id/65/200/200', isExpert: false, isGuest: false },
    answers: [
      {
        id: 'a1',
        questionId: 'q1',
        author: { id: 'e1', name: 'BS. Lan Anh', avatar: 'https://picsum.photos/id/66/200/200', isExpert: true, specialty: 'Bác sĩ Nhi khoa', isGuest: false },
        content: 'Chào mẹ Sóc. Ở giai đoạn 2 tuổi, bé bắt đầu có tâm lý "khủng hoảng tuổi lên 2" và muốn khẳng định bản thân, bao gồm cả việc ăn uống. Mẹ thử cho bé tự bốc hoặc dùng thìa xem sao nhé. Đừng ép bé ăn, hãy để bữa ăn vui vẻ.',
        likes: 12,
        isBestAnswer: true,
        isExpertVerified: true,
        createdAt: '2023-10-25T10:00:00Z',
        isAi: false
      }
    ],
    likes: 5,
    views: 120,
    createdAt: '2023-10-25T08:00:00Z'
  },
  {
    id: 'q2',
    title: 'Nên cho bé học tiếng Anh từ mấy tuổi?',
    content: 'Mình thấy nhiều trung tâm nhận bé từ 3 tuổi. Không biết sớm quá có ảnh hưởng đến tiếng Việt của con không?',
    category: 'Giáo dục sớm',
    author: { id: 'u3', name: 'Bố Ken', avatar: 'https://picsum.photos/id/68/200/200', isExpert: false, isGuest: false },
    answers: [],
    likes: 2,
    views: 45,
    createdAt: '2023-10-26T09:30:00Z'
  },
  {
     id: 'q3',
     title: 'Thực đơn ăn dặm cho bé 6 tháng?',
     content: 'Bắp nhà mình sắp 6 tháng, mình định cho ăn theo kiểu Nhật. Mẹ nào có thực đơn chia sẻ mình với ạ.',
     category: 'Dinh dưỡng',
     author: { id: 'u4', name: 'Mẹ Bắp', avatar: 'https://picsum.photos/id/64/200/200', isExpert: false, isGuest: false },
     answers: [],
     likes: 8,
     views: 200,
     createdAt: '2024-01-15T09:30:00Z'
  }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [categories, setCategories] = useState<string[]>(CATEGORIES);
  const [authLoading, setAuthLoading] = useState(true);
  const [showGlobalAuthModal, setShowGlobalAuthModal] = useState(false);

  // Subscribe to Real Auth Changes
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

  const handleLogout = async () => {
    await logoutUser();
  };

  // Question CRUD
  const handleAddQuestion = (q: Question) => {
    setQuestions([q, ...questions]);
  };

  const handleEditQuestion = (id: string, title: string, content: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, title, content } : q));
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleHideQuestion = (id: string) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, isHidden: !q.isHidden } : q));
  };

  const handleAddCategory = (newCategory: string) => {
    if (!categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
    }
  };

  // Answer CRUD
  const handleAddAnswer = (qId: string, answer: Answer) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, answers: [...q.answers, answer] };
      }
      return q;
    }));
  };

  const handleEditAnswer = (qId: string, aId: string, newContent: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: q.answers.map(a => a.id === aId ? { ...a, content: newContent } : a)
        };
      }
      return q;
    }));
  };

  const handleDeleteAnswer = (qId: string, aId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: q.answers.filter(a => a.id !== aId)
        };
      }
      return q;
    }));
  };

  const handleHideAnswer = (qId: string, aId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return {
          ...q,
          answers: q.answers.map(a => a.id === aId ? { ...a, isHidden: !a.isHidden } : a)
        };
      }
      return q;
    }));
  };

  const handleMarkBestAnswer = (questionId: string, answerId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updatedAnswers = q.answers.map(a => ({
          ...a,
          isBestAnswer: a.id === answerId ? !a.isBestAnswer : false // Toggle selection, unique best answer
        }));
        return { ...q, answers: updatedAnswers };
      }
      return q;
    }));
  };

  const handleVerifyAnswer = (questionId: string, answerId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updatedAnswers = q.answers.map(a => {
          if (a.id === answerId) {
            return { ...a, isExpertVerified: !a.isExpertVerified }; // Toggle verification
          }
          return a;
        });
        return { ...q, answers: updatedAnswers };
      }
      return q;
    }));
  };

  const handleExpertRegistration = (data: any) => {
    setCurrentUser({
      ...currentUser,
      expertStatus: 'pending',
      specialty: data.specialty,
      workplace: data.workplace
    });
  };

  // Wrapper functions for Global Auth Modal
  const handleGlobalLogin = async (email: string, pass: string) => { await loginWithEmail(email, pass); };
  const handleGlobalRegister = async (email: string, pass: string, name: string) => { await registerWithEmail(email, pass, name); };
  const handleGlobalGoogle = async () => { await loginWithGoogle(); };

  return (
    <HashRouter>
      <PWAInstallPrompt />
      
      {/* Global Auth Modal for Profile/Navigation */}
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
        <Route path="/question/:id" element={
          <Layout>
            <QuestionDetail 
              questions={questions} 
              currentUser={currentUser} 
              onAddAnswer={handleAddAnswer} 
              onMarkBestAnswer={handleMarkBestAnswer}
              onVerifyAnswer={handleVerifyAnswer}
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
        
        {/* Expert Registration */}
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
