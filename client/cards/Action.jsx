import React, { useState } from 'react';
import RollModal from './modals/RollModal';
import PersonnageModal from './modals/PersonnageModal';
import MoneyModal from './modals/MoneyModal';
import ManageItemModal from './modals/ManageItemModal'; // <--- NOUVEAU IMPORT

const Action = ({ sessionName, icon, playerData, auth, sessionId, onRefresh }) => {
  const j = playerData.joueur;
  const wallet = playerData.money.wallet;

  const [isRollOpen, setIsRollOpen] = useState(false);
  const [isPersonnageOpen, setIsPersonnageOpen] = useState(false);
  const [isMoneyOpen, setIsMoneyOpen] = useState(false);
  const [isManageItemOpen, setIsManageItemOpen] = useState(false); // <--- ETAT RENOMMÉ

  return (
    <>
      <div className="flex flex-col items-center justify-center py-10 animate-fade-in relative w-full">
        {/* ... (HUD Argent et Stats inchangés) ... */}
        
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
        
        {/* BOUTONS ACTIONS */}
        <div className="flex flex-col gap-4 mt-8 w-full max-w-xs">
          <button onClick={() => setIsRollOpen(true)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2"><span>🎲</span> Lancer un Dé</button>
          
          <div className="grid grid-cols-2 gap-4">
             <button onClick={() => setIsPersonnageOpen(true)} className="px-4 py-3 bg-emerald-900/50 border border-emerald-500/50 hover:bg-emerald-800 text-emerald-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"><span>👤</span> Personnage</button>
             <button onClick={() => setIsMoneyOpen(true)} className="px-4 py-3 bg-yellow-900/40 border border-yellow-500/40 hover:bg-yellow-800/60 text-yellow-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"><span>💰</span> Argent</button>
          </div>

          {/* BOUTON RENOMMÉ */}
          <button onClick={() => setIsManageItemOpen(true)} className="px-6 py-3 bg-slate-700/50 hover:bg-slate-600 border border-slate-600 text-gray-200 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 mt-2">
            <span>📦</span> Gestion Objets
          </button>
        </div>
      </div>

      <RollModal isOpen={isRollOpen} onClose={() => setIsRollOpen(false)} auth={auth} sessionId={sessionId} onRefresh={onRefresh} playerData={playerData} />
      <PersonnageModal isOpen={isPersonnageOpen} onClose={() => setIsPersonnageOpen(false)} auth={auth} sessionId={sessionId} onRefresh={onRefresh} />
      <MoneyModal isOpen={isMoneyOpen} onClose={() => setIsMoneyOpen(false)} auth={auth} sessionId={sessionId} onRefresh={onRefresh} playerData={playerData} />

      {/* NOUVELLE MODALE */}
      <ManageItemModal 
        isOpen={isManageItemOpen} 
        onClose={() => setIsManageItemOpen(false)} 
        auth={auth} 
        sessionId={sessionId} 
        onRefresh={onRefresh} 
        inventory={playerData?.inventory || []} // On passe l'inventaire pour le select
      />

    </>
  );
};

export default Action;