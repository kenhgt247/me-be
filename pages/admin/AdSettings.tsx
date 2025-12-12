import React, { useEffect, useState } from 'react';
import { AdConfig } from '../../types';
import { getAdConfig, updateAdConfig } from '../../services/ads';
import { Save, Loader2, Megaphone, Monitor, LayoutTemplate, Sidebar, Palette, Check, ExternalLink, Image as ImageIcon, MousePointerClick } from 'lucide-react';

// Danh sách màu Gradient mẫu đẹp mắt
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
    // Khởi tạo đầy đủ các giá trị mặc định để tránh lỗi null/undefined
    setConfig({
        ...data,
        sidebarAd: data.sidebarAd || {
            enabled: true,
            title: 'Khóa học Ăn dặm',
            description: 'Giúp bé ăn ngon, mẹ nhàn tênh chỉ sau 7 ngày.',
            buttonText: 'Xem ngay',
            link: '#',
            gradient: 'from-indigo-500 to-purple-600'
        },
        blogFeedAd: data.blogFeedAd || {
            enabled: true,
            frequency: 4,
            title: 'Bí quyết giúp bé ngủ xuyên đêm',
            excerpt: 'Phương pháp Easy giúp bé tự ngủ, mẹ có thêm thời gian nghỉ ngơi.',
            imageUrl: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&w=800&q=80',
            ctaText: 'Tìm hiểu thêm',
            link: '#',
            sponsorName: 'Tài trợ'
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
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
        
        {/* --- HEADER --- */}
        <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Megaphone size={24}/></div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Quản lý Quảng cáo</h1>
                <p className="text-gray-500 text-sm">Cấu hình hiển thị AdSense, Banner Feed, Sidebar và Native Ads.</p>
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
                                <span className="block font-bold text-gray-900 text-sm">Trạng thái hệ thống</span>
                                <span className="text-xs text-gray-500">Bật/Tắt toàn bộ QC</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={config.isEnabled} onChange={e => setConfig({...config, isEnabled: e.target.checked})} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfig({...config, provider: 'adsense'})} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${config.provider === 'adsense' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}>
                                <Monitor size={20}/> Google AdSense
                            </button>
                            <button onClick={() => setConfig({...config, provider: 'custom'})} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${config.provider === 'custom' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 hover:bg-gray-50 text-gray-500'}`}>
                                <LayoutTemplate size={20}/> Banner Ảnh
                            </button>
                        </div>

                        {config.provider === 'adsense' ? (
                            <div className="space-y-3 animate-fade-in bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">Publisher ID</label>
                                    <input value={config.adsenseClientId} onChange={e => setConfig({...config, adsenseClientId: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-sm outline-none" placeholder="ca-pub-..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">Slot ID</label>
                                    <input value={config.adsenseSlotId} onChange={e => setConfig({...config, adsenseSlotId: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg p-2.5 text-sm outline-none" placeholder="1234567890" />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 animate-fade-in bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <div>
                                    <label className="block text-xs font-bold text-purple-700 mb-1">Ảnh Banner (URL)</label>
                                    <input value={config.customBannerUrl} onChange={e => setConfig({...config, customBannerUrl: e.target.value})} className="w-full bg-white border border-purple-200 rounded-lg p-2.5 text-sm outline-none" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-purple-700 mb-1">Link đích</label>
                                    <input value={config.customTargetUrl} onChange={e => setConfig({...config, customTargetUrl: e.target.value})} className="w-full bg-white border border-purple-200 rounded-lg p-2.5 text-sm outline-none" placeholder="https://..." />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tần suất xuất hiện</label>
                            <div className="flex items-center gap-3">
                                <input type="range" min="3" max="20" value={config.frequency} onChange={e => setConfig({...config, frequency: parseInt(e.target.value)})} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded text-sm">{config.frequency} bài</span>
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
                        {/* Live Preview */}
                        <div className="relative group">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Xem trước</label>
                            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.sidebarAd?.gradient} p-6 text-white shadow-lg text-center transition-all duration-500`}>
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                <div className="relative z-10 flex flex-col items-center">
                                    <span className="bg-white/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-3 border border-white/20">Quảng cáo</span>
                                    <Megaphone size={32} className="mb-3 animate-bounce" />
                                    <h4 className="font-bold text-lg mb-1">{config.sidebarAd?.title || 'Tiêu đề'}</h4>
                                    <p className="text-xs text-white/90 mb-4 px-4 line-clamp-2">{config.sidebarAd?.description || 'Mô tả...'}</p>
                                    <button className="bg-white text-gray-900 px-6 py-2 rounded-full text-xs font-bold w-full shadow-sm">
                                        {config.sidebarAd?.buttonText || 'Xem ngay'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Form Inputs */}
                        <div className="space-y-3 pt-2">
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề</label>
                                    <input value={config.sidebarAd?.title} onChange={e => setConfig({...config, sidebarAd: {...config.sidebarAd!, title: e.target.value}})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                                <div className="w-1/3">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nút bấm</label>
                                    <input value={config.sidebarAd?.buttonText} onChange={e => setConfig({...config, sidebarAd: {...config.sidebarAd!, buttonText: e.target.value}})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-black transition-colors"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả ngắn</label>
                                <textarea rows={2} value={config.sidebarAd?.description} onChange={e => setConfig({...config, sidebarAd: {...config.sidebarAd!, description: e.target.value}})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-black transition-colors resize-none"/>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">Link đích <ExternalLink size={12}/></label>
                                <input value={config.sidebarAd?.link} onChange={e => setConfig({...config, sidebarAd: {...config.sidebarAd!, link: e.target.value}})} className="w-full border border-gray-200 rounded-xl p-2.5 text-sm outline-none focus:border-black transition-colors text-blue-600"/>
                            </div>
                            {/* Gradient Picker */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2 flex items-center gap-1"><Palette size={12}/> Màu nền</label>
                                <div className="flex gap-2">
                                    {GRADIENT_PRESETS.map(preset => (
                                        <button key={preset.id} onClick={() => setConfig({...config, sidebarAd: {...config.sidebarAd!, gradient: preset.class}})} className={`w-8 h-8 rounded-full bg-gradient-to-br ${preset.class} shadow-sm transition-transform active:scale-90 flex items-center justify-center border-2 ${config.sidebarAd?.gradient === preset.class ? 'border-black' : 'border-transparent'}`} title={preset.label}>
                                            {config.sidebarAd?.gradient === preset.class && <Check size={14} className="text-white drop-shadow-md"/>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. CẤU HÌNH BLOG FEED ADS (NATIVE) - FULL WIDTH */}
            <div className="col-span-1 lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                    <h2 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                        <LayoutTemplate size={18}/> Quảng cáo Xen kẽ Blog (Native Ad)
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">Quảng cáo được thiết kế giống hệt bài viết Blog để tăng tỷ lệ click (CTR).</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* LEFT: FORM INPUTS */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                <span className="font-bold text-sm text-gray-700">Kích hoạt quảng cáo này</span>
                                <input type="checkbox" checked={config.blogFeedAd?.enabled} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, enabled: e.target.checked}})} className="w-5 h-5 accent-black"/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Tần suất (Bài)</label>
                                    <input type="number" min="1" value={config.blogFeedAd?.frequency} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, frequency: parseInt(e.target.value)}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Nhãn tài trợ</label>
                                    <input value={config.blogFeedAd?.sponsorName} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, sponsorName: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black" placeholder="Tài trợ"/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Tiêu đề bài viết</label>
                                <input value={config.blogFeedAd?.title} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, title: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm font-bold outline-none focus:border-black"/>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Mô tả ngắn (Excerpt)</label>
                                <textarea rows={3} value={config.blogFeedAd?.excerpt} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, excerpt: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black resize-none"/>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><ImageIcon size={12}/> Link Ảnh</label>
                                    <input value={config.blogFeedAd?.imageUrl} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, imageUrl: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><MousePointerClick size={12}/> Nút bấm</label>
                                    <input value={config.blogFeedAd?.ctaText} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, ctaText: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm outline-none focus:border-black"/>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1"><ExternalLink size={12}/> Link Đích</label>
                                <input value={config.blogFeedAd?.link} onChange={e => setConfig({...config, blogFeedAd: {...config.blogFeedAd!, link: e.target.value}})} className="w-full border border-gray-200 p-2.5 rounded-xl text-sm text-blue-600 outline-none focus:border-black"/>
                            </div>
                        </div>

                        {/* RIGHT: LIVE PREVIEW (NATIVE CARD) */}
                        <div className="flex flex-col justify-center">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 text-center">Xem trước giao diện</label>
                            <div className="group bg-white rounded-[1.5rem] overflow-hidden border border-yellow-300 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col h-full max-w-sm mx-auto w-full relative">
                                <div className="aspect-video bg-gray-100 relative overflow-hidden shrink-0">
                                    <img src={config.blogFeedAd?.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="ad cover" />
                                    <div className="absolute top-3 left-3">
                                        <span className="bg-yellow-400 text-black px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm border border-yellow-300">
                                            Quảng cáo
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col flex-1 bg-yellow-50/10">
                                    <h2 className="font-bold text-lg text-gray-900 mb-2 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                                        {config.blogFeedAd?.title || 'Tiêu đề quảng cáo'}
                                    </h2>
                                    <p className="text-sm text-gray-500 line-clamp-3 mb-4 font-normal flex-1">
                                        {config.blogFeedAd?.excerpt || 'Mô tả ngắn về sản phẩm hoặc dịch vụ...'}
                                    </p>
                                    <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-auto">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px]">📢</div>
                                            <span className="text-xs font-bold text-gray-700 truncate max-w-[100px]">{config.blogFeedAd?.sponsorName}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                                            {config.blogFeedAd?.ctaText} <ExternalLink size={10}/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        {/* FOOTER SAVE BUTTON */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
            <div className="max-w-5xl mx-auto flex justify-end">
                <button 
                    onClick={handleSave} 
                    disabled={saving}
                    className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-70"
                >
                    {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                    Lưu thay đổi
                </button>
            </div>
        </div>
    </div>
  );
};
