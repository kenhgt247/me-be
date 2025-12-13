import { Story, User } from '../types';

// Dữ liệu giả lập ban đầu (Database giả)
let MOCK_DB_STORIES: Story[] = [
  {
    id: 's1',
    userId: 'u2',
    userName: 'Bác sĩ Thảo',
    userAvatar: 'https://i.pravatar.cc/150?u=b',
    userIsExpert: true,
    mediaUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=80',
    mediaType: 'image',
    createdAt: new Date().toISOString(), // Vừa đăng
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    viewers: [],
    likes: []
  },
  {
    id: 's2',
    userId: 'u3',
    userName: 'Mẹ Bắp',
    userAvatar: 'https://i.pravatar.cc/150?u=c',
    mediaUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80',
    mediaType: 'image',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Đăng 2 tiếng trước
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
    viewers: [],
    likes: []
  }
];

// 1. Lấy danh sách Story (Chỉ lấy tin còn hạn)
export const fetchStories = async (currentUser: User): Promise<Story[]> => {
  // Giả lập độ trễ mạng
  await new Promise(resolve => setTimeout(resolve, 500));

  const now = new Date().toISOString();
  
  // Lọc tin chưa hết hạn
  const activeStories = MOCK_DB_STORIES.filter(s => s.expiresAt > now);
  
  // Sắp xếp tin mới nhất lên đầu
  return activeStories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

// 2. Đăng Story mới
export const createStory = async (user: User, file: File): Promise<Story> => {
  await new Promise(resolve => setTimeout(resolve, 1000)); // Giả lập upload lâu hơn chút

  // Giả lập upload ảnh (Trong thực tế bạn sẽ upload lên Firebase/AWS S3 lấy về URL)
  const fakeImageUrl = URL.createObjectURL(file);

  const newStory: Story = {
    id: `s_${Date.now()}`,
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    userIsExpert: user.isExpert,
    mediaUrl: fakeImageUrl,
    mediaType: 'image', // Tạm thời chỉ hỗ trợ ảnh
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Hết hạn sau 24h
    viewers: [],
    likes: []
  };

  // Lưu vào DB giả
  MOCK_DB_STORIES.unshift(newStory);
  
  return newStory;
};

// 3. Đánh dấu đã xem
export const markStoryViewed = async (storyId: string, userId: string) => {
  const story = MOCK_DB_STORIES.find(s => s.id === storyId);
  if (story && !story.viewers.includes(userId)) {
    story.viewers.push(userId);
  }
};
