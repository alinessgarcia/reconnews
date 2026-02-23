import React from 'react';

interface SectionTitleProps {
    readonly title: string;
    readonly actionLabel?: string;
    readonly onAction?: () => void;
}

const SectionTitle: React.FC<Readonly<SectionTitleProps>> = ({
    title,
    actionLabel = 'See All',
    onAction,
}) => {
    return (
        <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {onAction && (
                <button
                    onClick={onAction}
                    className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
};

export default SectionTitle;
