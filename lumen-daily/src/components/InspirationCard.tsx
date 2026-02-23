import React from 'react';
import type { Inspiration } from '../data/mockData';

interface InspirationCardProps {
    readonly inspiration: Readonly<Inspiration>;
}

const InspirationCard: React.FC<Readonly<InspirationCardProps>> = ({ inspiration }) => {
    return (
        <div className="mx-5 rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-blue-800 p-5 text-white shadow-xl shadow-primary/20 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-5 -translate-x-5" />

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-yellow-300 text-lg">auto_awesome</span>
                    <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                        Daily Inspiration
                    </span>
                </div>
                <p className="text-sm font-light leading-relaxed mb-3 italic">
                    "{inspiration.text}"
                </p>
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white/90">— {inspiration.reference}</span>
                    <div className="flex gap-2">
                        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
                            <span className="material-symbols-outlined text-sm">bookmark_border</span>
                        </button>
                        <button className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
                            <span className="material-symbols-outlined text-sm">share</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InspirationCard;
