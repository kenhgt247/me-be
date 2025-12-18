import React, { useEffect, useState } from 'react';
import { AdConfig } from '../../types';
import { getAdConfig, updateAdConfig } from '../../services/ads';
import { 
  Save, Loader2, Megaphone, Monitor, LayoutTemplate, Sidebar, 
  Palette, Check, ExternalLink, Image as ImageIcon, MousePointerClick, 
  FileText, MessageSquare 
} from 'lucide-react';

// Danh sách màu Gradient mẫu
const GRADIENT_PRESETS = [
    { id: 'purple', label: 'Tím mộng mơ', class: 'from-indigo-500 to-purple-600' },
    { id: 'orange', label: 'Cam năng động', class: 'from-orange-400 to-pink-500' },
    { id: 'blue', label: 'Xanh tin cậy', class: 'from-blue-500 to-cyan-500' },
    { id: 'green', label: 'Xanh thiên nhiên', class: 'from-emerald-500 to-teal-600' },
    { id: 'dark', label: 'Đêm huyền bí', class: 'from-gray-800 to-gray-900' },
];

export const AdSettings: React.FC = () => {
  const [config, setConfig] = useState<AdConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const data = await getAdConfig();
    
    // Khởi tạo dữ liệu mặc định đầy đủ (Merge để tránh lỗi null)
    setConfig({
        ...data,
        // 1. Home Feed Native Ad
        homeAd: data.homeAd || {
            title: 'Gợi ý từ chuyên gia',
            content: 'Làm sao để bé phát triển chiều cao tối ưu trong giai đoạn vàng? Khám phá ngay giải pháp dinh dưỡng chuẩn Nhật.',
            imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80',
            ctaText: 'Xem chi tiết',
            link: '#',
            sponsorName: 'NutriGrow'
        },
        // 2. Sidebar Ad
        sidebarAd: data.sidebarAd || {
            enabled: true,
            title: 'Khóa học Ăn dặm',
            description: 'Giúp bé ăn ngon, mẹ nhàn tênh chỉ sau 7 ngày.',
            buttonText: 'Xem ngay',
            link: '#',
            gradient: 'from-indigo-500 to-purple-600'
        },
        // 3. Blog Native Ad
        blogFeedAd: data.blogFeedAd || {
            enabled: true,
            frequency: 4,
            title: 'Bí quyết giúp bé ngủ xuyên đêm',
            excerpt: 'Phương pháp Easy giúp bé tự ngủ, mẹ có thêm thời gian nghỉ ngơi.',
            imageUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80',
            ctaText: 'Tìm hiểu thêm',
            link: '#',
            sponsorName: 'Pampers'
        },
        // 4. Document Native Ad
        documentAd: data.documentAd || {
            enabled: true,
            frequency: 6,
            title: 'Tài liệu ôn thi Toán lớp 1',
            description: 'Bộ đề thi thử và bài tập ôn luyện giúp bé tự tin đạt điểm cao.',
            imageUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80',
            ctaText: 'Tải ngay',
            link: '#',
            sponsorName: 'EduMall'
        },
        // 5. Question Detail Ad (MỚI)
        questionDetailAd: data.questionDetailAd || {
            enabled: true,
            title: 'Sữa dinh dưỡng cao cấp',
            description: 'Bổ sung DHA và Canxi giúp bé phát triển toàn diện.',
            imageUrl: 'https://images.unsplash.com/photo-1632053009576-925cb73b222a?auto=format&fit=crop&w=800&q=80',
            ctaText: 'Mua ngay',
            link: '#',
            sponsorName: 'NutriGold'
        }
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    await updateAdConfig(config);
    setSaving(false);
    alert("Đã lưu cấu hình quảng cáo!");
  };

  if (loading || !config) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto"/></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
        
        {/* --- HEADER --- */}
        <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Megaphone size={24}/></div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Quảng cáo</h1>
                <p className="text-gray-500 text-sm">Cấu hình hiển thị AdSense và Native Ads trên toàn hệ thống.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* 1. CẤU HÌNH FEED ADS (HOME) */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 h-full">
                    <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <Monitor size={18}/> Quảng cáo Feed (Trang chủ)
                    </h2>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <div>
                                <span className="block font-bold text-gray-900 text-sm">Trạng thái</span>
                                <span className="text-xs text-gray-500">Bật/Tắt quảng cáo trên Feed</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={config.isEnabled} onChange={e => setConfig({...config, isEnabled: e.target.checked})} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        {/* Provider Toggle */}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfig({...config, provider: 'adsense'})} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${config.provider === 'adsense' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}>
                                <span className="text-lg">G</span> Google AdSense
                            </button>
                            <button onClick={() => setConfig({...config, provider: 'custom'})} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${config.provider === 'custom' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}>
                                <ImageIcon size={20}/> Native Image
                            </button>
                        </div>

                        {/* Config Inputs */}
                        {config.provider === 'adsense' ? (
                            <div className="space-y-4 animate-fade-in bg-blue-50 p-5 rounded-2xl border border-blue-100">
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">Publisher ID</label>
                                    <input value={config.adsenseClientId} onChange={e => setConfig({...config, adsenseClientId: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm outline-none" placeholder="ca-pub-..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">Slot ID</label>
                                    <input value={config.adsenseSlotId} onChange={e => setConfig({...config, adsenseSlotId: e.target.value})} className="w-full bg-white border border-blue-200 rounded-xl p-3 text-sm outline-none" placeholder="1234567890" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nhãn tài trợ</label>
                                        <input value={config.homeAd?.sponsorName} onChange={e => setConfig({...config, homeAd: {...config.homeAd!, sponsorName: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black" placeholder="Tài trợ"/>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 mb-1">Nút bấm (CTA)</label>
                                        <input value={config.homeAd?.ctaText} onChange={e => setConfig({...config, homeAd: {...config.homeAd!, ctaText: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề</label>
                                    <input value={config.homeAd?.title} onChange={e => setConfig({...config, homeAd: {...config.homeAd!, title: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm font-bold outline-none focus:border-black"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nội dung</label>
                                    <textarea rows={3} value={config.homeAd?.content} onChange={e => setConfig({...config, homeAd: {...config.homeAd!, content: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black resize-none"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Link Ảnh</label>
                                    <input value={config.homeAd?.imageUrl} onChange={e => setConfig({...config, homeAd: {...config.homeAd!, imageUrl: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Link Đích</label>
                                    <input value={config.homeAd?.link} onChange={e => setConfig({...config, homeAd: {...config.homeAd!, link: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm text-blue-600 outline-none focus:border-black"/>
                                </div>
                            </div>
                        )}

                        <div className="pt-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tần suất xuất hiện</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="3" max="20" value={config.frequency} onChange={e => setConfig({...config, frequency: parseInt(e.target.value)})} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                <span className="font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-lg text-sm">{config.frequency} bài</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. CẤU HÌNH SIDEBAR ADS */}
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 h-full">
                    <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <Sidebar size={18}/> Quảng cáo Sidebar (Blog)
                    </h2>
                    <div className="space-y-5">
                        {/* Preview */}
                        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.sidebarAd?.gradient} p-6 text-white shadow-lg text-center`}>
                            <div className="relative z-10 flex flex-col items-center">
                                <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-3 border border-white/20">Quảng cáo</span>
                                <h4 className="font-bold text-lg mb-1">{config.sidebarAd?.title}</h4>
                                <p className="text-xs text-white/90 mb-4 px-4 line-clamp-2">{config.sidebarAd?.description}</p>
                                <button className="bg-white text-gray-900 px-6 py-2 rounded-full text-xs font-bold w-full shadow-sm">{config.sidebarAd?.buttonText}</button>
                            </div>
                        </div>
                        {/* Inputs */}
                        <div className="space-y-3 pt-2">
                            <input value={config.sidebarAd?.title} onChange={e => setConfig({...config, sidebarAd: {...config.sidebarAd!, title: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="Tiêu đề"/>
                            <input value={config.sidebarAd?.link} onChange={e => setConfig({...config, sidebarAd: {...config.sidebarAd!, link: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm text-blue-600" placeholder="Link đích"/>
                            <div className="flex gap-2">
                                {GRADIENT_PRESETS.map(preset => (
                                    <button key={preset.id} onClick={() => setConfig({...config, sidebarAd: {...config.sidebarAd!, gradient: preset.class}})} className={`w-6 h-6 rounded-full bg-gradient-to-br ${preset.class} border-2 ${config.sidebarAd?.gradient === preset.class ? 'border-black' : 'border-transparent'}`} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CẤU HÌNH BLOG FEED ADS (NATIVE) */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 h-full">
                    <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <LayoutTemplate size={18}/> Quảng cáo Xen kẽ Blog (Native Ad)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="font-bold text-sm">Bật quảng cáo</span>
                                <input type="checkbox" checked={config.blogFeedAd?.enabled} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, enabled: e.target.checked}})} className="w-5 h-5 accent-black"/>
                            </div>
                            <input value={config.blogFeedAd?.title} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, title: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm font-bold" placeholder="Tiêu đề"/>
                            <div className="grid grid-cols-2 gap-3">
                                <input value={config.blogFeedAd?.sponsorName} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, sponsorName: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="Nhãn tài trợ"/>
                                <input type="number" value={config.blogFeedAd?.frequency} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, frequency: parseInt(e.target.value)}})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="Tần suất"/>
                            </div>
                            <input value={config.blogFeedAd?.imageUrl} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, imageUrl: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="Link ảnh"/>
                        </div>
                        {/* Blog Preview */}
                        <div className="group bg-white rounded-[1.5rem] overflow-hidden border border-yellow-300 shadow-md hover:shadow-xl transition-all h-full max-w-sm mx-auto w-full relative">
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                                <img src={config.blogFeedAd?.imageUrl} className="w-full h-full object-cover" alt="ad" />
                                <div className="absolute top-3 left-3"><span className="bg-yellow-400 text-black px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm">Quảng cáo</span></div>
                            </div>
                            <div className="p-4 bg-yellow-50/10">
                                <h4 className="font-bold text-gray-900 mb-1 line-clamp-2">{config.blogFeedAd?.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">{config.blogFeedAd?.excerpt}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. CẤU HÌNH DOCUMENT FEED ADS (NATIVE) */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                    <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <FileText size={18}/> Quảng cáo Xen kẽ Tài liệu
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <span className="font-bold text-sm">Bật quảng cáo</span>
                                <input type="checkbox" checked={config.documentAd?.enabled} onChange={e => setConfig({...config, documentAd: {...config.documentAd!, enabled: e.target.checked}})} className="w-5 h-5 accent-black"/>
                            </div>
                            <input value={config.documentAd?.title} onChange={e => setConfig({...config, documentAd: {...config.documentAd!, title: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm font-bold" placeholder="Tiêu đề"/>
                            <input value={config.documentAd?.imageUrl} onChange={e => setConfig({...config, documentAd: {...config.documentAd!, imageUrl: e.target.value}})} className="w-full border p-2.5 rounded-xl text-sm" placeholder="Link ảnh/icon"/>
                        </div>
                        {/* Doc Preview */}
                        <div className="bg-white p-4 rounded-2xl border border-yellow-200 shadow-md flex gap-4 items-start relative overflow-hidden h-fit self-center max-w-sm w-full">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg">ADS</div>
                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center">
                                {config.documentAd?.imageUrl ? <img src={config.documentAd.imageUrl} className="w-full h-full object-cover"/> : <span>🎁</span>}
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-sm mb-1">{config.documentAd?.title}</h3>
                                <p className="text-xs text-gray-500 line-clamp-1">{config.documentAd?.description}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. CẤU HÌNH QUESTION DETAIL AD (MỚI) */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                    <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <MessageSquare size={18}/> Quảng cáo Chi tiết Câu hỏi (Sidebar/Bottom)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* LEFT: FORM INPUTS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="font-bold text-sm text-gray-700">Bật quảng cáo này</span>
                                <input type="checkbox" checked={config.questionDetailAd?.enabled} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, enabled: e.target.checked}})} className="w-5 h-5 accent-black"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nhãn tài trợ</label>
                                    <input value={config.questionDetailAd?.sponsorName} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, sponsorName: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black" placeholder="Tài trợ"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nút bấm</label>
                                    <input value={config.questionDetailAd?.ctaText} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, ctaText: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề</label>
                                <input value={config.questionDetailAd?.title} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, title: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm font-bold outline-none focus:border-black"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả ngắn</label>
                                <textarea rows={3} value={config.questionDetailAd?.description} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, description: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black resize-none"/>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1"><ImageIcon size={12}/> Ảnh</label>
                                    <input value={config.questionDetailAd?.imageUrl} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, imageUrl: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1"><ExternalLink size={12}/> Link Đích</label>
                                    <input value={config.questionDetailAd?.link} onChange={e => setConfig({...config, questionDetailAd: {...config.questionDetailAd!, link: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm text-blue-600 outline-none focus:border-black"/>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: LIVE PREVIEW */}
                        <div className="flex flex-col justify-center">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Xem trước giao diện</label>
                            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all max-w-sm mx-auto w-full group relative overflow-hidden">
                                <div className="absolute top-3 right-3 bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-200">Ad</div>
                                <div className="flex gap-4 mb-3">
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 shrink-0 overflow-hidden border border-gray-100">
                                        <img src={config.questionDetailAd?.imageUrl} className="w-full h-full object-cover" alt="ad"/>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-500 mb-0.5">{config.questionDetailAd?.sponsorName}</p>
                                        <h4 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{config.questionDetailAd?.title}</h4>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{config.questionDetailAd?.description}</p>
                                <button className="w-full py-2 bg-blue-50 text-blue-600 font-bold text-xs rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-1">
                                    {config.questionDetailAd?.ctaText} <ExternalLink size={10}/>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* FOOTER SAVE BUTTON */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
            <div className="max-w-5xl mx-auto flex justify-end">
                <button onClick={handleSave} disabled={saving} className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70">
                    {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Lưu thay đổi
                </button>
            </div>
        </div>
    </div>
  );
};
