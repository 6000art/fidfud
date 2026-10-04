export interface MLUserProfile {
  favoriteCategories: Record<string, number>;
  averageSpend: number;
  frequentKeywords: Record<string, number>;
  dietaryPreferences: string[];
  totalOrdersCount: number;
  totalSpentAmount: number;
}

export interface MLScoreResult {
  score: number;
  matchPercentage: number;
  matchReason: string;
  badgeLabel: string;
  breakdown: {
    categoryScore: number;
    contentScore: number;
    priceScore: number;
    intentScore: number;
    popularityScore: number;
  };
}

export class MLRecommendationEngine {
  /**
   * Build vector profile of user preferences from past order history & interactions
   */
  public static buildUserProfile(orders: any[] = [], currentUserId?: string, restaurants: any[] = []): MLUserProfile {
    const favoriteCategories: Record<string, number> = {};
    const frequentKeywords: Record<string, number> = {};
    let totalSpentAmount = 0;
    let totalOrdersCount = 0;

    // Filter relevant orders for current user if user ID is present
    const userOrders = currentUserId && currentUserId !== 'usr-guest'
      ? orders.filter(o => o.userId === currentUserId)
      : orders;

    userOrders.forEach(order => {
      totalOrdersCount++;
      totalSpentAmount += (order.totalAmount || 0);

      // Extract restaurant category if present
      if (order.restaurantId && Array.isArray(restaurants)) {
        const rest = restaurants.find(r => r.id === order.restaurantId);
        if (rest && rest.category) {
          favoriteCategories[rest.category] = (favoriteCategories[rest.category] || 0) + 1;
        }
      }

      if (Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const qty = item.quantity || 1;
          
          // Tokenize item dish name
          const nameTokens = (item.dishName || item.name || '')
            .toLowerCase()
            .replace(/[^\w\sàâäéèêëîïôöùûüç]/gi, '')
            .split(/\s+/)
            .filter((t: string) => t.length > 3);

          nameTokens.forEach((token: string) => {
            frequentKeywords[token] = (frequentKeywords[token] || 0) + qty;
          });
        });
      }
    });

    const averageSpend = totalOrdersCount > 0 ? (totalSpentAmount / totalOrdersCount) : 15.0;

    return {
      favoriteCategories,
      averageSpend,
      frequentKeywords,
      dietaryPreferences: [],
      totalOrdersCount,
      totalSpentAmount
    };
  }

  /**
   * Score a video/dish for recommendation priority (0 to 100)
   */
  public static scoreVideo(
    video: any,
    dish: any,
    restaurant: any,
    userProfile: MLUserProfile,
    activeSearchQuery: string = '',
    activeCategory: string = ''
  ): MLScoreResult {
    // 1. Category score (0 to 100)
    let categoryScore = 45; // baseline
    const restCategory = (restaurant?.category || '').toLowerCase();
    
    // Check if user has ordered from this category
    const categoryHits = Object.entries(userProfile.favoriteCategories)
      .filter(([cat]) => restCategory.includes(cat.toLowerCase()) || cat.toLowerCase().includes(restCategory));
    
    if (categoryHits.length > 0) {
      const topCount = Math.max(...categoryHits.map(([, count]) => count));
      categoryScore = Math.min(100, 65 + topCount * 12);
    }

    // 2. Content similarity score (0 to 100)
    let contentScore = 50;
    const textToMatch = `${video.title || ''} ${dish?.name || ''} ${dish?.description || ''} ${restaurant?.name || ''}`.toLowerCase();
    
    const matchedTokens = Object.keys(userProfile.frequentKeywords).filter(token => 
      textToMatch.includes(token)
    );

    if (matchedTokens.length > 0) {
      contentScore = Math.min(100, 55 + matchedTokens.length * 18);
    }

    // 3. Price affinity score (0 to 100)
    let priceScore = 80;
    if (dish?.price && userProfile.averageSpend > 0) {
      const priceDiff = Math.abs(dish.price - userProfile.averageSpend);
      priceScore = Math.max(15, Math.round(100 * Math.exp(-priceDiff / 15)));
    }

    // 4. Intent alignment score (0 to 100)
    let intentScore = 50;
    if (activeCategory && restCategory.includes(activeCategory.toLowerCase())) {
      intentScore += 40;
    }
    if (activeSearchQuery.trim()) {
      const query = activeSearchQuery.toLowerCase().trim();
      if (textToMatch.includes(query)) {
        intentScore += 45;
      }
    }
    intentScore = Math.min(100, intentScore);

    // 5. Popularity score (0 to 100)
    const likes = video.likesCount || 0;
    const popularityScore = Math.min(100, Math.round(45 + Math.log2(likes + 1) * 8));

    // Weighted Machine Learning Composite Formula
    const weightedScore = (
      (0.30 * categoryScore) +
      (0.25 * contentScore) +
      (0.15 * priceScore) +
      (0.20 * intentScore) +
      (0.10 * popularityScore)
    );

    const matchPercentage = Math.min(99, Math.max(68, Math.round(weightedScore)));

    // Generate human-readable rationale
    let matchReason = "Recommandation basée sur la popularité du chef";
    if (matchedTokens.length > 0) {
      matchReason = `Match saveurs : contient vos ingrédients favoris (${matchedTokens.slice(0, 2).join(', ')})`;
    } else if (categoryHits.length > 0) {
      matchReason = `Basé sur vos ${userProfile.totalOrdersCount} commande(s) en ${restaurant?.category || 'gastronomie'}`;
    } else if (activeCategory) {
      matchReason = `Sélection ML pertinente pour la catégorie ${activeCategory}`;
    } else if (matchPercentage > 85) {
      matchReason = `Profil à ${matchPercentage}% identique à vos préférences d'achat`;
    }

    const badgeLabel = `🧠 ${matchPercentage}% Match ML`;

    return {
      score: weightedScore,
      matchPercentage,
      matchReason,
      badgeLabel,
      breakdown: {
        categoryScore,
        contentScore,
        priceScore,
        intentScore,
        popularityScore
      }
    };
  }

  /**
   * Sort array of videos based on ML Recommendation Scores
   */
  public static rankVideos(
    videos: any[],
    orders: any[] = [],
    user: any = null,
    dishes: any[] = [],
    restaurants: any[] = [],
    activeSearchQuery: string = '',
    activeCategory: string = ''
  ): { rankedVideos: any[]; scoresMap: Record<string, MLScoreResult> } {
    const userProfile = this.buildUserProfile(orders, user?.id, restaurants);
    const scoresMap: Record<string, MLScoreResult> = {};

    const scoredList = videos.map(video => {
      const dish = dishes.find(d => d.id === video.associatedDishId) || video.associatedDish;
      const restaurant = restaurants.find(r => r.id === video.restaurantId);
      const res = this.scoreVideo(video, dish, restaurant, userProfile, activeSearchQuery, activeCategory);
      scoresMap[video.id] = res;
      return { video, score: res.score };
    });

    // Sort descending by score
    scoredList.sort((a, b) => b.score - a.score);

    return {
      rankedVideos: scoredList.map(item => item.video),
      scoresMap
    };
  }
}
