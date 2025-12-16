import React, { useState, useEffect } from 'react';

const AdminFiche = ({ accessToken, guildId, sessionList, onMasquerade, initialSession, initialTab }) => {
  const [selectedSession, setSelectedSession] = useState(initialSession || "");
  const [data, setData] = useState({ players: [], pnjs: [] });
  const [activeTab, setActiveTab] = useState(initialTab || 'joueur');
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // États Création PNJ
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newPnj, setNewPnj] = useState({
    id: "",
    name: "",
    stats: { force: 10, constitution: 10, agilite: 10, intelligence: 10, perception: 10 }
  });

  useEffect(() => {
    if (Array.isArray(sessionList) && sessionList.length > 0 && !selectedSession) {
      setSelectedSession(sessionList[0]);
    }
  }, [sessionList]);

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
      if (responseData && (responseData.players || responseData.pnjs)) {
          setData({
            players: Array.isArray(responseData.players) ? responseData.players : [],
            pnjs: Array.isArray(responseData.pnjs) ? responseData.pnjs : []
          });
      } else {
          setData({ players: [], pnjs: [] });
      }
    } catch (e) { 
        console.error("Erreur fetch entités", e); 
        setData({ players: [], pnjs: [] });
    } finally { 
        setLoading(false); 
    }
  };

  // Ouvre la modale et prépare un ID unique (géré côté client juste pour l'affichage initial si besoin)
  const openCreateModal = () => {
    setNewPnj({
      id: "", // Laisse vide, le serveur s'en occupe si non fourni
      name: "",
      stats: { force: 10, constitution: 10, agilite: 10, intelligence: 10, perception: 10 }
    });
    setIsCreateOpen(true);
  };

  const handleCreatePnj = async () => {
    if (!newPnj.name) return alert("Le nom est obligatoire");
    if (!selectedSession) return alert("Aucune session sélectionnée");
    
    try {
      const res = await fetch("/api/admin/pnj/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          guild_id: guildId,
          session_id: selectedSession,
          id: newPnj.id, // Optionnel
          name: newPnj.name,
          stats: newPnj.stats
        })
      });
      const d = await res.json();
      if (d.success) {
        setIsCreateOpen(false);
        fetchEntities(); // Rafraîchir la liste pour voir le nouveau PNJ
      } else {
        alert("Erreur création : " + (d.error || "Inconnue"));
      }
    } catch (e) { 
        console.error(e);
        alert("Erreur serveur lors de la création"); 
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
        const res = await fetch("/api/players/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                access_token: accessToken,
                guild_id: guildId,
                session_id: selectedSession,
                target_id: deleteTarget.id,
                type: deleteTarget.type
            })
        });
        const d = await res.json();
        if (d.success) {
            setDeleteTarget(null);
            fetchEntities(); 
        } else {
            alert("Erreur suppression");
        }
    } catch (e) { alert("Erreur serveur"); }
  };

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
    <div className="flex-1 animate-fade-in flex flex-col h-full bg-[#111] rounded-xl overflow-hidden relative">
      
      {/* Header */}
      <div className="p-3 border-b border-gray-800 flex items-center justify-between bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
            <span className="text-xl">📝</span>
            <h2 className="text-sm font-bold text-gray-200">Fiches & Personnages</h2>
        </div>
        <button onClick={fetchEntities} className="text-xs text-gray-500 hover:text-white" title="Actualiser la liste">↻</button>
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

        {/* BARRE OUTILS PNJ (Recherche + Création) */}
        {activeTab === 'pnj' && (
            <div className="animate-fade-in flex gap-2">
                <input 
                    type="text" 
                    placeholder="Rechercher nom PNJ..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-[#0a0a0a] border border-gray-700 rounded p-2 text-white text-sm focus:border-orange-500 outline-none"
                />
                <button 
                    onClick={openCreateModal}
                    className="px-3 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded shadow transition-all"
                >
                    + CRÉER
                </button>
            </div>
        )}

        {/* LISTE DES RÉSULTATS */}
        <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-800 rounded bg-[#0a0a0a] p-2 space-y-2">
            {loading ? (
                <div className="text-center text-gray-500 text-xs py-4">Chargement...</div>
            ) : filteredEntities.length === 0 ? (
                <div className="text-center text-gray-600 text-xs py-4 italic">Aucun résultat.</div>
            ) : (
                filteredEntities.map((ent) => (
                    <div 
                        key={ent.id}
                        className="w-full flex items-center justify-between p-3 rounded border border-gray-800 bg-[#151515] hover:border-indigo-500/30 transition-all group"
                    >
                        <div className="flex flex-col flex-1 cursor-pointer" onClick={() => onMasquerade(ent.id, ent.username, selectedSession, activeTab)}>
                            <span className="text-sm font-bold text-gray-200 group-hover:text-white transition-colors">
                                {activeTab === 'pnj' ? '👾 ' : '👤 '}{ent.username || "Sans nom"}
                            </span>
                            <span className="text-[10px] font-mono text-gray-600">ID: {ent.id}</span>
                        </div>

                        <div className="flex flex-col gap-2 pl-3">
                             <button 
                                onClick={() => onMasquerade(ent.id, ent.username, selectedSession, activeTab)}
                                className="text-[10px] uppercase tracking-wider bg-gray-900 text-gray-500 px-3 py-1.5 rounded hover:bg-indigo-900 hover:text-indigo-300 transition-colors w-full text-center"
                            >
                                Incarner
                            </button>
                            <button 
                                onClick={() => setDeleteTarget(ent)}
                                className="text-[10px] uppercase tracking-wider bg-red-900/10 text-red-700 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white border border-transparent hover:border-red-500 transition-colors w-full text-center"
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* POP-UP SUPPRESSION */}
      {deleteTarget && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] border border-red-500/30 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
                <div className="text-3xl mb-4">⚠️</div>
                <h3 className="text-white font-bold text-lg mb-2">Supprimer ce personnage ?</h3>
                <p className="text-gray-400 text-sm mb-6">
                    Vous allez supprimer définitivement <span className="text-white font-bold">{deleteTarget.username}</span>.
                </p>
                <div className="flex gap-3 justify-center">
                    <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded bg-gray-800 text-white text-sm font-bold hover:bg-gray-700">Annuler</button>
                    <button onClick={handleDeleteConfirm} className="px-4 py-2 rounded bg-red-600 text-white text-sm font-bold hover:bg-red-500 shadow-lg">Confirmer</button>
                </div>
            </div>
        </div>
      )}

      {/* MODALE CRÉATION PNJ */}
      {isCreateOpen && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-[#1a1a1a] border border-orange-500/30 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col">
                <div className="p-4 border-b border-gray-800 bg-[#111] flex justify-between items-center">
                    <h3 className="text-orange-400 font-bold">Nouveau PNJ</h3>
                    <button onClick={() => setIsCreateOpen(false)} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>
                
                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Nom</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-orange-500 outline-none" 
                            value={newPnj.name}
                            onChange={(e) => setNewPnj({...newPnj, name: e.target.value})}
                            placeholder="Ex: Gobelin Chef"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        {Object.keys(newPnj.stats).map(stat => (
                            <div key={stat}>
                                <label className="text-[10px] text-gray-500 uppercase font-bold block mb-1 capitalize">{stat}</label>
                                <input 
                                    type="number" 
                                    className="w-full bg-black border border-gray-700 rounded p-2 text-white text-center focus:border-indigo-500 outline-none font-mono"
                                    value={newPnj.stats[stat]}
                                    onChange={(e) => setNewPnj({
                                        ...newPnj, 
                                        stats: { ...newPnj.stats, [stat]: parseInt(e.target.value) || 0 }
                                    })}
                                />
                            </div>
                        ))}
                    </div>
                    
                    <div className="bg-[#222] p-2 rounded text-[10px] text-gray-500 italic text-center border border-gray-800">
                        HP, Mana et Stamina seront calculés automatiquement.
                    </div>
                </div>

                <button onClick={handleCreatePnj} className="w-full py-4 bg-orange-700 hover:bg-orange-600 text-white font-bold transition-colors">
                    CRÉER LE PNJ
                </button>
            </div>
        </div>
      )}

    </div>
  );
};

export default AdminFiche;