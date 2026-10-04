import React from 'react';
import LazyImage from './LazyImage';
import { X, ShoppingBag, Trash2, Plus, Minus, CreditCard, ShieldAlert, Sparkles } from 'lucide-react';
import { CartItem } from '../types';
import { notify } from '../utils/notify';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (dishId: string, delta: number) => void;
  onRemoveItem: (dishId: string) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export default function Cart({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout
}: CartProps) {
  if (!isOpen) return null;

  const subtotal = cartItems.reduce((acc, item) => {
    const suppTotal = (item.selectedSupplements || []).reduce((sum, s) => sum + s.price, 0);
    return acc + (item.dish.price + suppTotal) * item.quantity;
  }, 0);

  const restaurantName = cartItems.length > 0 ? cartItems[0].restaurantName : '';

  const handleUpdateQty = (dishId: string, delta: number, dishName: string) => {
    onUpdateQuantity(dishId, delta);
    if (delta > 0) {
      notify("🔢 QUANTITÉ AUGMENTÉE", `Une portion de ${dishName} ajoutée`, "info");
    } else {
      notify("🔢 QUANTITÉ DIMINUÉE", `Portion de ${dishName} ajustée`, "info");
    }
  };

  const handleRemove = (dishId: string, dishName: string) => {
    onRemoveItem(dishId);
    notify("🗑️ PLAT RETIRÉ", `${dishName} retiré du panier`, "info");
  };

  const handleClear = () => {
    onClearCart();
    notify("🗑️ PANIER VIDÉ", "Tous les articles ont été retirés du panier", "warn");
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/80 backdrop-blur-sm transition-opacity duration-300">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Cart Slider */}
      <div className="relative w-full max-w-md h-full bg-[#0D0D0E]/95 backdrop-blur-md border-l border-white/5 shadow-2xl flex flex-col z-10 transition-transform duration-300 transform translate-x-0">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#050505]">
          <div className="flex items-center space-x-2">
            <ShoppingBag size={20} className="text-[#FF5A1F]" />
            <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Mon Panier</h3>
            <span className="bg-[#FF5A1F]/15 text-[#FF5A1F] text-xs font-black px-2 py-0.5 rounded-full">
              {cartItems.length}
            </span>
          </div>
          <button 
            id="btn-close-cart"
            onClick={onClose}
            className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-white/5 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cart Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-4 rounded-full bg-zinc-900/60 text-zinc-500 mb-4 border border-white/5">
                <ShoppingBag size={40} className="stroke-[1.5]" />
              </div>
              <h4 className="text-white font-black uppercase text-base mb-1 italic">Votre panier est vide</h4>
              <p className="text-zinc-500 text-xs max-w-xs leading-relaxed font-sans">
                Scrollez les vidéos verticales de FIDFUD pour découvrir de délicieux plats locaux et commandez en un clic !
              </p>
            </div>
          ) : (
            <>
              {/* Single Restaurant Warning / Info Header */}
              <div className="p-3 bg-zinc-900/60 rounded-xl border border-white/5 flex items-start space-x-3">
                <div className="p-1.5 rounded bg-[#FF5A1F]/10 text-[#FF5A1F] mt-0.5">
                  <ShieldAlert size={14} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Commande chez :</p>
                  <p className="text-sm text-[#FF5A1F] font-black italic uppercase">{restaurantName}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal font-sans font-medium">
                    Pour garantir la fraîcheur et la rapidité de préparation, chaque commande FIDFUD doit provenir d'un seul restaurant.
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                {cartItems.map(item => {
                  const suppTotal = (item.selectedSupplements || []).reduce((sum, s) => sum + s.price, 0);
                  const itemUnitPrice = item.dish.price + suppTotal;
                  const itemTotalPrice = itemUnitPrice * item.quantity;

                  return (
                    <div 
                      key={item.dish.id + (item.selectedSupplements?.map(s => s.id).join('-') || '')} 
                      className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start space-x-3 transition-colors hover:border-white/10"
                    >
                      {/* Dish Image */}
                      {item.dish.imageUrl && (
                        <LazyImage 
                          src={item.dish.imageUrl} 
                          alt={item.dish.name} 
                          sizeType="thumbnail"
                          containerClassName="w-16 h-16 rounded-lg shrink-0 overflow-hidden bg-zinc-900 border border-white/5"
                          className="w-full h-full object-cover" 
                        />
                      )}

                      {/* Information */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-black truncate">{item.dish.name}</p>
                        <p className="text-zinc-500 text-[11px] truncate mt-0.5">{item.dish.description}</p>
                        
                        {/* Selected Supplements Pill List */}
                        {item.selectedSupplements && item.selectedSupplements.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {item.selectedSupplements.map(supp => (
                              <span 
                                key={supp.id}
                                className="inline-flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono"
                              >
                                <Sparkles size={8} /> {supp.name} (+{supp.price.toFixed(2)}€)
                              </span>
                            ))}
                          </div>
                        )}

                        <p className="text-[#FF5A1F] text-sm font-extrabold mt-1.5">
                          {itemTotalPrice.toFixed(2)} €
                        </p>
                      </div>

                      {/* Actions and Quantities */}
                      <div className="flex flex-col items-end justify-between h-16 pl-2">
                        <button 
                          onClick={() => handleRemove(item.dish.id, item.dish.name)}
                          className="p-1 text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                          title="Supprimer du panier"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="flex items-center space-x-1 bg-zinc-950 border border-white/5 rounded-lg p-0.5">
                          <button
                            onClick={() => handleUpdateQty(item.dish.id, -1, item.dish.name)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Diminuer"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-white font-mono">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleUpdateQty(item.dish.id, 1, item.dish.name)}
                            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Augmenter"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Clear Cart Button */}
              <button
                id="btn-clear-cart"
                onClick={handleClear}
                className="w-full text-center text-xs text-zinc-500 hover:text-red-500 hover:border-red-500/20 transition-colors py-2 border border-white/5 rounded-lg font-mono cursor-pointer"
              >
                Vider le panier entièrement
              </button>
            </>
          )}
        </div>

        {/* Footer Summary & Passer commande triggers */}
        {cartItems.length > 0 && (
          <div className="p-5 border-t border-white/5 bg-[#050505] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Sous-total</span>
              <span className="text-xl font-black text-white">{subtotal.toFixed(2)} €</span>
            </div>
            
            <div className="space-y-2">
              <button
                id="btn-proceed-checkout"
                onClick={onCheckout}
                className="w-full flex items-center justify-center space-x-2 bg-[#FF5A1F] hover:bg-[#ff6e38] text-white font-black uppercase text-sm py-4 rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-[0_20px_40px_rgba(255,90,31,0.25)] cursor-pointer"
              >
                <CreditCard size={16} />
                <span>Passer la commande (Stripe)</span>
              </button>
              
              <p className="text-[10px] text-zinc-500 text-center font-sans">
                Sélection du mode de livraison et paiement sécurisé à l'étape suivante.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
