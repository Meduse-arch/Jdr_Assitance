import React, { useState } from 'react';

const Inventaire = ({ playerData, auth, sessionId, onRefresh }) => {
  const [currentView, setCurrentView] = useState('home');
  const [selectedItem, setSelectedItem] = useState(null); // Item sélectionné pour la popup
  const [useLoading, setUseLoading] = useState(false);

  const inventory = playerData?.inventory || [];

  // Filtre les objets selon la vue
  const getItemsForView = () => {
    const typeMap = {
      'list_consommable': 'consommable',
      'list_materiaux': 'materiaux',
      'list_autres': 'autres',
      'list_arme': 'arme',
      'list_armure': 'armure',
      'list_bijoux': 'bijoux'
    };
    const type = typeMap[currentView];
    return inventory.filter(i => i.type === type);
  };

  // Action : Utiliser l'objet
  const handleUseItem = async () => {
    if (!selectedItem) return;
    setUseLoading(true);
    try {
      const res = await fetch("/api/player/inventory/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: auth.user.id, 
          session_id: sessionId, 
          item_id: selectedItem.id 
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        setSelectedItem(null); // Ferme la popup après usage (ou on peut la laisser ouverte si qté > 1)
      } else {
        alert("Erreur: " + data.error);
      }
    } catch (e) { console.error(e); } 
    finally { setUseLoading(false); }
  };

  // Helper: Icône par type
  const getIconForType = (type) => {
    switch(type) {
        case 'consommable': return '🧪';
        case 'arme': return '⚔️';
        case 'armure': return '🦺';
        case 'bijoux': return '💍';
        case 'materiaux': return '🪵';
        default: return '📦';
    }
  };

  // --- RENDU : BOUTONS DE NAVIGATION (CATÉGORIES) ---
  const CategoryBtn = ({ label, icon, onClick, color = "border-gray-700 hover:border-indigo-500", fullWidth = false }) => (
    <button 
      onClick={onClick}
      className={`w-full flex flex-col items-center justify-center p-4 bg-[#1a1a1a] border ${color} rounded-xl shadow-lg transition-all hover:scale-[1.02] hover:bg-[#222] group ${fullWidth ? 'h-24 flex-row gap-4' : 'h-32'}`}
    >
      <span className="text-3xl mb-2 filter drop-shadow group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-bold text-gray-300 uppercase tracking-wider text-xs sm:text-sm">{label}</span>
    </button>
  );

  // --- VUE 1 : ACCUEIL ---
  const renderHome = () => (
    <div className="animate-fade-in flex flex-col h-full w-full">
      <div className="text-center mb-8">
        <span className="text-4xl">🎒</span>
        <h2 className="text-xl font-bold text-white mt-2 uppercase tracking-widest">Inventaire</h2>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full">
        <div className="col-span-1"><CategoryBtn label="Conso." icon="🧪" onClick={() => setCurrentView('list_consommable')} color="border-red-900/50 hover:border-red-500" /></div>
        <div className="col-span-1"><CategoryBtn label="Équipement" icon="🛡️" onClick={() => setCurrentView('equipement_menu')} color="border-blue-900/50 hover:border-blue-500" /></div>
        <div className="col-span-1"><CategoryBtn label="Matériaux" icon="🪵" onClick={() => setCurrentView('list_materiaux')} color="border-yellow-900/50 hover:border-yellow-500" /></div>
        <div className="col-span-3 mt-2"><CategoryBtn label="Autres" icon="📦" onClick={() => setCurrentView('list_autres')} fullWidth={true} /></div>
      </div>
    </div>
  );

  // --- VUE 2 : MENU ÉQUIPEMENT ---
  const renderEquipementMenu = () => (
    <div className="animate-fade-in flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-2">
        <button onClick={() => setCurrentView('home')} className="text-gray-400 hover:text-white px-2 font-bold text-xl">←</button>
        <h2 className="text-lg font-bold text-blue-400 uppercase tracking-widest">Équipement</h2>
        <div className="w-8"></div>
      </div>
      <div className="grid grid-cols-3 gap-4 mt-4 w-full">
        <CategoryBtn label="Arme" icon="⚔️" onClick={() => setCurrentView('list_arme')} color="border-orange-900/50 hover:border-orange-500" />
        <CategoryBtn label="Armure" icon="🦺" onClick={() => setCurrentView('list_armure')} color="border-slate-700 hover:border-slate-400" />
        <CategoryBtn label="Bijoux" icon="💍" onClick={() => setCurrentView('list_bijoux')} color="border-purple-900/50 hover:border-purple-500" />
      </div>
    </div>
  );

  // --- VUE 3 : GRILLE D'OBJETS ---
  const renderList = () => {
    const items = getItemsForView();
    const title = currentView.replace('list_', '').toUpperCase();
    const backAction = ['list_arme', 'list_armure', 'list_bijoux'].includes(currentView) 
      ? () => setCurrentView('equipement_menu') 
      : () => setCurrentView('home');

    return (
      <div className="animate-fade-in flex flex-col h-full w-full">
        <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
          <button onClick={backAction} className="text-gray-400 hover:text-white px-2 font-bold text-xl">←</button>
          <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">{title}</h2>
          <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-50 mt-10">
                <span className="text-4xl mb-2 grayscale">🕸️</span>
                <p className="text-gray-500 italic text-sm">Vide...</p>
            </div>
          ) : (
            // GRILLE D'ITEMS
            <div className="grid grid-cols-3 gap-3">
                {items.map(item => (
                    <button 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        className="bg-[#151515] border border-gray-800 rounded-lg p-3 flex flex-col items-center justify-between h-24 hover:bg-[#222] hover:border-indigo-500/50 transition-all group relative"
                    >
                        <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{getIconForType(item.type)}</span>
                        <span className="text-[10px] text-gray-300 font-bold text-center leading-tight line-clamp-2">{item.name}</span>
                        {item.count > 1 && (
                            <span className="absolute top-1 right-1 bg-gray-800 text-gray-400 text-[9px] px-1.5 rounded-full font-mono">x{item.count}</span>
                        )}
                    </button>
                ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- POPUP DÉTAILS OBJET ---
  const ItemDetailPopup = () => {
    if (!selectedItem) return null;
    const hasModifiers = selectedItem.modifiers && Object.keys(selectedItem.modifiers).length > 0;
    
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedItem(null)}>
            <div className="bg-[#1a1a1a] border border-gray-600 w-full max-w-sm rounded-xl overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
                
                {/* Header Popup */}
                <div className="bg-[#111] p-4 flex gap-4 items-center border-b border-gray-700">
                    <div className="bg-[#222] p-3 rounded-lg text-3xl border border-gray-700">
                        {getIconForType(selectedItem.type)}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white leading-tight">{selectedItem.name}</h3>
                        <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">{selectedItem.type}</span>
                    </div>
                    <button onClick={() => setSelectedItem(null)} className="text-gray-500 hover:text-white text-xl">✕</button>
                </div>

                {/* Contenu */}
                <div className="p-5 space-y-4">
                    {/* Description */}
                    {selectedItem.description ? (
                        <p className="text-sm text-gray-400 italic bg-black/30 p-3 rounded border border-gray-800">
                            "{selectedItem.description}"
                        </p>
                    ) : (
                        <p className="text-xs text-gray-600 italic">Aucune description.</p>
                    )}

                    {/* Modificateurs */}
                    {hasModifiers && (
                        <div>
                            <label className="text-[10px] uppercase font-bold text-indigo-400 mb-1 block">Effets</label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(selectedItem.modifiers).map(([key, val]) => (
                                    <div key={key} className="bg-[#111] border border-gray-700 px-2 py-1 rounded flex justify-between items-center">
                                        <span className="text-xs text-gray-400 capitalize">{key}</span>
                                        <span className={`text-xs font-bold font-mono ${val > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {val > 0 ? '+' : ''}{val}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Quantité */}
                    <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-800 pt-2">
                        <span>Quantité en sac</span>
                        <span className="font-bold text-white font-mono">x{selectedItem.count}</span>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-[#111] border-t border-gray-700">
                    <button 
                        onClick={handleUseItem}
                        disabled={useLoading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {useLoading ? '...' : 'UTILISER'}
                    </button>
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
        
        {/* Popup rendue au niveau racine du composant */}
        <ItemDetailPopup />
    </>
  );
};

export default Inventaire;