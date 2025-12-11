import React from 'react';
// @ts-ignore
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LayoutDashboard, Users, FileQuestion, GraduationCap, Flag, LogOut, Menu, X, ArrowLeft, Database, Gamepad2, Megaphone, BookOpen, FileText } from 'lucide-react';
import { User as UserType } from '../types';

interface AdminLayoutProps {
	currentUser: UserType;
	onLogout: () => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentUser, onLogout }) => {
	// Khởi tạo isSidebarOpen là false trên di động
	const [isSidebarOpen, setSidebarOpen] = React.useState(window.innerWidth >= 768); 
	const location = useLocation();
	const navigate = useNavigate();

	// Basic Security Check (Giữ nguyên)
	if (!currentUser || (!currentUser.isAdmin && !currentUser.isExpert)) {
		return (
			<div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
				<div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
					<div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
						<LogOut size={32} />
					</div>
					<h2 className="text-2xl font-bold text-gray-800 mb-2">Truy cập bị từ chối</h2>
					<p className="text-gray-500 mb-6">Bạn không có quyền truy cập vào khu vực quản trị.</p>
					<button onClick={() => navigate('/')} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
						Về trang chủ
					</button>
				</div>
			</div>
		);
	}

	const navItems = [
		{ path: '/admin', label: 'Tổng quan', icon: <LayoutDashboard size={20} />, roles: ['admin'] },
		{ path: '/admin/users', label: 'Người dùng', icon: <Users size={20} />, roles: ['admin'] },
		{ path: '/admin/experts', label: 'Chuyên gia', icon: <GraduationCap size={20} />, roles: ['admin'] },
		{ path: '/admin/questions', label: 'Câu hỏi', icon: <FileQuestion size={20} />, roles: ['admin'] },
		{ path: '/admin/blog', label: 'Blog', icon: <BookOpen size={20} />, roles: ['admin', 'expert'] },
		{ path: '/admin/documents', label: 'Tài liệu', icon: <FileText size={20} />, roles: ['admin', 'expert'] },
		{ path: '/admin/games', label: 'Quản lý Game', icon: <Gamepad2 size={20} />, roles: ['admin'] },
		{ path: '/admin/reports', label: 'Báo cáo', icon: <Flag size={20} />, roles: ['admin'] },
		{ path: '/admin/ads', label: 'Quảng cáo', icon: <Megaphone size={20} />, roles: ['admin'] },
		{ path: '/admin/seed', label: 'Sinh dữ liệu (Demo)', icon: <Database size={20} />, roles: ['admin'] },
	];

	// Tìm tiêu đề của trang hiện tại
	const currentItem = navItems.find(item => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path)));
	const pageTitle = currentItem?.label || 'Tổng quan';

	// Đóng sidebar khi click vào menu trên di động
	const handleLinkClick = () => {
		if (window.innerWidth < 768) {
			setSidebarOpen(false);
		}
	};
	
	// Khắc phục lỗi sidebar mở/đóng trên di động
	React.useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth >= 768) {
				setSidebarOpen(true);
			}
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);
	

	return (
		<div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
			
			{/* SIDEBAR */}
			<aside 
				className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 md:flex-shrink-0`}
			>
				<div className="h-16 flex items-center px-6 border-b border-gray-100">
					<Link to="/" className="flex items-center gap-2 text-xl font-black text-gray-800 tracking-tight hover:opacity-80">
						<span className="bg-blue-600 text-white p-1 rounded-md text-sm">A</span>sking
					</Link>
					<button onClick={() => setSidebarOpen(false)} className="md:hidden ml-auto text-gray-500 hover:text-gray-900 p-2 rounded-full">
						<X size={24} />
					</button>
				</div>

				<nav className="p-4 space-y-1">
					{navItems.filter(item => item.roles.includes(currentUser.isAdmin ? 'admin' : 'expert')).map(item => {
						const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
						return (
							<Link 
								key={item.path} 
								to={item.path}
								onClick={handleLinkClick} {/* <-- Xử lý đóng sidebar khi điều hướng */}
								className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
									isActive 
									? 'bg-blue-50 text-blue-700' 
									: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
								}`}
							>
								{item.icon}
								{item.label}
							</Link>
						)
					})}
				</nav>

				<div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
					<div className="flex items-center gap-3 mb-4 px-2">
						<img src={currentUser.avatar} className="w-8 h-8 rounded-full bg-gray-200" />
						<div className="flex-1 min-w-0">
							<p className="text-sm font-bold truncate">{currentUser.name}</p>
							<p className="text-xs text-gray-500">{currentUser.isAdmin ? 'Administrator' : 'Expert'}</p>
						</div>
					</div>
					<button 
						onClick={onLogout}
						className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
					>
						<LogOut size={16} /> Đăng xuất
					</button>
				</div>
			</aside>

			{/* OVERLAY (Dành cho Mobile) */}
			{isSidebarOpen && window.innerWidth < 768 && (
				<div
					onClick={() => setSidebarOpen(false)}
					className="fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-200"
					aria-hidden="true"
				/>
			)}

			{/* MAIN CONTENT */}
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				{/* TOP HEADER */}
				<header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8">
					<div className="flex items-center gap-4">
						{/* Nút mở/đóng sidebar */}
						<button onClick={() => setSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 text-gray-500">
							{isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
						</button>
						{/* Tiêu đề trang hiện tại */}
						<h2 className="text-lg font-bold text-gray-800 truncate">
							{pageTitle}
						</h2>
					</div>
					<Link to="/" className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600">
						Xem trang chủ <ArrowLeft size={16} />
					</Link>
				</header>

				<main className="flex-1 overflow-y-auto p-4 md:p-8">
					<Outlet />
				</main>
			</div>

		</div>
	);
};
