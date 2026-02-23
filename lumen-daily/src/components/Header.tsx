import React from 'react';

interface HeaderProps {
    readonly title: string;
    readonly subtitle?: string;
    readonly showBack?: boolean;
    readonly rightIcon?: string;
    readonly onBack?: () => void;
}

const Header: React.FC<Readonly<HeaderProps>> = ({
    title,
    subtitle,
    showBack = false,
    rightIcon,
    onBack,
}) => {
    return (
        <header className="sticky top-0 bg-white/90 backdrop-blur-md z-40 border-b border-gray-50">
            <div className="max-w-[430px] mx-auto flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                    {showBack && (
                        <button
                            onClick={onBack}
                            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <span className="material-symbols-outlined text-text-primary">arrow_back</span>
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg font-semibold text-text-primary tracking-tight">{title}</h1>
                        {subtitle && (
                            <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {rightIcon && (
                        <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                            <span className="material-symbols-outlined text-text-secondary">{rightIcon}</span>
                        </button>
                    )}
                    <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined text-text-secondary">account_circle</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
