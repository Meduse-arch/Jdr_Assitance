import React, { useState, useEffect } from 'react';

const AdminFiche = ({ accessToken, guildId, sessionList, onMasquerade, onBack }) => {
  // Initialisation sécurisée
  const [selectedSession, setSelectedSession] = useState("");
  
  // Structure de données sécurisée
  const [data, setData] = useState({ players: [], pnjs: [] });
  
  const [activeTab, setActiveTab] = useState('joueur'); // 'joueur' | 'pnj'
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. SÉCURITÉ : Sélectionne automatiquement la première session si aucune n'est choisie
  useEffect(() => {
    if (Array.isArray(sessionList) && sessionList.length > 0 && !selectedSession) {
      setSelectedSession(sessionList[0]);
    }
  }, [sessionList]);

  // 2. LOGIQUE DE CHARGEMENT : Se déclenche quand la session change
  useEffect(() => {
    if (selectedSession) {
        fetchEntities();
    } else {
        setData({ players: [], pnjs: [] });
    }
  }, [selectedSession]);

  const fetchEntities = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/session/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: accessToken, 
          guild_id: guildId, 
          session_id: selectedSession 
        }),
      });
      
      const responseData = await res.json();
      
      // Vérification que le serveur a bien renvoyé les tableaux attendus
      if (responseData && (responseData.players || responseData.pnjs)) {
          setData({
            players: Array.isArray(responseData.players) ? responseData.players : [],
            pnjs: Array.isArray(responseData.pnjs) ? responseData.pnjs : []
          });
      } else {
          // Fallback si le format est incorrect
          setData({ players: [], pnjs: [] });
      }
    } catch (e) { 
        console.error("Erreur fetch entités", e); 
        setData({ players: [], pnjs: [] });
    } finally { 
        setLoading(false); 
    }
  };

  // 3. FILTRAGE
  const getDisplayList = () => {
    const sourceList = activeTab === 'joueur' ? data.players : data.pnjs;
    return sourceList.filter(ent => {
        if (activeTab === 'pnj') {
            return (ent.username || "").toLowerCase().includes(searchQuery.toLowerCase());
        }
        return true; 
    });
  };

  const filteredEntities = getDisplayList();

  return (
    <div className="flex-1 animate-fade-in flex flex-col h-full bg-[#111] rounded-xl overflow-hidden">
      
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-gray-400 hover:text-white px-2 font-bold text-xl">←</button>
            <h2 className="text-sm font-bold text-gray-200">Fiches & Personnages</h2>
        </div>
        {/* Petit bouton refresh manuel au cas où */}
        <button onClick={fetchEntities} className="text-xs text-gray-500 hover:text-white" title="Actualiser la liste">
            ↻
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
        
        {/* SÉLECTEUR DE SESSION */}
        <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase font-bold text-gray-500">Session Cible</label>
            <div className="relative">
                <select 
                    value={selectedSession} 
                    onChange={(e) => setSelectedSession(e.target.value)}
                    className="w-full bg-black border border-gray-700 text-white rounded p-2 text-sm appearance-none outline-none focus:border-indigo-500 cursor-pointer"
                >
                    {!selectedSession && <option value="">Sélectionner...</option>}
                    {Array.isArray(sessionList) && sessionList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">▼</div>
            </div>
        </div>

        {/* ONGLETS */}
        <div className="flex p-1 bg-black rounded border border-gray-800">
            <button 
                onClick={() => { setActiveTab('joueur'); setSearchQuery(''); }}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${activeTab === 'joueur' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Joueurs ({data.players.length})
            </button>
            <button 
                onClick={() => setActiveTab('pnj')}
                className={`flex-1 py-1 text-xs font-bold rounded transition-colors ${activeTab === 'pnj' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                PNJ ({data.pnjs.length})
            </button>
        </div>

        {/* RECHERCHE (PNJ uniquement) */}
        {activeTab === 'pnj' && (
            <div className="animate-fade-in">
                <input 
                    type="text" 
                    placeholder="Rechercher nom PNJ..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded p-2 text-white text-sm focus:border-orange-500 outline-none placeholder-gray-600"
                />
            </div>
        )}

        {/* LISTE DES RÉSULTATS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-800 rounded bg-[#0a0a0a] p-2 space-y-2">
            {loading ? (
                <div className="text-center text-gray-500 text-xs py-4 flex items-center justify-center gap-2">
                    <span className="animate-spin">⟳</span> Chargement...
                </div>
            ) : filteredEntities.length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-4 italic">
                    {activeTab === 'pnj' ? "Aucun PNJ trouvé." : `Aucun Joueur dans la session "${selectedSession}".`}
                </div>
            ) : (
                filteredEntities.map((ent) => (
                    <button 
                        key={ent.id}
                        onClick={() => onMasquerade(ent.id, ent.username, selectedSession)}
                        className="w-full flex items-center justify-between p-3 rounded border border-gray-800 bg-[#151515] hover:bg-[#202020] hover:border-indigo-500/50 transition-all group text-left"
                    >
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-200 group-hover:text-white">
                                {activeTab === 'pnj' ? '👾 ' : '👤 '}{ent.username || "Sans nom"}
                            </span>
                            <span className="text-[10px] font-mono text-gray-600">ID: ...{ent.id ? ent.id.slice(-6) : "?"}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider bg-gray-900 text-gray-500 px-2 py-1 rounded group-hover:bg-indigo-900 group-hover:text-indigo-300">
                            Incarner →
                        </span>
                    </button>
                ))
            )}
        </div>

      </div>
    </div>
  );
};

export default AdminFiche;