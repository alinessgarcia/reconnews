import React from 'react';
import { NavLink } from 'react-router-dom';
import { navItems } from '../data/mockData';

interface BottomNavBarProps {
    readonly className?: string;
}

const BottomNavBar: React.FC<Readonly<BottomNavBarProps>> = ({ className }) => {
    return (
        <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 ${className ?? ''}`}>
            <div className="max-w-[430px] mx-auto flex justify-around items-center py-2 px-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.id}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[60px] ${isActive
                                ? 'text-primary bg-blue-50'
                                : 'text-text-muted hover:text-text-secondary'
                            }`
                        }
                    >
                        <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                        <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavBar;
