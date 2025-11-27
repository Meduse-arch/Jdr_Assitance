import React, { useState } from 'react';

const Action = ({ sessionName, icon, playerData, auth, sessionId, onRefresh }) => {
  const j = playerData.joueur;
  const [isReposOpen, setIsReposOpen] = useState(false);
  const [isRollOpen, setIsRollOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // États Roll
  const [rollTab, setRollTab] = useState('stat'); 
  const [diceParams, setDiceParams] = useState({ min: 1, max: 100, count: 1 });
  const [advType, setAdvType] = useState('n'); 
  const [modifier, setModifier] = useState(0);
  
  // États Sort
  const [effectMod, setEffectMod] = useState(0);
  const [effects, setEffects] = useState([{ id: 1, val: 0, res: null }]); 

  const [rollResult, setRollResult] = useState(null);
  const [rollDetails, setRollDetails] = useState(null);
  const [rollCost, setRollCost] = useState(null);
  const [rollError, setRollError] = useState(null);

  // --- CALCULS SORTS EN TEMPS RÉEL ---
  const totalEffectCost = effects.reduce((sum, e) => sum + (parseInt(e.val) || 0), 0);
  const currentIntel = j.intelligence - totalEffectCost;
  const canCastSpell = currentIntel > 0;

  // --- API CALLS ---
  const handleRepos = async (type, target = null) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/repos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, type, target }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setIsReposOpen(false); } 
      else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleRoll = async (type, dataPayload) => {
    setRollResult("..."); setRollCost(null); setRollDetails(null); setRollError(null);
    
    if (type === 'sort') setEffects(prev => prev.map(e => ({ ...e, res: null })));

    const finalPayload = { ...dataPayload, adv: advType, mod: modifier };
    if (type === 'sort') {
      finalPayload.effects = effects.map(e => parseInt(e.val) || 0);
      finalPayload.modEffect = effectMod;
    }

    try {
      const res = await fetch("/api/player/roll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, type, data: finalPayload }),
      });
      const data = await res.json();
      
      if (data.success) {
        setRollResult(data.result);
        if (data.list) setRollDetails(data.list);
        if (data.cost > 0) {
          setRollCost(`-${data.cost} ${data.costType}`);
          await onRefresh(); 
        }
        if (type === 'sort' && data.effectResults) {
          setEffects(prev => prev.map((eff, i) => ({ ...eff, res: data.effectResults[i] })));
        }
      } else {
        if (data.error === 'NO_MANA') { setRollResult(null); setRollError("0 MP"); }
        else if (data.error === 'NO_STAM') { setRollResult(null); setRollError("0 ST"); }
        else { setRollResult("Err"); alert(data.error); }
      }
    } catch (e) { setRollResult("Err"); }
  };

  // Helpers
  const addEffect = () => setEffects([...effects, { id: Date.now(), val: 0, res: null }]);
  const removeEffect = (id) => setEffects(effects.filter(e => e.id !== id));
  const updateEffect = (id, val) => setEffects(effects.map(e => e.id === id ? { ...e, val } : e));

  const tabClass = (active) => `flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${active ? 'border-indigo-500 text-indigo-400 bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`;
  const advBtnClass = (type, current) => `flex-1 py-1 text-xs font-bold border rounded transition-all ${current === type ? (type === 'a' ? 'bg-green-900/80 border-green-500 text-green-300' : type === 'm' ? 'bg-red-900/80 border-red-500 text-red-300' : 'bg-gray-600 border-gray-400 text-white') : 'bg-[#111] border-gray-700 text-gray-500 hover:bg-gray-800'}`;

  return (
    <>
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in relative w-full">
        <div className="absolute top-0 right-0 flex flex-col sm:flex-row gap-1 sm:gap-3 bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-lg z-10">
          <span className="text-red-400 font-bold">HP {j.hp}/{j.hpMax}</span>
          <span className="text-blue-400 font-bold">MP {j.mana}/{j.manaMax}</span>
          <span className="text-green-400 font-bold">ST {j.stam}/{j.stamMax}</span>
        </div>

        <span className="text-6xl mb-4 block filter drop-shadow-lg mt-8">{icon || '🎲'}</span>
        <h2 className="text-2xl font-bold text-white mb-2">Zone d'Actions</h2>
        <p className="text-gray-400">Session : <span className="text-indigo-400 font-mono">{sessionName}</span></p>
        
        <div className="flex gap-4 mt-8">
          <button onClick={() => setIsRollOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center gap-2"><span>🎲</span> Lancer un Dé</button>
          <button onClick={() => setIsReposOpen(true)} className="px-6 py-3 bg-blue-900/50 border border-blue-500/50 hover:bg-blue-800 text-blue-100 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg"><span>💤</span> Se Reposer</button>
        </div>
      </div>

      {/* POPUP REPOS */}
      {isReposOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#222] border border-gray-600 w-full max-w-sm rounded-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-center">Type de Repos</h2>
            <div className="flex flex-col gap-3">
              <button onClick={() => handleRepos('long')} disabled={isLoading} className="w-full p-4 bg-[#1a1a2e] border border-indigo-500/50 hover:bg-indigo-900/30 rounded-lg text-left group"><div className="font-bold text-indigo-300 group-hover:text-white">✨ Repos Long</div><div className="text-xs text-gray-500 group-hover:text-gray-300">HP, Mana, Stamina Max</div></button>
              <button onClick={() => handleRepos('court')} disabled={isLoading} className="w-full p-4 bg-[#1a2e1a] border border-green-500/50 hover:bg-green-900/30 rounded-lg text-left group"><div className="font-bold text-green-300 group-hover:text-white">💫 Repos Court</div><div className="text-xs text-gray-500 group-hover:text-gray-300">Mana, Stamina Max</div></button>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#222] border border-gray-600 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            
            {/* Onglets */}
            <div className="flex bg-[#151515] border-b border-gray-700 flex-none">
              <button onClick={() => { setRollTab('stat'); setRollResult(null); setRollError(null); }} className={tabClass(rollTab === 'stat')}>Stat</button>
              <button onClick={() => { setRollTab('sort'); setRollResult(null); setRollError(null); }} className={tabClass(rollTab === 'sort')}>Sort</button>
              <button onClick={() => { setRollTab('dice'); setRollResult(null); setRollError(null); }} className={tabClass(rollTab === 'dice')}>Classique</button>
            </div>

            <div className="flex flex-1 gap-4 p-4 min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                
                {rollTab === 'stat' && (
                  <div className="flex flex-col gap-2">
                    {['force', 'constitution', 'agilite', 'intelligence', 'perception'].map(stat => (
                      <button key={stat} onClick={() => handleRoll('stat', { stat })} className="flex justify-between items-center p-3 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all group">
                        <span className="capitalize text-gray-300 font-bold group-hover:text-white">{stat}</span>
                        <span className="text-xs bg-[#111] px-2 py-1 rounded text-gray-500 font-mono">{j[stat]}</span>
                      </button>
                    ))}
                    <p className="text-[10px] text-gray-600 mt-2 text-center uppercase tracking-wide">Force & Agi = Coût Stamina</p>
                  </div>
                )}

                {/* --- ZONE SORT MODIFIÉE --- */}
                {rollTab === 'sort' && (
                  <div className="flex flex-col gap-4 h-full">
                    {/* Panneau d'infos dynamiques */}
                    <div className={`p-3 border rounded-lg text-center transition-colors ${canCastSpell ? 'bg-blue-900/10 border-blue-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                      <div className="flex justify-between text-xs mb-1 text-gray-400">
                        <span>Base: {j.intelligence}</span>
                        <span>- Coût: {totalEffectCost}</span>
                      </div>
                      <p className={`text-lg font-bold ${canCastSpell ? 'text-blue-300' : 'text-red-400'}`}>
                        Intel. Dispo: {currentIntel}
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2">
                      {effects.map((effect, idx) => (
                        <div key={effect.id} className="flex items-center gap-2 bg-[#151515] p-2 rounded border border-gray-800">
                          <label className="text-[10px] text-gray-500 w-8 font-bold">Eff.{idx+1}</label>
                          <input 
                            type="number" 
                            value={effect.val} 
                            onChange={(e) => updateEffect(effect.id, e.target.value)}
                            className="w-12 bg-black border border-gray-600 rounded p-1 text-center text-white text-sm focus:border-indigo-500 outline-none"
                          />
                          <div className="flex-1 flex justify-end pr-2">{effect.res !== null ? <span className="text-green-400 font-bold font-mono">{effect.res}</span> : <span className="text-gray-700">-</span>}</div>
                          <button onClick={() => removeEffect(effect.id)} className="text-red-500 px-1 hover:text-white">×</button>
                        </div>
                      ))}
                      <button onClick={addEffect} className="w-full py-1 border border-dashed border-gray-600 text-gray-500 rounded text-xs hover:border-gray-400 hover:text-gray-300">+ Effet</button>
                    </div>
                    <div className="flex items-center gap-2 bg-[#151515] p-2 rounded">
                      <label className="text-[10px] text-gray-500 uppercase">Modif.</label>
                      <input type="number" value={effectMod} onChange={(e) => setEffectMod(parseInt(e.target.value)||0)} className="flex-1 bg-black border border-gray-700 rounded p-1 text-center text-white text-sm" />
                    </div>
                    
                    {/* Bouton désactivé si Intel <= 0 */}
                    <button 
                      onClick={() => handleRoll('sort', {})} 
                      disabled={!canCastSpell}
                      className={`w-full py-2 font-bold rounded shadow transition-all ${canCastSpell ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                    >
                      {canCastSpell ? "LANCER LE SORT" : "INTEL INSUFFISANTE"}
                    </button>
                  </div>
                )}

                {rollTab === 'dice' && (
                  <div className="flex flex-col gap-4 pt-2">
                    <div><label className="text-xs text-gray-500 uppercase font-bold block mb-1">Min</label><input type="number" value={diceParams.min} onChange={(e) => setDiceParams({...diceParams, min: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" /></div>
                    <div><label className="text-xs text-gray-500 uppercase font-bold block mb-1">Max</label><input type="number" value={diceParams.max} onChange={(e) => setDiceParams({...diceParams, max: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" /></div>
                    <div><label className="text-xs text-gray-500 uppercase font-bold block mb-1">Nombre</label><input type="number" value={diceParams.count} onChange={(e) => setDiceParams({...diceParams, count: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" /></div>
                  </div>
                )}
              </div>

              {/* DROITE : DÉ */}
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex-1 flex flex-col items-center justify-center bg-[#151515] rounded-xl border border-gray-800 relative min-h-[160px]">
                  {rollError ? (
                    <div className="text-red-500 font-bold text-xl animate-pulse">{rollError}</div>
                  ) : (
                    <button 
                      onClick={() => rollTab === 'dice' && handleRoll('dice', diceParams)}
                      className={`w-32 h-32 flex flex-col items-center justify-center rounded-2xl shadow-2xl transition-all transform active:scale-95 ${rollTab === 'dice' ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer' : 'bg-gray-800 cursor-default'}`}
                    >
                      {rollResult === null ? <span className="text-5xl opacity-50">🎲</span> : <span className="text-6xl font-bold text-white animate-bounce">{rollResult}</span>}
                    </button>
                  )}
                  {rollDetails && rollDetails.length > 1 && <div className="mt-2 text-xs text-gray-500 font-mono text-center px-2">[{rollDetails.join(', ')}]</div>}
                  {rollCost && <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-900/80 text-red-200 text-[10px] rounded border border-red-500/30 font-bold">-{rollCost}</div>}
                </div>

                <div className="bg-[#151515] border border-gray-700 p-3 rounded-lg flex-none">
                  <div className="flex gap-1 mb-3">
                    <button onClick={() => setAdvType('a')} className={advBtnClass('a', advType)}>Avantage</button>
                    <button onClick={() => setAdvType('n')} className={advBtnClass('n', advType)}>Normal</button>
                    <button onClick={() => setAdvType('m')} className={advBtnClass('m', advType)}>Désav.</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] text-gray-500 uppercase font-bold w-10">Modif</label>
                    <input type="number" value={modifier} onChange={(e) => setModifier(parseInt(e.target.value) || 0)} className="flex-1 bg-black border border-gray-700 rounded p-1 text-white text-sm text-center outline-none focus:border-indigo-500 font-mono" />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 border-t border-gray-800 bg-[#151515] flex-none">
              <button onClick={() => setIsRollOpen(false)} className="w-full py-3 bg-red-600 hover:bg-red-600 text-white font-bold rounded-lg transition-colors shadow-md">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Action;