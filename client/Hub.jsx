import React, { useState, useEffect } from 'react';

const Hub = ({ user, isAdmin, sessionList, onJoin, onRefresh, accessToken, guildId }) => {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  
  // États Admin
  const [newSessionName, setNewSessionName] = useState("");
  const [overwriteWarning, setOverwriteWarning] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (sessionList.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sessionList[0]);
      setSessionToDelete(sessionList[0]);
    }
  }, [sessionList]);

  // --- ACTIONS ADMIN ---
  const handleCreateSession = async (force = false) => {
    if (!newSessionName.trim()) return;
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: accessToken, guild_id: guildId, 
          session_id: newSessionName.trim(), force 
        }),
      });
      
      if (res.status === 409) {
        setOverwriteWarning(newSessionName);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setNewSessionName("");
        setOverwriteWarning(null);
        onRefresh(data.list);
        alert("Session créée !");
      }
    } catch (e) { alert("Erreur création"); }
  };

  const confirmDeleteSession = async () => {
    try {
      const res = await fetch("/api/sessions/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: accessToken, guild_id: guildId, 
          session_id: sessionToDelete
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh(data.list);
        const next = data.list.length > 0 ? data.list[0] : "";
        setSessionToDelete(next);
        setSelectedSessionId(next);
        setShowDeleteConfirm(false);
      }
    } catch (e) { alert("Erreur suppression"); }
  };

  return (
    <div className="w-full max-w-lg mx-auto mt-10">
      <h1 className="text-4xl font-bold mb-8 text-white">JDR Assistance</h1>
      <p className="mb-6 text-gray-400">Bienvenue, <span className="text-indigo-400">{user.username}</span></p>
      
      {/* CARTE JOUEUR */}
      <div className="bg-[#222] p-6 rounded-xl border border-gray-700 shadow-2xl mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-200">Rejoindre une partie</h3>
        
        {sessionList.length === 0 ? (
          <p className="text-gray-500 italic my-4">Aucune session active.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <select 
                className="w-full p-3 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none appearance-none cursor-pointer"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                {sessionList.map(sess => <option key={sess} value={sess}>Session : {sess}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
            
            <button 
              onClick={() => onJoin(selectedSessionId)} 
              disabled={!selectedSessionId}
              className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              Rejoindre la partie
            </button>
          </div>
        )}
        
        <button onClick={() => onRefresh()} className="mt-4 text-sm text-gray-500 hover:text-white underline bg-transparent border-none cursor-pointer">
          Actualiser la liste
        </button>
      </div>

      {/* CARTE ADMIN */}
      {isAdmin && (
        <div className="border-2 border-dashed border-orange-500/30 bg-orange-500/5 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-orange-500 mb-6 flex items-center justify-center gap-2">
            <span>👑</span> Zone MJ (Admin)
          </h3>
          
          {/* Création */}
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Nom nouvelle session"
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="flex-1 p-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white focus:border-orange-500 outline-none placeholder-gray-600"
            />
            <button onClick={() => handleCreateSession(false)} className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-md">
              Créer
            </button>
          </div>

          {/* Alerte Overwrite */}
          {overwriteWarning && (
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg mb-6 animate-fade-in">
              <p className="text-red-300 mb-3 text-sm">⚠️ La session "<strong>{overwriteWarning}</strong>" existe déjà !</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => handleCreateSession(true)} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-sm shadow">Écraser</button>
                <button onClick={() => setOverwriteWarning(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm shadow">Annuler</button>
              </div>
            </div>
          )}

          {/* Suppression */}
          <div className="pt-4 border-t border-orange-500/20">
            <h4 className="text-sm text-orange-400/80 mb-2 text-left">Supprimer une session :</h4>
            {sessionList.length > 0 ? (
              <>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <select 
                      className="w-full p-2 bg-[#1a1a1a] border border-gray-600 rounded-lg text-white text-sm outline-none appearance-none"
                      value={sessionToDelete}
                      onChange={(e) => { setSessionToDelete(e.target.value); setShowDeleteConfirm(false); }}
                    >
                      {sessionList.map(sess => <option key={sess} value={sess}>{sess}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                  </div>
                  <button 
                    onClick={() => { if(sessionToDelete) setShowDeleteConfirm(true) }}
                    className="w-10 h-10 flex items-center justify-center bg-red-500/10 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>

                {showDeleteConfirm && (
                  <div className="mt-4 p-4 bg-red-950/30 border border-red-800/50 rounded-lg animate-fade-in">
                    <p className="text-red-300 mb-3 text-sm">Supprimer définitivement <strong>"{sessionToDelete}"</strong> ?</p>
                    <div className="flex gap-3 justify-center">
                      <button onClick={confirmDeleteSession} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-500 shadow">Oui</button>
                      <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600 shadow">Non</button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-600 text-sm italic">Rien à supprimer.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Hub;