import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg disabled:opacity-50 disabled:pointer-events-none select-none focus:outline-none';
    
    const variants = {
      primary: 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-900',
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
      outline: 'border border-slate-300 hover:bg-slate-50 bg-white text-slate-700',
      danger: 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-600',
      success: 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600',
      ghost: 'bg-transparent hover:bg-slate-100 text-slate-700',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 min-h-[32px] gap-1.5',
      md: 'text-xs px-3.5 py-2 min-h-[38px] gap-2',
      lg: 'text-sm px-5 py-2.5 min-h-[44px] font-bold gap-2',
      icon: 'p-2 min-h-[38px] min-w-[38px] rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
