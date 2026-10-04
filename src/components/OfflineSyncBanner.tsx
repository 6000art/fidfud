import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, ShieldCheck, Download } from 'lucide-react';
import { offlineCacheService } from '../services/OfflineCacheService';

interface OfflineSyncBannerProps {
  onOpenOfflineDownloads?: () => void;
}

export default function OfflineSyncBanner({ onOpenOfflineDownloads }: OfflineSyncBannerProps) {
  const [isOnline, setIsOnline] = useState<boolean>(offlineCacheService.getIsOnline());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = offlineCacheService.subscribe((online) => {
      setIsOnline(online);
      const pending = offlineCacheService.getPendingOrders();
      setPendingCount(pending.length);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    setSyncStatusMsg('Synchronisation en cours...');
    
    try {
      const result = await offlineCacheService.syncPendingData();
      if (result.syncedOrders > 0) {
        setSyncStatusMsg(`✅ ${result.syncedOrders} commande(s) synchronisée(s) !`);
      } else {
        setSyncStatusMsg('✅ Données à jour et synchronisées !');
      }
      setPendingCount(offlineCacheService.getPendingOrders().length);
    } catch (err) {
      setSyncStatusMsg('⚠️ Erreur de synchronisation.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  if (isOnline && pendingCount === 0 && !syncStatusMsg) {
    return null; // Silent when everything is normal and online
  }

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[90] max-w-lg w-[94%] sm:w-auto">
      {!isOnline ? (
        <div className="bg-[#18181B]/95 backdrop-blur-xl border border-amber-500/40 text-amber-300 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-bold font-mono animate-fade-in flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <WifiOff size={15} className="text-amber-400 shrink-0" />
            <span>Mode Hors-Ligne (Caches Actifs)</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenOfflineDownloads && (
              <button
                onClick={onOpenOfflineDownloads}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
              >
                <Download size={12} />
                <span>Bibliothèque Hors-Ligne</span>
              </button>
            )}
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-black px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                {pendingCount} en attente
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#0D0D0E]/95 backdrop-blur-xl border border-emerald-500/40 text-emerald-400 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center justify-between gap-3 text-xs font-bold font-mono animate-fade-in">
          <div className="flex items-center gap-2">
            <Wifi size={15} className="text-emerald-400 shrink-0" />
            <span>{syncStatusMsg || `${pendingCount} commande(s) hors-ligne prête(s) à être transmise(s)`}</span>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 bg-emerald-500 text-black hover:bg-emerald-400 font-black px-2.5 py-1 rounded-xl text-[10px] uppercase transition-all"
          >
            <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sync...' : 'Envoyer'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
