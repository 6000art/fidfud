import { Dish, Order, Restaurant, TasteMatchScore, TasteProfile, User, Video } from '../types';

// Storage keys
const TASTE_INTERACTIONS_KEY = 'fidfud_taste_interactions';
const CUSTOM_TASTE_TAGS_KEY = 'fidfud_custom_taste_tags';
const LIKED_VIDEOS_KEY = 'fidfud_liked_videos';
const SAVED_RESTAURANTS_KEY = 'fidfud_favorite_restaurants';

export interface DishInteractionEvent {
  dishId: string;
  dishName?: string;
  restaurantId?: string;
  action: 'view' | 'cart_add' | 'order' | 'favorite';
  timestamp: number;
}

export interface FlavorAttributeDefinition {
  id: string;
  label: string;
  icon: string;
  keywords: string[];
}

export const FLAVOR_ATTRIBUTES: FlavorAttributeDefinition[] = [
  {
    id: 'spicy',
    label: 'Épicé & Piquant',
    icon: '🌶️',
    keywords: ['épicé', 'epice', 'spicy', 'piment', 'chili', 'jalapeno', 'jalapeño', 'harissa', 'piquant', 'curry', 'wasabi', 'sriracha', 'chipotle', 'tabasco', 'poivre', 'sambal']
  },
  {
    id: 'cheesy_comfort',
    label: 'Fromager & Gourmand',
    icon: '🧀',
    keywords: ['cheddar', 'fromage', 'cheese', 'mozzarella', 'burrata', 'raclette', 'fondant', 'gratin', 'smash', 'burger', 'mac and cheese', 'creme', 'crème', 'bechamel', 'tartiflette', 'parmesan', 'gorgonzola']
  },
  {
    id: 'asian_fresh',
    label: 'Asiatique & Wok',
    icon: '🥢',
    keywords: ['sushi', 'saumon', 'thon', 'poke', 'sashimi', 'wok', 'ramen', 'noodles', 'nouilles', 'riz', 'tempura', 'teriyaki', 'miso', 'gyoza', 'bo bun', 'pad thai', 'soja', 'umami']
  },
  {
    id: 'italian_pizza',
    label: 'Italien & Pizza Napolitaine',
    icon: '🍕',
    keywords: ['pizza', 'pasta', 'pâtes', 'tagliatelle', 'penne', 'spaghetti', 'pesto', 'napolitaine', 'focaccia', 'lasagne', 'calzone', 'stracciatella', 'bolognaise', 'carbonara', 'risotto']
  },
  {
    id: 'meaty_bbq',
    label: 'Grillades, Braisé & BBQ',
    icon: '🥩',
    keywords: ['barbecue', 'bbq', 'grillade', 'braisé', 'steak', 'entrecôte', 'brochette', 'ribs', 'agneau', 'boeuf', 'poulet', 'kebab', 'shawarma', 'fumoir', 'smash burger', 'rôti']
  },
  {
    id: 'healthy_green',
    label: 'Healthy, Frais & Végétal',
    icon: '🥗',
    keywords: ['salade', 'bio', 'avocat', 'quinoa', 'bowl', 'smoothie', 'vegan', 'végétarien', 'veggie', 'graines', 'acai', 'legumes', 'légumes', 'falafel', 'hummus', 'frais']
  },
  {
    id: 'sweet_pastry',
    label: 'Douceurs & Pâtisseries',
    icon: '🍰',
    keywords: ['chocolat', 'cookie', 'tiramisu', 'crêpe', 'gaufre', 'caramel', 'vanille', 'glace', 'donut', 'pancake', 'matcha', 'noisette', 'pistache', 'fraise', 'framboise', 'dessert']
  },
  {
    id: 'truffle_gourmet',
    label: 'Truffe & Gastronomie',
    icon: '✨',
    keywords: ['truffe', 'truffé', 'foie gras', 'caviar', 'gastronomique', 'saint-jacques', 'magret', 'morilles', 'confit', 'artisanal', 'fait maison', 'signature']
  }
];

