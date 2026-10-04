import React, { useState, useEffect } from 'react';
import { X, Users, Search, Gift, Video, Share2, Check, RefreshCw, AlertCircle, Phone, Mail, UserCheck, Sparkles } from 'lucide-react';
import { getFirebaseAuth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface Contact {
  resourceName: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
}

interface GoogleContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendGiftDish?: (contact: Contact) => void;
  onInviteToLive?: (contact: Contact) => void;
  designSettings?: any;
}

export default function GoogleContactsModal({
  isOpen,
  onClose,
  onSendGiftDish,
  onInviteToLive,
  designSettings
}: GoogleContactsModalProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
  const [giftSentContactId, setGiftSentContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnectGoogleContacts = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const auth = getFirebaseAuth();
      if (!auth) {
        throw new Error("Authentification Firebase non initialisée.");
      }

      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/contacts.readonly');
      provider.addScope('https://www.googleapis.com/auth/contacts.other.readonly');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (!credential?.accessToken) {
        throw new Error("Jeton d'accès Google introuvable. Veuillez réessayer.");
      }

      const token = credential.accessToken;
      setAccessToken(token);

      // Fetch contacts using People API
      await fetchContacts(token);

    } catch (err: any) {
      console.warn("Erreur lors de la connexion Google Contacts:", err);
      const isPopupBlocked = err?.message?.includes('popup-closed-by-user') || 
                             err?.message?.includes('cancelled-popup-request') ||
                             err?.message?.includes('popup-blocked');
      const isNetworkErr = err?.message?.includes('Failed to fetch') || err?.message?.includes('network');

      if (isPopupBlocked) {
        setErrorMsg("La fenêtre popup Google a été bloquée ou fermée par le navigateur.");
      } else if (isNetworkErr) {
        setErrorMsg("Connexion au service Google Contacts momentanément restreinte dans l'aperçu.");
      } else {
        setErrorMsg(err?.message || "Impossible de récupérer vos contacts Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContacts = async (token: string) => {
    try {
      const res = await fetch(
        'https://people.googleapis.com/v1/people/me/connections?personFields=names,emailAddresses,photos,phoneNumbers&pageSize=100',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Erreur API Google People (${res.status})`);
      }

      const data = await res.json();
      const connections = data.connections || [];

      const parsedContacts: Contact[] = connections.map((conn: any, index: number) => {
        const name = conn.names?.[0]?.displayName || conn.names?.[0]?.givenName || 'Ami Foodie';
        const email = conn.emailAddresses?.[0]?.value || '';
        const phone = conn.phoneNumbers?.[0]?.value || '';
        const photoUrl = conn.photos?.[0]?.url || '';

        return {
          resourceName: conn.resourceName || `contact-${index}`,
          name,
          email,
          phone,
          photoUrl
        };
      });

      setContacts(parsedContacts);
    } catch (err: any) {
      console.error("Erreur lecture contacts:", err);
      setErrorMsg(err.message || "Échec de la lecture des contacts Google.");
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const handleCopyInviteLink = (contact: Contact) => {
    const inviteUrl = `${window.location.origin}?ref=${encodeURIComponent(contact.name)}`;
    const shareText = `Rejoins-moi sur Feed Food pour regarder les chefs en Live et commander du Food Porn ! 🍕🔥 ${inviteUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText);
      setCopiedContactId(contact.resourceName);
      setTimeout(() => setCopiedContactId(null), 3000);
    }
  };

  const handleTriggerGift = (contact: Contact) => {
    setGiftSentContactId(contact.resourceName);
    if (onSendGiftDish) {
      onSendGiftDish(contact);
    }
    setTimeout(() => setGiftSentContactId(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 via-[#FF5C00]/20 to-zinc-950 p-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF5C00] text-white flex items-center justify-center shadow-lg shadow-[#FF5C00]/30 shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Mes Contacts Google
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[9px] font-black uppercase tracking-wider">
                  OAuth Intégré
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Invitez vos amis aux Lives, partagez des repas ou offrez un plat en 1 clic
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 scrollbar-thin">
          
          {/* Unauthenticated / Initial Connection State */}
          {contacts.length === 0 && !isLoading && (
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950 border border-white/10 rounded-2xl p-6 text-center space-y-5 my-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles size={32} />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h4 className="text-sm font-black text-white uppercase tracking-wider">
                  Synchroniser vos Amis Google Contacts
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Connectez en toute sécurité votre compte Google pour retrouver vos proches, les inviter à vos streams de restauration en direct et leur envoyer de délicieux cadeaux culinaires.
                </p>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-xl text-xs text-red-400 flex items-center gap-2 text-left">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Official Google Sign-In Styled Button */}
              <button
                onClick={handleConnectGoogleContacts}
                className="w-full max-w-sm mx-auto bg-white hover:bg-zinc-100 text-zinc-900 font-bold text-xs uppercase tracking-wider py-3.5 px-5 rounded-2xl shadow-xl transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-98 border border-zinc-200"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Synchroniser mes Contacts Google</span>
              </button>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#FF5C00]/30 border-t-[#FF5C00] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-amber-400 font-mono font-bold uppercase tracking-wider">
                Chargement sécurisé de vos contacts Google...
              </p>
            </div>
          )}

          {/* Connected Contacts List */}
          {contacts.length > 0 && (
            <div className="space-y-3">
              
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/80 p-2.5 rounded-2xl border border-white/10">
                <div className="relative w-full sm:w-auto flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par nom, email ou téléphone..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-xl border border-white/5">
                    {contacts.length} Contact{contacts.length > 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => accessToken && fetchContacts(accessToken)}
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all cursor-pointer"
                    title="Actualiser la liste"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              {/* Contacts Cards Grid */}
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.resourceName}
                    className="bg-zinc-900/90 border border-white/10 hover:border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {contact.photoUrl ? (
                        <img
                          src={contact.photoUrl}
                          alt={contact.name}
                          className="w-10 h-10 rounded-full object-cover border border-amber-500/30 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-[#FF5C00] text-white font-black text-sm flex items-center justify-center shrink-0 shadow">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 space-y-0.5">
                        <h5 className="text-xs font-black text-white truncate flex items-center gap-1.5">
                          {contact.name}
                        </h5>
                        
                        {contact.email && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                            <Mail size={10} className="text-amber-400 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}

                        {contact.phone && (
                          <div className="flex items-center gap-1 text-[10px] text-zinc-400 truncate">
                            <Phone size={10} className="text-emerald-400 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons per contact */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        onClick={() => handleTriggerGift(contact)}
                        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                        title="Offrir un repas ou cadeau gourmand"
                      >
                        <Gift size={12} />
                        {giftSentContactId === contact.resourceName ? 'Envoyé !' : 'Offrir'}
                      </button>

                      {onInviteToLive && (
                        <button
                          onClick={() => onInviteToLive(contact)}
                          className="bg-[#FF5C00]/10 hover:bg-[#FF5C00]/20 text-[#FF5C00] border border-[#FF5C00]/30 px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                          title="Inviter au Live Shopping"
                        >
                          <Video size={12} />
                          Live
                        </button>
                      )}

                      <button
                        onClick={() => handleCopyInviteLink(contact)}
                        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10 p-1.5 rounded-xl transition-all cursor-pointer"
                        title="Copier le lien d'invitation personnalisé"
                      >
                        {copiedContactId === contact.resourceName ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Share2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}

                {filteredContacts.length === 0 && (
                  <div className="text-center py-10 text-xs text-zinc-500 font-mono">
                    Aucun contact ne correspond à "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-950 border-t border-white/10 flex items-center justify-between text-[10px] text-zinc-500 font-mono shrink-0">
          <span className="flex items-center gap-1">
            <UserCheck size={12} className="text-emerald-400" />
            Confidentialité garantie (API Google People V1)
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase tracking-wider cursor-pointer transition-all"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
