import React, { useState } from 'react';
import { 
  Layout, 
  Sliders, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  MoveUp, 
  MoveDown, 
  Check, 
  Sparkles, 
  Image as ImageIcon, 
  Maximize2, 
  Palette, 
  MousePointer, 
  Menu, 
  ShoppingBag, 
  User, 
  Disc, 
  Search, 
  MapPin, 
  Bell, 
  Tv, 
  Home as HomeIcon,
  Users,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface HeaderAndNavBuilderProps {
  designSettings: any;
  onUpdateDesignSettings: (settings: any) => void;
  onSaveDesignSettings?: (settings: any) => Promise<boolean>;
}

const AVAILABLE_ICONS = [
  { id: 'Home', label: 'Accueil', icon: HomeIcon },
  { id: 'Tv', label: 'Vidéos & Lives', icon: Tv },
  { id: 'Search', label: 'Recherche', icon: Search },
  { id: 'ShoppingBag', label: 'Commandes', icon: ShoppingBag },
  { id: 'Disc', label: 'DJ Live', icon: Disc },
  { id: 'Users', label: 'Contacts', icon: Users },
  { id: 'User', label: 'Profil', icon: User },
  { id: 'Bell', label: 'Notifications', icon: Bell },
  { id: 'MapPin', label: 'GPS', icon: MapPin },
];

const PRESET_LOGOS = [
  { label: 'Fidfud Neon Sunset', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80' },
  { label: 'Gourmet Gold Badge', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=150&auto=format&fit=crop&q=80' },
  { label: 'Street Food Flame', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=150&auto=format&fit=crop&q=80' },
];

export default function HeaderAndNavBuilder({
  designSettings,
  onUpdateDesignSettings,
  onSaveDesignSettings
}: HeaderAndNavBuilderProps) {
  const [activeTab, setActiveTab] = useState<'header' | 'bottom' | 'hidden' | 'editor'>('header');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Safely extract config with fallbacks
  const headerConfig = designSettings?.headerConfig || {
    backgroundColor: '#0B0B0C',
    backgroundOpacity: 95,
    enableBackdropBlur: true,
    logoUrl: designSettings?.logoUrl || '',
    logoPosition: 'left',
    logoSizeMobile: designSettings?.logoSizeMobile || 36,
    logoSizeDesktop: designSettings?.logoSizeDesktop || 48,
    visibleIcons: {
      hamburgerMenu: true,
      djLive: true,
      cart: true,
      account: true,
      searchBar: true,
      gpsLocation: false,
      ordersHistory: false,
    }
  };

  const bottomNavConfig = designSettings?.bottomNavConfig || {
    backgroundColor: '#050506',
    backgroundOpacity: 95,
    activeColor: '#FF5C00',
    items: [
      { id: 'home', label: 'Accueil', icon: 'Home', visible: true, action: 'home' },
      { id: 'feed', label: 'Consulter', icon: 'Tv', visible: true, action: 'feed' },
      { id: 'dj', label: 'DJ Live', icon: 'Disc', visible: true, action: 'dj' },
      { id: 'orders', label: 'Activité', icon: 'Bell', visible: true, action: 'orders' },
      { id: 'account', label: 'Compte', icon: 'User', visible: true, action: 'profile' }
    ]
  };

  const hiddenElements: string[] = designSettings?.hiddenElements || [];
  const isVisualEditorActive: boolean = designSettings?.isVisualEditorActive || false;

  const updateHeaderConfig = (updatedFields: Partial<typeof headerConfig>) => {
    const newHeaderConfig = { ...headerConfig, ...updatedFields };
    onUpdateDesignSettings({
      headerConfig: newHeaderConfig,
      // sync root logo fields if modified
      ...(updatedFields.logoUrl !== undefined ? { logoUrl: updatedFields.logoUrl } : {}),
      ...(updatedFields.logoSizeMobile !== undefined ? { logoSizeMobile: updatedFields.logoSizeMobile } : {}),
      ...(updatedFields.logoSizeDesktop !== undefined ? { logoSizeDesktop: updatedFields.logoSizeDesktop } : {})
    });
  };

  const updateBottomNavConfig = (updatedFields: Partial<typeof bottomNavConfig>) => {
    const newBottomConfig = { ...bottomNavConfig, ...updatedFields };
    onUpdateDesignSettings({ bottomNavConfig: newBottomConfig });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    if (onSaveDesignSettings) {
      const ok = await onSaveDesignSettings(designSettings);
      if (ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } else {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
    setIsSaving(false);
  };

  // Bottom Nav items management
  const handleAddBottomNavItem = () => {
    const newId = `nav-${Date.now()}`;
    const newItem = {
      id: newId,
      label: 'Nouveau',
      icon: 'Home',
      visible: true,
      action: 'home'
    };
    const updatedItems = [...bottomNavConfig.items, newItem];
    updateBottomNavConfig({ items: updatedItems });
  };

  const handleRemoveBottomNavItem = (id: string) => {
    const updatedItems = bottomNavConfig.items.filter((it: any) => it.id !== id);
    updateBottomNavConfig({ items: updatedItems });
  };

  const handleMoveBottomNavItem = (index: number, direction: 'up' | 'down') => {
    const items = [...bottomNavConfig.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;
    updateBottomNavConfig({ items });
  };

  const handleUpdateBottomNavItem = (index: number, field: string, value: any) => {
    const items = [...bottomNavConfig.items];
    items[index] = { ...items[index], [field]: value };
    updateBottomNavConfig({ items });
  };

  // Restore hidden elements
  const handleRestoreElement = (elementId: string) => {
    const updatedHidden = hiddenElements.filter(id => id !== elementId);
    onUpdateDesignSettings({ hiddenElements: updatedHidden });
  };

  const handleRestoreAllElements = () => {
    onUpdateDesignSettings({ hiddenElements: [] });
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-4 md:p-6 text-white space-y-6 shadow-2xl">
      
      {/* HEADER BUILDER TITLE & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30">
              <Sliders size={20} />
            </span>
            <h2 className="text-lg md:text-xl font-black tracking-tight text-white">
              Éditeur de Layout & Navigabilité (Elementor Super-Admin)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Gérez la disposition de votre en-tête (Header), menu burger et barre de navigation basse en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Quick toggle for Live Visual Builder */}
          <button
            onClick={() => onUpdateDesignSettings({ isVisualEditorActive: !isVisualEditorActive })}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border transition-all cursor-pointer ${
              isVisualEditorActive
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:text-white'
            }`}
          >
            <MousePointer size={14} className={isVisualEditorActive ? 'animate-bounce text-amber-400' : ''} />
            <span>{isVisualEditorActive ? 'Éditeur Visuel: ACTIF' : 'Activer Éditeur Visuel Direct'}</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white font-black text-xs uppercase tracking-wider rounded-2xl border border-[#FF5C00] shadow-lg shadow-[#FF5C00]/25 flex items-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : savedSuccess ? (
              <Check size={14} className="text-emerald-300" />
            ) : (
              <Sparkles size={14} />
            )}
            <span>{savedSuccess ? 'Enregistré !' : 'Enregistrer'}</span>
          </button>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'header', label: '📌 En-Tête (Header)', icon: Layout },
          { id: 'bottom', label: '📱 Navigation Basse', icon: Sliders },
          { id: 'editor', label: '🛠️ Mode Visual Direct', icon: MousePointer },
          { id: 'hidden', label: `👁️ Éléments Masqués (${hiddenElements.length})`, icon: EyeOff }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap border ${
                isActive
                  ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-lg shadow-[#FF5C00]/20'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: HEADER CONFIGURATION */}
      {activeTab === 'header' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Header Colors & Transparency */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Palette size={16} />
              <span>Style & Transparence du Header</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Background Color */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Couleur de Fond</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={headerConfig.backgroundColor || '#0B0B0C'}
                    onChange={e => updateHeaderConfig({ backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={headerConfig.backgroundColor || '#0B0B0C'}
                    onChange={e => updateHeaderConfig({ backgroundColor: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              {/* Background Opacity Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-zinc-300">Opacité du Header</label>
                  <span className="font-mono text-amber-400 font-bold">{headerConfig.backgroundOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={headerConfig.backgroundOpacity ?? 95}
                  onChange={e => updateHeaderConfig({ backgroundOpacity: Number(e.target.value) })}
                  className="w-full accent-[#FF5C00] cursor-pointer"
                />
                <p className="text-[10px] text-zinc-500">Mettre à 0% pour un header totalement transparent.</p>
              </div>

              {/* Backdrop Blur Toggle */}
              <div className="space-y-1.5 flex flex-col justify-center">
                <label className="text-xs font-bold text-zinc-300">Effet Flou Arrière-Plan (Blur)</label>
                <label className="flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={headerConfig.enableBackdropBlur ?? true}
                    onChange={e => updateHeaderConfig({ enableBackdropBlur: e.target.checked })}
                    className="w-4 h-4 accent-[#FF5C00] rounded cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300">Activer backdrop-blur</span>
                </label>
              </div>
            </div>
          </div>

          {/* Logo Settings & Position */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#FF5C00] flex items-center gap-2">
              <ImageIcon size={16} />
              <span>Logo & Emplacement</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Custom Logo URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">URL du Logo Personnalisé</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={headerConfig.logoUrl || ''}
                  onChange={e => updateHeaderConfig({ logoUrl: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
                />
                {/* Preset Logo Quick Selectors */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-400 font-bold">Exemples:</span>
                  {PRESET_LOGOS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => updateHeaderConfig({ logoUrl: preset.url })}
                      className="text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-700 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Position */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Alignement du Logo dans le Header</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'left', label: 'Gauche (Défaut)' },
                    { id: 'center', label: 'Centré' },
                    { id: 'right', label: 'Droite' }
                  ].map(pos => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateHeaderConfig({ logoPosition: pos.id as any })}
                      className={`py-2 px-2 rounded-xl text-xs font-bold text-center border cursor-pointer transition-all ${
                        headerConfig.logoPosition === pos.id
                          ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-md'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-white'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Height Mobile & Desktop */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-zinc-300">Taille du Logo Mobile</label>
                  <span className="font-mono text-zinc-400">{headerConfig.logoSizeMobile || 36}px</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={headerConfig.logoSizeMobile || 36}
                  onChange={e => updateHeaderConfig({ logoSizeMobile: Number(e.target.value) })}
                  className="w-full accent-[#FF5C00] cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-zinc-300">Taille du Logo Desktop</label>
                  <span className="font-mono text-zinc-400">{headerConfig.logoSizeDesktop || 48}px</span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="120"
                  value={headerConfig.logoSizeDesktop || 48}
                  onChange={e => updateHeaderConfig({ logoSizeDesktop: Number(e.target.value) })}
                  className="w-full accent-[#FF5C00] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Visible Icons Selector */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Eye size={16} />
              <span>Icônes & Éléments Visibles dans le Header Supérieur</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Activez ou masquez directement les éléments de la barre principale. Tout élément masqué reste accessible depuis le menu Hamburger.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: 'hamburgerMenu', label: '🍔 Menu Hamburger', icon: Menu, desc: 'Tiroir complet des fonctionnalités' },
                { key: 'djLive', label: '🎧 Bouton DJ Live', icon: Disc, desc: 'Bouton d’accès au stream musical' },
                { key: 'cart', label: '🛒 Bouton Mon Panier', icon: ShoppingBag, desc: 'Compteur et ouverture du panier' },
                { key: 'account', label: '👤 Bouton Mon Compte', icon: User, desc: 'Accès au profil / connexion' },
                { key: 'searchBar', label: '🔍 Barre de Recherche Desktop', icon: Search, desc: 'Champ de saisie direct' },
                { key: 'gpsLocation', label: '📍 Bouton GPS Autour de moi', icon: MapPin, desc: 'Détection géolocalisée' },
                { key: 'ordersHistory', label: '🔔 Bouton Notifications / Suivi', icon: Bell, desc: 'Cloche de suivi des commandes' }
              ].map(item => {
                const isEnabled = headerConfig.visibleIcons?.[item.key] ?? true;
                const Icon = item.icon;
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      const current = headerConfig.visibleIcons || {};
                      updateHeaderConfig({
                        visibleIcons: {
                          ...current,
                          [item.key]: !isEnabled
                        }
                      });
                    }}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                      isEnabled
                        ? 'bg-zinc-900 border-[#FF5C00]/50 text-white shadow-md'
                        : 'bg-zinc-950/80 border-zinc-800 text-zinc-500 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${isEnabled ? 'bg-[#FF5C00]/20 text-[#FF5C00]' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold truncate">{item.label}</span>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => {}} // handled by div onClick
                          className="w-4 h-4 accent-[#FF5C00] rounded cursor-pointer"
                        />
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: BOTTOM NAVIGATION CONFIGURATION */}
      {activeTab === 'bottom' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Bottom Bar Styling */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Palette size={16} />
              <span>Apparence de la Barre du Bas</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Couleur de Fond</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bottomNavConfig.backgroundColor || '#050506'}
                    onChange={e => updateBottomNavConfig({ backgroundColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={bottomNavConfig.backgroundColor || '#050506'}
                    onChange={e => updateBottomNavConfig({ backgroundColor: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300">Couleur d'Onglet Actif</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bottomNavConfig.activeColor || '#FF5C00'}
                    onChange={e => updateBottomNavConfig({ activeColor: e.target.value })}
                    className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 cursor-pointer p-1"
                  />
                  <input
                    type="text"
                    value={bottomNavConfig.activeColor || '#FF5C00'}
                    onChange={e => updateBottomNavConfig({ activeColor: e.target.value })}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-zinc-300">Opacité de la Barre</label>
                  <span className="font-mono text-amber-400 font-bold">{bottomNavConfig.backgroundOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={bottomNavConfig.backgroundOpacity ?? 95}
                  onChange={e => updateBottomNavConfig({ backgroundOpacity: Number(e.target.value) })}
                  className="w-full accent-[#FF5C00] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Bottom Nav Items Editor */}
          <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#FF5C00] flex items-center gap-2">
                <Sliders size={16} />
                <span>Onglets & Catégories du Menu Bas</span>
              </h3>
              <button
                onClick={handleAddBottomNavItem}
                className="px-3 py-1.5 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Plus size={14} />
                <span>Ajouter un Onglet</span>
              </button>
            </div>

            <div className="space-y-3">
              {bottomNavConfig.items?.map((item: any, idx: number) => (
                <div
                  key={item.id || idx}
                  className="bg-zinc-950 border border-zinc-800 rounded-2xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  {/* Item Label & Action */}
                  <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                    <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    
                    {/* Label Input */}
                    <input
                      type="text"
                      value={item.label || ''}
                      onChange={e => handleUpdateBottomNavItem(idx, 'label', e.target.value)}
                      placeholder="Nom de l'onglet"
                      className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] w-32 shrink-0"
                    />

                    {/* Icon Select */}
                    <select
                      value={item.icon || 'Home'}
                      onChange={e => handleUpdateBottomNavItem(idx, 'icon', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                    >
                      {AVAILABLE_ICONS.map(ic => (
                        <option key={ic.id} value={ic.id}>{ic.label} ({ic.id})</option>
                      ))}
                    </select>

                    {/* Action Type Select */}
                    <select
                      value={item.action || 'home'}
                      onChange={e => handleUpdateBottomNavItem(idx, 'action', e.target.value)}
                      className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF5C00] cursor-pointer"
                    >
                      <option value="home">Action: Accueil</option>
                      <option value="feed">Action: Consulter / Lives</option>
                      <option value="dj">Action: Espace DJ</option>
                      <option value="orders">Action: Activité / Suivi</option>
                      <option value="profile">Action: Compte / Profil</option>
                      <option value="search">Action: Recherche</option>
                    </select>
                  </div>

                  {/* Actions Right */}
                  <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={() => handleUpdateBottomNavItem(idx, 'visible', !item.visible)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border cursor-pointer transition-all ${
                        item.visible
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      {item.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>{item.visible ? 'Visible' : 'Masqué'}</span>
                    </button>

                    {/* Reorder Up/Down */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveBottomNavItem(idx, 'up')}
                      className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-700 disabled:opacity-30 cursor-pointer"
                      title="Monter"
                    >
                      <MoveUp size={12} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === bottomNavConfig.items.length - 1}
                      onClick={() => handleMoveBottomNavItem(idx, 'down')}
                      className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-700 disabled:opacity-30 cursor-pointer"
                      title="Descendre"
                    >
                      <MoveDown size={12} />
                    </button>

                    {/* Delete Item */}
                    <button
                      type="button"
                      onClick={() => handleRemoveBottomNavItem(item.id)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl border border-red-500/30 cursor-pointer transition-colors"
                      title="Supprimer l'onglet"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: VISUAL EDITOR MODE TUTORIAL */}
      {activeTab === 'editor' && (
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <MousePointer size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Mode Éditeur Visuel Elementor (Super-Admin Live)
              </h3>
              <p className="text-xs text-zinc-400">
                Éditez directement votre application depuis l'interface en direct sans passer par des formulaires !
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-black text-[#FF5C00] uppercase">1. Activer le Mode</span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Cliquez sur le bouton <span className="text-amber-400 font-bold">"Activer Éditeur Visuel Direct"</span> en haut à droite. Une bannière de contrôle s'affichera sur votre écran.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-black text-[#FF5C00] uppercase">2. Masquer & Déplacer</span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Passez votre souris sur n'importe quel bouton, logo ou bloc. Un contour d'édition apparaîtra avec une icône de poubelle pour masquer l'élément en 1-clic.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
              <span className="text-xs font-black text-[#FF5C00] uppercase">3. Sauvegarde Instantanée</span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Vos modifications sont sauvegardées immédiatement en base de données et dans la configuration de votre application Fidfud.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => onUpdateDesignSettings({ isVisualEditorActive: !isVisualEditorActive })}
              className="px-6 py-3 bg-[#FF5C00] hover:bg-[#ff6d1a] text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-[#FF5C00]/30 cursor-pointer flex items-center gap-2 active:scale-95 transition-all"
            >
              <MousePointer size={16} />
              <span>{isVisualEditorActive ? 'Désactiver le Mode Éditeur' : 'Activer le Mode Éditeur Visuel Maintenant'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: HIDDEN ELEMENTS RESTORATION */}
      {activeTab === 'hidden' && (
        <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                <EyeOff size={16} />
                <span>Éléments Masqués via l'Éditeur</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Liste des boutons, widgets et sections masqués en 1-clic depuis l'interface.
              </p>
            </div>

            {hiddenElements.length > 0 && (
              <button
                onClick={handleRestoreAllElements}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold border border-emerald-500/30 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Eye size={14} />
                <span>Tout Réafficher</span>
              </button>
            )}
          </div>

          {hiddenElements.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              Aucun élément n'est actuellement masqué sur l'interface.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {hiddenElements.map(elementId => (
                <div
                  key={elementId}
                  className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <span className="text-xs font-mono text-zinc-300 truncate">{elementId}</span>
                  <button
                    onClick={() => handleRestoreElement(elementId)}
                    className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold cursor-pointer transition-colors shrink-0"
                    title="Réafficher"
                  >
                    <Eye size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
