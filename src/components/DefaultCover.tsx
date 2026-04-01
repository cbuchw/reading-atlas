import React from 'react';
import { cn } from '../lib/utils';
import { Book } from 'lucide-react';

interface DefaultCoverProps {
  title: string;
  author: string;
  className?: string;
  variant?: 'grid' | 'list';
}

export const DefaultCover: React.FC<DefaultCoverProps> = ({ title, author, className, variant = 'grid' }) => {
  // Generate a stable "random" index based on title
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hash = getHash(title + author);
  
  const backgrounds = [
    'bg-[#F5F2ED]', // Paper
    'bg-[#E8E4D8]', // Warm Stone
    'bg-[#D6D1C4]', // Muted Clay
    'bg-[#5A5A40]/5', // Faint Olive
    'bg-[#8C7E6D]/10', // Faint Earth
  ];

  const accentColors = [
    'text-olive',
    'text-ink',
    'text-brass',
    'text-[#8C7E6D]',
    'text-[#5A5A40]',
  ];

  const bgClass = backgrounds[hash % backgrounds.length];
  const textClass = accentColors[hash % accentColors.length];
  const firstLetter = title.charAt(0).toUpperCase();

  if (variant === 'list') {
    return (
      <div className={cn("w-full h-full flex items-center justify-center", bgClass, textClass, className)}>
        <Book className="w-4 h-4 opacity-40" />
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full flex flex-col items-center justify-center p-6 text-center relative overflow-hidden", bgClass, className)}>
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-1 bg-olive/10" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-olive/10" />
      
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className={cn("w-12 h-px bg-current opacity-30", textClass)} />
        
        <div className="space-y-2">
          <h4 className={cn("font-display font-bold text-lg leading-tight line-clamp-3", textClass)}>
            {title}
          </h4>
          <div className={cn("w-4 h-px bg-current opacity-20 mx-auto", textClass)} />
          <p className={cn("text-[10px] font-sans font-bold uppercase tracking-[0.2em] opacity-60", textClass)}>
            {author}
          </p>
        </div>

        <div className={cn("w-12 h-px bg-current opacity-30", textClass)} />
      </div>
    </div>
  );
};
