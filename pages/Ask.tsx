
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft, RefreshCw, Lightbulb, Plus, X, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { Question, User } from '../types';
import { suggestTitles } from '../services/gemini';
import { AuthModal } from '../components/AuthModal';

interface AskProps {
  onAddQuestion: (q: Question) => void;
  currentUser: User;
  categories: string[];
  onAddCategory: (category: string) => void;
  // Auth Functions
  onLogin: (email: string, pass: string) => Promise<User>;
  onRegister: (email: string, pass: string, name: string) => Promise<User>;
  onGoogleLogin: () => Promise<User>;
}

export const Ask: React.FC<AskProps> = ({ 
  onAddQuestion, 
  currentUser, 
  categories, 
  onAddCategory,
  onLogin,
  onRegister,
  onGoogleLogin
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  
  // Image State
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  // Custom Category State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to fetch suggestions
  const fetchSuggestions = async (currentTitle: string, currentContent: string) => {
    if (currentTitle.length < 5) return;
    
    setIsSuggesting(true);
    const results = await suggestTitles(currentTitle, currentContent);
    setSuggestions(results);
    setIsSuggesting(false);
  };

  // Debounce suggestion on title change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (title.length > 5) {
        fetchSuggestions(title, content);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title]); 
  
  // Clean up object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  // Focus input when adding category
  useEffect(() => {
    if (isAddingCategory && newCategoryInputRef.current) {
      newCategoryInputRef.current.focus();
    }
  }, [isAddingCategory]);

  const handleAddNewCategory = () => {
    if (newCategoryName.trim()) {
      onAddCategory(newCategoryName.trim());
      setCategory(newCategoryName.trim());
      setNewCategoryName('');
      setIsAddingCategory(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const totalImages = selectedImages.length + filesArray.length;
      
      if (totalImages > 3) {
        alert("Mẹ chỉ được đăng tối đa 3 ảnh thôi nhé!");
        return;
      }

      const newImages = [...selectedImages, ...filesArray];
      setSelectedImages(newImages);

      // Generate previews
      const newPreviews = filesArray.map(file => URL.createObjectURL(file));
      setPreviewUrls([...previewUrls, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);

    const newPreviews = [...previewUrls];
    URL.revokeObjectURL(newPreviews[index]); // Cleanup
    newPreviews.splice(index, 1);
    setPreviewUrls(newPreviews);
  };

  const finalizeSubmission = (user: User) => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      title,
      content,
      category,
      author: user,
      answers: [],
      likes: 0,
      views: 0,
      createdAt: new Date().toISOString(),
      images: previewUrls 
    };

    onAddQuestion(newQuestion);
    setIsSubmitting(false);
    navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    // Check if user is Guest
    if (currentUser.isGuest) {
      setShowAuthModal(true);
    } else {
      finalizeSubmission(currentUser);
    }
  };

  // Auth Wrappers
  const handleEmailLogin = async (email: string, pass: string) => {
    const user = await onLogin(email, pass);
    finalizeSubmission(user);
  };

  const handleRegister = async (email: string, pass: string, name: string) => {
    const user = await onRegister(email, pass, name);
    finalizeSubmission(user);
  };

  const handleGoogleAuth = async () => {
    const user = await onGoogleLogin();
    finalizeSubmission(user);
  };

  const handleGuestContinue = () => {
    setShowAuthModal(false);
    finalizeSubmission(currentUser); // Current user is already Guest
  };

  return (
    <div className="px-4 pb-10 max-w-3xl mx-auto">
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleEmailLogin}
        onRegister={handleRegister}
        onGoogleLogin={handleGoogleAuth}
        onGuestContinue={handleGuestContinue}
      />

      <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-textGray hover:text-primary transition-colors">
        <ArrowLeft size={20} className="mr-1" /> Quay lại
      </button>

      <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 animate-fade-in">
        <h1 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
          <Sparkles className="text-accent" />
          Đặt câu hỏi mới
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-textDark">Tiêu đề câu hỏi</label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Bé 6 tháng tuổi bị sốt mọc răng..."
                className="w-full p-4 pr-12 rounded-xl border-2 border-gray-100 focus:border-secondary focus:ring-4 focus:ring-secondary/20 focus:outline-none transition-all"
                required
              />
              {isSuggesting && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <RefreshCw className="animate-spin text-primary" size={20} />
                </div>
              )}
            </div>
            
            {/* Suggestions Area */}
            {(suggestions.length > 0 || isSuggesting) && (
              <div className="mt-3 bg-gradient-to-br from-cream to-white p-4 rounded-xl border border-secondary/30 shadow-sm animate-pop-in">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs text-primary font-bold flex items-center gap-1">
                     <Lightbulb size={14} className="text-accent" />
                     Gợi ý từ Asking AI:
                  </p>
                  {!isSuggesting && (
                    <button 
                      type="button" 
                      onClick={() => fetchSuggestions(title, content)}
                      className="text-[10px] text-textGray hover:text-primary flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Làm mới
                    </button>
                  )}
                </div>
                
                {isSuggesting ? (
                  <div className="space-y-2 opacity-50">
                    <div className="h-8 bg-gray-200 rounded-lg w-3/4 animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded-lg w-1/2 animate-pulse"></div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {suggestions.map((s, idx) => (
                      <button 
                        key={idx}
                        type="button"
                        onClick={() => setTitle(s)}
                        className="text-sm bg-white text-textDark px-4 py-2 rounded-lg border border-gray-100 hover:border-primary hover:text-primary hover:shadow-md transition-all text-left flex items-center group"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover:bg-primary mr-2 transition-colors"></span>
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-textDark mb-2">Chủ đề</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${category === cat ? 'bg-primary text-white shadow-md transform scale-105' : 'bg-gray-50 text-textGray hover:bg-gray-100'}`}
                >
                  {cat}
                </button>
              ))}
              
              {/* Add New Category Button/Input */}
              {isAddingCategory ? (
                <div className="flex items-center gap-1 bg-white border-2 border-primary rounded-lg px-2 overflow-hidden">
                   <input 
                      ref={newCategoryInputRef}
                      type="text" 
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewCategory();
                        }
                        if (e.key === 'Escape') setIsAddingCategory(false);
                      }}
                      onBlur={() => {
                        // Small timeout to allow click on check button to fire
                        setTimeout(() => {
                           if(newCategoryName) handleAddNewCategory();
                           else setIsAddingCategory(false);
                        }, 200);
                      }}
                      className="w-24 text-sm py-2 outline-none text-primary font-medium"
                      placeholder="Chủ đề..."
                   />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-dashed border-gray-300 text-textGray hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <Plus size={16} /> Khác
                </button>
              )}
            </div>
          </div>

          {/* Image Upload Section */}
          <div>
            <label className="block text-sm font-bold text-textDark mb-2 flex items-center justify-between">
               <span>Hình ảnh minh họa</span>
               <span className="text-xs font-normal text-textGray">Tối đa 3 ảnh</span>
            </label>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
               {previewUrls.map((url, index) => (
                 <div key={index} className="relative w-24 h-24 flex-shrink-0 animate-pop-in group">
                    <img src={url} alt="Preview" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md hover:bg-red-50 transition-colors border border-gray-100"
                    >
                      <X size={14} />
                    </button>
                 </div>
               ))}

               {previewUrls.length < 3 && (
                 <label className="w-24 h-24 flex-shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary hover:bg-blue-50/50 transition-all text-textGray hover:text-primary">
                    <div className="bg-gray-100 p-2 rounded-full mb-1 group-hover:bg-white">
                       <ImageIcon size={20} />
                    </div>
                    <span className="text-[10px] font-bold">Thêm ảnh</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      onChange={handleImageChange}
                      className="hidden"
                    />
                 </label>
               )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-textDark mb-2">Chi tiết</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onBlur={() => {
                if (title.length > 5) fetchSuggestions(title, content);
              }}
              placeholder="Mô tả chi tiết hơn về vấn đề của mẹ để nhận được câu trả lời chính xác nhất..."
              className="w-full p-4 rounded-xl border-2 border-gray-100 focus:border-secondary focus:ring-4 focus:ring-secondary/20 focus:outline-none h-40 resize-none transition-all"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-primary text-white font-bold text-lg py-4 rounded-full shadow-lg hover:bg-[#25A99C] hover:shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 disabled:bg-gray-300"
          >
            {isSubmitting ? (
              <span>Đang xử lý...</span>
            ) : (
              <>
                <span>Gửi câu hỏi</span>
                <ArrowLeft className="rotate-180" size={20} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
