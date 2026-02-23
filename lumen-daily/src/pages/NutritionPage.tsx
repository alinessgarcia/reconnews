import React from 'react';
import Header from '../components/Header';
import SectionTitle from '../components/SectionTitle';
import RecipeCard from '../components/RecipeCard';
import WorkoutCard from '../components/WorkoutCard';
import { recipes, workouts, heroContent } from '../data/mockData';

const NutritionPage: React.FC = () => {
    return (
        <div className="pb-24">
            <Header title="Faith in Action" subtitle="Nourish Body & Spirit" />

            {/* Hero Banner */}
            <section className="px-5 pt-4 pb-6">
                <div className="relative rounded-2xl overflow-hidden h-48 shadow-lg">
                    <img
                        src={heroContent.imageUrl}
                        alt={heroContent.title}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                        <h2 className="text-white text-base font-semibold leading-snug">
                            {heroContent.title}
                        </h2>
                        <p className="text-white/80 text-xs mt-1">{heroContent.subtitle}</p>
                    </div>
                </div>
            </section>

            {/* Biblical Nutrition */}
            <section className="pb-6">
                <SectionTitle title="Biblical Nutrition" onAction={() => { }} />
                <div className="grid grid-cols-2 gap-3 px-5">
                    {recipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            </section>

            {/* Active Faith */}
            <section className="pb-6">
                <SectionTitle title="Active Faith" onAction={() => { }} />
                <div className="flex flex-col gap-3 px-5">
                    {workouts.slice(0, 3).map((w) => (
                        <WorkoutCard key={w.id} workout={w} variant="compact" />
                    ))}
                </div>
            </section>
        </div>
    );
};

export default NutritionPage;
