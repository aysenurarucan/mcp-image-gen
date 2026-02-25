import AuthPage from "./AuthPage";
import FeedPage from "./FeedPage";
import { pb } from "./pb";
import { useState, useEffect } from 'react';
import { Image as ImageIcon, Sparkles, Clock, Download, Command, X, Layers, Settings, ChevronDown } from 'lucide-react';



const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

const getCorrectImageUrl = (url: string) => {
  if (!url) return '';

  return url;
};

function App() {

  const [authed, setAuthed] = useState(pb.authStore.isValid);
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState('General');
  const [style, setStyle] = useState('Photorealistic');
  const [platform, setPlatform] = useState('Web');
  const [generating, setGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [refineText, setRefineText] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [activeView, setActiveView] = useState<'create' | 'feed'>('create');
  const [showMobileSettings, setShowMobileSettings] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/generations`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!prompt) return;
    setGenerating(true);
    try {
      const fullPrompt = `${style} style. ${prompt}`;

      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ((pb.authStore as any).model?.id ?? (pb.authStore as any).record?.id ?? ''),
        },

        body: JSON.stringify({
          promptText: fullPrompt,
          width: 1024,
          height: 1024,
          steps: 40,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      if (data.success) {
        setCurrentImage({
          url: data.imageUrl,
          prompt: fullPrompt,
          id: data.recordId
        });
        fetchHistory();
      }
    } catch (e: any) {
      console.error(e);
      if (e.message.includes('Failed to fetch')) {
        alert("Cannot connect to backend. Please ensure you are running 'npm run dev' from the ROOT project directory, not inside 'web'.");
      } else {
        alert(`Error: ${e.message}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = () => {
    if (!refineText) return;
    setPrompt(prev => `${prev} ${refineText}`);
    setRefineText('');
  };

  console.log("PB connected:", pb.baseUrl);


  if (!authed) {
    return <AuthPage onAuthed={() => setAuthed(true)} />;
  }


  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col font-sans selection:bg-purple-500/30">
      {/* Top Bar */}
      <header className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="h-14 md:h-16 flex items-center px-3 md:px-6 justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-900/20">
              <Command size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:block">UI Mastery Pro</span>
          </div>

          {/* Navigation Tabs - Desktop only */}
          <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setActiveView('create')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${activeView === 'create'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Sparkles size={14} />
              Create
            </button>
            <button
              onClick={() => setActiveView('feed')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${(activeView as string) === 'feed'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Layers size={14} />
              Feed
            </button>
          </div>

          {/* Prompt Input - Desktop only (shown separately on mobile) */}
          <div className="flex-1 max-w-2xl mx-2 md:mx-12 hidden md:block">
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Sparkles className="w-4 h-4 text-purple-400 group-focus-within:text-purple-300 transition-colors" />
              </div>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your vision (e.g., 'a futuristic city with flying cars')..."
                className="w-full bg-[#18181b] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-[#27272a] transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { pb.authStore.clear(); location.reload(); }}
              className="text-sm text-white/70 hover:text-white hidden sm:block mr-2"
            >
              Logout
            </button>

            <button
              onClick={() => setShowRightPanel(!showRightPanel)}
              className="xl:hidden p-2 text-gray-400 hover:text-white"
            >
              <Clock size={20} />
            </button>

            <button
              onClick={handleGenerate}
              disabled={generating || !prompt}
              className={`px-4 md:px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-purple-900/30 flex items-center gap-2 ${generating ? 'opacity-70 cursor-wait' : ''}`}
            >
              {generating ? <span className="animate-spin">⏳</span> : <Sparkles size={16} />}
              <span className="hidden md:inline">{generating ? 'Dreaming...' : 'Generate'}</span>
            </button>
          </div>
        </div>

        {/* Mobile Prompt Input - below the top bar */}
        <div className="md:hidden px-3 pb-3">
          <div className="relative group">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Sparkles className="w-4 h-4 text-purple-400 group-focus-within:text-purple-300 transition-colors" />
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your vision..."
              className="w-full bg-[#18181b] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:bg-[#27272a] transition-all"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
          </div>
        </div>
      </header>

      {activeView === 'feed' ? (
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <FeedPage onSwitchToCreate={() => setActiveView('create')} />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Sidebar - Desktop only */}
          <aside className="hidden md:block w-64 border-r border-white/5 bg-[#0c0c0e] p-6 space-y-8 h-full overflow-y-auto">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Configuration</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg p-2.5 text-sm outline-none focus:border-purple-500/50"
                  >
                    <option>General</option>
                    <option>Character Design</option>
                    <option>Environment</option>
                    <option>UI/UX Mockup</option>
                    <option>Logo/Icon</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg p-2.5 text-sm outline-none focus:border-purple-500/50"
                  >
                    <option>Photorealistic</option>
                    <option>Anime</option>
                    <option>Digital Art</option>
                    <option>Cyberpunk</option>
                    <option>Minimalist</option>
                    <option>3D Render</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg p-2.5 text-sm outline-none focus:border-purple-500/50"
                  >
                    <option>Web</option>
                    <option>Mobile</option>
                    <option>Desktop</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5">
              <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/10">
                <p className="text-xs text-purple-300 leading-relaxed">
                  <Sparkles size={12} className="inline mr-1" />
                  Pro Tip: Be specific with lighting and textures for better results.
                </p>
              </div>
            </div>
          </aside>

          {/* Mobile Settings Bottom Sheet */}
          {showMobileSettings && (
            <div
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
              onClick={() => setShowMobileSettings(false)}
            />
          )}
          <div className={`md:hidden fixed inset-x-0 bottom-0 z-50 bg-[#0c0c0e] border-t border-white/5 rounded-t-2xl transition-transform duration-300 ease-in-out ${showMobileSettings ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ maxHeight: '70vh' }}>
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="p-5 space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 2rem)' }}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Configuration</h3>
                <button onClick={() => setShowMobileSettings(false)} className="text-gray-400 hover:text-white">
                  <ChevronDown size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg p-3 text-sm outline-none focus:border-purple-500/50"
                  >
                    <option>General</option>
                    <option>Character Design</option>
                    <option>Environment</option>
                    <option>UI/UX Mockup</option>
                    <option>Logo/Icon</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Style</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg p-3 text-sm outline-none focus:border-purple-500/50"
                  >
                    <option>Photorealistic</option>
                    <option>Anime</option>
                    <option>Digital Art</option>
                    <option>Cyberpunk</option>
                    <option>Minimalist</option>
                    <option>3D Render</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-gray-400">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full bg-[#18181b] border border-white/5 rounded-lg p-3 text-sm outline-none focus:border-purple-500/50"
                  >
                    <option>Web</option>
                    <option>Mobile</option>
                    <option>Desktop</option>
                  </select>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-900/10 border border-purple-500/10">
                <p className="text-xs text-purple-300 leading-relaxed">
                  <Sparkles size={12} className="inline mr-1" />
                  Pro Tip: Be specific with lighting and textures for better results.
                </p>
              </div>
              <button
                onClick={() => { pb.authStore.clear(); location.reload(); }}
                className="w-full py-3 text-sm text-red-400 border border-white/5 rounded-lg hover:bg-white/5"
              >
                Log Out
              </button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
            <div className="flex-1 p-3 md:p-8 flex gap-8 min-h-0 relative pb-20 md:pb-8">

              {/* Center Canvas */}
              <div className="flex-1 relative flex flex-col">
                <div className="flex-1 bg-[#0c0c0e] rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden group shadow-2xl">
                  {/* Grid Pattern */}
                  <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3f3f46 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

                  {currentImage ? (
                    <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
                      <img
                        src={getCorrectImageUrl(currentImage.url)}
                        alt="Generated"
                        className="max-w-full max-h-full rounded-lg shadow-2xl transition-transform duration-500 group-hover:scale-[1.01]"
                      />
                      <div className="absolute top-4 right-4 md:top-6 md:right-6 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <a href={getCorrectImageUrl(currentImage.url)} download target="_blank" className="p-2 bg-black/60 backdrop-blur-md rounded-lg hover:bg-black/80 text-white border border-white/10 block">
                          <Download size={20} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 md:p-12">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-[#18181b] rounded-2xl mx-auto mb-4 md:mb-6 flex items-center justify-center border border-white/5">
                        <ImageIcon className="text-gray-600" size={28} />
                      </div>
                      <h3 className="text-lg md:text-xl font-medium text-gray-300 mb-2">Ready to Create</h3>
                      <p className="text-sm md:text-base text-gray-500 max-w-sm mx-auto">Select your parameters and enter a prompt to generate high-quality assets.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Desktop & Mobile Overlay */}
              <div className={`${showRightPanel ? 'translate-x-0' : 'translate-x-full'} xl:translate-x-0 fixed xl:relative inset-y-0 right-0 w-80 bg-[#0c0c0e] xl:bg-transparent border-l xl:border-l-0 border-white/5 p-6 xl:p-0 z-40 transition-transform duration-300 ease-in-out shadow-2xl xl:shadow-none space-y-6 pt-20 xl:pt-0 overflow-y-auto`}>

                {/* Mobile Close Button */}
                <button
                  onClick={() => setShowRightPanel(false)}
                  className="xl:hidden absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
                {currentImage && (
                  <div className="bg-[#0c0c0e] rounded-xl border border-white/5 p-5 shadow-lg">
                    <h3 className="font-semibold mb-1 truncate" title={currentImage.prompt}>{prompt || 'Untitled'}</h3>
                    <p className="text-xs text-gray-500 mb-4 font-mono">{new Date().toLocaleTimeString()}</p>

                    <div className="flex flex-wrap gap-2 mb-6">
                      <span className="px-2 py-1 bg-white/5 border border-white/5 rounded text-xs text-gray-400">{style}</span>
                      <span className="px-2 py-1 bg-white/5 border border-white/5 rounded text-xs text-gray-400">1024x1024</span>
                    </div>

                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Refine Asset</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={refineText}
                          onChange={(e) => setRefineText(e.target.value)}
                          placeholder="Add detail (e.g. 'more dramatic lighting')"
                          className="flex-1 bg-[#18181b] border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500/50"
                        />
                        <button
                          onClick={handleRefine}
                          className="p-2 bg-[#18181b] border border-white/5 hover:bg-[#27272a] rounded-lg transition-colors"
                        >
                          <Sparkles size={16} className="text-purple-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-400">Recent History</h3>
                    <Clock size={14} className="text-gray-600" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {history.map((item: any) => (
                      <div
                        key={item.id}
                        onClick={() => setCurrentImage({ url: item.imageUrl, prompt: item.promptId, id: item.id })}
                        className="aspect-square rounded-lg bg-[#18181b] border border-white/5 overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500/50 transition-all relative group"
                      >
                        <img src={getCorrectImageUrl(item.imageUrl)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Panel Overlay */}
              {showRightPanel && (
                <div
                  className="fixed inset-0 bg-black/50 z-30 xl:hidden"
                  onClick={() => setShowRightPanel(false)}
                />
              )}

            </div>
          </main>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0c0c0e]/95 backdrop-blur-md border-t border-white/5">
        <div className="flex items-center justify-around h-14">
          <button
            onClick={() => setActiveView('create')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all ${activeView === 'create' ? 'text-purple-400' : 'text-gray-500'}`}
          >
            <Sparkles size={20} />
            <span className="text-[10px] font-medium">Create</span>
          </button>
          <button
            onClick={() => setActiveView('feed')}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all ${activeView === 'feed' ? 'text-purple-400' : 'text-gray-500'}`}
          >
            <Layers size={20} />
            <span className="text-[10px] font-medium">Feed</span>
          </button>
          <button
            onClick={() => setShowRightPanel(!showRightPanel)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all ${showRightPanel ? 'text-purple-400' : 'text-gray-500'}`}
          >
            <Clock size={20} />
            <span className="text-[10px] font-medium">History</span>
          </button>
          <button
            onClick={() => setShowMobileSettings(!showMobileSettings)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg transition-all ${showMobileSettings ? 'text-purple-400' : 'text-gray-500'}`}
          >
            <Settings size={20} />
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default App;
