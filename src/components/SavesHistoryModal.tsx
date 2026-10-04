import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  History, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Download, 
  Check, 
  Search, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  Zap, 
  Sliders
} from 'lucide-react';

interface BackupItem {
  id: string;
  name: string;
  type: 'original' | 'manual' | 'auto';
  createdAt: string;
  data?: string;
}

interface SavesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshAppData: () => void;
  isAutoSaveEnabled: boolean;
  onToggleAutoSave: (enabled: boolean) => void;
  lastAutoSaveTime: Date | null;
}

export function SavesHistoryModal({
  isOpen,
  onClose,
  onRefreshAppData,
  isAutoSaveEnabled,
  onToggleAutoSave,
  lastAutoSaveTime
}: SavesHistoryModalProps) {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'auto' | 'manual' | 'original'>('all');
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [customBackupName, setCustomBackupName] = useState('');
  
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Fetch backups on open
  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data);
      }
    } catch (err) {
      console.error('Error fetching backups history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle manual instant save
  const handleCreateSave = async (isAuto = false) => {
    setIsSaving(true);
    try {
      const nameToUse = customBackupName.trim() || undefined;
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameToUse,
          isAutoSave: isAuto,
          type: isAuto ? 'auto' : 'manual'
        })
      });

      if (res.ok) {
        const newBackup = await res.json();
        setBackups(prev => [newBackup, ...prev.filter(b => b.id !== newBackup.id)]);
        setCustomBackupName('');
        setSaveSuccessMsg('Sauvegarde enregistrée avec succès !');
        setTimeout(() => setSaveSuccessMsg(null), 3000);
      } else {
        alert("Erreur lors de la création de la sauvegarde.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle restore
  const handleRestore = async (id: string, name: string) => {
    const isOriginal = id === 'original';
    const confirmText = isOriginal
      ? "⚠️ Êtes-vous sûr de vouloir restaurer la CONFIGURATION D'ORIGINE ? Vos modifications actuelles seront remplacées."
      : `⚠️ Êtes-vous sûr de vouloir restaurer la sauvegarde "${name}" ?`;

    if (!confirm(confirmText)) return;

    setRestoringId(id);
    try {
      const res = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: id })
      });

      if (res.ok) {
        setSaveSuccessMsg(`Restauration de "${name}" effectuée avec succès !`);
        onRefreshAppData();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        const err = await res.json();
        alert(`Erreur de restauration: ${err.error || 'Erreur inconnue'}`);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur de connexion lors de la restauration.");
    } finally {
      setRestoringId(null);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (id === 'original') {
      alert("La sauvegarde d'origine ne peut pas être supprimée.");
      return;
    }
    if (!confirm("Voulez-vous vraiment supprimer cette sauvegarde de l'historique ?")) return;

    try {
      const res = await fetch(`/api/admin/backups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setBackups(prev => prev.filter(b => b.id !== id));
      } else {
        alert("Erreur lors de la suppression.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle rename
  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      const res = await fetch(`/api/admin/backups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() })
      });
      if (res.ok) {
        setBackups(prev => prev.map(b => b.id === id ? { ...b, name: editingName.trim() } : b));
        setEditingId(null);
        setEditingName('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Download backup JSON
  const handleDownload = (bk: BackupItem) => {
    if (!bk.data) {
      alert("Données non disponibles dans cet aperçu. Tentez une restauration directe.");
      return;
    }
    const blob = new Blob([bk.data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_fidfud_${bk.id}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered backups
  const filteredBackups = backups.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          b.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || b.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      <div className="bg-[#09090b] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Header */}
        <header className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-[#0D0D11]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00] flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight italic">
                  Historique des Sauvegardes Admin
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30 text-[10px] font-mono font-bold">
                  25 Max
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Enregistrez l'état complet de votre application et restaurez une version antérieure à tout moment.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </header>

        {/* Top Actions & Auto-Save Toolbar */}
        <div className="p-4 sm:p-6 border-b border-white/5 bg-[#0B0B0E] space-y-4">
          {/* Success Banner */}
          {saveSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-bounce">
              <Check size={16} />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Create Instant Save Input & Toggle Row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Quick Name Input & Save Button */}
            <div className="md:col-span-8 flex gap-2">
              <input
                type="text"
                placeholder="Nom personnalisé de votre sauvegarde (ex: Version promo été)..."
                value={customBackupName}
                onChange={(e) => setCustomBackupName(e.target.value)}
                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00] font-sans"
              />
              <button
                disabled={isSaving}
                onClick={() => handleCreateSave(false)}
                className="bg-gradient-to-r from-[#FF5C00] to-orange-600 hover:brightness-110 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 border border-white/10"
              >
                {isSaving ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={15} />
                    <span>Sauvegarder</span>
                  </>
                )}
              </button>
            </div>

            {/* Auto-Save Toggle Box */}
            <div className="md:col-span-4 bg-zinc-950/80 border border-white/10 p-2.5 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full ${isAutoSaveEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                <div className="truncate">
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Enregistrement Auto</p>
                  <p className="text-[9px] text-zinc-400 font-mono">
                    {lastAutoSaveTime ? `Dernier: ${lastAutoSaveTime.toLocaleTimeString('fr-FR')}` : 'Toutes les 60s'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onToggleAutoSave(!isAutoSaveEnabled)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  isAutoSaveEnabled 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30' 
                    : 'bg-zinc-800 text-zinc-400 border-white/10 hover:text-white'
                }`}
              >
                {isAutoSaveEnabled ? 'ACTIF' : 'INACTIF'}
              </button>
            </div>
          </div>

          {/* Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  filterType === 'all' 
                    ? 'bg-white text-black border-white' 
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                Toutes ({backups.length})
              </button>
              <button
                onClick={() => setFilterType('auto')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  filterType === 'auto' 
                    ? 'bg-[#FF5C00] text-white border-[#FF5C00]' 
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                ⚡ Auto ({backups.filter(b => b.type === 'auto').length})
              </button>
              <button
                onClick={() => setFilterType('manual')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  filterType === 'manual' 
                    ? 'bg-blue-600 text-white border-blue-500' 
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                💾 Manuelles ({backups.filter(b => b.type === 'manual').length})
              </button>
              <button
                onClick={() => setFilterType('original')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                  filterType === 'original' 
                    ? 'bg-amber-500 text-black border-amber-400 font-black' 
                    : 'bg-zinc-900 text-zinc-400 border-white/5 hover:text-white'
                }`}
              >
                👑 Origine
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Rechercher une version..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
              />
            </div>
          </div>
        </div>

        {/* Backups List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <span className="w-8 h-8 border-2 border-[#FF5C00] border-t-transparent rounded-full animate-spin inline-block" />
              <p className="text-xs text-zinc-400 font-mono">Chargement de votre historique de sauvegardes...</p>
            </div>
          ) : filteredBackups.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-zinc-950/50 rounded-2xl border border-white/5">
              <p className="text-sm font-bold text-zinc-400 uppercase">Aucune sauvegarde trouvée</p>
              <p className="text-xs text-zinc-600">Cliquez sur "Sauvegarder" ci-dessus pour enregistrer votre première version.</p>
            </div>
          ) : (
            filteredBackups.map((bk) => (
              <div 
                key={bk.id} 
                className="p-4 rounded-2xl bg-zinc-950 border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {editingId === bk.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="bg-zinc-900 border border-[#FF5C00] rounded-lg px-2 py-1 text-xs text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRename(bk.id)}
                          className="p-1 text-emerald-400 hover:text-emerald-300"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {bk.name}
                      </h4>
                    )}

                    {/* Type Badge */}
                    <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                      bk.type === 'original'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : bk.type === 'auto'
                          ? 'bg-[#FF5C00]/20 text-[#FF5C00] border-[#FF5C00]/40'
                          : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}>
                      {bk.type === 'original' ? '👑 Origine' : bk.type === 'auto' ? '⚡ Auto-Save' : '💾 Manuel'}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-500 font-mono flex items-center gap-2">
                    <Clock size={11} />
                    <span>Créée le: {new Date(bk.createdAt).toLocaleString('fr-FR')}</span>
                    <span className="text-zinc-700">|</span>
                    <span>ID: {bk.id}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Rename */}
                  {bk.type !== 'original' && (
                    <button
                      onClick={() => {
                        setEditingId(bk.id);
                        setEditingName(bk.name);
                      }}
                      className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Renommer cette sauvegarde"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}

                  {/* Download JSON */}
                  {bk.data && (
                    <button
                      onClick={() => handleDownload(bk)}
                      className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Télécharger le fichier JSON de sauvegarde"
                    >
                      <Download size={14} />
                    </button>
                  )}

                  {/* Delete */}
                  {bk.type !== 'original' && (
                    <button
                      onClick={() => handleDelete(bk.id)}
                      className="p-2 rounded-xl bg-zinc-900 border border-white/5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Supprimer cette sauvegarde"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {/* Restore Button */}
                  <button
                    disabled={restoringId !== null}
                    onClick={() => handleRestore(bk.id, bk.name)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${
                      restoringId === bk.id
                        ? 'bg-zinc-800 text-zinc-500'
                        : bk.type === 'original'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:brightness-110 text-black font-black'
                          : 'bg-[#FF5C00] hover:bg-[#FF3E00] text-white'
                    }`}
                  >
                    {restoringId === bk.id ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <RefreshCw size={13} />
                        <span>Restaurer</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <footer className="px-6 py-3 border-t border-white/10 bg-[#0B0B0E] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>FID FUD CMS HISTORY ENGINE • RETENTION: 25 SLOTS</span>
          <span className="text-emerald-400 font-bold">🟢 SYNCHRONISÉ AVEC FIRESTORE</span>
        </footer>
      </div>
    </div>
  );
}
