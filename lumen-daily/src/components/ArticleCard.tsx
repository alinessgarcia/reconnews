import React from 'react';
import type { Article } from '../data/mockData';

interface ArticleCardProps {
    readonly article: Readonly<Article>;
    readonly variant?: 'horizontal' | 'vertical';
}

const ArticleCard: React.FC<Readonly<ArticleCardProps>> = ({
    article,
    variant = 'horizontal',
}) => {
    if (variant === 'vertical') {
        return (
            <div className="bg-white rounded-card overflow-hidden shadow-sm border border-gray-100 min-w-[260px] snap-start transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <div className="relative h-36 overflow-hidden">
                    <img
                        src={article.imageUrl}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    <div className="absolute top-2.5 left-2.5">
                        <span className="px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded-full shadow-md">
                            {article.source}
                        </span>
                    </div>
                </div>
                <div className="p-3.5">
                    <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                        {article.title}
                    </h3>
                    <p className="text-xs text-text-muted mt-1.5 line-clamp-2">{article.excerpt}</p>
                    <span className="text-[10px] text-text-muted mt-2 block">{article.timestamp}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-3.5 bg-white rounded-card p-3.5 shadow-sm border border-gray-100 transition-transform hover:scale-[1.01] active:scale-[0.99]">
            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <span className="text-[10px] font-semibold text-primary">{article.source}</span>
                    <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 mt-0.5">
                        {article.title}
                    </h3>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-text-muted">{article.timestamp}</span>
                    <span className="text-[10px] text-text-muted">•</span>
                    <span className="text-[10px] text-text-muted">{article.category}</span>
                </div>
            </div>
        </div>
    );
};

export default ArticleCard;
