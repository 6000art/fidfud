import React from 'react';
import * as LucideIcons from 'lucide-react';

interface CustomIconProps {
  iconKey: string;
  defaultIcon: React.ComponentType<any>;
  designSettings?: any;
  size?: number;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export const CustomIcon: React.FC<CustomIconProps> = ({
  iconKey,
  defaultIcon: DefaultIconComponent,
  designSettings,
  size = 16,
  className = '',
  onClick
}) => {
  const customValue = designSettings?.customIcons?.[iconKey];

  if (!customValue) {
    return <DefaultIconComponent size={size} className={className} onClick={onClick} />;
  }

  // Case 1: Custom value is a URL (Image, custom icon or animated GIF)
  if (
    customValue.startsWith('http') ||
    customValue.startsWith('/') ||
    customValue.startsWith('data:')
  ) {
    return (
      <img
        src={customValue}
        alt="Custom icon"
        style={{ width: size, height: size }}
        className={`object-contain inline-block rounded-xs ${className}`}
        onClick={onClick}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Case 2: Custom value is an emoji (if length is small and not alphanumeric only)
  const isEmoji = /\p{Emoji}/u.test(customValue) && customValue.length <= 4;
  if (isEmoji) {
    return (
      <span
        style={{ fontSize: size }}
        className={`inline-flex items-center justify-center leading-none select-none ${className}`}
        onClick={onClick}
      >
        {customValue}
      </span>
    );
  }

  // Case 3: Custom value is a Lucide icon name
  const IconComponent = (LucideIcons as any)[customValue];
  if (IconComponent) {
    return <IconComponent size={size} className={className} onClick={onClick} />;
  }

  // Fallback to default
  return <DefaultIconComponent size={size} className={className} onClick={onClick} />;
};

export default CustomIcon;
