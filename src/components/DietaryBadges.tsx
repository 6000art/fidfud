import React from 'react';
import { Dish, Restaurant } from '../types';

interface DietaryBadgesProps {
  item?: Dish | Restaurant | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
  isHalal?: boolean;
  isBio?: boolean;
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isHomemade?: boolean;
  isKosher?: boolean;
  isSpicy?: boolean;
  spicyLevel?: number;
  dietary_info?: string[] | string;
}

const parseDietaryInfo = (raw: string[] | string | undefined | null): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export default function DietaryBadges({
  item,
  size = 'sm',
  showLabel = true,
  className = '',
  isHalal: explicitHalal,
  isBio: explicitBio,
  isVegan: explicitVegan,
  isVegetarian: explicitVegetarian,
  isGlutenFree: explicitGlutenFree,
  isHomemade: explicitHomemade,
  isKosher: explicitKosher,
  isSpicy: explicitSpicy,
  spicyLevel: explicitSpicyLevel,
  dietary_info: explicitDietaryInfo
}: DietaryBadgesProps) {
  // Infer certifications from item or props
  let hasHalal = explicitHalal;
  let hasBio = explicitBio;
  let hasVegan = explicitVegan;
  let hasVegetarian = explicitVegetarian;
  let hasGlutenFree = explicitGlutenFree;
  let hasHomemade = explicitHomemade;
  let hasKosher = explicitKosher;
  let hasLactoseFree = false;
  let spicyLevel = explicitSpicyLevel !== undefined ? explicitSpicyLevel : (explicitSpicy ? 2 : 0);

  const customDietaryBadges: Array<{ id: string; label: string; sublabel: string; symbol: string; color: string }> = [];

  const rawDietaryInfoList = [
    ...parseDietaryInfo(explicitDietaryInfo),
    ...(item ? parseDietaryInfo((item as Dish).dietary_info || (item as Dish).dietaryInfo) : []),
    ...(item ? parseDietaryInfo((item as Restaurant).dietary_info || (item as Restaurant).dietaryInfo) : [])
  ];

  rawDietaryInfoList.forEach(rawTag => {
    const tagLower = rawTag.toLowerCase();
    if (tagLower.includes('halal') || tagLower.includes('حلال')) {
      hasHalal = true;
    } else if (tagLower.includes('bio') || tagLower === 'ab') {
      hasBio = true;
    } else if (tagLower.includes('végan') || tagLower.includes('vegan') || tagLower.includes('100% végétal')) {
      hasVegan = true;
    } else if (tagLower.includes('végétarien') || tagLower.includes('vegetarian') || tagLower.includes('veggie')) {
      hasVegetarian = true;
    } else if (tagLower.includes('gluten') || tagLower.includes('sans gluten') || tagLower.includes('gluten-free')) {
      hasGlutenFree = true;
    } else if (tagLower.includes('lactose') || tagLower.includes('sans lactose')) {
      hasLactoseFree = true;
    } else if (tagLower.includes('maison') || tagLower.includes('homemade') || tagLower.includes('fait maison') || tagLower.includes('artisanal')) {
      hasHomemade = true;
    } else if (tagLower.includes('kosher') || tagLower.includes('kasher') || tagLower.includes('cacher')) {
      hasKosher = true;
    } else if (tagLower.includes('piment') || tagLower.includes('épicé') || tagLower.includes('spicy') || tagLower.includes('piquant')) {
      if (spicyLevel === 0) spicyLevel = 2;
    } else {
      // Custom tag
      if (!customDietaryBadges.some(b => b.label.toLowerCase() === rawTag.toLowerCase())) {
        customDietaryBadges.push({
          id: `custom-${rawTag}`,
          label: rawTag.toUpperCase(),
          sublabel: rawTag,
          symbol: '🏷️',
          color: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
        });
      }
    }
  });

  if (item) {
    const dish = item as Dish;
    const rest = item as Restaurant;

    if (dish.isHalal || rest.isHalalCertified || (dish.dietaryBadges && dish.dietaryBadges.includes('HALAL')) || (rest.certifications && rest.certifications.includes('HALAL'))) {
      hasHalal = true;
    }
    if (dish.isBio || rest.isBioCertified || (dish.dietaryBadges && dish.dietaryBadges.includes('BIO')) || (rest.certifications && rest.certifications.includes('BIO'))) {
      hasBio = true;
    }
    if (dish.isVegan || (dish.dietaryBadges && dish.dietaryBadges.includes('VEGAN'))) {
      hasVegan = true;
    }
    if (dish.isVegetarian || (dish.dietaryBadges && dish.dietaryBadges.includes('VEGETARIAN'))) {
      hasVegetarian = true;
    }
    if (dish.isGlutenFree || (dish.dietaryBadges && dish.dietaryBadges.includes('SANS_GLUTEN'))) {
      hasGlutenFree = true;
    }
    if (dish.isHomemade || rest.isHomemadeCertified || (dish.dietaryBadges && dish.dietaryBadges.includes('FAIT_MAISON')) || (rest.certifications && rest.certifications.includes('FAIT_MAISON'))) {
      hasHomemade = true;
    }
    if (dish.isKosher || rest.isKosherCertified || (dish.dietaryBadges && dish.dietaryBadges.includes('KASHER')) || (rest.certifications && rest.certifications.includes('KASHER'))) {
      hasKosher = true;
    }
    if (dish.spicyLevel !== undefined && dish.spicyLevel > 0) {
      spicyLevel = dish.spicyLevel;
    } else if (dish.isSpicy) {
      spicyLevel = 2;
    }

    // Heuristic fallbacks if name/description mentions Halal, Fait Maison, Bio, etc.
    const combinedText = `${dish.name || ''} ${dish.description || ''} ${rest.name || ''} ${rest.slogan || ''}`.toLowerCase();
    if (!hasHalal && (combinedText.includes('halal') || combinedText.includes('حلال'))) {
      hasHalal = true;
    }
    if (!hasKosher && (combinedText.includes('cacher') || combinedText.includes('kasher') || combinedText.includes('kosher'))) {
      hasKosher = true;
    }
    if (!hasHomemade && (combinedText.includes('fait maison') || combinedText.includes('artisan') || combinedText.includes('frais') || combinedText.includes('traditionnel'))) {
      hasHomemade = true;
    }
    if (!hasBio && combinedText.includes('bio')) {
      hasBio = true;
    }
    if (!hasVegan && (combinedText.includes('végan') || combinedText.includes('vegan'))) {
      hasVegan = true;
    }
    if (spicyLevel === 0 && (combinedText.includes('piment') || combinedText.includes('épicé') || combinedText.includes('spicy') || combinedText.includes('piquant') || combinedText.includes('harissa') || combinedText.includes('jalapeno') || combinedText.includes('chili'))) {
      spicyLevel = combinedText.includes('très épicé') || combinedText.includes('extra') ? 3 : 2;
    }
  }

  const badges = [];

  if (hasHalal) {
    badges.push({
      id: 'halal',
      label: 'HALAL',
      sublabel: 'Certifié Halal',
      symbol: '☪️',
      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    });
  }

  if (hasKosher) {
    badges.push({
      id: 'kosher',
      label: 'CASHER',
      sublabel: 'Certifié Casher',
      symbol: '✡️',
      color: 'bg-blue-500/15 text-blue-400 border-blue-500/30'
    });
  }

  if (spicyLevel > 0) {
    const spicyLabels = ['', 'DOUX', 'ÉPICÉ 🌶️', 'TRÈS ÉPICÉ 🌶️🌶️', 'EXTRÊME 🔥'];
    const spicyColors = [
      '',
      'bg-amber-500/15 text-amber-300 border-amber-500/30',
      'bg-orange-500/15 text-orange-400 border-orange-500/30',
      'bg-red-500/15 text-red-400 border-red-500/30',
      'bg-red-600/25 text-red-300 border-red-500/50 animate-pulse'
    ];
    badges.push({
      id: 'spicy',
      label: spicyLabels[Math.min(spicyLevel, 4)] || 'ÉPICÉ',
      sublabel: `Piment niv. ${spicyLevel}`,
      symbol: '🌶️',
      color: spicyColors[Math.min(spicyLevel, 4)] || 'bg-red-500/15 text-red-400 border-red-500/30'
    });
  }

  if (hasHomemade) {
    badges.push({
      id: 'homemade',
      label: 'FAIT MAISON',
      sublabel: 'Artisanal',
      symbol: '👨‍🍳',
      color: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    });
  }

  if (hasBio) {
    badges.push({
      id: 'bio',
      label: 'BIO',
      sublabel: 'AB',
      symbol: '🌿',
      color: 'bg-green-500/15 text-green-400 border-green-500/30'
    });
  }

  if (hasVegan) {
    badges.push({
      id: 'vegan',
      label: 'VÉGAN',
      sublabel: '100% Végétal',
      symbol: '🌱',
      color: 'bg-teal-500/15 text-teal-300 border-teal-500/30'
    });
  } else if (hasVegetarian) {
    badges.push({
      id: 'vegetarian',
      label: 'VÉGÉTARIEN',
      sublabel: 'Veggie',
      symbol: '🥗',
      color: 'bg-lime-500/15 text-lime-400 border-lime-500/30'
    });
  }

  if (hasGlutenFree) {
    badges.push({
      id: 'glutenfree',
      label: 'SANS GLUTEN',
      sublabel: 'Gluten-Free',
      symbol: '🌾',
      color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30'
    });
  }

  if (hasLactoseFree) {
    badges.push({
      id: 'lactosefree',
      label: 'SANS LACTOSE',
      sublabel: 'Dairy-Free',
      symbol: '🥛',
      color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
    });
  }

  // Include custom dietary tags
  badges.push(...customDietaryBadges);

  if (badges.length === 0) return null;

  const sizeClasses = {
    xs: 'text-[9px] px-1.5 py-0.5 gap-1',
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {badges.map((b) => (
        <span
          key={b.id}
          className={`inline-flex items-center font-black uppercase tracking-wider border rounded-md shadow-xs backdrop-blur-md ${sizeClasses[size]} ${b.color}`}
          title={`${b.label} (${b.sublabel})`}
        >
          <span className="text-xs leading-none">{b.symbol}</span>
          {showLabel && <span>{b.label}</span>}
        </span>
      ))}
    </div>
  );
}
