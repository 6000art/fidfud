import { Dish } from '../types';

export interface EnrichedIngredient {
  id: string;
  name: string;
  emoji: string;
  qualityTag?: string; // 'AOP' | 'Bio' | 'Fait Maison' | 'Label Rouge' | 'Local' | 'Frais' | 'Origine France'
  description?: string;
  isKeyIngredient?: boolean;
}

export interface EnrichedNutritionalFacts {
  calories: number; // kcal
  proteins: number; // g
  carbs: number; // g
  fats: number; // g
  fibres: number; // g
  salt: number; // g
  servingSize: string; // e.g. "Portion généreuse 350g"
}

export interface EnrichedAllergen {
  id: string;
  name: string;
  emoji: string;
  severity: 'present' | 'trace';
}

export interface EnrichedDishData {
  galleryImages: string[];
  ingredients: EnrichedIngredient[];
  allergens: EnrichedAllergen[];
  nutrition: EnrichedNutritionalFacts;
  chefTechnique: string;
  chefNotes: string;
  originInfo: string;
  cookingStyle: string;
  portionSize: string;
  spicyLevel: number;
  preparationMinutes: number;
}

// Category-based high definition photography suites
const GALLERY_SUITES: Record<string, string[]> = {
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=1200&auto=format&fit=crop&q=80',
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=1200&auto=format&fit=crop&q=80',
  ],
  sushi: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563612116625-3012372fccce?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=1200&auto=format&fit=crop&q=80',
  ],
  pasta: [
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=1200&auto=format&fit=crop&q=80',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1587314168485-3236d6710814?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=1200&auto=format&fit=crop&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&auto=format&fit=crop&q=80',
  ]
};

// Helper to deduce emoji from ingredient name
function getIngredientEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('tomate') || n.includes('sauce tomate')) return '🍅';
  if (n.includes('mozzarella') || n.includes('fromage') || n.includes('parmesan') || n.includes('cheddar') || n.includes('burrata')) return '🧀';
  if (n.includes('boeuf') || n.includes('steak') || n.includes('viande') || n.includes('angus') || n.includes('pastrami')) return '🥩';
  if (n.includes('poulet') || n.includes('volaille')) return '🍗';
  if (n.includes('saumon') || n.includes('poisson') || n.includes('thon') || n.includes('dorade')) return '🐟';
  if (n.includes('crevette') || n.includes('gambas') || n.includes('homard')) return '🦐';
  if (n.includes('basilic') || n.includes('herbe') || n.includes('coriandre') || n.includes('menthe') || n.includes('estragon')) return '🌿';
  if (n.includes('huile') || n.includes('olive')) return '🫒';
  if (n.includes('ail') || n.includes('echalote') || n.includes('oignon')) return '🧄';
  if (n.includes('pain') || n.includes('bun') || n.includes('brioche') || n.includes('focaccia')) return '🥖';
  if (n.includes('piment') || n.includes('epice') || n.includes('jalapeno') || n.includes('harissa')) return '🌶️';
  if (n.includes('avocat') || n.includes('guacamole')) return '🥑';
  if (n.includes('oeuf') || n.includes('jaune')) return '🥚';
  if (n.includes('riz') || n.includes('vinegre')) return '🍚';
  if (n.includes('citron') || n.includes('yuzu') || n.includes('lime')) return '🍋';
  if (n.includes('truffe')) return '🍄';
  if (n.includes('salade') || n.includes('roquette') || n.includes('laitue')) return '🥬';
  if (n.includes('chocolat') || n.includes('cacao')) return '🍫';
  if (n.includes('vanille') || n.includes('creme') || n.includes('mascarpone')) return '🍦';
  if (n.includes('fraise') || n.includes('framboise') || n.includes('fruit')) return '🍓';
  if (n.includes('pomme de terre') || n.includes('frite')) return '🥔';
  return '✨';
}

