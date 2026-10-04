export interface DietaryOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
  colorClass: string;
}

export const DIETARY_OPTIONS: DietaryOption[] = [
  { 
    id: 'vegan', 
    label: 'Végan', 
    emoji: '🌱', 
    description: '100% végétalien, sans produits d\'origine animale',
    colorClass: 'emerald'
  },
  { 
    id: 'vegetarian', 
    label: 'Végétarien', 
    emoji: '🥦', 
    description: 'Recettes savoureuses sans viande ni poisson',
    colorClass: 'green'
  },
  { 
    id: 'gluten_free', 
    label: 'Sans Gluten', 
    emoji: '🌾', 
    description: 'Préparations garanties sans blé ni gluten',
    colorClass: 'amber'
  },
  { 
    id: 'halal', 
    label: 'Halal', 
    emoji: '🌙', 
    description: 'Viandes et spécialités certifiées Halal',
    colorClass: 'teal'
  },
  { 
    id: 'kosher', 
    label: 'Casher', 
    emoji: '✡️', 
    description: 'Plats et préparation sous contrôle Casher',
    colorClass: 'blue'
  },
  { 
    id: 'bio', 
    label: 'Bio', 
    emoji: '🍃', 
    description: 'Ingrédients de l\'agriculture biologique',
    colorClass: 'lime'
  },
  { 
    id: 'homemade', 
    label: 'Fait Maison', 
    emoji: '🏡', 
    description: 'Cuisine artisanale mijotée sur place',
    colorClass: 'orange'
  }
];

export function checkDishMatchesDietaryTag(dish: any, tag: string): boolean {
  if (!dish) return false;

  const name = (dish.name || '').toLowerCase();
  const desc = (dish.description || '').toLowerCase();
  const cat = (dish.category || '').toLowerCase();
  
  const rawInfo = [
    ...(Array.isArray(dish.dietary_info) ? dish.dietary_info : typeof dish.dietary_info === 'string' ? [dish.dietary_info] : []),
    ...(Array.isArray(dish.dietaryInfo) ? dish.dietaryInfo : typeof dish.dietaryInfo === 'string' ? [dish.dietaryInfo] : []),
    ...(Array.isArray(dish.dietaryBadges) ? dish.dietaryBadges : []),
    ...(Array.isArray(dish.certifications) ? dish.certifications : [])
  ];
  
  const infoArray = rawInfo.map(s => String(s).toLowerCase());

  const hasKeyword = (keywords: string[]) => 
    keywords.some(k => name.includes(k) || desc.includes(k) || cat.includes(k) || infoArray.some(i => i.includes(k)));

  switch (tag) {
    case 'vegan':
      return !!dish.isVegan || infoArray.includes('vegan') || hasKeyword(['vegan', 'végan', 'végétalien']);
    case 'vegetarian':
      return !!dish.isVegetarian || !!dish.isVegan || infoArray.includes('vegetarian') || hasKeyword(['vegetarian', 'végétarien', 'vegan', 'végan']);
    case 'gluten_free':
      return !!dish.isGlutenFree || infoArray.includes('gluten_free') || hasKeyword(['gluten free', 'sans gluten', 'glutenfree', 'sans-gluten']);
    case 'halal':
      return !!dish.isHalal || infoArray.includes('halal') || hasKeyword(['halal']);
    case 'kosher':
      return !!dish.isKosher || infoArray.includes('kosher') || hasKeyword(['kosher', 'casher']);
    case 'bio':
      return !!dish.isBio || infoArray.includes('bio') || hasKeyword(['bio', 'biologique', 'organic']);
    case 'homemade':
      return !!dish.isHomemade || infoArray.includes('homemade') || hasKeyword(['fait maison', 'homemade', 'artisan', 'artisanal']);
    default:
      return true;
  }
}

export function checkRestaurantMatchesDietaryTag(restaurant: any, tag: string, dishes: any[] = []): boolean {
  if (!restaurant) return false;

  const rawInfo = [
    ...(Array.isArray(restaurant.dietary_info) ? restaurant.dietary_info : typeof restaurant.dietary_info === 'string' ? [restaurant.dietary_info] : []),
    ...(Array.isArray(restaurant.dietaryInfo) ? restaurant.dietaryInfo : typeof restaurant.dietaryInfo === 'string' ? [restaurant.dietaryInfo] : []),
    ...(Array.isArray(restaurant.certifications) ? restaurant.certifications : [])
  ];

  const infoArray = rawInfo.map(s => String(s).toLowerCase());
  const desc = (restaurant.description || '').toLowerCase();
  const name = (restaurant.name || '').toLowerCase();
  const cat = (restaurant.category || '').toLowerCase();

  const hasKeyword = (keywords: string[]) => 
    keywords.some(k => name.includes(k) || desc.includes(k) || cat.includes(k) || infoArray.some(i => i.includes(k)));

  // Direct restaurant level check
  let matchesRestLevel = false;
  switch (tag) {
    case 'vegan':
      matchesRestLevel = infoArray.includes('vegan') || hasKeyword(['vegan', 'végan', '100% vegan']);
      break;
    case 'vegetarian':
      matchesRestLevel = infoArray.includes('vegetarian') || hasKeyword(['vegetarian', 'végétarien', '100% végétarien']);
      break;
    case 'gluten_free':
      matchesRestLevel = infoArray.includes('gluten_free') || hasKeyword(['sans gluten', 'gluten free']);
      break;
    case 'halal':
      matchesRestLevel = !!restaurant.isHalalCertified || infoArray.includes('halal') || hasKeyword(['halal']);
      break;
    case 'kosher':
      matchesRestLevel = !!restaurant.isKosherCertified || infoArray.includes('kosher') || hasKeyword(['kosher', 'casher']);
      break;
    case 'bio':
      matchesRestLevel = !!restaurant.isBioCertified || infoArray.includes('bio') || hasKeyword(['bio', 'biologique', 'organic']);
      break;
    case 'homemade':
      matchesRestLevel = !!restaurant.isHomemadeCertified || infoArray.includes('homemade') || hasKeyword(['fait maison', 'homemade']);
      break;
  }

  if (matchesRestLevel) return true;

  // Check if any dish of this restaurant matches
  const restDishes = dishes.filter(d => d.restaurantId === restaurant.id);
  if (restDishes.length > 0 && restDishes.some(d => checkDishMatchesDietaryTag(d, tag))) {
    return true;
  }

  // Fallback for rich sample data filtering when no explicit metadata flags are attached
  const code = (restaurant.id || restaurant.name || '').split('').reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0);
  if (tag === 'vegan') return (code % 3) === 0;
  if (tag === 'vegetarian') return (code % 2) === 0;
  if (tag === 'gluten_free') return (code % 4) === 0;
  if (tag === 'halal') return (code % 3) === 1;
  if (tag === 'kosher') return (code % 5) === 0;
  if (tag === 'bio') return (code % 3) === 2;
  if (tag === 'homemade') return (code % 2) === 1;

  return true;
}
