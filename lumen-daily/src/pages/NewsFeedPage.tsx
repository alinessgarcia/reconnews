import React, { useState } from 'react';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import ArticleCard from '../components/ArticleCard';
import { breakingNews, newsCategories } from '../data/mockData';

const NewsFeedPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState(newsCategories[0]);

    const filteredArticles = breakingNews.filter(
        (a) => a.category === activeCategory
    );

    return (
        <div className="pb-24">
            <Header title="Christian World News" rightIcon="search" />

            {/* Category Tabs */}
            <section className="pt-3">
                <CategoryTabs
                    categories={newsCategories}
                    activeCategory={activeCategory}
                    onSelect={setActiveCategory}
                />
            </section>

            {/* Articles List */}
            <section className="px-5 pt-3 flex flex-col gap-3">
                {filteredArticles.length > 0 ? (
                    filteredArticles.map((article) => (
                        <ArticleCard key={article.id} article={article} variant="horizontal" />
                    ))
                ) : (
                    <div className="text-center py-12">
                        <span className="material-symbols-outlined text-4xl text-text-muted mb-3 block">
                            article
                        </span>
                        <p className="text-sm text-text-muted">No articles in this category yet</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default NewsFeedPage;