export function enrichDishData(dish: Dish): EnrichedDishData {
  const name = dish.name || 'Plat Signature';
  const nameLower = name.toLowerCase();
  const desc = (dish.description || '').toLowerCase();
  const cat = (dish.category || '').toLowerCase();

  // 1. Photos Suite
  let baseImages: string[] = [];
  if (dish.imageUrl && dish.imageUrl.trim()) {
    baseImages.push(dish.imageUrl.trim());
  }
  if (Array.isArray(dish.galleryImages) && dish.galleryImages.length > 0) {
    dish.galleryImages.forEach(img => {
      if (img && img.trim() && !baseImages.includes(img.trim())) {
        baseImages.push(img.trim());
      }
    });
  }

  let suiteKey = 'default';
  if (nameLower.includes('pizza') || cat.includes('pizza') || desc.includes('pizza')) suiteKey = 'pizza';
  else if (nameLower.includes('burger') || cat.includes('burger') || desc.includes('burger')) suiteKey = 'burger';
  else if (nameLower.includes('sushi') || nameLower.includes('saumon') || cat.includes('japonais') || cat.includes('asiatique')) suiteKey = 'sushi';
  else if (nameLower.includes('pasta') || nameLower.includes('pâtes') || nameLower.includes('tagliatelle') || cat.includes('italien')) suiteKey = 'pasta';
  else if (nameLower.includes('tiramisu') || nameLower.includes('gâteau') || nameLower.includes('chocolat') || cat.includes('dessert')) suiteKey = 'dessert';

  const defaultSuite = GALLERY_SUITES[suiteKey] || GALLERY_SUITES.default;
  defaultSuite.forEach(img => {
    if (!baseImages.includes(img) && baseImages.length < 6) {
      baseImages.push(img);
    }
  });

  // 2. Ingredients Calculation
  let ingredientsList: EnrichedIngredient[] = [];

  if (Array.isArray(dish.ingredients) && dish.ingredients.length > 0) {
    ingredientsList = dish.ingredients.map((ing, idx) => ({
      id: `ing-${idx}`,
      name: ing,
      emoji: getIngredientEmoji(ing),
      qualityTag: idx === 0 ? 'Frais du jour' : (idx === 1 ? 'AOP' : undefined),
      isKeyIngredient: idx < 3
    }));
  } else {
    // Generate authentic gourmet ingredients based on profile
    if (suiteKey === 'pizza') {
      ingredientsList = [
        { id: 'i-1', name: 'Farine de blé type 00 issue de moulins italiens', emoji: '🌾', qualityTag: 'Origine Italie', isKeyIngredient: true, description: 'Fermentation lente 48h pour une pâte alvéolée et ultra-digeste.' },
        { id: 'i-2', name: 'Sauce Tomates San Marzano AOP de Campanie', emoji: '🍅', qualityTag: 'AOP', isKeyIngredient: true, description: 'Tomates fraîches concassées à froid au goût doux et acidulé.' },
        { id: 'i-3', name: 'Mozzarella di Bufala Campana fraîche', emoji: '🧀', qualityTag: 'AOP Lait Cru', isKeyIngredient: true, description: 'Fromage filé artisanal au cœur fondant et lacté.' },
        { id: 'i-4', name: 'Huile d\'olive vierge extra pressée à froid', emoji: '🫒', qualityTag: 'Bio', isKeyIngredient: false, description: 'Sélection d\'olives Taggiasca première pression à froid.' },
        { id: 'i-5', name: 'Feuilles de basilic frais bio', emoji: '🌿', qualityTag: 'Bio / Frais', isKeyIngredient: false, description: 'Cueilli le matin même pour préserver ses huiles essentielles.' },
        { id: 'i-6', name: 'Fleur de sel de Guérande', emoji: '🧂', qualityTag: 'Fait Maison', isKeyIngredient: false }
      ];
    } else if (suiteKey === 'burger') {
      ingredientsList = [
        { id: 'i-1', name: 'Pain Bun artisanal brioché au beurre d\'Isigny', emoji: '🥖', qualityTag: 'Fait Maison', isKeyIngredient: true, description: 'Doré minute sur plaque avec une mie fondante.' },
        { id: 'i-2', name: 'Steak de Bœuf Black Angus 100% origine France (150g)', emoji: '🥩', qualityTag: 'Label Rouge', isKeyIngredient: true, description: 'Haché chaque matin, saisi à la plancha pour une croûte croustillante.' },
        { id: 'i-3', name: 'Fromage Cheddar affiné 12 mois au lait cru', emoji: '🧀', qualityTag: 'AOP Affiné', isKeyIngredient: true, description: 'Fondu lentement pour enrober la viande de notes beurrées.' },
        { id: 'i-4', name: 'Oignons rouges caramélisés au vinaigre balsamique', emoji: '🧄', qualityTag: 'Maison', isKeyIngredient: false, description: 'Compotée douce relevée d\'une pointe d\'acidité.' },
        { id: 'i-5', name: 'Sauce secrète signature du Chef', emoji: '✨', qualityTag: 'Recette Secrète', isKeyIngredient: false, description: 'Emulsion onctueuse aux épices douces et moutarde à l\'ancienne.' },
        { id: 'i-6', name: 'Pickles de concombre croquants & jeunes pousses', emoji: '🥬', qualityTag: 'Frais', isKeyIngredient: false }
      ];
    } else if (suiteKey === 'sushi') {
      ingredientsList = [
        { id: 'i-1', name: 'Saumon d\'Écosse Label Rouge & Thon rouge sauvage', emoji: '🐟', qualityTag: 'Label Rouge / Frais', isKeyIngredient: true, description: 'Découpé minute par le maître sushiman, chair nacrée et fondante.' },
        { id: 'i-2', name: 'Riz japonais Koshihikari vinaigré', emoji: '🍚', qualityTag: 'Riz Supérieur', isKeyIngredient: true, description: 'Assaisonné au vinaigre de riz artisanal Akasu.' },
        { id: 'i-3', name: 'Avocat Hass mûr à point & concombre bio', emoji: '🥑', qualityTag: 'Frais', isKeyIngredient: false, description: 'Tranché finement pour un croquant velouté.' },
        { id: 'i-4', name: 'Graines de sésame noir torréfiées', emoji: '🌾', qualityTag: 'Bio', isKeyIngredient: false },
        { id: 'i-5', name: 'Wasabi frais râpé & gingembre mariné maison', emoji: '🌿', qualityTag: 'Artisanal', isKeyIngredient: false },
        { id: 'i-6', name: 'Sauce soja tamari artisanale vieillie en fût', emoji: '✨', qualityTag: 'Sans OGM', isKeyIngredient: false }
      ];
    } else if (suiteKey === 'dessert') {
      ingredientsList = [
        { id: 'i-1', name: 'Mascarpone crémeux de tradition italienne', emoji: '🍦', qualityTag: 'Laiterie Artisanale', isKeyIngredient: true, description: 'Fouetté délicatement avec des jaunes d\'œufs bio frais.' },
        { id: 'i-2', name: 'Café Espresso pur Arabica torréfaction artisanale', emoji: '☕', qualityTag: 'Grand Cru', isKeyIngredient: true, description: 'Infusé serré pour imprégner les biscuits sans les détremper.' },
        { id: 'i-3', name: 'Biscuits Savoiardi faits maison', emoji: '🥖', qualityTag: 'Fait Maison', isKeyIngredient: true, description: 'Texture aérienne saupoudrée de sucre glace.' },
        { id: 'i-4', name: 'Cacao amer hollandais grand cru Valrhona', emoji: '🍫', qualityTag: 'Chocolatier d\'exception', isKeyIngredient: false },
        { id: 'i-5', name: 'Gousse de vanille Bourbon de Madagascar', emoji: '🌿', qualityTag: 'Bio', isKeyIngredient: false }
      ];
    } else {
      ingredientsList = [
        { id: 'i-1', name: 'Produit noble sélectionné auprès de producteurs partenaires', emoji: '🥩', qualityTag: 'Origine France', isKeyIngredient: true, description: 'Sélection rigoureuse pour garantir texture et fraîcheur optimale.' },
        { id: 'i-2', name: 'Garniture de légumes de saison rôtis', emoji: '🥬', qualityTag: 'Circuit Court', isKeyIngredient: true, description: 'Légumes cultivés en agriculture raisonnée par nos maraîchers locaux.' },
        { id: 'i-3', name: 'Jus corsé réduit & beurre noisette', emoji: '🧈', qualityTag: 'Fait Maison', isKeyIngredient: true, description: 'Mijoté 12 heures pour concentrer les arômes naturels.' },
        { id: 'i-4', name: 'Herbes aromatiques fraîches & épices douces', emoji: '🌿', qualityTag: 'Frais', isKeyIngredient: false },
        { id: 'i-5', name: 'Fleur de sel et poivre de Kampot concassé', emoji: '🧂', qualityTag: 'Terroir', isKeyIngredient: false }
      ];
    }
  }

  // 3. Allergens List
  let allergensList: EnrichedAllergen[] = [];
  if (Array.isArray(dish.allergens) && dish.allergens.length > 0) {
    allergensList = dish.allergens.map((alg, idx) => ({
      id: `alg-${idx}`,
      name: alg,
      emoji: alg.toLowerCase().includes('gluten') ? '🌾' : (alg.toLowerCase().includes('lait') || alg.toLowerCase().includes('lactose') ? '🥛' : (alg.toLowerCase().includes('oeuf') ? '🥚' : (alg.toLowerCase().includes('poisson') ? '🐟' : '⚠️'))),
      severity: 'present'
    }));
  } else {
    if (suiteKey === 'pizza') {
      allergensList = [
        { id: 'a-1', name: 'Gluten (Farine de blé)', emoji: '🌾', severity: 'present' },
        { id: 'a-2', name: 'Lactose & Produits Laitiers', emoji: '🥛', severity: 'present' }
      ];
    } else if (suiteKey === 'burger') {
      allergensList = [
        { id: 'a-1', name: 'Gluten (Pain brioché)', emoji: '🌾', severity: 'present' },
        { id: 'a-2', name: 'Lait & Fromage', emoji: '🥛', severity: 'present' },
        { id: 'a-3', name: 'Œufs (Sauce du chef)', emoji: '🥚', severity: 'present' },
        { id: 'a-4', name: 'Traces de Graines de Sésame', emoji: '🌱', severity: 'trace' }
      ];
    } else if (suiteKey === 'sushi') {
      allergensList = [
        { id: 'a-1', name: 'Poissons & Fruits de mer', emoji: '🐟', severity: 'present' },
        { id: 'a-2', name: 'Soja (Sauce tamari)', emoji: '🫘', severity: 'present' },
        { id: 'a-3', name: 'Graines de Sésame', emoji: '🌱', severity: 'present' }
      ];
    } else if (suiteKey === 'dessert') {
      allergensList = [
        { id: 'a-1', name: 'Lait & Mascarpone', emoji: '🥛', severity: 'present' },
        { id: 'a-2', name: 'Œufs', emoji: '🥚', severity: 'present' },
        { id: 'a-3', name: 'Gluten (Biscuits)', emoji: '🌾', severity: 'present' }
      ];
    } else {
      allergensList = [
        { id: 'a-1', name: 'Traces de céleri et moutarde', emoji: '🌿', severity: 'trace' }
      ];
    }
  }

  // 4. Nutritional Facts
  const nutInfo = dish.nutritionalInfo || {};
  let defaultCalories = 580;
  let defaultProteins = 28;
  let defaultCarbs = 48;
  let defaultFats = 22;
  let defaultFibres = 4;
  let defaultSalt = 1.6;

  if (suiteKey === 'pizza') {
    defaultCalories = 780;
    defaultProteins = 32;
    defaultCarbs = 88;
    defaultFats = 26;
    defaultFibres = 5;
    defaultSalt = 2.4;
  } else if (suiteKey === 'burger') {
    defaultCalories = 840;
    defaultProteins = 42;
    defaultCarbs = 62;
    defaultFats = 38;
    defaultFibres = 4;
    defaultSalt = 2.1;
  } else if (suiteKey === 'sushi') {
    defaultCalories = 460;
    defaultProteins = 26;
    defaultCarbs = 58;
    defaultFats = 11;
    defaultFibres = 3;
    defaultSalt = 1.4;
  } else if (suiteKey === 'dessert') {
    defaultCalories = 420;
    defaultProteins = 7;
    defaultCarbs = 44;
    defaultFats = 24;
    defaultFibres = 2;
    defaultSalt = 0.3;
  }

  const nutrition: EnrichedNutritionalFacts = {
    calories: nutInfo.calories || defaultCalories,
    proteins: nutInfo.proteins || defaultProteins,
    carbs: nutInfo.carbs || defaultCarbs,
    fats: nutInfo.fats || defaultFats,
    fibres: defaultFibres,
    salt: defaultSalt,
    servingSize: dish.portionSize || (suiteKey === 'pizza' ? '1 pièce (environ 380g)' : (suiteKey === 'burger' ? '1 burger complet (environ 340g)' : '1 portion gourmet (environ 300g)'))
  };

  // 5. Chef Technique & Origins
  let chefTechnique = 'Préparation à la commande avec des ingrédients frais du jour.';
  let chefNotes = dish.chefNotes || 'Notre chef sélectionne des produits d\'exception issus de circuits courts afin de garantir un équilibre parfait entre gourmandise et authenticité.';
  let originInfo = dish.originMeat || 'Ingrédients français & européens certifiés terroirs AOP/AOC.';
  let cookingStyle = 'Cuisson minute & dressage soigné';

  if (suiteKey === 'pizza') {
    chefTechnique = 'Pâte fermentée 48 heures, étalée à la main et cuite à 450°C dans un four à bois napolitain traditionnel.';
    cookingStyle = 'Four à bois traditionnel (450°C - 90 secondes)';
  } else if (suiteKey === 'burger') {
    chefTechnique = 'Steak smashé à la plancha en fonte pour caraméliser les sucs de cuisson, bun toasté au beurre frais.';
    cookingStyle = 'Saisi plancha & toastage minute';
  } else if (suiteKey === 'sushi') {
    chefTechnique = 'Découpe chirurgicale selon la tradition Edomae, riz tiède vinaigré à température corporelle (36°C).';
    cookingStyle = 'Découpe artisanale crue & assaisonnement au pinceau';
  } else if (suiteKey === 'dessert') {
    chefTechnique = 'Émulsion onctueuse au fouet et repos de 6 heures au frais pour développer les arômes de café et cacao.';
    cookingStyle = 'Prise au froid & saupoudrage minute';
  }

  return {
    galleryImages: baseImages,
    ingredients: ingredientsList,
    allergens: allergensList,
    nutrition,
    chefTechnique,
    chefNotes,
    originInfo,
    cookingStyle,
    portionSize: nutrition.servingSize,
    spicyLevel: dish.spicyLevel || (dish.isSpicy ? 2 : 0),
    preparationMinutes: dish.preparationTimeMinutes || 12
  };
}
