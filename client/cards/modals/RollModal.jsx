import React, { useState } from 'react';

const RollModal = ({ isOpen, onClose, auth, sessionId, onRefresh, playerData }) => {
  if (!isOpen) return null;

  const j = playerData.joueur;
  const eq = playerData.equipment || {};
  
  const [activeTab, setActiveTab] = useState('stat');
  const [diceParams, setDiceParams] = useState({ min: 1, max: 100, count: 1 });
  const [advType, setAdvType] = useState('n'); 
  const [modifier, setModifier] = useState(0); // Modif pour le jet de réussite (D20/D100)
  const [effectMod, setEffectMod] = useState(0); // Modif GLOBAL pour les effets
  
  // NOUVEAU : Chaque effet a maintenant une valeur (dé) ET un modificateur personnel
  const [effects, setEffects] = useState([{ id: 1, val: 0, mod: 0, res: null }]); 
  
  const [rollResult, setRollResult] = useState(null);
  const [rollDetails, setRollDetails] = useState(null);
  const [rollCost, setRollCost] = useState(null);
  const [rollError, setRollError] = useState(null);

  const [activeWeapons, setActiveWeapons] = useState({ arme1: true, arme2: true });

  const toggleWeapon = (slot) => setActiveWeapons(prev => ({ ...prev, [slot]: !prev[slot] }));

  const WeaponSelector = () => (
    (eq.arme1 || eq.arme2) ? (
        <div className="mb-4 bg-[#151515] p-2 rounded border border-gray-700">
            <label className="text-[10px] text-gray-500 uppercase font-bold block mb-2">Bonus Armes &amp; Accessoires</label>
            <div className="flex gap-2">
                {eq.arme1 && (
                    <button onClick={() => toggleWeapon('arme1')} className={`flex-1 py-1 px-2 text-xs rounded border transition-all flex items-center justify-between ${activeWeapons.arme1 ? 'bg-indigo-900/50 border-indigo-500 text-white' : 'bg-black border-gray-700 text-gray-500'}`}>
                        <span className="truncate">{eq.arme1.name}</span>
                        <span className={`w-2 h-2 rounded-full ${activeWeapons.arme1 ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                    </button>
                )}
                {eq.arme2 && (
                    <button onClick={() => toggleWeapon('arme2')} className={`flex-1 py-1 px-2 text-xs rounded border transition-all flex items-center justify-between ${activeWeapons.arme2 ? 'bg-indigo-900/50 border-indigo-500 text-white' : 'bg-black border-gray-700 text-gray-500'}`}>
                        <span className="truncate">{eq.arme2.name}</span>
                        <span className={`w-2 h-2 rounded-full ${activeWeapons.arme2 ? 'bg-green-500' : 'bg-gray-600'}`}></span>
                    </button>
                )}
            </div>
        </div>
    ) : null
  );

  const totalEffectCost = effects.reduce((sum, e) => sum + (parseInt(e.val) || 0), 0);
  const clientIntel = j.intelligence || 0;
  const currentIntel = clientIntel - totalEffectCost;
  const canCastSpell = currentIntel > 0;

  const handleRoll = async (type, dataPayload) => {
    setRollResult("..."); setRollCost(null); setRollDetails(null); setRollError(null);
    if (type === 'sort') setEffects(prev => prev.map(e => ({ ...e, res: null })));
    
    const activeWeaponList = [];
    if (activeWeapons.arme1 && eq.arme1) activeWeaponList.push('arme1');
    if (activeWeapons.arme2 && eq.arme2) activeWeaponList.push('arme2');

    const finalPayload = { ...dataPayload, adv: advType, mod: modifier };
    
    if (type === 'sort') {
      // On envoie maintenant des objets { val, mod } au lieu de juste des nombres
      finalPayload.effects = effects.map(e => ({
          val: parseInt(e.val) || 0,
          mod: parseInt(e.mod) || 0
      }));
      finalPayload.modEffect = effectMod;
    }

    try {
      const res = await fetch("/api/player/roll", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          username: auth.user.username,
          session_id: sessionId, 
          type, 
          data: finalPayload,
          activeWeapons: activeWeaponList 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setRollResult(data.result);
        if (data.list) setRollDetails(data.list);
        if (data.cost > 0) { setRollCost(`-${data.cost} ${data.costType}`); await onRefresh(); }
        if (type === 'sort' && data.effectResults) { setEffects(prev => prev.map((eff, i) => ({ ...eff, res: data.effectResults[i] }))); }
      } else {
        if (data.error === 'NO_MANA') { setRollResult(null); setRollError("0 MP"); }
        else if (data.error === 'NO_STAM') { setRollResult(null); setRollError("0 ST"); }
        else { setRollResult("Err"); alert(data.error); }
      }
    } catch (e) { setRollResult("Err"); }
  };

  const addEffect = () => setEffects([...effects, { id: Date.now(), val: 0, mod: 0, res: null }]);
  const removeEffect = (id) => setEffects(effects.filter(e => e.id !== id));
  
  // Nouvelle fonction update générique pour val et mod
  const updateEffect = (id, field, value) => {
      setEffects(effects.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const tabClass = (active) => `flex-1 py-3 text-sm font-bold uppercase transition-colors border-b-2 ${active ? 'border-indigo-500 text-indigo-400 bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`;
  const advBtnClass = (type, current) => `flex-1 py-1 text-xs font-bold border rounded transition-all ${current === type ? (type === 'a' ? 'bg-green-900/80 border-green-500 text-green-300' : type === 'm' ? 'bg-red-900/80 border-red-500 text-red-300' : 'bg-gray-600 border-gray-400 text-white') : 'bg-[#111] border-gray-700 text-gray-500 hover:bg-gray-800'}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#222] border border-gray-600 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex bg-[#151515] border-b border-gray-700 flex-none">
          <button onClick={() => { setActiveTab('stat'); setRollResult(null); }} className={tabClass(activeTab === 'stat')}>Stat</button>
          <button onClick={() => { setActiveTab('sort'); setRollResult(null); }} className={tabClass(activeTab === 'sort')}>Sort</button>
          <button onClick={() => { setActiveTab('dice'); setRollResult(null); }} className={tabClass(activeTab === 'dice')}>Classique</button>
        </div>

        <div className="flex flex-1 gap-4 p-4 min-h-0 overflow-hidden flex-col sm:flex-row">
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            
            {activeTab === 'stat' && (
              <div className="flex flex-col gap-2">
                <WeaponSelector />
                {['force', 'constitution', 'agilite', 'intelligence', 'perception'].map(stat => (
                  <button key={stat} onClick={() => handleRoll('stat', { stat })} className="flex justify-between items-center p-3 bg-[#1a1a1a] border border-gray-700 rounded-lg hover:bg-indigo-900/20 hover:border-indigo-500/50 transition-all group">
                    <span className="capitalize text-gray-300 font-bold group-hover:text-white">{stat}</span>
                    <span className="text-xs bg-[#111] px-2 py-1 rounded text-gray-500 font-mono">{j[stat]}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'sort' && (
              <div className="flex flex-col gap-4 h-full">
                <WeaponSelector /> 
                
                <div className={`p-3 border rounded-lg text-center transition-colors ${canCastSpell ? 'bg-blue-900/10 border-blue-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                  <div className="flex justify-between text-xs mb-1 text-gray-400"><span>Base: {j.intelligence}</span><span>- Coût: {totalEffectCost}</span></div>
                  <p className={`text-lg font-bold ${canCastSpell ? 'text-blue-300' : 'text-red-400'}`}>Intel. Dispo (Est.): {currentIntel}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2">
                  <div className="grid grid-cols-[30px_1fr_50px_1fr_20px] gap-2 items-center text-[10px] text-gray-500 font-bold uppercase tracking-wide mb-1 px-2">
                      <span>#</span>
                      <span>Dés (Puissance)</span>
                      <span className="text-center">Modif</span>
                      <span className="text-right">Résultat</span>
                      <span></span>
                  </div>
                  
                  {effects.map((effect, idx) => (
                    <div key={effect.id} className="grid grid-cols-[30px_1fr_50px_1fr_20px] items-center gap-2 bg-[#151515] p-2 rounded border border-gray-800">
                      <label className="text-[10px] text-gray-500 font-bold">{idx+1}</label>
                      
                      {/* Input Valeur (Dé) */}
                      <input 
                        type="number" 
                        value={effect.val} 
                        onChange={(e) => updateEffect(effect.id, 'val', e.target.value)} 
                        className="w-full bg-black border border-gray-600 rounded p-1 text-center text-white text-sm focus:border-indigo-500 outline-none"
                        placeholder="Dé"
                      />

                      {/* Input Modif (Spécifique à l'effet) */}
                      <input 
                        type="number" 
                        value={effect.mod} 
                        onChange={(e) => updateEffect(effect.id, 'mod', e.target.value)} 
                        className="w-full bg-[#0a0a0a] border border-gray-700 rounded p-1 text-center text-gray-300 text-xs focus:border-indigo-500 outline-none"
                        placeholder="+/-"
                      />

                      {/* Résultat */}
                      <div className="flex justify-end pr-2">
                          {effect.res !== null ? <span className="text-green-400 font-bold font-mono">{effect.res}</span> : <span className="text-gray-700">-</span>}
                      </div>
                      
                      <button onClick={() => removeEffect(effect.id)} className="text-red-500 hover:text-white font-bold">×</button>
                    </div>
                  ))}
                  <button onClick={addEffect} className="w-full py-1 border border-dashed border-gray-600 text-gray-500 rounded text-xs hover:border-gray-400 hover:text-gray-300">+ Effet</button>
                </div>

                <div className="flex items-center gap-2 bg-[#151515] p-2 rounded border border-gray-700">
                  <label className="text-[10px] text-indigo-300 uppercase font-bold w-24">Bonus Global</label>
                  <input type="number" value={effectMod} onChange={(e) => setEffectMod(parseInt(e.target.value)||0)} className="flex-1 bg-black border border-gray-600 rounded p-1 text-center text-white text-sm focus:border-indigo-500 outline-none" placeholder="+/-" />
                </div>

                <button onClick={() => handleRoll('sort', {})} disabled={!canCastSpell} className={`w-full py-2 font-bold rounded shadow transition-all ${canCastSpell ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>{canCastSpell ? "LANCER LE SORT" : "INTEL INSUFFISANTE"}</button>
              </div>
            )}

            {activeTab === 'dice' && (
              <div className="flex flex-col gap-4 pt-2">
                <div><label className="text-xs text-gray-500 uppercase font-bold block mb-1">Min</label><input type="number" value={diceParams.min} onChange={(e) => setDiceParams({...diceParams, min: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase font-bold block mb-1">Max</label><input type="number" value={diceParams.max} onChange={(e) => setDiceParams({...diceParams, max: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" /></div>
                <div><label className="text-xs text-gray-500 uppercase font-bold block mb-1">Nombre</label><input type="number" value={diceParams.count} onChange={(e) => setDiceParams({...diceParams, count: e.target.value})} className="w-full bg-[#151515] border border-gray-700 rounded p-2 text-white outline-none focus:border-indigo-500" /></div>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col gap-3">
            <div className="flex-1 flex flex-col items-center justify-center bg-[#151515] rounded-xl border border-gray-800 relative min-h-[160px]">
              {rollError ? (<div className="text-red-500 font-bold text-xl animate-pulse">{rollError}</div>) : (
                <button onClick={() => activeTab === 'dice' && handleRoll('dice', diceParams)} className={`w-32 h-32 flex flex-col items-center justify-center rounded-2xl shadow-2xl transition-all transform active:scale-95 ${activeTab === 'dice' ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer' : 'bg-gray-800 cursor-default'}`}>
                  {rollResult === null ? <span className="text-5xl opacity-50">🎲</span> : <span className="text-6xl font-bold text-white animate-bounce">{rollResult}</span>}
                </button>
              )}
              {rollDetails && rollDetails.length > 1 && <div className="mt-2 text-xs text-gray-500 font-mono text-center px-2">[{rollDetails.join(', ')}]</div>}
              {rollCost && <div className="absolute top-2 right-2 px-2 py-0.5 bg-red-900/80 text-red-200 text-[10px] rounded border border-red-500/30 font-bold">-{rollCost}</div>}
            </div>
            
            <div className="bg-[#151515] border border-gray-700 p-3 rounded-lg flex-none">
              <label className="text-[10px] text-gray-500 uppercase font-bold block mb-2 text-center">Jet de Réussite</label>
              <div className="flex gap-1 mb-3">
                <button onClick={() => setAdvType('a')} className={advBtnClass('a', advType)}>Avantage</button>
                <button onClick={() => setAdvType('n')} className={advBtnClass('n', advType)}>Normal</button>
                <button onClick={() => setAdvType('m')} className={advBtnClass('m', advType)}>Désav.</button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold w-10">Modif</label>
                <input type="number" value={modifier} onChange={(e) => setModifier(parseInt(e.target.value) || 0)} className="flex-1 bg-black border border-gray-700 rounded p-1 text-white text-sm text-center outline-none focus:border-indigo-500 font-mono" placeholder="0" />
              </div>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-4 bg-[#111] text-gray-400 hover:text-white font-bold border-t border-gray-700 transition-colors">Fermer</button>
      </div>
    </div>
  );
};

export default RollModal;