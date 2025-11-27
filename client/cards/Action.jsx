import React, { useState } from 'react';

const Action = ({ sessionName, icon, playerData, auth, sessionId, onRefresh }) => {
  const j = playerData.joueur;
  const m = playerData.money;
  const wallet = m.wallet;

  // États Modales
  const [isReposOpen, setIsReposOpen] = useState(false);
  const [isRollOpen, setIsRollOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false); // Renommé de isResourceOpen pour clarté
  const [isMoneyOpen, setIsMoneyOpen] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);

  // --- ÉTATS MODALE STATS (Ressources & Attributs) ---
  const [statsTab, setStatsTab] = useState('resources'); // 'resources' | 'attributes'
  
  // Ressources (HP, Mana, Stam)
  const [resTarget, setResTarget] = useState('hp');
  const [resAction, setResAction] = useState('remove');
  const [resValue, setResValue] = useState("");

  // Attributs (Force, Const, etc.)
  const [attrTarget, setAttrTarget] = useState('force');
  const [attrAction, setAttrAction] = useState('add');
  const [attrValue, setAttrValue] = useState("1");

  // --- ÉTATS MODALE ARGENT ---
  const [moneyTab, setMoneyTab] = useState('transfer');
  // Transfert
  const [transferDir, setTransferDir] = useState('wallet_to_bank');
  const [transferCoin, setTransferCoin] = useState('pc');
  const [transferAmount, setTransferAmount] = useState("");
  // Base
  const [baseTarget, setBaseTarget] = useState('wallet');
  const [baseAction, setBaseAction] = useState('add');
  const [baseCoin, setBaseCoin] = useState('pc');
  const [baseAmount, setBaseAmount] = useState("");

  // --- ÉTATS ROLL & SORT ---
  const [rollTab, setRollTab] = useState('stat'); 
  const [diceParams, setDiceParams] = useState({ min: 1, max: 100, count: 1 });
  const [advType, setAdvType] = useState('n'); 
  const [modifier, setModifier] = useState(0);
  const [effectMod, setEffectMod] = useState(0);
  const [effects, setEffects] = useState([{ id: 1, val: 0, res: null }]); 
  const [rollResult, setRollResult] = useState(null);
  const [rollDetails, setRollDetails] = useState(null);
  const [rollCost, setRollCost] = useState(null);
  const [rollError, setRollError] = useState(null);

  // Listes constantes
  const statsList = [
    { id: 'force', label: 'Force' }, { id: 'constitution', label: 'Const' },
    { id: 'agilite', label: 'Agi' }, { id: 'intelligence', label: 'Intel' },
    { id: 'perception', label: 'Perc' }
  ];
  const coinOptions = [
    {v: 'pc', l: 'PC', c: 'text-orange-600'}, {v: 'pa', l: 'PA', c: 'text-gray-400'},
    {v: 'po', l: 'PO', c: 'text-yellow-500'}, {v: 'pp', l: 'PP', c: 'text-slate-300'}
  ];

  // Calculs Sorts
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

  const handleResourceMod = async () => {
    const val = parseInt(resValue);
    if (!val || val <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/resource", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, target: resTarget, action: resAction, value: val }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setResValue(""); setIsStatsOpen(false); } 
      else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleAttributeMod = async () => {
    const val = parseInt(attrValue);
    if (!val || val <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/stat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, stat: attrTarget, action: attrAction, value: val }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setAttrValue("1"); setIsStatsOpen(false); } 
      else { alert("Erreur: " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleTransfer = async () => {
    const val = parseInt(transferAmount);
    if (!val || val <= 0) return;
    const sourceName = transferDir === 'wallet_to_bank' ? 'wallet' : 'bank';
    const destName = transferDir === 'wallet_to_bank' ? 'bank' : 'wallet';
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/transfer", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, from: sourceName, to: destName, coin: transferCoin, amount: val }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setTransferAmount(""); setIsMoneyOpen(false); }
      else { alert("Erreur : " + data.error); }
    } catch (e) { alert("Erreur serveur"); } finally { setIsLoading(false); }
  };

  const handleBaseMoney = async () => {
    const val = parseInt(baseAmount);
    if (!val || val <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/money", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, target: baseTarget, action: baseAction, coin: baseCoin, value: val }),
      });
      const data = await res.json();
      if (data.success) { await onRefresh(); setBaseAmount(""); setIsMoneyOpen(false); }
      else { alert("Erreur : " + data.error); }
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
        if (data.cost > 0) { setRollCost(`-${data.cost} ${data.costType}`); await onRefresh(); }
        if (type === 'sort' && data.effectResults) { setEffects(prev => prev.map((eff, i) => ({ ...eff, res: data.effectResults[i] }))); }
      } else {
        if (data.error === 'NO_MANA') { setRollResult(null); setRollError("0 MP"); }
        else if (data.error === 'NO_STAM') { setRollResult(null); setRollError("0 ST"); }
        else { setRollResult("Err"); alert(data.error); }
      }
    } catch (e) { setRollResult("Err"); }
  };

  // Helpers UI
  const addEffect = () => setEffects([...effects, { id: Date.now(), val: 0, res: null }]);
  const removeEffect = (id) => setEffects(effects.filter(e => e.id !== id));
  const updateEffect = (id, val) => setEffects(effects.map(e => e.id === id ? { ...e, val } : e));
  const tabClass = (active) => `flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${active ? 'border-indigo-500 text-indigo-400 bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`;
  const advBtnClass = (type, current) => `flex-1 py-1 text-xs font-bold border rounded transition-all ${current === type ? (type === 'a' ? 'bg-green-900/80 border-green-500 text-green-300' : type === 'm' ? 'bg-red-900/80 border-red-500 text-red-300' : 'bg-gray-600 border-gray-400 text-white') : 'bg-[#111] border-gray-700 text-gray-500 hover:bg-gray-800'}`;

  return (
    <>
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in relative w-full">
        
        {/* HUD ARGENT */}
        <div className="absolute top-0 left-0 flex flex-row items-center gap-3 bg-[#151515] border border-gray-700 rounded-lg px-4 py-2 text-xs font-mono shadow-lg z-10">
          <div className="flex items-center gap-2 text-orange-600"><span className="font-bold">PC</span> <span>{wallet.pc}</span></div>
          <div className="w-px h-3 bg-gray-800"></div>
          <div className="flex items-center gap-2 text-gray-400"><span className="font-bold">PA</span> <span>{wallet.pa}</span></div>
          <div className="w-px h-3 bg-gray-800"></div>
          <div className="flex items-center gap-2 text-yellow-500"><span className="font-bold">PO</span> <span>{wallet.po}</span></div>
          <div className="w-px h-3 bg-gray-800"></div>
          <div className="flex items-center gap-2 text-slate-300"><span className="font-bold">PP</span> <span>{wallet.pp}</span></div>
        </div>

        {/* HUD STATS */}
        <div className="absolute top-0 right-0 flex flex-col sm:flex-row gap-1 sm:gap-3 bg-[#151515] border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono shadow-lg z-10">
          <span className="text-red-400 font-bold">HP {j.hp}/{j.hpMax}</span>
          <span className="text-blue-400 font-bold">MP {j.mana}/{j.manaMax}</span>
          <span className="text-green-400 font-bold">ST {j.stam}/{j.stamMax}</span>
        </div>

        <span className="text-6xl mb-4 block filter drop-shadow-lg mt-8">{icon || '🎲'}</span>
        <h2 className="text-2xl font-bold text-white mb-2">Zone d'Actions</h2>
        <p className="text-gray-400">Session : <span className="text-indigo-400 font-mono">{sessionName}</span></p>
        
        <div className="flex flex-col gap-4 mt-8 w-full max-w-xs">
          <button onClick={() => setIsRollOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"><span>🎲</span> Lancer un Dé</button>
          
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setIsReposOpen(true)} className="px-4 py-3 bg-blue-900/50 border border-blue-500/50 hover:bg-blue-800 text-blue-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"><span>💤</span> Repos</button>
             {/* BOUTON STATS (Modifié) */}
             <button onClick={() => setIsStatsOpen(true)} className="px-4 py-3 bg-emerald-900/50 border border-emerald-500/50 hover:bg-emerald-800 text-emerald-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"><span>❤️</span> Stats</button>
             <button onClick={() => setIsMoneyOpen(true)} className="col-span-2 px-4 py-3 bg-yellow-900/40 border border-yellow-500/40 hover:bg-yellow-800/60 text-yellow-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"><span>💰</span> Argent</button>
          </div>
        </div>
      </div>

      {/* --- POPUP STATS (RESSOURCES & ATTRIBUTS) --- */}
      {isStatsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#222] border border-gray-600 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col">
            
            <div className="flex bg-[#151515] border-b border-gray-700">
              <button onClick={() => setStatsTab('resources')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${statsTab === 'resources' ? 'bg-emerald-700 text-white' : 'text-gray-500 hover:text-white'}`}>Ressources</button>
              <button onClick={() => setStatsTab('attributes')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${statsTab === 'attributes' ? 'bg-purple-700 text-white' : 'text-gray-500 hover:text-white'}`}>Attributs</button>
            </div>

            <div className="p-6">
              
              {/* ONGLET RESSOURCES */}
              {statsTab === 'resources' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex gap-2">
                    {[{ id: 'hp', l: 'HP', c: 'border-red-500 text-red-400' }, { id: 'mana', l: 'Mana', c: 'border-blue-500 text-blue-400' }, { id: 'stam', l: 'Stam', c: 'border-green-500 text-green-400' }].map(t => (
                      <button key={t.id} onClick={() => setResTarget(t.id)} className={`flex-1 py-2 rounded-lg border font-bold text-sm transition-all ${resTarget === t.id ? `bg-white/10 ${t.c}` : 'border-gray-700 text-gray-500 hover:bg-white/5'}`}>{t.l}</button>
                    ))}
                  </div>
                  <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setResAction('remove')} className={`flex-1 py-2 rounded font-bold text-sm ${resAction === 'remove' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>- Retirer</button>
                    <button onClick={() => setResAction('add')} className={`flex-1 py-2 rounded font-bold text-sm ${resAction === 'add' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>+ Ajouter</button>
                  </div>
                  <input type="number" value={resValue} onChange={(e) => setResValue(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg p-3 text-center text-white text-xl font-bold outline-none" placeholder="0"/>
                  <button onClick={handleResourceMod} disabled={isLoading || !resValue} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50">Valider</button>
                </div>
              )}

              {/* ONGLET ATTRIBUTS */}
              {statsTab === 'attributes' && (
                <div className="animate-fade-in space-y-4">
                   <div className="grid grid-cols-2 gap-2">
                      {statsList.map(s => (
                        <button key={s.id} onClick={() => setAttrTarget(s.id)} className={`py-2 text-xs font-bold rounded border transition-colors ${attrTarget === s.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-[#1a1a1a] border-gray-700 text-gray-500 hover:text-white'}`}>{s.label}</button>
                      ))}
                   </div>
                   <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                      <button onClick={() => setAttrAction('remove')} className={`flex-1 py-2 rounded font-bold text-sm ${attrAction === 'remove' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}>- Retirer</button>
                      <button onClick={() => setAttrAction('add')} className={`flex-1 py-2 rounded font-bold text-sm ${attrAction === 'add' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>+ Ajouter</button>
                   </div>
                   <input type="number" value={attrValue} onChange={(e) => setAttrValue(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded-lg p-3 text-center text-white text-xl font-bold outline-none" placeholder="1"/>
                   <button onClick={handleAttributeMod} disabled={isLoading || !attrValue} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50">Valider</button>
                   <p className="text-[9px] text-gray-500 text-center italic mt-1">Modifie HP/Mana/Stam max</p>
                </div>
              )}

            </div>
            <button onClick={() => setIsStatsOpen(false)} className="w-full py-3 bg-[#111] text-gray-400 hover:text-white font-bold border-t border-gray-700">Fermer</button>
          </div>
        </div>
      )}

      {/* --- POPUP ARGENT --- */}
      {isMoneyOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#222] border border-gray-600 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex bg-[#151515] border-b border-gray-700">
              <button onClick={() => setMoneyTab('transfer')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${moneyTab === 'transfer' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-white'}`}>Transfert</button>
              <button onClick={() => setMoneyTab('base')} className={`flex-1 py-3 text-sm font-bold uppercase transition-colors ${moneyTab === 'base' ? 'bg-yellow-600 text-white' : 'text-gray-500 hover:text-white'}`}>Base</button>
            </div>
            <div className="p-6">
              {moneyTab === 'transfer' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setTransferDir('wallet_to_bank')} className={`flex-1 py-2 text-xs font-bold rounded ${transferDir === 'wallet_to_bank' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>👛 ➔ 🏦</button>
                    <button onClick={() => setTransferDir('bank_to_wallet')} className={`flex-1 py-2 text-xs font-bold rounded ${transferDir === 'bank_to_wallet' ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>🏦 ➔ 👛</button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Pièce</label>
                    <div className="flex gap-2">
                      {coinOptions.map(c => (
                        <button key={c.v} onClick={() => setTransferCoin(c.v)} className={`flex-1 py-1 rounded border text-xs font-bold ${transferCoin === c.v ? 'bg-white/10 border-white text-white' : 'border-gray-700 text-gray-500'}`}>{c.l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1"><label className="text-xs text-gray-500 uppercase font-bold">Montant</label><span className="text-xs text-gray-500">Max: {m[transferDir === 'wallet_to_bank' ? 'wallet' : 'bank'][transferCoin]}</span></div>
                    <input type="number" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white font-mono" placeholder="0"/>
                  </div>
                  <button onClick={handleTransfer} disabled={isLoading || !transferAmount} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 mt-2">Transférer</button>
                </div>
              )}
              {moneyTab === 'base' && (
                <div className="animate-fade-in space-y-4">
                  <div className="flex gap-2">
                     <button onClick={() => setBaseTarget('wallet')} className={`flex-1 py-2 rounded border font-bold text-xs ${baseTarget === 'wallet' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' : 'border-gray-700 text-gray-500'}`}>👛 Porte-monnaie</button>
                     <button onClick={() => setBaseTarget('bank')} className={`flex-1 py-2 rounded border font-bold text-xs ${baseTarget === 'bank' ? 'border-blue-500 text-blue-500 bg-blue-500/10' : 'border-gray-700 text-gray-500'}`}>🏦 Banque</button>
                  </div>
                  <div className="flex bg-[#111] p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setBaseAction('add')} className={`flex-1 py-2 text-xs font-bold rounded ${baseAction === 'add' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>+ Ajouter</button>
                    <button onClick={() => setBaseAction('remove')} className={`flex-1 py-2 text-xs font-bold rounded ${baseAction === 'remove' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>- Retirer</button>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase font-bold block mb-1">Pièce</label>
                    <div className="flex gap-2">
                      {coinOptions.map(c => (
                        <button key={c.v} onClick={() => setBaseCoin(c.v)} className={`flex-1 py-1 rounded border text-xs font-bold ${baseCoin === c.v ? 'bg-white/10 border-white text-white' : 'border-gray-700 text-gray-500'}`}>{c.l}</button>
                      ))}
                    </div>
                  </div>
                  <input type="number" value={baseAmount} onChange={(e) => setBaseAmount(e.target.value)} className="w-full bg-[#1a1a1a] border border-gray-600 rounded p-2 text-white font-mono" placeholder="0"/>
                  <button onClick={handleBaseMoney} disabled={isLoading || !baseAmount} className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50 mt-2">Valider</button>
                </div>
              )}
            </div>
            <button onClick={() => setIsMoneyOpen(false)} className="w-full py-3 bg-[#111] text-gray-400 hover:text-white font-bold border-t border-gray-700">Fermer</button>
          </div>
        </div>
      )}

      {/* --- POPUP REPOS --- */}
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

      {/* --- POPUP ROLL --- */}
      {isRollOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#222] border border-gray-600 w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
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
                {rollTab === 'sort' && (
                  <div className="flex flex-col gap-4 h-full">
                    <div className={`p-3 border rounded-lg text-center transition-colors ${canCastSpell ? 'bg-blue-900/10 border-blue-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                      <div className="flex justify-between text-xs mb-1 text-gray-400"><span>Base: {j.intelligence}</span><span>- Coût: {totalEffectCost}</span></div>
                      <p className={`text-lg font-bold ${canCastSpell ? 'text-blue-300' : 'text-red-400'}`}>Intel. Dispo: {currentIntel}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                      {effects.map((effect, idx) => (
                        <div key={effect.id} className="flex items-center gap-2 bg-[#151515] p-2 rounded border border-gray-800">
                          <label className="text-[10px] text-gray-500 w-8 font-bold">Eff.{idx+1}</label>
                          <input type="number" value={effect.val} onChange={(e) => updateEffect(effect.id, e.target.value)} className="w-12 bg-black border border-gray-600 rounded p-1 text-center text-white text-sm focus:border-indigo-500 outline-none"/>
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
                    <button onClick={() => handleRoll('sort', {})} disabled={!canCastSpell} className={`w-full py-2 font-bold rounded shadow transition-all ${canCastSpell ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>{canCastSpell ? "LANCER LE SORT" : "INTEL INSUFFISANTE"}</button>
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
              <div className="flex-1 flex flex-col gap-3">
                <div className="flex-1 flex flex-col items-center justify-center bg-[#151515] rounded-xl border border-gray-800 relative min-h-[160px]">
                  {rollError ? (<div className="text-red-500 font-bold text-xl animate-pulse">{rollError}</div>) : (
                    <button onClick={() => rollTab === 'dice' && handleRoll('dice', diceParams)} className={`w-32 h-32 flex flex-col items-center justify-center rounded-2xl shadow-2xl transition-all transform active:scale-95 ${rollTab === 'dice' ? 'bg-indigo-600 hover:bg-indigo-500 cursor-pointer' : 'bg-gray-800 cursor-default'}`}>
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