import React, { useEffect, useState } from 'react';
// @ts-ignore
import { useParams, useNavigate, Link } from 'react-router-dom';
// Giả định hàm service đã được sửa: fetchBlogComments(postId: string, lastCommentId?: string)
import { fetchPostBySlug, fetchRelatedPosts, fetchBlogComments, addBlogComment } from '../services/blog'; 
import { loginAnonymously } from '../services/auth';
import { Loader2, ArrowLeft, Calendar, User as UserIcon, Share2, MessageCircle, Send, PlayCircle, ExternalLink, ShieldCheck } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { ShareModal } from '../components/ShareModal';

// --- HẰNG SỐ PHÂN TRANG ---
const PAGE_SIZE = 5; // Số lượng bình luận hiển thị ban đầu và mỗi lần tải thêm

// Khai báo lại interface BlogComment nếu cần thêm thuộc tính UI
interface BlogCommentWithUI extends BlogComment {
    // Nếu có logic 'Xem thêm/Thu gọn' cho nội dung dài, bạn có thể thêm:
    // isExpanded?: boolean; 
}

export const BlogDetail: React.FC<{ currentUser: User; onOpenAuth: () => void }> = ({ currentUser, onOpenAuth }) => {
	const { slug } = useParams<{ slug: string }>();
	const navigate = useNavigate();
	const [post, setPost] = useState<BlogPost | null>(null);
	const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
	const [comments, setComments] = useState<BlogCommentWithUI[]>([]);
	const [loading, setLoading] = useState(true);
	
	// --- STATE MỚI CHO PHÂN TRANG ---
	const [hasMore, setHasMore] = useState(false); // Còn bình luận để tải không?
	const [isFetchingMore, setIsFetchingMore] = useState(false); // Đang tải thêm không?

	const [commentContent, setCommentContent] = useState('');
	const [submittingComment, setSubmittingComment] = useState(false);
	const [showShare, setShowShare] = useState(false);

	useEffect(() => {
		if (slug) loadData(slug);
	}, [slug]);

	// --- HÀM TẢI DỮ LIỆU BAN ĐẦU (TẢI 5 BÌNH LUẬN ĐẦU TIÊN) ---
	const loadData = async (slug: string) => {
		setLoading(true);
		const postData = await fetchPostBySlug(slug);
		if (postData) {
			
			// Lấy các bài viết liên quan (Toàn bộ)
			const related = await fetchRelatedPosts(postData.id, postData.categoryId);
			
			// Tải 5 bình luận đầu tiên
			const initialComments = await fetchBlogComments(postData.id); 

			setPost(postData);
			setRelatedPosts(related);
			setComments(initialComments as BlogCommentWithUI[]);
			
			// Kiểm tra còn bình luận để tải nữa không
			setHasMore(initialComments.length === PAGE_SIZE); 
		}
		setLoading(false);
	};
    
    // --- HÀM TẢI THÊM BÌNH LUẬN ---
	const handleLoadMore = async () => {
		if (!post || isFetchingMore || !hasMore) return;

		setIsFetchingMore(true);
		const lastComment = comments[comments.length - 1]; // Lấy bình luận cuối cùng đã có
		
		try {
			// Tải 5 bình luận tiếp theo, bắt đầu sau bình luận cuối cùng
			const nextComments = await fetchBlogComments(post.id, lastComment.id); 

			setComments(prev => [
				...prev,
				...(nextComments as BlogCommentWithUI[])
			]);

			// Nếu số lượng tải được < PAGE_SIZE (5), tức là hết
			setHasMore(nextComments.length === PAGE_SIZE); 
		} catch (error) {
			console.error("Lỗi khi tải thêm bình luận:", error);
			setHasMore(false);
		} finally {
			setIsFetchingMore(false);
		}
	};


	// --- HÀM GỬI BÌNH LUẬN (TẢI LẠI TRANG 1 VÀ RESET PHÂN TRANG) ---
	const handleSendComment = async () => {
		if (!commentContent.trim() || !post) return;
		
		let user = currentUser;
		if (user.isGuest) {
			try {
				user = await loginAnonymously();
			} catch (e) {
				onOpenAuth();
				return;
			}
		}

		setSubmittingComment(true);
		await addBlogComment(user, post.id, commentContent);
		
        // Tải lại 5 bình luận đầu tiên (reset về trang 1)
		const initialComments = await fetchBlogComments(post.id);
		setComments(initialComments as BlogCommentWithUI[]);
        setHasMore(initialComments.length === PAGE_SIZE); // Đặt lại trạng thái "còn nữa"
        
		setCommentContent('');
		setSubmittingComment(false);
	};

	if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F7F7F5]"><Loader2 className="animate-spin text-primary" size={32} /></div>;
	
	if (!post) return <div className="p-10 text-center">Bài viết không tồn tại. <button onClick={() => navigate('/blog')} className="text-blue-500 underline">Quay lại</button></div>;

	return (
		<div className="min-h-screen bg-[#F7F7F5] pb-24 animate-fade-in pt-safe-top">
			{/* Nav (GIỮ NGUYÊN) */}
			<div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm">
				<button onClick={() => navigate('/blog')} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-textDark transition-colors">
					<ArrowLeft size={22} />
				</button>
				<span className="font-bold text-sm text-textDark uppercase tracking-wider">Bài viết chuyên gia</span>
				<button onClick={() => setShowShare(true)} className="p-2 -mr-2 hover:bg-gray-100 rounded-full text-blue-600 transition-colors">
					<Share2 size={20} />
				</button>
			</div>

			{/* Content (GIỮ NGUYÊN) */}
			<article className="max-w-3xl mx-auto bg-white min-h-screen shadow-sm md:my-6 md:rounded-[2rem] overflow-hidden">
				{/* ... (Cover, Meta, Title, Author, Excerpt, Embed, Main Content, Source - GIỮ NGUYÊN) ... */}
			</article>

			{/* Related Posts (GIỮ NGUYÊN) */}
			{relatedPosts.length > 0 && (
				<div className="max-w-3xl mx-auto px-4 py-8">
					{/* ... (Related Posts List - GIỮ NGUYÊN) ... */}
				</div>
			)}

			{/* Comments Section */}
			<div className="max-w-3xl mx-auto px-4 py-8 pb-32">
				<h3 className="font-bold text-xl text-textDark mb-4 flex items-center gap-2">
					<MessageCircle /> Bình luận ({post.commentCount || comments.length})
				</h3>
				
				{/* Comment List */}
				<div className="space-y-4 mb-6">
					{comments.map(c => (
						<div key={c.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
							<div className="flex items-center gap-2 mb-2">
								<img src={c.authorAvatar} className="w-6 h-6 rounded-full bg-gray-200" />
								<span className="font-bold text-sm text-textDark">{c.authorName}</span>
								{c.isExpert && <ShieldCheck size={12} className="text-blue-500" />}
								<span className="text-[10px] text-gray-400">• {new Date(c.createdAt).toLocaleDateString('vi-VN')}</span>
							</div>
							<p className="text-sm text-gray-700">{c.content}</p>
						</div>
					))}

                    {/* --- NÚT TẢI THÊM BÌNH LUẬN --- */}
                    {hasMore && (
                        <div className="pt-4 text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={isFetchingMore}
                                className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-full hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2 mx-auto disabled:opacity-70"
                            >
                                {isFetchingMore ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} /> Đang tải...
                                    </>
                                ) : (
                                    'Xem thêm bình luận'
                                )}
                            </button>
                        </div>
                    )}
				</div>

				{/* Input (GIỮ NGUYÊN) */}
				<div className="flex gap-2">
					<input 
						value={commentContent}
						onChange={e => setCommentContent(e.target.value)}
						className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary shadow-sm"
						placeholder="Viết bình luận..."
					/>
					<button 
						onClick={handleSendComment}
						disabled={!commentContent.trim() || submittingComment}
						className="bg-primary text-white p-3 rounded-xl shadow-lg active:scale-90 transition-transform disabled:opacity-50"
					>
						{submittingComment ? <Loader2 className="animate-spin" /> : <Send />}
					</button>
				</div>
			</div>

			{/* Share Modal (GIỮ NGUYÊN) */}
			<ShareModal 
				isOpen={showShare}
				onClose={() => setShowShare(false)}
				url={window.location.href}
				title={post.title}
			/>
		</div>
	);
};

const getYoutubeId = (url: string) => {
	const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
	const match = url.match(regExp);
	return (match && match[2].length === 11) ? match[2] : null;
};
