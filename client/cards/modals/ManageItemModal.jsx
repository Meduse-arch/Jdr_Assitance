import React, { useState } from 'react';
import CreateItemModal from './CreateItemModal';

const ManageItemModal = ({ isOpen, onClose, auth, sessionId, onRefresh, inventory }) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleDelete = async (itemId) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/inventory/remove", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, item_id: itemId }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
        setDeleteConfirmId(null);
      } else {
        alert("Erreur suppression: " + data.error);
      }
    } catch (e) { alert("Erreur serveur"); }
    finally { setIsLoading(false); }
  };

  const handleAdjust = async (itemId, amount) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/player/inventory/adjust", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId, item_id: itemId, amount }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert("Erreur ajustement: " + data.error);
      }
    } catch (e) { alert("Erreur serveur"); }
    finally { setIsLoading(false); }
  };

  const getIcon = (type) => {
      switch(type) { case 'consommable': return '🧪'; case 'arme': return '⚔️'; case 'armure': return '🦺'; case 'bijoux': return '💍'; case 'materiaux': return '🪵'; default: return '📦'; }
  };

  const filteredInventory = (inventory || []).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#222] border border-gray-600 w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          
          {/* Header */}
          <div className="p-4 bg-[#1a1a1a] border-b border-gray-700 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📦</span>
                <h3 className="text-white font-bold">Inventaire</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsCreateOpen(true)}
                  className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white text-xs font-bold rounded flex items-center gap-1 shadow-lg transition-all"
                >
                  <span>+</span> Créer
                </button>
                <button onClick={onClose} className="text-gray-500 hover:text-white font-bold text-xl px-2">✕</button>
              </div>
          </div>

          {/* Barre de recherche */}
          <div className="p-3 border-b border-gray-800 bg-[#151515]">
              <input 
                  type="text" 
                  placeholder="Rechercher un objet..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded p-2 text-white text-sm focus:border-indigo-500 outline-none"
              />
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
              {filteredInventory.length === 0 ? (
                  <div className="text-center text-gray-500 italic py-10">Inventaire vide.</div>
              ) : (
                  filteredInventory.map(item => (
                      <div key={item.id} className="bg-[#1a1a1a] border border-gray-700 rounded p-2 flex items-center gap-3 group hover:border-indigo-500/30 transition-colors">
                          <span className="text-2xl pl-1">{getIcon(item.type)}</span>
                          
                          <div className="flex-1 min-w-0 flex flex-col">
                              <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-200 truncate text-sm">{item.name}</span>
                                  {item.isEquipped && <span className="text-[8px] bg-blue-900/50 text-blue-200 px-1 rounded uppercase font-bold border border-blue-500/30">Équipé</span>}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                  <span className="text-[9px] text-gray-500 uppercase mr-1">{item.type}</span>
                                  
                                  {/* Affichage des Bonus (MODIFIÉ) */}
                                  {item.modifiers && Object.entries(item.modifiers).map(([key, val]) => (
                                      <span key={key} className="text-[8px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700">
                                          {key === 'modEffect' ? 'SORT' : key.substring(0, 3).toUpperCase()} {val > 0 ? '+' : ''}{val}
                                      </span>
                                  ))}
                              </div>
                          </div>

                          {/* Contrôles de Stock */}
                          <div className="flex items-center bg-black rounded border border-gray-800 flex-none">
                             <button 
                               onClick={() => handleAdjust(item.id, -1)} 
                               disabled={isLoading}
                               className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-l"
                             >-</button>
                             <span className="w-8 text-center text-xs font-mono font-bold text-white">{item.count}</span>
                             <button 
                               onClick={() => handleAdjust(item.id, 1)} 
                               disabled={isLoading}
                               className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 rounded-r"
                             >+</button>
                          </div>
                          
                          {/* Bouton Supprimer */}
                          {deleteConfirmId === item.id ? (
                              <div className="flex flex-col gap-1 ml-1 flex-none">
                                  <button onClick={() => handleDelete(item.id)} disabled={isLoading} className="bg-red-600 hover:bg-red-500 text-white text-[9px] px-2 py-1 rounded font-bold">OUI</button>
                                  <button onClick={() => setDeleteConfirmId(null)} className="bg-gray-700 hover:bg-gray-600 text-white text-[9px] px-2 py-1 rounded">NON</button>
                              </div>
                          ) : (
                              <button onClick={() => setDeleteConfirmId(item.id)} className="text-gray-600 hover:text-red-500 transition-colors p-2 flex-none" title="Supprimer">
                                  🗑️
                              </button>
                          )}
                      </div>
                  ))
              )}
          </div>
        </div>
      </div>

      {/* Modal de création par-dessus */}
      <CreateItemModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        auth={auth} 
        sessionId={sessionId} 
        onRefresh={onRefresh} 
      />
    </>
  );
};

export default ManageItemModal;