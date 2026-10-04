import React, { useState, useEffect } from 'react';
import { 
  ChefHat, X, Plus, Search, Heart, Clock, Flame, 
  Sparkles, CheckCircle2, Play, Timer, Share2, 
  Tag, AlertCircle, BookOpen, User, Film,
  SlidersHorizontal, Check, RefreshCw
} from 'lucide-react';
import { Recipe, RecipeCategory, RecipeIngredient, RecipeStep } from '../types';
import UniversalVideoPlayer from './UniversalVideoPlayer';
import { parseVideoUrl } from '../utils/videoUtils';

interface RecipeSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
  currentUser?: { id: string; email: string; name?: string; role?: string } | null;
  onRefreshFeed?: () => Promise<any> | void;
  onRecipeSelected?: (recipe: Recipe) => void;
}

export default function RecipeSectionModal({
  isOpen,
  onClose,
  initialCategory,
  currentUser,
  onRefreshFeed,
  onRecipeSelected
}: RecipeSectionModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<RecipeCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-modals
  const [isCreateRecipeOpen, setIsCreateRecipeOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);

  // Interactive detail state
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [activeStepTimer, setActiveStepTimer] = useState<{ stepNumber: number; remainingSeconds: number } | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);

  // New Recipe Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState('Omelettes');
  const [newAuthorName, setNewAuthorName] = useState('Chef Fidfud');
  const [newPrepTime, setNewPrepTime] = useState(2);
  const [newCookTime, setNewCookTime] = useState(1);
  const [newDifficulty, setNewDifficulty] = useState<'Facile' | 'Moyen' | 'Expert'>('Facile');
  const [newBudget, setNewBudget] = useState<'€' | '€€' | '€€€'>('€');
  const [newServings, setNewServings] = useState(2);
  const [newCalories, setNewCalories] = useState<number | ''>(250);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newThumbnailUrl, setNewThumbnailUrl] = useState('');
  const [newIngredients, setNewIngredients] = useState<RecipeIngredient[]>([
    { name: '3 gros œufs frais', quantity: '3 pièces', emoji: '🥚' },
    { name: 'Beurre doux', quantity: '20g', emoji: '🧈' },
    { name: 'Fines herbes ciselées', quantity: '1 poignée', emoji: '🌿' }
  ]);
  const [newSteps, setNewSteps] = useState<RecipeStep[]>([
    { stepNumber: 1, title: 'Préparation', instruction: 'Battre les œufs vivement à la fourchette avec sel et poivre.', tip: 'Ne pas trop battre pour garder de l\'onctuosité.' },
    { stepNumber: 2, title: 'Cuisson express', instruction: 'Faire mousser le beurre dans la poêle bien chaude, verser les œufs et remuer vivement 45 secondes.', timerSeconds: 45 },
    { stepNumber: 3, title: 'Pliage & Service', instruction: 'Rouler délicatement l\'omelette en fuseau et servir baveuse.' }
  ]);
  const [newTips, setNewTips] = useState<string[]>([
    'Utilisez une poêle bien chaude et retirez du feu 10s avant la consistance voulue !'
  ]);
  const [newDietaryTags, setNewDietaryTags] = useState<string[]>(['Express < 1 min', 'Végétarien']);
  const [isSubmittingRecipe, setIsSubmittingRecipe] = useState(false);
  const [recipeSubmitSuccess, setRecipeSubmitSuccess] = useState(false);

  // New Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('🍳');
  const [newCatDescription, setNewCatDescription] = useState('');
  const [isSubmittingCat, setIsSubmittingCat] = useState(false);

  // Load recipes and categories
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        fetch('/api/recipes'),
        fetch('/api/recipe-categories')
      ]);
      const recData = await recRes.json();
      const catData = await catRes.json();

      if (Array.isArray(recData)) setRecipes(recData);
      if (Array.isArray(catData)) setCategories(catData);
    } catch (err) {
      console.error('Error fetching recipes/categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
      if (initialCategory) {
        setSelectedCategory(initialCategory);
      }
    }
  }, [isOpen, initialCategory]);

  // Step countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && activeStepTimer && activeStepTimer.remainingSeconds > 0) {
      interval = setInterval(() => {
        setActiveStepTimer(prev => {
          if (!prev || prev.remainingSeconds <= 1) {
            setTimerRunning(false);
            return null;
          }
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning, activeStepTimer]);

  const handleStartTimer = (stepNumber: number, seconds: number) => {
    setActiveStepTimer({ stepNumber, remainingSeconds: seconds });
    setTimerRunning(true);
  };

  const handleToggleIngredient = (ingName: string) => {
    setCheckedIngredients(prev => ({
      ...prev,
      [ingName]: !prev[ingName]
    }));
  };

  const handleLikeRecipe = async (recipeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/recipes/${recipeId}/like`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setRecipes(prev => prev.map(r => r.id === recipeId ? { ...r, likesCount: data.likesCount } : r));
        if (selectedRecipe && selectedRecipe.id === recipeId) {
          setSelectedRecipe(prev => prev ? { ...prev, likesCount: data.likesCount } : null);
        }
      }
    } catch (err) {
      console.error('Error liking recipe:', err);
    }
  };

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmittingCat(true);
    try {
      const res = await fetch('/api/recipe-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          emoji: newCatEmoji.trim() || '🍳',
          description: newCatDescription.trim()
        })
      });
      const data = await res.json();
      if (data.category) {
        setCategories(prev => [...prev, data.category]);
        setNewCategory(data.category.name);
        setSelectedCategory(data.category.name);
        setIsCreateCategoryOpen(false);
        setNewCatName('');
        setNewCatDescription('');
      }
    } catch (err) {
      console.error('Error creating category:', err);
    } finally {
      setIsSubmittingCat(false);
    }
  };

  const handleCreateRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newVideoUrl.trim()) return;
    setIsSubmittingRecipe(true);

    try {
      const parsed = parseVideoUrl(newVideoUrl);
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          category: newCategory,
          authorName: newAuthorName.trim() || 'Chef Fidfud',
          authorRole: 'client',
          prepTimeMinutes: Number(newPrepTime) || 2,
          cookTimeMinutes: Number(newCookTime) || 1,
          difficulty: newDifficulty,
          budgetLevel: newBudget,
          servings: Number(newServings) || 2,
          calories: newCalories ? Number(newCalories) : undefined,
          videoUrl: newVideoUrl.trim(),
          thumbnailUrl: newThumbnailUrl.trim() || undefined,
          videoSourceType: parsed.type,
          ingredients: newIngredients.filter(i => i.name.trim() !== ''),
          steps: newSteps.filter(s => s.instruction.trim() !== ''),
          tips: newTips.filter(t => t.trim() !== ''),
          dietaryTags: newDietaryTags,
          isFeatured: true
        })
      });

      const data = await res.json();
      if (data.success && data.recipe) {
        setRecipes(prev => [data.recipe, ...prev]);
        setRecipeSubmitSuccess(true);
        setTimeout(() => {
          setRecipeSubmitSuccess(false);
          setIsCreateRecipeOpen(false);
          // Reset fields
          setNewTitle('');
          setNewDescription('');
          setNewVideoUrl('');
          setNewThumbnailUrl('');
        }, 1200);
      }
    } catch (err) {
      console.error('Error submitting recipe:', err);
    } finally {
      setIsSubmittingRecipe(false);
    }
  };

  if (!isOpen) return null;

  // Filter recipes
  const filteredRecipes = recipes.filter(r => {
    const matchesCategory = selectedCategory === 'all' || r.category.toLowerCase() === selectedCategory.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery = !q || 
      r.title.toLowerCase().includes(q) || 
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.ingredients && r.ingredients.some(i => i.name.toLowerCase().includes(q)));
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 md:p-6 animate-fade-in font-sans">
      <div className="bg-[#09090B] border border-amber-500/30 rounded-3xl w-full max-w-6xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* TOP HEADER */}
        <div className="p-4 md:p-6 border-b border-white/10 flex flex-wrap items-center justify-between gap-4 bg-zinc-950/90">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10">
              <ChefHat size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-white tracking-wide uppercase">
                  Section Recettes & Astuces
                </h2>
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ⏱️ &lt; 1 min
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Vidéos courtes, astuces de chefs et tutoriels express intégrés directement au feed
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateCategoryOpen(true)}
              className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} className="text-amber-400" />
              <span>Créer une Catégorie</span>
            </button>

            <button
              onClick={() => setIsCreateRecipeOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <Plus size={16} />
              <span>Publier ma Recette (&lt; 1 min)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer ml-1"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SEARCH & CATEGORY BAR */}
        <div className="px-4 md:px-6 py-3 border-b border-white/10 bg-zinc-900/50 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Categories Tab Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
              }`}
            >
              <span>🔥</span>
              <span>Toutes les recettes</span>
              <span className="text-[10px] opacity-75">({recipes.length})</span>
            </button>

            {categories.map(cat => {
              const count = recipes.filter(r => r.category.toLowerCase() === cat.name.toLowerCase()).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory.toLowerCase() === cat.name.toLowerCase()
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black'
                      : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700'
                  }`}
                >
                  <span>{cat.emoji || '🍳'}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="Rechercher ingrédients, œufs, Comté..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* MAIN BODY: RECIPES GRID */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
              <RefreshCw className="animate-spin text-amber-500" size={32} />
              <p className="text-sm font-medium">Chargement des recettes gourmandes...</p>
            </div>
          ) : filteredRecipes.length === 0 ? (
            <div className="text-center py-16 bg-zinc-950/50 rounded-2xl border border-dashed border-white/10 p-8 space-y-3">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                🍳
              </div>
              <h3 className="text-base font-bold text-white">Aucune recette trouvée dans cette catégorie</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Soyez le premier à ajouter une délicieuse recette vidéo courte (&lt; 1 min) pour inspirer la communauté !
              </p>
              <button
                onClick={() => {
                  setNewCategory(selectedCategory !== 'all' ? selectedCategory : 'Omelettes');
                  setIsCreateRecipeOpen(true);
                }}
                className="mt-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Déposer la première recette</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {filteredRecipes.map(recipe => {
                const parsedVideo = parseVideoUrl(recipe.videoUrl);
                return (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className="group bg-zinc-900/90 hover:bg-zinc-850 border border-white/10 hover:border-amber-500/50 rounded-2xl overflow-hidden transition-all duration-200 flex flex-col cursor-pointer hover:shadow-xl hover:shadow-amber-500/5"
                  >
                    {/* Media Preview Box */}
                    <div className="relative aspect-video bg-black overflow-hidden">
                      <UniversalVideoPlayer
                        src={recipe.videoUrl}
                        poster={recipe.thumbnailUrl}
                        isPlaying={false}
                        showControls={false}
                        loop={true}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 pointer-events-none"
                      />

                      {/* Source & Duration Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                        <span className="bg-black/80 backdrop-blur-md text-amber-400 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                          🍳 {recipe.category}
                        </span>
                        {parsedVideo.type === 'pinterest' && (
                          <span className="bg-red-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                            📌 Pinterest
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-2.5 right-2.5 bg-black/85 backdrop-blur-md text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1 z-10">
                        <Clock size={11} className="text-amber-400" />
                        <span>{recipe.cookTimeMinutes}m cuisson</span>
                      </div>

                      {/* Overlay play button on hover */}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                          <Play size={18} className="fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                          <span className="flex items-center gap-1 text-zinc-300 font-medium">
                            <User size={12} className="text-amber-400" />
                            {recipe.authorName}
                          </span>
                          <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            {recipe.difficulty}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {recipe.title}
                        </h3>

                        {recipe.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                            {recipe.description}
                          </p>
                        )}
                      </div>

                      {/* Ingredients snippet */}
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {recipe.ingredients.slice(0, 3).map((ing, idx) => (
                            <span key={idx} className="bg-white/5 text-zinc-300 text-[10px] px-2 py-0.5 rounded-md border border-white/5">
                              {ing.emoji || '•'} {ing.name}
                            </span>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <span className="bg-white/5 text-amber-400 text-[10px] px-1.5 py-0.5 rounded-md border border-white/5">
                              +{recipe.ingredients.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <button
                          onClick={(e) => handleLikeRecipe(recipe.id, e)}
                          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-red-400 transition cursor-pointer"
                        >
                          <Heart size={14} className="hover:fill-red-400" />
                          <span className="font-bold font-mono">{recipe.likesCount || 0}</span>
                        </button>

                        <span className="text-xs text-amber-400 font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          <span>Voir la fiche recette</span>
                          <span>→</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* BOTTOM STATUS BAR */}
        <div className="p-3 px-6 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Flux de recettes en direct synchronisé avec le feed vidéo</span>
          </div>
          <div className="text-[11px] text-zinc-500">
            Toutes les nouvelles recettes publiées apparaissent immédiatement dans le flux principal !
          </div>
        </div>

      </div>

      {/* ============================================================ */}
      {/* FULL RECIPE DETAIL MODAL SHEET */}
      {/* ============================================================ */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-2 md:p-6 animate-fade-in font-sans">
          <div className="bg-[#0c0c0e] border border-amber-500/40 rounded-3xl w-full max-w-4xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Detail Header */}
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🍳</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      {selectedRecipe.category}
                    </span>
                    <span className="text-xs text-zinc-400">Par {selectedRecipe.authorName}</span>
                  </div>
                  <h2 className="text-base md:text-lg font-black text-white line-clamp-1">
                    {selectedRecipe.title}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLikeRecipe(selectedRecipe.id)}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Heart size={14} className="fill-red-400" />
                  <span>{selectedRecipe.likesCount || 0}</span>
                </button>

                <button
                  onClick={() => setSelectedRecipe(null)}
                  className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Detail Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              
              {/* Video Player */}
              <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-lg relative">
                <UniversalVideoPlayer
                  src={selectedRecipe.videoUrl}
                  poster={selectedRecipe.thumbnailUrl}
                  isPlaying={true}
                  showControls={true}
                  loop={true}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                  <Clock className="text-amber-400" size={20} />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Préparation</div>
                    <div className="text-xs font-bold text-white">{selectedRecipe.prepTimeMinutes} min</div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                  <Flame className="text-orange-400" size={20} />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Cuisson Express</div>
                    <div className="text-xs font-bold text-amber-400">{selectedRecipe.cookTimeMinutes} min</div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                  <Sparkles className="text-emerald-400" size={20} />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Difficulté</div>
                    <div className="text-xs font-bold text-emerald-400">{selectedRecipe.difficulty}</div>
                  </div>
                </div>

                <div className="bg-zinc-900/80 border border-white/5 p-3 rounded-xl flex items-center gap-3">
                  <Tag className="text-purple-400" size={20} />
                  <div>
                    <div className="text-[10px] text-zinc-400 uppercase font-bold">Portions / Budget</div>
                    <div className="text-xs font-bold text-white">{selectedRecipe.servings} pers. • {selectedRecipe.budgetLevel}</div>
                  </div>
                </div>
              </div>

              {/* Dietary Tags */}
              {selectedRecipe.dietaryTags && selectedRecipe.dietaryTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedRecipe.dietaryTags.map((tag, idx) => (
                    <span key={idx} className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold px-2.5 py-1 rounded-lg">
                      ✨ {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingredients Interactive Checklist */}
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 md:p-5 space-y-3">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-400" />
                  <span>Ingrédients Nécessaires (Cochez au fur et à mesure)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {selectedRecipe.ingredients.map((ing, idx) => {
                    const isChecked = !!checkedIngredients[ing.name];
                    return (
                      <div
                        key={idx}
                        onClick={() => handleToggleIngredient(ing.name)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between transition cursor-pointer ${
                          isChecked 
                            ? 'bg-emerald-950/30 border-emerald-500/40 text-zinc-400 line-through' 
                            : 'bg-zinc-950 border-white/5 hover:border-amber-500/30 text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{ing.emoji || '🥚'}</span>
                          <span className="text-xs font-bold">{ing.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-amber-400 font-mono font-bold">{ing.quantity}</span>
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isChecked ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-600'
                          }`}>
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <ChefHat size={16} className="text-amber-400" />
                  <span>Étapes de Préparation Minute</span>
                </h3>

                <div className="space-y-3">
                  {selectedRecipe.steps.map((step, idx) => {
                    const isTimerRunningOnThisStep = activeStepTimer?.stepNumber === step.stepNumber;
                    return (
                      <div key={idx} className="p-3.5 bg-zinc-950 border border-white/5 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500 text-black font-black text-xs flex items-center justify-center">
                              {step.stepNumber || idx + 1}
                            </span>
                            {step.title && (
                              <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                                {step.title}
                              </h4>
                            )}
                          </div>

                          {step.timerSeconds && (
                            <button
                              onClick={() => handleStartTimer(step.stepNumber || idx + 1, step.timerSeconds || 45)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                                isTimerRunningOnThisStep
                                  ? 'bg-amber-500 text-black animate-pulse'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                              }`}
                            >
                              <Timer size={13} />
                              <span>
                                {isTimerRunningOnThisStep 
                                  ? `${activeStepTimer.remainingSeconds}s` 
                                  : `Chrono ${step.timerSeconds}s`}
                              </span>
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-zinc-300 pl-8 leading-relaxed">
                          {step.instruction}
                        </p>

                        {step.tip && (
                          <div className="ml-8 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[11px] text-amber-300 flex items-start gap-1.5">
                            <Sparkles size={13} className="shrink-0 mt-0.5 text-amber-400" />
                            <span><strong>Secret :</strong> {step.tip}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chef Tips Section */}
              {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-4 md:p-5 space-y-2">
                  <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} />
                    <span>Astuces Secrètes de Chef</span>
                  </h3>
                  <ul className="space-y-1.5 pl-4 list-disc text-xs text-zinc-300">
                    {selectedRecipe.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PUBLISH NEW RECIPE (< 1 MIN) */}
      {/* ============================================================ */}
      {isCreateRecipeOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-3 md:p-6 animate-fade-in font-sans">
          <div className="bg-[#0a0a0c] border border-amber-500/40 rounded-3xl w-full max-w-3xl max-h-[94vh] overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Form Header */}
            <div className="p-4 md:p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-black rounded-xl font-bold">
                  <ChefHat size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase">
                    Publier une Recette Express (&lt; 1 min)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Partagez votre recette vidéo : elle sera instantanément visible sur le feed vidéo !
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCreateRecipeOpen(false)}
                className="p-2 text-zinc-400 hover:text-white bg-white/5 rounded-xl cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateRecipeSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              
              {recipeSubmitSuccess ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <CheckCircle2 size={48} className="text-emerald-400 animate-bounce" />
                  <h4 className="text-lg font-black text-white">Recette publiée avec succès !</h4>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Votre recette vidéo a été enregistrée et ajoutée directement au feed principal.
                  </p>
                </div>
              ) : (
                <>
                  {/* Title & Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                        Titre de la Recette *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ex: Omelette Baveuse aux Cèpes & Comté"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                        Catégorie *
                      </label>
                      <select
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>
                            {c.emoji} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Video URL with Pinterest & Direct MP4 support */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-zinc-300 uppercase">
                      Lien de la Vidéo Courte (&lt; 1 min) *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://pinterest.com/pin/... ou https://youtu.be/... ou lien direct .mp4"
                      value={newVideoUrl}
                      onChange={e => setNewVideoUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <p className="text-[11px] text-amber-400/90">
                      💡 <strong>Supports pris en charge :</strong> Liens Pinterest (pin.it ou /pin/...), YouTube Shorts, TikTok, Instagram Reel ou fichier vidéo MP4 direct.
                    </p>
                  </div>

                  {/* Video Live Preview */}
                  {newVideoUrl.trim() !== '' && (
                    <div className="p-3 bg-zinc-950 border border-amber-500/20 rounded-xl space-y-2">
                      <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                        <Play size={12} />
                        <span>Aperçu de la vidéo intégrée</span>
                      </div>
                      <div className="w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden mx-auto border border-white/10">
                        <UniversalVideoPlayer
                          src={newVideoUrl}
                          isPlaying={false}
                          showControls={true}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* Times, Difficulty, Budget */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                        Prép (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={newPrepTime}
                        onChange={e => setNewPrepTime(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                        Cuisson (min)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={newCookTime}
                        onChange={e => setNewCookTime(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                        Difficulté
                      </label>
                      <select
                        value={newDifficulty}
                        onChange={e => setNewDifficulty(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Facile">Facile</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                        Budget
                      </label>
                      <select
                        value={newBudget}
                        onChange={e => setNewBudget(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="€">€ (Éco)</option>
                        <option value="€€">€€ (Moyen)</option>
                        <option value="€€€">€€€ (Gourmet)</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                      Description & Histoire du Plat
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Petite description ou conseil pour réussir ce plat..."
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Ingredients Builder */}
                  <div className="space-y-2 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        Ingrédients ({newIngredients.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => setNewIngredients(prev => [...prev, { name: '', quantity: '', emoji: '🥚' }])}
                        className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} />
                        <span>Ajouter un ingrédient</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {newIngredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nom (ex: Œufs plein air)"
                            value={ing.name}
                            onChange={e => {
                              const val = e.target.value;
                              setNewIngredients(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="flex-1 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                          />
                          <input
                            type="text"
                            placeholder="Qté (ex: 3)"
                            value={ing.quantity}
                            onChange={e => {
                              const val = e.target.value;
                              setNewIngredients(prev => prev.map((item, i) => i === idx ? { ...item, quantity: val } : item));
                            }}
                            className="w-24 bg-zinc-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            type="button"
                            onClick={() => setNewIngredients(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-white/10">
                    <button
                      type="submit"
                      disabled={isSubmittingRecipe}
                      className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingRecipe ? (
                        <>
                          <RefreshCw className="animate-spin" size={16} />
                          <span>Publication en cours...</span>
                        </>
                      ) : (
                        <>
                          <ChefHat size={18} />
                          <span>Publier & Ajouter au Feed Vidéo</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREATE NEW CATEGORY */}
      {/* ============================================================ */}
      {isCreateCategoryOpen && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/90 backdrop-blur-2xl p-4 animate-fade-in font-sans">
          <div className="bg-[#0a0a0c] border border-amber-500/40 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🍳</span>
                <h3 className="text-sm font-black text-white uppercase">
                  Nouvelle Catégorie de Recette
                </h3>
              </div>
              <button
                onClick={() => setIsCreateCategoryOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white bg-white/5 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCategorySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Nom de la Catégorie *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Omelettes, Tapas, Pâtes Fraîches..."
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Émoji
                </label>
                <input
                  type="text"
                  placeholder="🍳"
                  value={newCatEmoji}
                  onChange={e => setNewCatEmoji(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-300 uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Brève description de cette catégorie de recettes..."
                  value={newCatDescription}
                  onChange={e => setNewCatDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingCat || !newCatName.trim()}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCat ? 'Création...' : 'Créer la catégorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
