'use client';

import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
  type = 'button',
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-red-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
    >
      Reset All
    </button>
  );
};

export default Button;