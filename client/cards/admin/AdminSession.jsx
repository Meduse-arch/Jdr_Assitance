import React, { useState, useEffect } from 'react';

const AdminSession = ({ accessToken, guildId, sessionList, onRefresh, onBack }) => {
  const [newSessionName, setNewSessionName] = useState("");
  const [overwriteWarning, setOverwriteWarning] = useState(null);
  const [sessionToDelete, setSessionToDelete] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialiser la sélection de suppression
  useEffect(() => {
    if (sessionList.length > 0 && !sessionToDelete) {
      setSessionToDelete(sessionList[0]);
    }
  }, [sessionList, sessionToDelete]);

  const handleCreateSession = async (force = false) => {
    if (!newSessionName.trim()) return;
    try {
      const res = await fetch("/api/sessions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          access_token: accessToken, 
          guild_id: guildId, 
          session_id: newSessionName.trim(), 
          force 
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
          access_token: accessToken, 
          guild_id: guildId, 
          session_id: sessionToDelete 
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh(data.list);
        setSessionToDelete(data.list.length > 0 ? data.list[0] : "");
        setShowDeleteConfirm(false);
      }
    } catch (e) { alert("Erreur suppression"); }
  };

  return (
    <div className="flex-1 animate-fade-in flex flex-col h-full">
      <button 
        onClick={onBack} 
        className="mb-4 text-xs text-orange-400 hover:text-orange-300 underline self-start flex items-center gap-1"
      >
        <span>←</span> Retour Menu
      </button>
      
      <div className="space-y-6 overflow-y-auto custom-scrollbar pr-2">
        
        {/* CRÉATION */}
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-3 border-b border-gray-700/50 pb-1 flex items-center gap-2">
            <span>✨</span> Créer une Session
          </h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Nom..." 
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              className="flex-1 bg-black border border-gray-600 rounded p-2 text-white text-sm outline-none focus:border-orange-500 transition-colors"
            />
            <button 
              onClick={() => handleCreateSession(false)} 
              className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold shadow transition-all"
            >
              OK
            </button>
          </div>

          {overwriteWarning && (
            <div className="mt-3 bg-red-900/20 p-2 rounded border border-red-500/30 flex flex-col gap-2 animate-pulse">
              <span className="text-xs text-red-300 font-bold">⚠️ La session "{overwriteWarning}" existe déjà !</span>
              <div className="flex gap-2 justify-end">
                <button onClick={() => handleCreateSession(true)} className="px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] rounded font-bold">Écraser</button>
                <button onClick={() => setOverwriteWarning(null)} className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] rounded">Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* SUPPRESSION */}
        <div className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700 shadow-sm">
          <h3 className="text-sm font-bold text-white mb-3 border-b border-gray-700/50 pb-1 flex items-center gap-2">
            <span>🗑️</span> Supprimer une Session
          </h3>
          {sessionList.length > 0 ? (
            <div className="flex gap-2">
              <select 
                className="flex-1 bg-black border border-gray-600 rounded p-2 text-white text-sm outline-none focus:border-red-500 transition-colors cursor-pointer"
                value={sessionToDelete}
                onChange={(e) => { setSessionToDelete(e.target.value); setShowDeleteConfirm(false); }}
              >
                {sessionList.map(sess => <option key={sess} value={sess}>{sess}</option>)}
              </select>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="px-3 bg-red-600 hover:bg-red-500 text-white rounded text-sm font-bold shadow transition-all"
              >
                X
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Aucune session à supprimer.</p>
          )}
          
          {showDeleteConfirm && (
            <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded animate-fade-in">
              <p className="text-xs text-red-300 mb-2 text-center font-bold">Confirmer la suppression définitive ?</p>
              <div className="flex justify-center gap-2">
                <button onClick={confirmDeleteSession} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-500 font-bold shadow">Oui</button>
                <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1 bg-gray-700 text-white text-xs rounded hover:bg-gray-600 shadow">Non</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AdminSession;