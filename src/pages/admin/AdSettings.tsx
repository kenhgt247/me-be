import React, { useEffect, useState } from 'react';
import { AdConfig, AdCampaign, AdPlacement } from '../../types';
import { getAdConfig, updateAdConfig, createAdCampaign, updateAdCampaign, deleteAdCampaign, getAdsByPlacement } from '../../services/ads';
import { Plus, Trash2, Edit2, Save, Power, Monitor, List, Sidebar, FileText } from 'lucide-react';

// ... (Giữ nguyên component CampaignManager như cũ) ...
const CampaignManager = ({ placement, title, icon: Icon }: { placement: AdPlacement, title: string, icon: any }) => {
    // ... (Code CampaignManager giữ nguyên, không đổi) ...
    // Để ngắn gọn, tôi chỉ hiển thị phần AdSettings cần sửa bên dưới
    const [ads, setAds] = useState<AdCampaign[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Partial<AdCampaign>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadAds(); }, []);

    const loadAds = async () => {
        setLoading(true);
        const data = await getAdsByPlacement(placement);
        setAds(data);
        setLoading(false);
    };

    const handleSubmit = async () => {
        if (!form.title || !form.link) return alert("Vui lòng nhập Tiêu đề và Link đích!");
        if (form.id) await updateAdCampaign(form.id, form);
        else await createAdCampaign({ ...form, placement, isActive: true, ctaText: form.ctaText || 'Xem ngay', sponsorName: form.sponsorName || 'Tài trợ' } as any);
        setIsEditing(false); loadAds();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Xóa quảng cáo này?")) { await deleteAdCampaign(id); loadAds(); }
    };

    const toggleActive = async (ad: AdCampaign) => {
        await updateAdCampaign(ad.id, { isActive: !ad.isActive });
        loadAds();
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <h3 className="font-bold text-lg flex items-center gap-2 text-gray-800"><Icon size={20} className="text-blue-600"/> {title} <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{ads.length}</span></h3>
                <button onClick={() => { setIsEditing(true); setForm({}); }} className="bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"><Plus size={16}/> Thêm mới</button>
            </div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {loading ? <p className="text-center text-gray-400 py-4">Đang tải...</p> : ads.length === 0 ? <div className="text-center text-gray-400 py-8 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">Chưa có quảng cáo nào.<br/>Bấm "Thêm mới" để tạo.</div> : null}
                {ads.map(ad => (
                    <div key={ad.id} className={`flex items-start gap-3 p-3 border rounded-xl transition-all ${ad.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-100">
                            {ad.imageUrl ? <img src={ad.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs">No Img</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-gray-900 truncate">{ad.title}</div>
                            <div className="text-xs text-gray-500 truncate">{ad.sponsorName} • <a href={ad.link} target="_blank" className="text-blue-500 hover:underline">Link</a></div>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => toggleActive(ad)} className={`p-1.5 rounded-lg transition-colors ${ad.isActive ? "text-green-600 bg-green-50 hover:bg-green-100" : "text-gray-400 bg-gray-200 hover:bg-gray-300"}`}><Power size={14}/></button>
                            <button onClick={() => {setForm(ad); setIsEditing(true)}} className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"><Edit2 size={14}/></button>
                            <button onClick={() => handleDelete(ad.id)} className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors"><Trash2 size={14}/></button>
                        </div>
                    </div>
                ))}
            </div>
            {isEditing && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
                        <h3 className="font-bold text-xl mb-4 text-gray-900">Chi tiết quảng cáo</h3>
                        <div className="space-y-3">
                            <input className="w-full border border-gray-300 p-2.5 rounded-xl text-sm" placeholder="Tiêu đề (Bắt buộc)" value={form.title||''} onChange={e=>setForm({...form, title: e.target.value})} />
                            <input className="w-full border border-gray-300 p-2.5 rounded-xl text-sm" placeholder="Link Ảnh (URL)" value={form.imageUrl||''} onChange={e=>setForm({...form, imageUrl: e.target.value})} />
                            <input className="w-full border border-gray-300 p-2.5 rounded-xl text-sm" placeholder="Link Đích (URL Bắt buộc)" value={form.link||''} onChange={e=>setForm({...form, link: e.target.value})} />
                            <div className="grid grid-cols-2 gap-3">
                                <input className="w-full border border-gray-300 p-2.5 rounded-xl text-sm" placeholder="Nhà tài trợ" value={form.sponsorName||''} onChange={e=>setForm({...form, sponsorName: e.target.value})} />
                                <input className="w-full border border-gray-300 p-2.5 rounded-xl text-sm" placeholder="Nút bấm (CTA)" value={form.ctaText||''} onChange={e=>setForm({...form, ctaText: e.target.value})} />
                            </div>
                            <textarea className="w-full border border-gray-300 p-2.5 rounded-xl text-sm h-20 resize-none" placeholder="Mô tả ngắn (Tùy chọn)" value={form.description||''} onChange={e=>setForm({...form, description: e.target.value})} />
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                            <button onClick={()=>setIsEditing(false)} className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Hủy</button>
                            <button onClick={handleSubmit} className="px-6 py-2.5 text-sm font-bold bg-black text-white rounded-xl shadow-lg hover:bg-gray-800">Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const AdSettings = () => {
    const [config, setConfig] = useState<AdConfig | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => { 
        getAdConfig().then(data => {
            // --- FIX QUAN TRỌNG: VÁ DỮ LIỆU CŨ ---
            if (!data.frequencies) {
                data.frequencies = { home: 5, blog: 4, document: 6 };
            }
            if (!data.provider) data.provider = 'custom';
            setConfig(data); 
        }); 
    }, []);

    const saveConfig = async () => {
        if (config) {
            setSaving(true);
            await updateAdConfig(config);
            setSaving(false);
            alert("Đã lưu cấu hình hệ thống thành công!");
        }
    };

    if (!config) return <div className="p-10 text-center">Loading...</div>;

    const updateFreq = (key: 'home' | 'blog' | 'document', val: number) => {
        if (!config.frequencies) return;
        setConfig({
            ...config,
            frequencies: { ...config.frequencies, [key]: val }
        });
    };

    return (
        <div className="max-w-6xl mx-auto pb-24 animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Monitor size={24}/></div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Quảng cáo</h1>
                    <p className="text-gray-500 text-sm">Cấu hình hiển thị và nội dung quảng cáo trên toàn hệ thống.</p>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
                <h3 className="font-bold text-lg mb-4 text-gray-900 border-b border-gray-100 pb-2">Cấu hình Hệ thống</h3>
                <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="font-bold text-gray-700">Trạng thái Quảng cáo</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={config.isEnabled} onChange={e => setConfig({...config, isEnabled: e.target.checked})} />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                            </label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setConfig({...config, provider: 'custom'})} className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${config.provider === 'custom' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-100 text-gray-500'}`}>Tự quản lý (Random)</button>
                            <button onClick={() => setConfig({...config, provider: 'adsense'})} className={`p-3 rounded-xl border-2 font-bold text-sm transition-all ${config.provider === 'adsense' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-500'}`}>Google AdSense</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tần suất Home</label>
                            <input type="number" value={config.frequencies?.home || 5} onChange={e => updateFreq('home', +e.target.value)} className="w-full border p-2 rounded-xl text-center font-bold"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tần suất Blog</label>
                            <input type="number" value={config.frequencies?.blog || 4} onChange={e => updateFreq('blog', +e.target.value)} className="w-full border p-2 rounded-xl text-center font-bold"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Tần suất Doc</label>
                            <input type="number" value={config.frequencies?.document || 6} onChange={e => updateFreq('document', +e.target.value)} className="w-full border p-2 rounded-xl text-center font-bold"/>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-end">
                    <button onClick={saveConfig} disabled={saving} className="bg-black text-white px-6 py-2.5 rounded-full font-bold shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 active:scale-95">{saving ? "Đang lưu..." : <><Save size={18}/> Lưu cấu hình</>}</button>
                </div>
            </div>

            {config.provider === 'custom' ? (
                <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
                    <CampaignManager placement="home" title="Home Feed (Trang chủ)" icon={Monitor} />
                    <CampaignManager placement="blog" title="Blog List (Bài viết)" icon={List} />
                    <CampaignManager placement="document" title="Document List (Tài liệu)" icon={FileText} />
                    <CampaignManager placement="sidebar" title="Sidebar (Cột bên phải)" icon={Sidebar} />
                </div>
            ) : (
                <div className="bg-blue-50 border border-blue-100 p-8 rounded-2xl text-center text-blue-800">
                    <h3 className="font-bold text-lg mb-2">Đang sử dụng Google AdSense</h3>
                    <p className="text-sm">Hệ thống sẽ hiển thị quảng cáo tự động từ Google.</p>
                </div>
            )}
        </div>
    );
};