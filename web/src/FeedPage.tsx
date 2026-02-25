import { useState, useEffect, useCallback } from 'react';
import { Heart, Eye, Clock, Layers, ChevronDown, Sparkles, Image as ImageIcon } from 'lucide-react';

const API_BASE = `${import.meta.env.VITE_API_URL}/api`;

const getCorrectImageUrl = (url: string) => {
    if (!url) return "";
    return url;
};

interface FeedItem {
    id: string;
    prompt: string;
    model: string;
    width: number;
    height: number;
    steps?: number;
    userId: string;
    created: string;
    imageUrl: string;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default function FeedPage({ onSwitchToCreate }: { onSwitchToCreate: () => void }) {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

    const fetchFeed = useCallback(async (pageNum: number, append = false) => {
        try {
            if (pageNum === 1) setLoading(true);
            else setLoadingMore(true);

            const res = await fetch(`${API_BASE}/feed?page=${pageNum}&perPage=12`);
            const data = await res.json();

            if (data.items) {
                setItems(prev => append ? [...prev, ...data.items] : data.items);
                setHasMore(pageNum < data.totalPages);
            }
        } catch (e) {
            console.error('Feed fetch error:', e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchFeed(1);
    }, [fetchFeed]);

    const loadMore = () => {
        const next = page + 1;
        setPage(next);
        fetchFeed(next, true);
    };

    const toggleLike = (id: string) => {
        setLikedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
                <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-purple-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto text-purple-400" size={24} />
                    </div>
                    <p className="text-gray-400 text-sm font-medium tracking-wide">Loading feed...</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center">
                <div className="text-center max-w-md px-6">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/10 flex items-center justify-center">
                        <ImageIcon className="text-purple-400" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">No creations yet</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        The feed is empty. Be the first to create something amazing and share it with the world.
                    </p>
                    <button
                        onClick={onSwitchToCreate}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 hover:scale-105 active:scale-95"
                    >
                        <Sparkles size={16} className="inline mr-2" />
                        Create Your First Image
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="px-4 md:px-8 py-6 max-w-[1600px] mx-auto">
            {/* Feed Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                            <Layers size={16} />
                        </div>
                        Community Feed
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">{items.length} creation{items.length !== 1 ? 's' : ''} and counting</p>
                </div>
                <button
                    onClick={() => fetchFeed(1)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all duration-200"
                >
                    Refresh
                </button>
            </div>

            {/* Masonry Grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                {items.map((item, idx) => (
                    <div
                        key={item.id}
                        className="break-inside-avoid group"
                        style={{ animationDelay: `${idx * 60}ms` }}
                    >
                        <div
                            className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#0c0c0e] hover:border-purple-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-900/10"
                            onMouseEnter={() => setHoveredId(item.id)}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            {/* Image */}
                            <div className="relative overflow-hidden">
                                <img
                                    src={getCorrectImageUrl(item.imageUrl)}
                                    alt={item.prompt || 'Generated image'}
                                    className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"
                                    loading="lazy"
                                />

                                {/* Hover Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 ${hoveredId === item.id ? 'opacity-100' : 'opacity-0'}`}>
                                    {/* Top Actions */}
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                                            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 ${likedIds.has(item.id) ? 'bg-pink-500/30 text-pink-400 scale-110' : 'bg-black/40 text-white/70 hover:text-white hover:bg-black/60'}`}
                                        >
                                            <Heart size={16} fill={likedIds.has(item.id) ? 'currentColor' : 'none'} />
                                        </button>
                                        <a
                                            href={getCorrectImageUrl(item.imageUrl)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white/70 hover:text-white hover:bg-black/60 transition-all duration-200"
                                        >
                                            <Eye size={16} />
                                        </a>
                                    </div>

                                    {/* Bottom Info */}
                                    <div className="absolute bottom-0 left-0 right-0 p-4">
                                        {item.prompt && (
                                            <p className="text-white text-sm font-medium leading-snug line-clamp-3 mb-2">
                                                {item.prompt}
                                            </p>
                                        )}
                                        <div className="flex items-center justify-between text-xs text-gray-400">
                                            <div className="flex items-center gap-3">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {timeAgo(item.created)}
                                                </span>
                                                {item.model && (
                                                    <span className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] uppercase tracking-wider">
                                                        {item.model}
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-500">
                                                {item.width}×{item.height}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer - always visible */}
                            <div className="px-4 py-3 border-t border-white/5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-[10px] font-bold">
                                            {item.userId ? item.userId.slice(0, 2).toUpperCase() : 'AI'}
                                        </div>
                                        <span className="text-xs text-gray-500">{timeAgo(item.created)}</span>
                                    </div>
                                    <button
                                        onClick={() => toggleLike(item.id)}
                                        className={`flex items-center gap-1 text-xs transition-colors ${likedIds.has(item.id) ? 'text-pink-400' : 'text-gray-600 hover:text-gray-400'}`}
                                    >
                                        <Heart size={12} fill={likedIds.has(item.id) ? 'currentColor' : 'none'} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Load More */}
            {hasMore && (
                <div className="flex justify-center mt-12 mb-8">
                    <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="group flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/30 rounded-xl text-sm text-gray-300 hover:text-white transition-all duration-300 disabled:opacity-50"
                    >
                        {loadingMore ? (
                            <>
                                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                                Loading...
                            </>
                        ) : (
                            <>
                                <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                Load More
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
