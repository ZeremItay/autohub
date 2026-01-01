'use client';

import React from 'react';

interface MagicButtonProps {
  children: React.ReactNode;
  color?: 'pink' | 'cyan' | 'yellow';
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  href?: string;
}

const colorVariants = {
  pink: {
    gradient: 'from-hot-pink via-pink-500 to-rose-500',
    shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.4)]',
    shadowHover: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.6)]',
    glow: 'rgba(236, 72, 153, 0.3)',
  },
  cyan: {
    gradient: 'from-cyan-400 via-cyan-500 to-blue-500',
    shadow: 'shadow-[0_0_20px_rgba(0,245,255,0.4)]',
    shadowHover: 'hover:shadow-[0_0_30px_rgba(0,245,255,0.6)]',
    glow: 'rgba(0, 245, 255, 0.3)',
  },
  yellow: {
    gradient: 'from-yellow-400 via-yellow-500 to-orange-500',
    shadow: 'shadow-[0_0_20px_rgba(251,191,36,0.4)]',
    shadowHover: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.6)]',
    glow: 'rgba(251, 191, 36, 0.3)',
  },
};

export default function MagicButton({
  children,
  color = 'pink',
  className = '',
  onClick,
  type = 'button',
  disabled = false,
  href,
}: MagicButtonProps) {
  const colorConfig = colorVariants[color];

  const baseClasses = `
    relative
    px-6 py-3
    rounded-full
    font-semibold
    text-white
    overflow-hidden
    transition-all
    duration-300
    ease-out
    group
    ${colorConfig.shadow}
    ${colorConfig.shadowHover}
    hover:scale-105
    active:scale-100
    disabled:opacity-50
    disabled:cursor-not-allowed
    disabled:hover:scale-100
    ${className}
  `;

  const gradientClasses = `
    absolute
    inset-0
    bg-gradient-to-r
    ${colorConfig.gradient}
    opacity-100
    group-hover:opacity-90
    transition-opacity
    duration-300
  `;

  const shineClasses = `
    absolute
    inset-0
    bg-gradient-to-r
    from-transparent
    via-white/20
    to-transparent
    -translate-x-full
    group-hover:translate-x-full
    transition-transform
    duration-1000
    ease-in-out
  `;

  const contentClasses = `
    relative
    z-10
    flex
    items-center
    justify-center
    gap-2
  `;

  const buttonContent = (
    <>
      <div className={gradientClasses}></div>
      <div className={shineClasses}></div>
      <div className={contentClasses}>
        {children}
      </div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={baseClasses}
        onClick={onClick}
      >
        {buttonContent}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={baseClasses}
    >
      {buttonContent}
    </button>
  );
}

