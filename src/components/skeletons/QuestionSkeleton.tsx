import React from 'react';

export const QuestionSkeleton = () => {
  return (
    <div className="bg-white dark:bg-dark-card p-5 rounded-[1.5rem] border border-gray-100 dark:border-dark-border animate-pulse shadow-sm">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-slate-700"></div>
          <div className="space-y-2">
            <div className="h-3 w-24 bg-gray-200 dark:bg-slate-700 rounded"></div>
            <div className="h-2 w-16 bg-gray-100 dark:bg-slate-800 rounded"></div>
          </div>
        </div>
        <div className="h-5 w-12 bg-gray-100 dark:bg-slate-800 rounded-lg"></div>
      </div>

      {/* Content Skeleton */}
      <div className="space-y-3 mb-4">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-3 w-full bg-gray-100 dark:bg-slate-800 rounded"></div>
        <div className="h-3 w-5/6 bg-gray-100 dark:bg-slate-800 rounded"></div>
      </div>

      {/* Image Skeleton */}
      <div className="h-40 w-full bg-gray-50 dark:bg-slate-800 rounded-xl mb-4"></div>

      {/* Footer Skeleton */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-slate-800/50">
        <div className="flex gap-4">
          <div className="h-3 w-8 bg-gray-100 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-8 bg-gray-100 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-8 bg-gray-100 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    </div>
  );
};