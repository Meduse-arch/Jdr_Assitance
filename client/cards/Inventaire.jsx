import React, { useState } from 'react';

const Inventaire = ({ playerData, auth, sessionId, onRefresh }) => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null); 
  const [useLoading, setUseLoading] = useState(false);

  // TRI : Objets équipés en premier
  const inventory = (playerData?.inventory || []).sort((a, b) => (b.isEquipped ? 1 : 0) - (a.isEquipped ? 1 : 0));

  const getItemsForView = () => {
    const typeMap = { 'list_consommable': 'consommable', 'list_materiaux': 'materiaux', 'list_autres': 'autres', 'list_arme': 'arme', 'list_armure': 'armure', 'list_bijoux': 'bijoux' };
    const type = typeMap[currentView];
    return inventory.filter(i => i.type === type);
  };

  const handleItemAction = async (action = 'use', targetSlot = null) => {
    if (!selectedItem) return;
    setUseLoading(true);
    
    let endpoint = "/api/player/inventory/use";
    if (action === 'equip') endpoint = "/api/player/inventory/equip";
    if (action === 'unequip') endpoint = "/api/player/inventory/unequip";

    try {
      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, item_id: selectedItem.id, target_slot: targetSlot }),
      });
      if ((await res.json()).success) {
        onRefresh(); setSelectedItem(null);
      } else { alert("Erreur"); }
    } catch (e) { console.error(e); } 
    finally { setUseLoading(false); }
  };

  const getIconForType = (type) => {
    switch(type) { case 'consommable': return '🧪'; case 'arme': return '⚔️'; case 'armure': return '🦺'; case 'bijoux': return '💍'; case 'materiaux': return '🪵'; default: return '📦'; }
  };

  // --- UI ---
  const CategoryBtn = ({ label, icon, onClick, color = "border-gray-700", fullWidth = false }) => (
    <button onClick={onClick} className={`w-full flex flex-col items-center justify-center p-4 bg-[#1a1a1a] border ${color} rounded-xl shadow-lg transition-all hover:bg-[#222] group ${fullWidth ? 'h-24 flex-row gap-4' : 'h-32'}`}>
      <span className="text-3xl mb-2 filter drop-shadow group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-bold text-gray-300 uppercase tracking-wider text-xs sm:text-sm">{label}</span>
    </button>
  );

  const renderHome = () => (
    <div className="animate-fade-in flex flex-col h-full w-full">
      <div className="text-center mb-8"><span className="text-4xl">🎒</span><h2 className="text-xl font-bold text-white mt-2 uppercase tracking-widest">Inventaire</h2></div>
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="col-span-1"><CategoryBtn label="Conso." icon="🧪" onClick={() => setCurrentView('list_consommable')} color="border-red-900/50" /></div>
        <div className="col-span-1"><CategoryBtn label="Équipement" icon="🛡️" onClick={() => setCurrentView('equipement_menu')} color="border-blue-900/50" /></div>
        <div className="col-span-1"><CategoryBtn label="Matériaux" icon="🪵" onClick={() => setCurrentView('list_materiaux')} color="border-yellow-900/50" /></div>
        <div className="col-span-3 mt-2"><CategoryBtn label="Autres" icon="📦" onClick={() => setCurrentView('list_autres')} fullWidth={true} /></div>
      </div>
    </div>
  );

  const renderEquipementMenu = () => (
    <div className="animate-fade-in flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-2"><button onClick={() => setCurrentView('home')} className="text-gray-400 hover:text-white px-2 font-bold text-xl">←</button><h2 className="text-lg font-bold text-blue-400 uppercase tracking-widest">Équipement</h2><div className="w-8"></div></div>
      <div className="grid grid-cols-3 gap-4 mt-4 w-full">
        <CategoryBtn label="Arme" icon="⚔️" onClick={() => setCurrentView('list_arme')} color="border-orange-900/50" />
        <CategoryBtn label="Armure" icon="🦺" onClick={() => setCurrentView('list_armure')} color="border-slate-700" />
        <CategoryBtn label="Bijoux" icon="💍" onClick={() => setCurrentView('list_bijoux')} color="border-purple-900/50" />
      </div>
    </div>
  );

  const renderList = () => {
    const items = getItemsForView();
    const title = currentView.replace('list_', '').toUpperCase();
    const backAction = ['list_arme', 'list_armure', 'list_bijoux'].includes(currentView) ? () => setCurrentView('equipement_menu') : () => setCurrentView('home');

    return (
      <div className="animate-fade-in flex flex-col h-full w-full">
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2"><button onClick={backAction} className="text-gray-400 hover:text-white px-2 font-bold text-xl">←</button><h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{title}</h2><div className="w-8"></div></div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-10"><span className="text-4xl mb-2 grayscale">🕸️</span><p className="text-gray-500 italic text-sm">Vide...</p></div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
                {items.map(item => (
                    <button key={item.id} onClick={() => setSelectedItem(item)} className={`bg-[#151515] border ${item.isEquipped ? 'border-blue-500/50 bg-blue-900/10' : 'border-gray-800'} rounded-lg p-3 flex flex-col items-center justify-between h-24 hover:bg-[#222] transition-all group relative`}>
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{getIconForType(item.type)}</span>
                        <span className="text-[10px] text-gray-300 font-bold text-center leading-tight line-clamp-2">{item.name}</span>
                        {item.count > 1 && <span className="absolute top-1 right-1 bg-gray-800 text-gray-400 text-[9px] px-1.5 rounded-full font-mono">x{item.count}</span>}
                        {item.isEquipped && <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] px-1 rounded font-bold uppercase">E</span>}
                    </button>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- POPUP ---
  const ItemDetailPopup = () => {
    if (!selectedItem) return null;
    const isEquipable = ['arme', 'armure', 'bijoux', 'autres'].includes(selectedItem.type);
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
            <div className="bg-[#1a1a1a] border border-gray-600 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                <div className="bg-[#111] p-4 flex gap-4 items-center border-b border-gray-700">
                    <div className="bg-[#222] p-3 rounded-lg text-3xl border border-gray-700">{getIconForType(selectedItem.type)}</div>
                    <div className="flex-1"><h3 className="text-lg font-bold text-white leading-tight">{selectedItem.name}</h3><span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{selectedItem.type}</span></div>
                    <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>
                <div className="p-5 space-y-4">
                    {selectedItem.description && <p className="text-sm text-gray-400 italic bg-black/30 p-3 rounded border border-gray-800">"{selectedItem.description}"</p>}
                    {selectedItem.modifiers && Object.keys(selectedItem.modifiers).length > 0 && (
                        <div className="grid grid-cols-2 gap-2">{Object.entries(selectedItem.modifiers).map(([key, val]) => (
                          <div key={key} className="bg-[#111] border border-gray-700 px-2 py-1 rounded flex justify-between">
                            <span className="text-xs text-gray-400 capitalize">{key === 'modEffect' ? 'Sort' : key}</span>
                            <span className="text-xs font-bold text-green-400">+{val}</span>
                          </div>
                        ))}</div>
                    )}
                </div>
                <div className="p-4 bg-[#111] border-t border-gray-700">
                    {isEquipable ? (
                        selectedItem.isEquipped ? (
                            <button onClick={() => handleItemAction('unequip')} disabled={useLoading} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg">DÉSÉQUIPER</button>
                        ) : (
                            selectedItem.type === 'arme' ? (
                                <div className="flex gap-2">
                                    <button onClick={() => handleItemAction('equip', 'arme1')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs">MAIN DROITE</button>
                                    <button onClick={() => handleItemAction('equip', 'arme2')} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs">MAIN GAUCHE</button>
                                </div>
                            ) : selectedItem.type === 'bijoux' ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleItemAction('equip', 'bijou1')} disabled={useLoading} className="py-3 bg-purple-900/50 border border-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs">SLOT 1</button>
                                    <button onClick={() => handleItemAction('equip', 'bijou2')} disabled={useLoading} className="py-3 bg-purple-900/50 border border-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs">SLOT 2</button>
                                    <button onClick={() => handleItemAction('equip', 'bijou3')} disabled={useLoading} className="py-3 bg-purple-900/50 border border-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs">SLOT 3</button>
                                    <button onClick={() => handleItemAction('equip', 'bijou4')} disabled={useLoading} className="py-3 bg-purple-900/50 border border-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg text-xs">SLOT 4</button>
                                </div>
                            ) : selectedItem.type === 'autres' ? (
                                // NOUVEAU : Grille de 10 slots pour "Autres"
                                <div className="grid grid-cols-5 gap-2">
                                    {[...Array(10)].map((_, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleItemAction('equip', `autre${i+1}`)} 
                                            disabled={useLoading} 
                                            className="py-2 bg-yellow-900/30 border border-yellow-500/50 hover:bg-yellow-600/50 text-yellow-100 font-bold rounded text-[10px] uppercase"
                                        >
                                            #{i+1}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <button onClick={() => handleItemAction('equip')} disabled={useLoading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg">ÉQUIPER</button>
                            )
                        )
                    ) : (
                        <button onClick={() => handleItemAction('use')} disabled={useLoading} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg">UTILISER</button>
                    )}
                </div>
            </div>
        </div>
    );
  };

  return (
    <>
        {currentView === 'home' && renderHome()}
        {currentView === 'equipement_menu' && renderEquipementMenu()}
        {['list_consommable', 'list_materiaux', 'list_autres', 'list_arme', 'list_armure', 'list_bijoux'].includes(currentView) && renderList()}
        <ItemDetailPopup />
    </>
  );
};

export default Inventaire;