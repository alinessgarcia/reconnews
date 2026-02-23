import React from 'react';

interface CategoryTabsProps {
    readonly categories: readonly string[];
    readonly activeCategory: string;
    readonly onSelect: (category: string) => void;
}

const CategoryTabs: React.FC<Readonly<CategoryTabsProps>> = ({
    categories,
    activeCategory,
    onSelect,
}) => {
    return (
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => onSelect(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap snap-start transition-all duration-200 ${activeCategory === cat
                            ? 'bg-primary text-white shadow-md shadow-primary/25'
                            : 'bg-surface text-text-secondary hover:bg-gray-200'
                        }`}
                >
                    {cat}
                </button>
            ))}
        </div>
    );
};

export default CategoryTabs;
