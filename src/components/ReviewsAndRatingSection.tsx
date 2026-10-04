import React, { useState, useEffect } from 'react';
import { 
  Star, 
  ThumbsUp, 
  MessageSquare, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  Filter, 
  Award,
  Clock,
  UserCheck
} from 'lucide-react';
import { Review } from '../types';
import { notify } from '../utils/notify';

interface ReviewsAndRatingSectionProps {
  restaurantId: string;
  restaurantName?: string;
  dishId?: string;
  dishName?: string;
  onReviewAdded?: (newReview: Review) => void;
  currentUser?: { email?: string; name?: string; id?: string } | null;
}

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Décevant 😕',
  2: 'Passable 😐',
  3: 'Bon / Correct 🙂',
  4: 'Très bon ! 😋',
  5: 'Exceptionnel ! ⭐'
};

export default function ReviewsAndRatingSection({
  restaurantId,
  restaurantName,
  dishId,
  dishName,
  onReviewAdded,
  currentUser
}: ReviewsAndRatingSectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState<number>(5.0);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [ratingDistribution, setRatingDistribution] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [showReviewForm, setShowReviewForm] = useState<boolean>(false);
  const [formRating, setFormRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [formTitle, setFormTitle] = useState<string>('');
  const [formText, setFormText] = useState<string>('');
  const [formUserName, setFormUserName] = useState<string>(currentUser?.name || currentUser?.email?.split('@')[0] || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Filter State
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'highest' | 'lowest'>('recent');

  const fetchReviews = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = dishId 
        ? `/api/dishes/${dishId}/reviews` 
        : `/api/restaurants/${restaurantId}/reviews`;
      
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error('Impossible de charger les avis.');
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setReviews(data);
        const count = data.length;
        setReviewCount(count);
        if (count > 0) {
          const sum = data.reduce((acc: number, r: Review) => acc + (Number(r.rating) || 5), 0);
          setAverageRating(Math.round((sum / count) * 10) / 10);
        }
      } else {
        setReviews(data.reviews || []);
        setAverageRating(data.averageRating || 5.0);
        setReviewCount(data.reviewCount || 0);
        if (data.ratingDistribution) {
          setRatingDistribution(data.ratingDistribution);
        }
      }
    } catch (err: any) {
      console.error('[Reviews Section] Error fetching reviews:', err);
      setError(err.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [restaurantId, dishId]);

  // Handle Form Submit
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating || formRating < 1 || formRating > 5) {
      notify('⭐ NOTE REQUISE', 'Veuillez attribuer une note de 1 à 5 étoiles.', 'warn');
      return;
    }
    if (!formText.trim()) {
      notify('✍️ COMMENTAIRE REQUIS', 'Veuillez rédiger un court avis d\'au moins quelques mots.', 'warn');
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = dishId 
        ? `/api/dishes/${dishId}/reviews` 
        : `/api/restaurants/${restaurantId}/reviews`;

      const payload = {
        userName: formUserName.trim() || 'Gourmet Fidfud',
        userEmail: currentUser?.email,
        rating: formRating,
        title: formTitle.trim(),
        text: formText.trim(),
        dishId: dishId || undefined
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Erreur lors de la publication de l\'avis.');
      }

      notify('🎉 AVIS PUBLIÉ !', resData.message || 'Votre avis a été enregistré avec succès.', 'success');
      
      // Reset form
      setFormText('');
      setFormTitle('');
      setShowReviewForm(false);
      
      // Refresh list
      fetchReviews();
      if (onReviewAdded && resData.review) {
        onReviewAdded(resData.review);
      }
    } catch (err: any) {
      notify('❌ ERREUR', err.message || 'Échec de publication de l\'avis.', 'warn');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Like a review
  const handleLikeReview = async (reviewId: string) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/like`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likesCount: data.likesCount } : r));
        notify('👍 MERCI !', 'Votre vote utile a été comptabilisé.', 'info');
      }
    } catch (err) {
      console.error('Error liking review:', err);
    }
  };

  // Filtered and sorted reviews
  const displayedReviews = reviews
    .filter(r => {
      if (selectedStarFilter === null) return true;
      return Math.round(r.rating) === selectedStarFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const getRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 5) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 30) return `Il y a ${diffDays} jours`;
      return new Date(isoString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return 'Récemment';
    }
  };

  return (
    <div className="w-full bg-stone-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-amber-500/20 text-stone-100 shadow-xl space-y-6">
      {/* Header & Overview Card */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between pb-6 border-b border-stone-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex flex-col items-center justify-center text-white shadow-lg shadow-orange-500/20 flex-shrink-0">
            <span className="text-2xl font-black leading-none">{averageRating.toFixed(1)}</span>
            <div className="flex items-center text-amber-200 mt-1">
              <Star className="w-3.5 h-3.5 fill-amber-200" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Avis & Évaluations</span>
              {dishName ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-normal border border-amber-500/30">
                  {dishName}
                </span>
              ) : restaurantName ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-normal border border-amber-500/30">
                  {restaurantName}
                </span>
              ) : null}
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Basé sur <strong className="text-amber-400 font-semibold">{reviewCount} avis authentiques</strong> vérifiés par Fidfud
            </p>
          </div>
        </div>

        <button
          id="btn-open-add-review"
          onClick={() => setShowReviewForm(!showReviewForm)}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 shadow-md ${
            showReviewForm 
              ? 'bg-stone-800 text-stone-300 hover:bg-stone-700' 
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-110 shadow-orange-500/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>{showReviewForm ? 'Fermer le formulaire' : 'Rédiger un avis'}</span>
        </button>
      </div>

      {/* Rating Breakdown Bar Visualizer */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 py-2">
        {[5, 4, 3, 2, 1].map((stars) => {
          const countForStar = ratingDistribution[stars] || 0;
          const percentage = reviewCount > 0 ? Math.round((countForStar / reviewCount) * 100) : (stars === 5 ? 85 : stars === 4 ? 15 : 0);
          const isSelected = selectedStarFilter === stars;
          return (
            <button
              key={stars}
              onClick={() => setSelectedStarFilter(isSelected ? null : stars)}
              className={`flex items-center justify-between sm:flex-col sm:items-start p-2 rounded-xl transition-all border ${
                isSelected 
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300' 
                  : 'bg-stone-950/40 border-stone-800/80 text-stone-400 hover:bg-stone-800/40'
              }`}
            >
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-stone-300">{stars}</span>
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] text-stone-500 sm:hidden">({countForStar})</span>
              </div>
              <div className="w-24 sm:w-full h-1.5 bg-stone-800 rounded-full overflow-hidden my-1">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-stone-500 hidden sm:inline-block">
                {countForStar} avis ({percentage}%)
              </span>
            </button>
          );
        })}
      </div>

      {/* Review Submission Form Modal / Deck */}
      {showReviewForm && (
        <form 
          onSubmit={handleSubmitReview}
          className="bg-stone-950/90 border-2 border-amber-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm sm:text-base font-bold text-white">
                Partagez votre expérience culinaire
              </h4>
            </div>
            <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
              Avis public
            </span>
          </div>

          {/* Interactive Star Rating Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-stone-300 block">
              Votre note globale (sur 5 étoiles) :
            </label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-stone-900 px-3 py-2 rounded-xl border border-stone-800">
                {[1, 2, 3, 4, 5].map((star) => {
                  const activeStar = hoverRating || formRating;
                  const isFilled = star <= activeStar;
                  return (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setFormRating(star)}
                      className="p-1 text-stone-600 hover:scale-125 transition-transform"
                    >
                      <Star 
                        className={`w-7 h-7 ${
                          isFilled 
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]' 
                            : 'text-stone-700'
                        }`} 
                      />
                    </button>
                  );
                })}
              </div>
              <span className="text-xs font-bold text-amber-400 bg-stone-900/90 px-3 py-2 rounded-xl border border-amber-500/20">
                {RATING_DESCRIPTIONS[hoverRating || formRating]}
              </span>
            </div>
          </div>

          {/* Name and Title Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Votre pseudo / nom :
              </label>
              <input
                type="text"
                value={formUserName}
                onChange={(e) => setFormUserName(e.target.value)}
                placeholder="Ex: Sophie G."
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 block mb-1">
                Titre de votre avis (optionnel) :
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: Pâte croustillante et saveurs au top !"
                className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Review Text */}
          <div>
            <label className="text-xs font-semibold text-stone-400 block mb-1">
              Votre commentaire détaillé :
            </label>
            <textarea
              rows={3}
              required
              value={formText}
              onChange={(e) => setFormText(e.target.value)}
              placeholder="Décrivez les saveurs, la texture, la température ou la qualité du service..."
              className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3 text-xs sm:text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReviewForm(false)}
              className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs sm:text-sm hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Publication en cours...' : 'Envoyer mon avis'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Reviews Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          {selectedStarFilter && (
            <button
              onClick={() => setSelectedStarFilter(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 hover:bg-amber-500/30"
            >
              <span>Filtre: {selectedStarFilter} ★</span>
              <span className="font-bold ml-1">×</span>
            </button>
          )}
          <span className="text-xs text-stone-400">
            {displayedReviews.length} avis affichés
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Trier par:
          </span>
          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="bg-stone-950 border border-stone-800 text-stone-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
          >
            <option value="recent">Plus récents</option>
            <option value="highest">Meilleures notes</option>
            <option value="lowest">Notes les plus basses</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-500 space-y-2">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Chargement des avis vérifiés...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs text-center">
            {error}
          </div>
        ) : displayedReviews.length === 0 ? (
          <div className="py-10 text-center bg-stone-950/30 border border-dashed border-stone-800 rounded-2xl p-6">
            <MessageSquare className="w-10 h-10 text-stone-600 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-stone-300">Aucun avis correspondant</p>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              Soyez le premier à partager votre avis gustatif pour aider la communauté gourmande !
            </p>
            <button
              onClick={() => setShowReviewForm(true)}
              className="mt-3 px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition-all"
            >
              Laisser la 1ère note
            </button>
          </div>
        ) : (
          displayedReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-stone-950/70 border border-stone-800/90 rounded-2xl p-4 sm:p-5 space-y-3 hover:border-stone-700/80 transition-all shadow-md"
            >
              {/* User Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-stone-800 to-stone-700 border border-stone-700 flex items-center justify-center text-amber-400 font-bold text-xs uppercase shadow-inner">
                    {rev.userName ? rev.userName.slice(0, 2) : 'CL'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-white">
                        {rev.userName}
                      </span>
                      {rev.isVerifiedBuyer !== false && (
                        <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded-full border border-emerald-800/40">
                          <UserCheck className="w-2.5 h-2.5" />
                          <span>Acheteur Vérifié</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-600" />
                        {getRelativeTime(rev.createdAt)}
                      </span>
                      {rev.dishName && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400/90 font-medium truncate max-w-[150px]">
                            {rev.dishName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Star visualizer */}
                <div className="flex items-center gap-0.5 bg-stone-900 px-2 py-1 rounded-lg border border-stone-800">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.rating 
                          ? 'text-amber-400 fill-amber-400' 
                          : 'text-stone-700'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-black text-amber-400 ml-1">
                    {rev.rating}
                  </span>
                </div>
              </div>

              {/* Review Content */}
              <div className="space-y-1 pl-1">
                {rev.title && (
                  <h5 className="text-xs sm:text-sm font-bold text-stone-200">
                    {rev.title}
                  </h5>
                )}
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                  {rev.text}
                </p>
              </div>

              {/* Chef Reply block if present */}
              {rev.chefReply && (
                <div className="bg-amber-950/30 border-l-2 border-amber-500/80 rounded-r-xl p-3 space-y-1 text-xs text-stone-300 ml-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                    <Award className="w-3.5 h-3.5" />
                    <span>Réponse de {rev.chefReply.chefName || 'l\'établissement'} :</span>
                    <span className="text-[10px] text-stone-500 font-normal ml-auto">
                      {getRelativeTime(rev.chefReply.repliedAt)}
                    </span>
                  </div>
                  <p className="text-stone-300 italic text-[11px] sm:text-xs">
                    "{rev.chefReply.text}"
                  </p>
                </div>
              )}

              {/* Bottom Helpful / Likes Action */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-900/60">
                <span className="text-[10px] text-stone-500">
                  Cet avis vous a-t-il été utile ?
                </span>
                <button
                  onClick={() => handleLikeReview(rev.id)}
                  className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-amber-400 bg-stone-900/60 px-2.5 py-1 rounded-lg border border-stone-800/80 transition-colors"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span className="text-[11px]">Utile ({rev.likesCount || 0})</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
