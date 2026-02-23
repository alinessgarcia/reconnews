import React from 'react';
import type { Recipe } from '../data/mockData';

interface RecipeCardProps {
    readonly recipe: Readonly<Recipe>;
}

const RecipeCard: React.FC<Readonly<RecipeCardProps>> = ({ recipe }) => {
    return (
        <div className="bg-white rounded-card overflow-hidden shadow-sm border border-gray-100 min-w-[180px] snap-start transition-transform hover:scale-[1.03] active:scale-[0.97]">
            <div className="relative h-28 overflow-hidden">
                <img
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                <div className="absolute top-2 right-2">
                    <span className="px-2 py-0.5 bg-white/85 text-text-secondary text-[10px] font-medium rounded-full shadow-sm backdrop-blur-sm">
                        {recipe.prepTime}
                    </span>
                </div>
            </div>
            <div className="p-3">
                <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                    {recipe.title}
                </h3>
                <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="material-symbols-outlined text-accent-warm text-xs">schedule</span>
                    <span className="text-[10px] text-text-muted">{recipe.prepTime}</span>
                    <span className="text-[10px] text-text-muted">•</span>
                    <span className="text-[10px] text-text-muted">{recipe.difficulty}</span>
                </div>
            </div>
        </div>
    );
};

export default RecipeCard;
