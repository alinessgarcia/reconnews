import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNavBar from './components/BottomNavBar';
import HomePage from './pages/HomePage';
import NewsFeedPage from './pages/NewsFeedPage';
import NutritionPage from './pages/NutritionPage';
import WorkoutLibraryPage from './pages/WorkoutLibraryPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="max-w-[430px] mx-auto min-h-screen bg-white relative shadow-2xl shadow-gray-200">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/news" element={<NewsFeedPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/workouts" element={<WorkoutLibraryPage />} />
          <Route path="/profile" element={<ProfilePlaceholder />} />
        </Routes>
        <BottomNavBar />
      </div>
    </BrowserRouter>
  );
};

const ProfilePlaceholder: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen pb-24 px-5">
    <span className="material-symbols-outlined text-6xl text-text-muted mb-4">person</span>
    <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
    <p className="text-sm text-text-muted mt-1 text-center">Your profile page will be available soon.</p>
  </div>
);

export default App;
