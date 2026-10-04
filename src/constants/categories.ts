export interface CategoryDefinition {
  id: string;
  label: string;
  emoji: string;
  icon: string;
}

export const CATEGORY_LIST: CategoryDefinition[] = [
  { id: 'Italien', label: 'Italien / Pizza', emoji: '🇮🇹', icon: '🍝' },
  { id: 'Japonais', label: 'Japonais / Sushi', emoji: '🇯🇵', icon: '🍣' },
  { id: 'Burgers', label: 'Burgers & Street', emoji: '🍔', icon: '🍔' },
  { id: 'Français', label: 'Français / Bistro', emoji: '🇫🇷', icon: '🥞' },
  { id: 'Végétarien', label: 'Végétarien / Healthy', emoji: '🥗', icon: '🥗' },
  { id: 'Rapide', label: 'Fast-Food & Snacking', emoji: '⚡', icon: '⚡' },
  { id: 'Tex-Mex', label: 'Tex-Mex & Tacos', emoji: '🇲🇽', icon: '🌮' },
  { id: 'Café', label: 'Café & Brunch', emoji: '☕', icon: '☕' },
  { id: 'Desserts', label: 'Desserts & Sucré', emoji: '🍰', icon: '🍰' },
  { id: 'Boissons', label: 'Boissons & Smoothies', emoji: '🥤', icon: '🥤' }
];

export const CATEGORY_NAMES = ['Tous', 'Italien', 'Japonais', 'Burgers', 'Français', 'Végétarien', 'Rapide', 'Tex-Mex', 'Café', 'Desserts', 'Boissons'];
