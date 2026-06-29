import React from 'react';

export const Card = ({ children, className = '' }: any) => (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors ${className}`}>{children}</div>
);

export const Badge = ({ children, variant = 'default', className = '' }: any) => {
    const variants: Record<string, string> = {
        default: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
        success: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50',
        warning: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50',
        danger: 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800/50',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50',
    };
    
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm transition-all ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

export const ProgressBar = ({ progress, label, color = 'bg-indigo-600' }: any) => (
    <div className="w-full">
        <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {label}
            </span>
            <span className="text-[10px] sm:text-xs font-black text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md shadow-sm border border-gray-200 dark:border-gray-700">
                {progress}%
            </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
                className={`h-full rounded-full ${color} transition-all duration-1000 ease-out relative overflow-hidden`} 
                style={{ width: `${progress}%` }}
            >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
            </div>
        </div>
    </div>
);
