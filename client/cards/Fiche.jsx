import React from 'react';

const Fiche = ({ playerData }) => {
  const j = playerData.joueur;
  
  return (
    <div className="animate-fade-in">
      {/* Grille des Attributs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6">
        {[
          { l: 'Force', v: j.force }, { l: 'Const', v: j.constitution }, 
          { l: 'Agilité', v: j.agilite }, { l: 'Intel', v: j.intelligence }, 
          { l: 'Perc', v: j.perception }
        ].map(s => (
          <div key={s.l} className="bg-[#151515] border border-gray-700 p-2 rounded-lg text-center shadow-sm">
            <span className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1">{s.l}</span>
            <span className="text-xl font-bold text-indigo-400">{s.v}</span>
          </div>
        ))}
      </div>
      
      {/* Barres de ressources */}
      <div className="space-y-3 border-t border-gray-700/50 pt-4">
        {[
          { l: 'HP', v: j.hp, m: j.hpMax, c: 'text-red-400', b: 'bg-red-500' },
          { l: 'Mana', v: j.mana, m: j.manaMax, c: 'text-blue-400', b: 'bg-blue-500' },
          { l: 'Stam', v: j.stam, m: j.stamMax, c: 'text-green-400', b: 'bg-green-500' }
        ].map(r => (
          <div key={r.l} className="bg-[#151515] rounded-lg p-3 relative overflow-hidden border border-gray-800">
            {/* Barre de progression */}
            <div className={`absolute left-0 top-0 bottom-0 opacity-10 ${r.b}`} style={{width: `${(r.v/r.m)*100}%`, transition: 'width 0.5s'}}></div>
            
            <div className="flex justify-between items-center relative z-10">
              <span className="text-gray-400 font-medium text-sm">{r.l}</span>
              <span className={`font-bold font-mono ${r.c}`}>{r.v} <span className="text-gray-600 text-xs">/ {r.m}</span></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Fiche;