export class AITasteProfileEngine {
  /**
   * Record a micro-interaction with a dish (view, add to cart, order, etc.)
   */
  public static recordDishInteraction(
    dishId: string,
    action: 'view' | 'cart_add' | 'order' | 'favorite',
    dishName?: string,
    restaurantId?: string
  ): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(TASTE_INTERACTIONS_KEY);
      const list: DishInteractionEvent[] = raw ? JSON.parse(raw) : [];
      list.push({
        dishId,
        dishName,
        restaurantId,
        action,
        timestamp: Date.now()
      });
      // Keep last 150 events to maintain fast in-memory computations
      if (list.length > 150) {
        list.splice(0, list.length - 150);
      }
      localStorage.setItem(TASTE_INTERACTIONS_KEY, JSON.stringify(list));
    } catch {
      // safe fallback
    }
  }

  /**
   * Get stored user interactions
   */
  public static getStoredInteractions(): DishInteractionEvent[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(TASTE_INTERACTIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Get custom taste tags manually activated by user
   */
  public static getCustomTasteTags(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(CUSTOM_TASTE_TAGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Toggle or set custom taste tags
   */
  public static setCustomTasteTags(tags: string[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CUSTOM_TASTE_TAGS_KEY, JSON.stringify(tags));
      window.dispatchEvent(new CustomEvent('fidfud-taste-profile-updated'));
    } catch {
      // safe
    }
  }

  /**
   * Extract liked video IDs from localStorage or user state
   */
  public static getLikedVideoIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(LIKED_VIDEOS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Extract favorite/saved restaurant IDs
   */
  public static getSavedRestaurantIds(user?: User | null): string[] {
    const userFavorites = user?.favoriteRestaurantIds || user?.savedRestaurantIds || [];
    if (typeof window === 'undefined') return userFavorites;
    try {
      const raw = localStorage.getItem(SAVED_RESTAURANTS_KEY);
      const localFavs: string[] = raw ? JSON.parse(raw) : [];
      return Array.from(new Set([...userFavorites, ...localFavs]));
    } catch {
      return userFavorites;
    }
  }

  /**
   * Compute comprehensive AI Taste Profile from multiple engagement signals
   */
  public static buildTasteProfile(
    orders: Order[] = [],
    user: User | null = null,
    dishes: Dish[] = [],
    restaurants: Restaurant[] = [],
    subscriptions: string[] = []
  ): TasteProfile {
    const interactions = this.getStoredInteractions();
    const customTasteTags = this.getCustomTasteTags();
    const likedVideoIds = this.getLikedVideoIds();
    const savedRestaurantIds = this.getSavedRestaurantIds(user);

    // 1. Gather all dish selections (from orders + cart/views interactions)
    const userOrders = user && user.id && user.id !== 'usr-guest'
      ? orders.filter(o => o.userId === user.id)
      : orders;

    const cuisineFrequencies: Record<string, { score: number; count: number }> = {};
    const flavorFrequencies: Record<string, { score: number; count: number }> = {};
    const restaurantEngagementMap: Record<string, { restaurantName: string; orderCount: number; likesCount: number; score: number }> = {};
    const dietarySet = new Set<string>();

    let totalSpent = 0;
    let dishPricesCount = 0;
    const prices: number[] = [];

    // Helper to evaluate text against flavor attributes
    const matchFlavors = (text: string, weightMultiplier: number = 1) => {
      const lower = text.toLowerCase();
      FLAVOR_ATTRIBUTES.forEach(attr => {
        const hits = attr.keywords.filter(k => lower.includes(k));
        if (hits.length > 0) {
          const current = flavorFrequencies[attr.id] || { score: 0, count: 0 };
          current.score += hits.length * weightMultiplier;
          current.count += 1;
          flavorFrequencies[attr.id] = current;
        }
      });
    };

    // A. Parse completed orders (Highest Weight = 4.0)
    userOrders.forEach(order => {
      const rest = restaurants.find(r => r.id === order.restaurantId);
      const restName = rest?.name || order.restaurantName || 'Restaurant';

      if (!restaurantEngagementMap[order.restaurantId]) {
        restaurantEngagementMap[order.restaurantId] = {
          restaurantName: restName,
          orderCount: 0,
          likesCount: 0,
          score: 0
        };
      }
      restaurantEngagementMap[order.restaurantId].orderCount += 1;
      restaurantEngagementMap[order.restaurantId].score += 35; // Heavy loyalty boost

      if (rest?.category) {
        const cat = rest.category;
        const current = cuisineFrequencies[cat] || { score: 0, count: 0 };
        current.score += 25;
        current.count += 1;
        cuisineFrequencies[cat] = current;
      }

      if (Array.isArray(order.items)) {
        order.items.forEach(item => {
          const dish = dishes.find(d => d.id === item.dishId);
          const fullText = `${item.dishName || ''} ${dish?.name || ''} ${dish?.description || ''} ${dish?.category || ''}`;
          matchFlavors(fullText, 4.0 * (item.quantity || 1));

          if (item.price) {
            prices.push(item.price);
            totalSpent += item.price * (item.quantity || 1);
            dishPricesCount += (item.quantity || 1);
          }

          if (dish?.dietaryBadges) {
            dish.dietaryBadges.forEach(b => dietarySet.add(b));
          }
          if (dish?.dietary_info) {
            const arr = Array.isArray(dish.dietary_info) ? dish.dietary_info : [dish.dietary_info];
            arr.forEach(d => dietarySet.add(d));
          }
        });
      }
    });

    // B. Parse Subscribed and Favorite Restaurants (Weight = 25)
    savedRestaurantIds.forEach(restId => {
      const rest = restaurants.find(r => r.id === restId);
      if (!restaurantEngagementMap[restId]) {
        restaurantEngagementMap[restId] = {
          restaurantName: rest?.name || 'Restaurant Favori',
          orderCount: 0,
          likesCount: 0,
          score: 0
        };
      }
      restaurantEngagementMap[restId].score += 25;
      if (rest?.category) {
        const current = cuisineFrequencies[rest.category] || { score: 0, count: 0 };
        current.score += 15;
        cuisineFrequencies[rest.category] = current;
      }
    });

    subscriptions.forEach(restId => {
      const rest = restaurants.find(r => r.id === restId);
      if (!restaurantEngagementMap[restId]) {
        restaurantEngagementMap[restId] = {
          restaurantName: rest?.name || 'Chef Suivi',
          orderCount: 0,
          likesCount: 0,
          score: 0
        };
      }
      restaurantEngagementMap[restId].score += 20;
    });

    // C. Parse micro-interactions (Cart additions = 2.5, Views = 1.0)
    interactions.forEach(evt => {
      const dish = dishes.find(d => d.id === evt.dishId);
      const mult = evt.action === 'cart_add' ? 2.5 : evt.action === 'favorite' ? 2.0 : 1.0;
      const fullText = `${evt.dishName || ''} ${dish?.name || ''} ${dish?.description || ''} ${dish?.category || ''}`;
      matchFlavors(fullText, mult);

      if (evt.restaurantId) {
        const rest = restaurants.find(r => r.id === evt.restaurantId);
        if (!restaurantEngagementMap[evt.restaurantId]) {
          restaurantEngagementMap[evt.restaurantId] = {
            restaurantName: rest?.name || 'Restaurant consulté',
            orderCount: 0,
            likesCount: 0,
            score: 0
          };
        }
        restaurantEngagementMap[evt.restaurantId].score += mult * 2;
      }
    });

    // D. Apply custom user taste tags (Heavy boost 5.0)
    customTasteTags.forEach(tagId => {
      const attr = FLAVOR_ATTRIBUTES.find(f => f.id === tagId);
      if (attr) {
        const current = flavorFrequencies[attr.id] || { score: 0, count: 0 };
        current.score += 50;
        current.count += 5;
        flavorFrequencies[attr.id] = current;
      }
    });

    // Format top flavors
    const topFlavorAttributes = FLAVOR_ATTRIBUTES.map(attr => {
      const stat = flavorFrequencies[attr.id] || { score: 0, count: 0 };
      return {
        attribute: attr.id,
        label: attr.label,
        icon: attr.icon,
        score: stat.score,
        count: stat.count
      };
    }).sort((a, b) => b.score - a.score);

    // Format top cuisines
    const primaryCuisines = Object.entries(cuisineFrequencies)
      .map(([cuisine, stat]) => ({
        cuisine,
        score: stat.score,
        count: stat.count
      }))
      .sort((a, b) => b.score - a.score);

    // Format top engaged restaurants
    const topEngagedRestaurants = Object.entries(restaurantEngagementMap)
      .map(([restaurantId, data]) => ({
        restaurantId,
        restaurantName: data.restaurantName,
        score: data.score,
        orderCount: data.orderCount,
        likesCount: data.likesCount
      }))
      .sort((a, b) => b.score - a.score);

    // Price range calculation
    let avgSpend = 14.50;
    let minPrice = 8.00;
    let maxPrice = 25.00;
    if (prices.length > 0) {
      avgSpend = totalSpent / prices.length;
      minPrice = Math.min(...prices);
      maxPrice = Math.max(...prices);
    }

    // Determine Persona Title & Description
    const topFlavor = topFlavorAttributes[0];
    const secondFlavor = topFlavorAttributes[1];
    const topCuisine = primaryCuisines[0];

    let personaTitle = 'Gourmet Curieux & Explorateur';
    let personaDescription = 'Votre profil gustatif s’affine à chaque sélection de plat et découverte de restaurant.';

    if (topFlavor && topFlavor.score > 10) {
      if (topFlavor.attribute === 'italian_pizza') {
        personaTitle = 'Passionné de Pizza & Terroir Italien';
        personaDescription = 'Grand amateur de pâtes al dente, pizzas napolitaines au feu de bois et mozzarella fraîche.';
      } else if (topFlavor.attribute === 'cheesy_comfort') {
        personaTitle = 'Amateur de Street Food & Fromage Coulant';
        personaDescription = 'Vous privilégiez les burgers généreux, raclettes, cheddar fondu et recettes ultra gourmandes.';
      } else if (topFlavor.attribute === 'spicy') {
        personaTitle = 'Explorateur de Saveurs Épicées & Piment';
        personaDescription = 'Vous adorez le frisson des épices intenses, piments du monde et marinades relevées.';
      } else if (topFlavor.attribute === 'asian_fresh') {
        personaTitle = 'Connaisseur Saveurs Asiatiques & Wok';
        personaDescription = 'Adepte de sushis raffinés, ramens fumants, poke bowls frais et cuisine au wok.';
      } else if (topFlavor.attribute === 'meaty_bbq') {
        personaTitle = 'Spécialiste Grillades, Braisé & BBQ';
        personaDescription = 'Passionné de viandes maturées, cuissons au feu de bois, smash burgers et fumoirs.';
      } else if (topFlavor.attribute === 'healthy_green') {
        personaTitle = 'Adepte de Cuisine Healthy & Végétale';
        personaDescription = 'Vous privilégiez les bowls équilibrés, ingrédients bio, légumes de saison et recettes fraîches.';
      } else if (topFlavor.attribute === 'sweet_pastry') {
        personaTitle = 'Bec Sucré & Passion Pâtisserie';
        personaDescription = 'Incollable sur les desserts artisanaux, crêpes moelleuses, chocolats grands crus et cookies.';
      } else if (topFlavor.attribute === 'truffle_gourmet') {
        personaTitle = 'Gourmet Haute Gastronomie & Truffe';
        personaDescription = 'Sensible aux produits d’exception, accords raffinés, sauces mijotées et truffes noires.';
      }
    } else if (topCuisine && topCuisine.score > 10) {
      personaTitle = `Fidèle de Gastronomie ${topCuisine.cuisine}`;
      personaDescription = `Vos commandes fréquentes confirment votre affinité pour la gastronomie ${topCuisine.cuisine.toLowerCase()}.`;
    }

    return {
      personaTitle,
      personaDescription,
      primaryCuisines: primaryCuisines.slice(0, 5),
      topFlavorAttributes,
      dietaryAffinities: Array.from(dietarySet),
      preferredPriceRange: {
        min: Number(minPrice.toFixed(2)),
        max: Number(maxPrice.toFixed(2)),
        average: Number(avgSpend.toFixed(2))
      },
      favoriteRestaurantIds: savedRestaurantIds,
      topEngagedRestaurants: topEngagedRestaurants.slice(0, 6),
      totalDishSelectionsCount: userOrders.length * 2 + interactions.length,
      totalOrdersCount: userOrders.length,
      totalVideosLikedCount: likedVideoIds.length,
      lastUpdated: new Date().toISOString(),
      customTasteTags
    };
  }

  /**
   * Score an individual video based on the user's AI Taste Profile
   */
  public static scoreVideoByTaste(
    video: Video,
    dish: Dish | undefined,
    restaurant: Restaurant | undefined,
    tasteProfile: TasteProfile,
    options: {
      searchQuery?: string;
      categoryFilter?: string;
      likedVideoIds?: string[];
      subscribedRestaurantIds?: string[];
    } = {}
  ): TasteMatchScore {
    const { searchQuery = '', categoryFilter = '', likedVideoIds = [], subscribedRestaurantIds = [] } = options;
    const tasteBadges: string[] = [];

    // 1. Dish Flavor & Ingredient Affinity Score (0 - 100) -> 35%
    let dishFlavorScore = 45; // baseline
    const targetText = `${video.title || ''} ${video.description || ''} ${dish?.name || ''} ${dish?.description || ''} ${dish?.category || ''}`.toLowerCase();
    
    // Check flavor matches
    let highestFlavorAffinity = 0;
    let bestMatchedFlavor: { label: string; icon: string } | null = null;

    tasteProfile.topFlavorAttributes.forEach(flavor => {
      const def = FLAVOR_ATTRIBUTES.find(f => f.id === flavor.attribute);
      if (!def) return;

      const matchedKeywords = def.keywords.filter(k => targetText.includes(k));
      if (matchedKeywords.length > 0) {
        const attributeAffinity = Math.min(100, 50 + flavor.score * 2.5 + matchedKeywords.length * 12);
        if (attributeAffinity > highestFlavorAffinity) {
          highestFlavorAffinity = attributeAffinity;
          bestMatchedFlavor = { label: def.label, icon: def.icon };
        }
      }
    });

    if (highestFlavorAffinity > 0) {
      dishFlavorScore = highestFlavorAffinity;
      if (bestMatchedFlavor) {
        tasteBadges.push(`${(bestMatchedFlavor as any).icon} ${(bestMatchedFlavor as any).label}`);
      }
    }

    // Direct dietary tag match boost
    if (dish) {
      if (dish.isHalal || dish.isHalalCertified || targetText.includes('halal')) {
        if (tasteProfile.dietaryAffinities.includes('Halal') || tasteProfile.customTasteTags.includes('halal')) {
          dishFlavorScore = Math.min(100, dishFlavorScore + 18);
          tasteBadges.push('🥩 Certifié Halal');
        }
      }
      if (dish.isBio || dish.isBioCertified || targetText.includes('bio')) {
        if (tasteProfile.dietaryAffinities.includes('Bio') || tasteProfile.customTasteTags.includes('bio')) {
          dishFlavorScore = Math.min(100, dishFlavorScore + 15);
          tasteBadges.push('🌿 100% Bio');
        }
      }
      if (dish.isHomemade || dish.isHomemadeCertified || targetText.includes('fait maison') || targetText.includes('artisan')) {
        dishFlavorScore = Math.min(100, dishFlavorScore + 12);
        tasteBadges.push('👨‍🍳 Fait Maison');
      }
    }

    // 2. Restaurant Engagement & Loyalty Score (0 - 100) -> 30%
    let restaurantEngagementScore = 40; // baseline
    const restId = video.restaurantId || restaurant?.id;

    if (restId) {
      const engaged = tasteProfile.topEngagedRestaurants.find(r => r.restaurantId === restId);
      const isFavorite = tasteProfile.favoriteRestaurantIds.includes(restId);
      const isSubscribed = subscribedRestaurantIds.includes(restId);
      const isVideoLiked = likedVideoIds.includes(video.id);

      let engagementPoints = 0;
      if (engaged && engaged.orderCount > 0) {
        engagementPoints += Math.min(50, 25 + engaged.orderCount * 12);
        tasteBadges.push(`⭐ ${engaged.orderCount}x Commandé`);
      }
      if (isFavorite) {
        engagementPoints += 30;
        tasteBadges.push('❤️ Restaurant Favori');
      }
      if (isSubscribed) {
        engagementPoints += 25;
        tasteBadges.push('🔔 Chef Suivi');
      }
      if (isVideoLiked) {
        engagementPoints += 20;
        tasteBadges.push('🔥 Vidéo Likée');
      }

      restaurantEngagementScore = Math.min(100, 40 + engagementPoints);
    }

    // 3. Cuisine Category Score (0 - 100) -> 15%
    let cuisineCategoryScore = 45;
    const restCat = (restaurant?.category || video.category || '').toLowerCase();
    const matchedCuisine = tasteProfile.primaryCuisines.find(c => 
      c.cuisine.toLowerCase().includes(restCat) || restCat.includes(c.cuisine.toLowerCase())
    );

    if (matchedCuisine) {
      cuisineCategoryScore = Math.min(100, 60 + matchedCuisine.score * 1.5);
    }

    if (categoryFilter && restCat.includes(categoryFilter.toLowerCase())) {
      cuisineCategoryScore = Math.min(100, cuisineCategoryScore + 30);
    }

    // 4. Price Sweet Spot Affinity (0 - 100) -> 10%
    let priceSweetSpotScore = 75;
    const dishPrice = dish?.price || video.dishPrice;
    if (dishPrice && tasteProfile.preferredPriceRange.average > 0) {
      const delta = Math.abs(dishPrice - tasteProfile.preferredPriceRange.average);
      // Gaussian decay around sweet spot
      priceSweetSpotScore = Math.max(20, Math.round(100 * Math.exp(-delta / 12)));
    }

    // 5. Serendipity & Discovery Bonus (0 - 100) -> 10%
    let noveltyDiscoveryScore = 55;
    // Reward verified & highly rated places to foster high-quality culinary discovery
    if (restaurant?.isCertified || restaurant?.isFavorite) {
      noveltyDiscoveryScore += 20;
    }
    if (video.likesCount && video.likesCount > 20) {
      noveltyDiscoveryScore += Math.min(25, Math.log2(video.likesCount) * 5);
    }
    noveltyDiscoveryScore = Math.min(100, noveltyDiscoveryScore);

    // Active Search Query Override Bonus
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (targetText.includes(q)) {
        dishFlavorScore = Math.min(100, dishFlavorScore + 35);
      }
    }

    // Weighted Formula
    const compositeScore = (
      (0.35 * dishFlavorScore) +
      (0.30 * restaurantEngagementScore) +
      (0.15 * cuisineCategoryScore) +
      (0.10 * priceSweetSpotScore) +
      (0.10 * noveltyDiscoveryScore)
    );

    // Match percentage normalized from 70% to 99% for intuitive UX
    const matchPercentage = Math.min(99, Math.max(68, Math.round(compositeScore)));

    // Rationale Generation in Natural French
    let matchReason = "Recommandé selon votre profil gustatif et la popularité du plat";
    let matchRationale = `Score IA basé sur vos préférences d'ingrédients et votre historique de commande.`;

    const engagedRest = restId ? tasteProfile.topEngagedRestaurants.find(r => r.restaurantId === restId) : null;
    
    if (engagedRest && engagedRest.orderCount > 0) {
      matchReason = `Fidélité : vous avez déjà commandé ${engagedRest.orderCount} fois chez ${restaurant?.name || 'ce chef'}`;
      matchRationale = `Ce restaurant fait partie de vos adresses régulières avec un taux de satisfaction maximal.`;
    } else if (bestMatchedFlavor && highestFlavorAffinity > 65) {
      matchReason = `Match ${(bestMatchedFlavor as any).label} : correspond à vos saveurs favorites`;
      matchRationale = `Les ingrédients et la préparation de ce plat correspondent à votre appétence pour ${(bestMatchedFlavor as any).label}.`;
    } else if (tasteProfile.favoriteRestaurantIds.includes(restId || '')) {
      matchReason = `Au menu de votre restaurant favori ${restaurant?.name || ''}`;
      matchRationale = `Nouvelle vidéo directement issue de vos établissements enregistrés.`;
    } else if (matchPercentage >= 88) {
      matchReason = `Match Gourmand à ${matchPercentage}% avec vos goûts récents`;
      matchRationale = `Harmonie optimale entre la catégorie culinaire, le tarif moyen (${tasteProfile.preferredPriceRange.average.toFixed(2)}€) et vos ingrédients préférés.`;
    }

    const badgeLabel = `👅 ${matchPercentage}% Match Profil IA`;

    return {
      score: compositeScore,
      matchPercentage,
      matchReason,
      matchRationale,
      badgeLabel,
      tasteBadges: Array.from(new Set(tasteBadges)).slice(0, 3),
      affinityBreakdown: {
        dishFlavorScore: Math.round(dishFlavorScore),
        restaurantEngagementScore: Math.round(restaurantEngagementScore),
        cuisineCategoryScore: Math.round(cuisineCategoryScore),
        priceSweetSpotScore: Math.round(priceSweetSpotScore),
        noveltyDiscoveryScore: Math.round(noveltyDiscoveryScore)
      }
    };
  }

  /**
   * Sort array of videos strictly according to AI Taste Profile scoring algorithm
   */
  public static rankVideosByTasteProfile(
    videos: Video[],
    orders: Order[] = [],
    user: User | null = null,
    dishes: Dish[] = [],
    restaurants: Restaurant[] = [],
    options: {
      searchQuery?: string;
      categoryFilter?: string;
      subscriptions?: string[];
    } = {}
  ): { rankedVideos: Video[]; scoresMap: Record<string, TasteMatchScore>; tasteProfile: TasteProfile } {
    const tasteProfile = this.buildTasteProfile(orders, user, dishes, restaurants, options.subscriptions || []);
    const likedVideoIds = this.getLikedVideoIds();
    const scoresMap: Record<string, TasteMatchScore> = {};

    const scoredList = videos.map(video => {
      const dish = dishes.find(d => d.id === video.associatedDishId || d.id === video.dishId) || video.associatedDish;
      const restaurant = restaurants.find(r => r.id === video.restaurantId);
      
      const scoreResult = this.scoreVideoByTaste(video, dish, restaurant, tasteProfile, {
        searchQuery: options.searchQuery,
        categoryFilter: options.categoryFilter,
        likedVideoIds,
        subscribedRestaurantIds: options.subscriptions || []
      });

      scoresMap[video.id] = scoreResult;
      return { video, score: scoreResult.score };
    });

    // Sort descending by highest score
    scoredList.sort((a, b) => b.score - a.score);

    return {
      rankedVideos: scoredList.map(item => item.video),
      scoresMap,
      tasteProfile
    };
  }
}
