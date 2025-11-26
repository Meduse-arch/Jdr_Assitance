import React, { useState } from 'react';

const Action = ({ sessionName, icon, playerData, auth, sessionId, onRefresh }) => {
  const j = playerData.joueur;
  const [isReposOpen, setIsReposOpen] = useState(false);
  const [isRollOpen, setIsRollOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // États Roll
  const [rollTab, setRollTab] = useState('stat'); // 'stat' ou 'dice'
  const [diceParams, setDiceParams] = useState({ min: 1, max: 100, count: 1 });
  const [rollResult, setRollResult] = useState(null);
  const [rollCost, setRollCost] = useState(null);

  const handleRepos = async (type, target = null) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/repos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, type, target }),
      });
      const data = await res.json();
      if (data.success) {
        await onRefresh();
        setIsReposOpen(false);
      } else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleRoll = async (type, dataPayload) => {
    setRollResult("..."); 
    setRollCost(null);
    
    try {
      const res = await fetch("/api/player/roll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          session_id: sessionId, 
          type, 
          data: dataPayload 
        }),
      });
      const data = await res.json();
      
      if (data.success) {
        setRollResult(data.result);
        if (data.cost > 0) {
          setRollCost(`-${data.cost} ${data.costType}`);
          await onRefresh(); // Rafraichir les stats si coût
        }
      } else {
        setRollResult("Err");
        console.error(data.error);
      }
    } catch (e) { setRollResult("Err"); }
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 animate-fade-in relative w-full">
      
      {/* Stats */}
      <div className="absolute top-0 right-0 flex flex-col sm:flex-row gap-1 sm:gap-3 bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-lg z-10">
        <span className="text-red-400 font-bold">HP {j.hp}/{j.hpMax}</span>
        <span className="text-blue-400 font-bold">MP {j.mana}/{j.manaMax}</span>
        <span className="text-green-400 font-bold">ST {j.stam}/{j.stamMax}</span>
      </div>

      <span className="text-6xl mb-4 block filter drop-shadow-lg mt-8">{icon || '🎲'}</span>
      <h2 className="text-2xl font-bold text-white mb-2">Zone d'Actions</h2>
      <p className="text-gray-400">Session : <span className="text-indigo-400 font-mono">{sessionName}</span></p>
      
      <div className="flex gap-4 mt-8">
        <button onClick={() => setIsRollOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2">
          <span>🎲</span> Lancer un Dé
        </button>
        <button onClick={() => setIsReposOpen(true)} className="px-6 py-3 bg-blue-900/50 border border-blue-500/50 hover:bg-blue-800 text-blue-100 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg">
          <span>💤</span> Se Reposer
        </button>
      </div>

      {/* POPUP REPOS */}
      {isReposOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#222] border border-gray-600 w-full max-w-sm rounded-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Type de Repos</h2>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleRepos('long')} disabled={isLoading} className="w-full p-4 bg-[#1a1a2e] border border-indigo-500/50 hover:bg-indigo-900/30 rounded-lg text-left group">
                <div className="font-bold text-indigo-300 group-hover:text-white">✨ Repos Long</div>
                <div className="text-xs text-gray-500">HP, Mana, Stamina Max</div>
              </button>
              <button onClick={() => handleRepos('court')} disabled={isLoading} className="w-full p-4 bg-[#1a2e1a] border border-green-500/50 hover:bg-green-900/30 rounded-lg text-left group">
                <div className="font-bold text-green-300 group-hover:text-white">💫 Repos Court</div>
                <div className="text-xs text-gray-500">Mana, Stamina Max</div>
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleRepos('simple', 'mana')} disabled={isLoading} className="p-3 bg-[#111] border border-blue-500/30 hover:bg-blue-900/20 rounded-lg text-blue-400 font-bold">💧 Mana</button>
                <button onClick={() => handleRepos('simple', 'stam')} disabled={isLoading} className="p-3 bg-[#111] border border-yellow-500/30 hover:bg-yellow-900/20 rounded-lg text-yellow-400 font-bold">⚡ Stam</button>
              </div>
            </div>
            <button onClick={() => setIsReposOpen(false)} className="w-full mt-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-lg">Fermer</button>
          </div>
        </div>
      )}

      {/* POPUP ROLL */}
      {isRollOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#222] border border-gray-600 w-full max-w-2xl rounded-xl p-6 shadow-2xl flex flex-col h-[500px]">
            
            {/* Onglets */}
            <div className="flex border-b border-gray-700 mb-4">
              {/* Changement de nom ICI */}
              <button onClick={() => { setRollTab('stat'); setRollResult(null); }} className={`flex-1 py-3 font-bold text-lg ${rollTab === 'stat' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}>Stat</button>
              <button onClick={() => { setRollTab('dice'); setRollResult(null); }} className={`flex-1 py-3 font-bold text-lg ${rollTab === 'dice' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}>Dés Classiques</button>
            </div>

            <div className="flex flex-1 gap-6 min-h-0">
              {/* GAUCHE */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {rollTab === 'stat' && (
                  <div className="flex flex-col gap-3">
                    {['force', 'constitution', 'agilite', 'intelligence', 'perception'].map(stat => (
                      <button key={stat} onClick={() => handleRoll('stat', { stat })} className="flex justify-between items-center p-3 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all group">
                        <span className="capitalize text-gray-300 font-bold group-hover:text-white">{stat}</span>
                        <span className="text-xs bg-[#111] px-2 py-1 rounded text-gray-500 font-mono">{j[stat]}</span>
                      </button>
                    ))}
                    <p className="text-xs text-gray-500 mt-2 text-center">⚠️ Force & Agilité coûtent de la Stamina.</p>
                  </div>
                )}

                {rollTab === 'dice' && (
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Minimum</label>
                      <input type="number" value={diceParams.min} onChange={(e) => setDiceParams({...diceParams, min: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Maximum</label>
                      <input type="number" value={diceParams.max} onChange={(e) => setDiceParams({...diceParams, max: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Nombre de dés</label>
                      <input type="number" value={diceParams.count} onChange={(e) => setDiceParams({...diceParams, count: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* DROITE : DÉ */}
              <div className="flex-1 flex flex-col items-center justify-center bg-[#151515] rounded-xl border border-gray-800 relative">
                <button 
                  onClick={() => rollTab === 'dice' && handleRoll('dice', diceParams)}
                  className={`w-40 h-40 flex flex-col items-center justify-center rounded-2xl shadow-2xl transition-all transform active:scale-95 ${rollTab === 'dice' ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer' : 'bg-gray-800 cursor-default'}`}
                >
                  {rollResult === null ? <span className="text-6xl opacity-50">🎲</span> : <span className="text-6xl font-bold text-white animate-bounce">{rollResult}</span>}
                </button>
                
                {rollCost && (
                  <div className="mt-4 px-3 py-1 bg-red-900/50 text-red-200 text-sm rounded border border-red-500/30 animate-pulse">
                    Coût : {rollCost}
                  </div>
                )}

                {rollTab === 'dice' && <p className="text-xs text-gray-500 mt-4">Clique sur le dé pour lancer</p>}
                {rollTab === 'stat' && <p className="text-xs text-gray-500 mt-4">Clique sur une stat à gauche</p>}
              </div>
            </div>

            <button onClick={() => setIsRollOpen(false)} className="w-full mt-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded-lg transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Action;