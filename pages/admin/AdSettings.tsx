
import React, { useEffect, useState } from 'react';
import { AdConfig } from '../../types';
import { getAdConfig, updateAdConfig } from '../../services/ads';
import { Save, Loader2, Megaphone, Monitor, LayoutTemplate } from 'lucide-react';

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
    setConfig(data);
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
    <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl"><Megaphone size={24}/></div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Quảng cáo</h1>
                    <p className="text-gray-500 text-sm">Cấu hình hiển thị AdSense hoặc Banner.</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <span className="block font-bold text-gray-900">Trạng thái hoạt động</span>
                        <span className="text-xs text-gray-500">Bật/Tắt toàn bộ quảng cáo trên web</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.isEnabled} onChange={e => setConfig({...config, isEnabled: e.target.checked})} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Loại quảng cáo</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setConfig({...config, provider: 'adsense'})}
                            className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold ${config.provider === 'adsense' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <Monitor size={20}/> Google AdSense
                        </button>
                        <button 
                            onClick={() => setConfig({...config, provider: 'custom'})}
                            className={`p-4 rounded-xl border-2 flex items-center justify-center gap-2 font-bold ${config.provider === 'custom' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
                        >
                            <LayoutTemplate size={20}/> Banner Tùy chỉnh
                        </button>
                    </div>
                </div>

                {config.provider === 'adsense' && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Publisher ID (ca-pub-xxx)</label>
                            <input value={config.adsenseClientId} onChange={e => setConfig({...config, adsenseClientId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="ca-pub-..." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Default Slot ID</label>
                            <input value={config.adsenseSlotId} onChange={e => setConfig({...config, adsenseSlotId: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="1234567890" />
                        </div>
                    </div>
                )}

                {config.provider === 'custom' && (
                    <div className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Banner Image URL</label>
                            <input value={config.customBannerUrl} onChange={e => setConfig({...config, customBannerUrl: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-purple-500" placeholder="https://..." />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Target Link (Click URL)</label>
                            <input value={config.customTargetUrl} onChange={e => setConfig({...config, customTargetUrl: e.target.value})} className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-purple-500" placeholder="https://..." />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tần suất hiển thị (Feed)</label>
                    <div className="flex items-center gap-3">
                        <input 
                            type="range" min="1" max="20" 
                            value={config.frequency} 
                            onChange={e => setConfig({...config, frequency: parseInt(e.target.value)})} 
                            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="font-bold text-gray-700 w-10 text-center">{config.frequency}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Cứ sau {config.frequency} bài viết sẽ hiển thị 1 quảng cáo.</p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin"/> : <Save size={20}/>} Lưu cấu hình
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};
