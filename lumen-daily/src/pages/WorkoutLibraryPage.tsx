import React, { useState } from 'react';
import Header from '../components/Header';
import WorkoutCard from '../components/WorkoutCard';
import { workouts } from '../data/mockData';
import type { Workout } from '../data/mockData';

type FilterLevel = 'All' | 'Beginner' | 'Intermediate' | 'All Levels';

const WorkoutLibraryPage: React.FC = () => {
    const [filter, setFilter] = useState<FilterLevel>('All');

    const filteredWorkouts: Workout[] =
        filter === 'All'
            ? workouts
            : workouts.filter((w) => w.level === filter);

    const filters: FilterLevel[] = ['All', 'Beginner', 'Intermediate', 'All Levels'];

    return (
        <div className="pb-24 bg-surface-blue/30 min-h-screen">
            <Header title="GIF Workout Library" rightIcon="filter_list" />

            {/* Filter Pills */}
            <section className="px-5 pt-3 pb-2">
                <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {filters.map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 ${filter === f
                                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                                    : 'bg-white text-text-secondary hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </section>

            {/* Workout Grid */}
            <section className="px-5 pt-2 flex flex-col gap-4">
                {filteredWorkouts.map((w) => (
                    <WorkoutCard key={w.id} workout={w} variant="full" />
                ))}
            </section>
        </div>
    );
};

export default WorkoutLibraryPage;
