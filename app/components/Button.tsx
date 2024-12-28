'use client';

import { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  glow?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  isLoading = false,
  glow = false,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'px-4 py-2 rounded-lg font-medium transition-all duration-200 relative overflow-hidden';
  
  const variantStyles = {
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    danger: 'bg-red-500 hover:bg-red-600 text-white'
  };

  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${glow ? 'hover-glow' : ''}
        ${isLoading ? 'opacity-80 cursor-not-allowed' : 'animate-click'}
        ${className}
      `}
    >
      <div className="flex items-center justify-center">
        {isLoading && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        {children}
      </div>
      
      {/* Click ripple effect overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 opacity-0 group-active:opacity-20 bg-black rounded-lg transform scale-0 group-active:scale-100 transition-all duration-300" />
      </div>
    </button>
  );
} 