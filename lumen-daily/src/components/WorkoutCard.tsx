import React from 'react';
import type { Workout } from '../data/mockData';

interface WorkoutCardProps {
    readonly workout: Readonly<Workout>;
    readonly variant?: 'compact' | 'full';
}

const levelColors: Record<string, string> = {
    Beginner: 'bg-green-100 text-green-700',
    Intermediate: 'bg-amber-100 text-amber-700',
    'All Levels': 'bg-blue-100 text-blue-700',
};

const WorkoutCard: React.FC<Readonly<WorkoutCardProps>> = ({
    workout,
    variant = 'compact',
}) => {
    if (variant === 'full') {
        return (
            <div className="bg-white rounded-card overflow-hidden shadow-sm border border-gray-100 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <div className="relative h-44 overflow-hidden">
                    <img
                        src={workout.imageUrl}
                        alt={workout.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    {workout.hasVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm">
                                <span className="material-symbols-outlined text-primary text-2xl ml-0.5">
                                    play_arrow
                                </span>
                            </div>
                        </div>
                    )}
                    <div className="absolute bottom-2.5 right-2.5">
                        <span className="px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-full backdrop-blur-sm">
                            {workout.duration}
                        </span>
                    </div>
                </div>
                <div className="p-3.5 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary leading-snug">
                            {workout.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                            <span
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${levelColors[workout.level]}`}
                            >
                                {workout.level}
                            </span>
                            <span className="text-[10px] text-text-muted">{workout.duration}</span>
                        </div>
                    </div>
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined text-text-muted text-lg">
                            bookmark_border
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex gap-3.5 bg-white rounded-card p-3 shadow-sm border border-gray-100 min-w-[280px] snap-start transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                <img
                    src={workout.imageUrl}
                    alt={workout.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />
                {workout.hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-primary text-sm ml-px">
                                play_arrow
                            </span>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                    {workout.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                    <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${levelColors[workout.level]}`}
                    >
                        {workout.level}
                    </span>
                    <span className="text-[10px] text-text-muted">{workout.duration}</span>
                </div>
            </div>
        </div>
    );
};

export default WorkoutCard;
