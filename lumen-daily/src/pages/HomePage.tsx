import React from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import InspirationCard from '../components/InspirationCard';
import SectionTitle from '../components/SectionTitle';
import ArticleCard from '../components/ArticleCard';
import RecipeCard from '../components/RecipeCard';
import WorkoutCard from '../components/WorkoutCard';
import {
    dailyInspiration,
    breakingNews,
    recipes,
    workouts,
} from '../data/mockData';

const HomePage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="pb-24">
            <Header title="Lumen Daily" subtitle="Faith · Wellness · Inspiration" />

            {/* Daily Inspiration */}
            <section className="pt-5 pb-6">
                <InspirationCard inspiration={dailyInspiration} />
            </section>

            {/* Breaking News */}
            <section className="pb-6">
                <SectionTitle title="Breaking News" onAction={() => navigate('/news')} />
                <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                    {breakingNews.slice(0, 3).map((article) => (
                        <ArticleCard key={article.id} article={article} variant="vertical" />
                    ))}
                </div>
            </section>

            {/* Healthy Recipes */}
            <section className="pb-6">
                <SectionTitle title="Healthy Recipes" onAction={() => navigate('/nutrition')} />
                <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                    {recipes.slice(0, 3).map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            </section>

            {/* Quick Workouts */}
            <section className="pb-6">
                <SectionTitle title="Quick Workouts" onAction={() => navigate('/workouts')} />
                <div className="flex gap-3 px-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1">
                    {workouts.slice(0, 3).map((w) => (
                        <WorkoutCard key={w.id} workout={w} variant="compact" />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default HomePage;
