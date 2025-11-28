import React, { useState } from 'react';

const Fiche = ({ playerData, auth, sessionId, onRefresh }) => {
  const j = playerData.joueur;
  const eq = playerData.equipment || { 
    arme1: null, arme2: null, tete: null, corp: null, dos: null, pantalon: null, pied: null, 
    bijou1: null, bijou2: null, bijou3: null, bijou4: null 
  };

  const [selectedEquip, setSelectedEquip] = useState(null); 
  const [showJewelryList, setShowJewelryList] = useState(false);
  const [loading, setLoading] = useState(false);

  const calculateTotalBonuses = () => {
    const totals = {};
    Object.values(eq).forEach(item => {
        if (item && item.modifiers) {
            Object.entries(item.modifiers).forEach(([stat, val]) => {
                totals[stat] = (totals[stat] || 0) + val;
            });
        }
    });
    return totals;
  };

  const totalBonuses = calculateTotalBonuses();
  const hasBonuses = Object.keys(totalBonuses).length > 0;

  const handleUnequip = async (item) => {
    if (!item) return;
    setLoading(true);
    try {
      const res = await fetch("/api/player/inventory/unequip", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, item_id: item.id }),
      });
      if ((await res.json()).success) {
        if (onRefresh) onRefresh();
        setSelectedEquip(null);
      }
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const StatBlock = ({ label, statKey, side }) => {
    const base = j[statKey] || 0;
    const bonus = totalBonuses[statKey] || 0;
    const total = base + bonus;
    
    return (
        <div className={`flex items-center gap-2 p-2 bg-[#1a1a1a] border border-gray-700 rounded-lg ${side === 'left' ? 'flex-row' : 'flex-row-reverse text-right'}`}>
            <div className="flex-1">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">{label}</span>
                <span className="text-xl font-bold text-white">
                    {total} 
                    {bonus > 0 && <span className="text-xs text-green-400 ml-1">+{bonus}</span>}
                </span>
            </div>
        </div>
    );
  };

  const EquipSlot = ({ label, slotKey, icon }) => {
    const item = eq[slotKey];
    return (
      <div onClick={() => item ? setSelectedEquip(item) : null} className={`flex items-center gap-3 p-2 rounded-lg border w-full h-16 transition-all ${item ? 'bg-[#1a1a1a] border-indigo-500/50 cursor-pointer hover:bg-[#252525]' : 'bg-black/20 border-gray-800 border-dashed text-gray-700'}`}>
        <span className="text-2xl opacity-80 w-8 text-center">{icon}</span>
        <div className="flex flex-col overflow-hidden">
            <span className="text-[8px] uppercase font-bold text-gray-500">{label}</span>
            <span className={`text-xs font-bold truncate ${item ? 'text-white' : 'text-gray-700 italic'}`}>{item ? item.name : 'Vide'}</span>
        </div>
      </div>
    );
  };

  const JewelryGroupSlot = () => {
    const count = [eq.bijou1, eq.bijou2, eq.bijou3, eq.bijou4].filter(x => x).length;
    return (
      <div onClick={() => setShowJewelryList(true)} className={`flex items-center gap-3 p-2 rounded-lg border w-full h-16 cursor-pointer transition-all ${count > 0 ? 'bg-[#1a1a1a] border-purple-500/50 hover:bg-[#252525]' : 'bg-black/20 border-gray-800 border-dashed'}`}>
        <span className="text-2xl opacity-80 w-8 text-center">💍</span>
        <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-gray-500">BIJOUX</span>
            <span className={`text-xs font-bold ${count > 0 ? 'text-purple-300' : 'text-gray-700 italic'}`}>{count} / 4 Équipés</span>
        </div>
      </div>
    );
  };

  const EquipDetailPopup = () => {
    if (!selectedEquip) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedEquip(null)}>
        <div className="bg-[#1a1a1a] border border-gray-600 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="bg-[#111] p-4 flex gap-4 items-center border-b border-gray-700">
                <div className="bg-[#222] p-3 rounded-lg text-2xl border border-gray-700">🛡️</div>
                <div className="flex-1"><h3 className="text-lg font-bold text-white">{selectedEquip.name}</h3><span className="text-xs text-gray-500 uppercase font-bold">{selectedEquip.type}</span></div>
                <button onClick={() => setSelectedEquip(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
            </div>
            <div className="p-5 space-y-3">
                {selectedEquip.description && <p className="text-sm text-gray-400 italic bg-black/30 p-3 rounded border border-gray-800">"{selectedEquip.description}"</p>}
                {selectedEquip.modifiers && <div className="grid grid-cols-2 gap-2">{Object.entries(selectedEquip.modifiers).map(([k, v]) => (<div key={k} className="bg-[#111] border border-gray-700 px-2 py-1 rounded flex justify-between"><span className="text-xs text-gray-400 capitalize">{k}</span><span className="text-xs font-bold text-green-400">+{v}</span></div>))}</div>}
            </div>
            <div className="p-4 bg-[#111] border-t border-gray-700"><button onClick={() => handleUnequip(selectedEquip)} disabled={loading} className="w-full py-3 bg-red-900/50 border border-red-500/50 hover:bg-red-600 text-white font-bold rounded-lg transition-all">{loading ? "..." : "DÉSÉQUIPER"}</button></div>
        </div>
      </div>
    );
  };

  const JewelryListPopup = () => {
    if (!showJewelryList) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setShowJewelryList(false)}>
            <div className="bg-[#1a1a1a] border border-purple-500/30 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="bg-[#111] p-4 flex justify-between items-center border-b border-gray-700"><h3 className="text-lg font-bold text-white">💍 Vos Bijoux</h3><button onClick={() => setShowJewelryList(false)} className="text-gray-500 hover:text-white text-xl">✕</button></div>
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {[{s:'Slot 1', i:eq.bijou1}, {s:'Slot 2', i:eq.bijou2}, {s:'Slot 3', i:eq.bijou3}, {s:'Slot 4', i:eq.bijou4}].map((b, idx) => (
                        <div key={idx} className="bg-[#0a0a0a] border border-gray-700 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2"><span className="text-[10px] uppercase font-bold text-gray-500">{b.s}</span>{b.i && <button onClick={() => handleUnequip(b.i)} className="text-[10px] text-red-400 underline">Déséquiper</button>}</div>
                            {b.i ? (
                                <div>
                                    <p className="text-sm font-bold text-purple-300">{b.i.name}</p>
                                    {b.i.modifiers && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {Object.entries(b.i.modifiers).map(([k, v]) => (
                                                <span key={k} className="text-[9px] bg-purple-900/50 text-purple-200 px-1 rounded">{k} +{v}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : <p className="text-sm text-gray-600">Vide</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="animate-fade-in relative pb-10">
      <div className="flex justify-between items-center mb-8 gap-4">
        <div className="flex flex-col gap-2 w-1/3">
            <StatBlock label="Force" statKey="force" side="left" />
            <StatBlock label="Const" statKey="constitution" side="left" />
        </div>
        <div className="w-1/3 flex justify-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-2xl border-4 border-[#1a1a1a]">
                <span className="text-2xl">👤</span>
            </div>
        </div>
        <div className="flex flex-col gap-2 w-1/3">
            <StatBlock label="Agilité" statKey="agilite" side="right" />
            <StatBlock label="Intel" statKey="intelligence" side="right" />
            <StatBlock label="Perc" statKey="perception" side="right" />
        </div>
      </div>
      
      <div className="space-y-2 mb-8">
        {[{ l: 'HP', v: j.hp, m: j.hpMax, c: 'bg-red-500' }, { l: 'Mana', v: j.mana, m: j.manaMax, c: 'bg-blue-500' }, { l: 'Stam', v: j.stam, m: j.stamMax, c: 'bg-green-500' }].map(r => (
          <div key={r.l} className="bg-[#151515] rounded h-5 relative overflow-hidden border border-gray-800">
            <div className={`absolute left-0 top-0 bottom-0 opacity-20 ${r.c}`} style={{width: `${(r.v/r.m)*100}%`}}></div>
            <div className="flex justify-between items-center relative z-10 px-2 h-full"><span className="text-[9px] font-bold text-gray-400">{r.l}</span><span className="text-[10px] font-mono font-bold text-white">{r.v}/{r.m}</span></div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch">
        <div className="flex-1 flex flex-col gap-2">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b border-gray-800 pb-1 mb-1">Armure</h4>
            <EquipSlot label="Tête" slotKey="tete" icon="🪖" />
            <EquipSlot label="Corps" slotKey="corp" icon="🥋" />
            <EquipSlot label="Jambes" slotKey="pantalon" icon="👖" />
            <EquipSlot label="Pieds" slotKey="pied" icon="👢" />
        </div>

        <div className="flex-1 bg-black/20 rounded-xl border border-gray-800/50 p-4 flex flex-col items-center justify-center relative min-h-[200px]">
            <h4 className="text-[10px] text-indigo-400 uppercase font-bold text-center absolute top-2">Bonus Équipement</h4>
            {hasBonuses ? (
                <div className="space-y-2 w-full mt-4">
                    {Object.entries(totalBonuses).map(([stat, val]) => (
                        <div key={stat} className="flex justify-between items-center border-b border-gray-800 pb-1 last:border-0">
                            <span className="text-xs text-gray-400 capitalize">{stat}</span>
                            <span className="text-sm font-bold text-green-400">+{val}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center opacity-30 mt-4">
                    <span className="text-4xl grayscale mb-2">⚖️</span>
                    <span className="text-xs text-gray-500 italic">Aucun bonus actif</span>
                </div>
            )}
        </div>

        <div className="flex-1 flex flex-col gap-2">
            <h4 className="text-[10px] text-gray-500 uppercase font-bold text-center border-b border-gray-800 pb-1 mb-1">Armes & Acc.</h4>
            <EquipSlot label="Main Droite" slotKey="arme1" icon="⚔️" />
            <EquipSlot label="Main Gauche" slotKey="arme2" icon="🛡️" />
            <EquipSlot label="Dos" slotKey="dos" icon="🎒" />
            <JewelryGroupSlot />
        </div>
      </div>

      <EquipDetailPopup />
      <JewelryListPopup />
    </div>
  );
};

export default Fiche;
