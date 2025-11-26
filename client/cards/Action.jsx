import React from 'react';

const Action = ({ sessionName, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-fade-in">
      <span className="text-6xl mb-4 block filter drop-shadow-lg">{icon || '🎲'}</span>
      <h2 className="text-2xl font-bold text-white mb-2">Zone d'Actions</h2>
      <p className="text-gray-400">Session : <span className="text-indigo-400 font-mono">{sessionName}</span></p>
      
      <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-200 text-sm">
        <p>Utilise les commandes slash du bot :</p>
        <p className="font-mono mt-1 bg-black/30 p-1 rounded">/roll</p>
      </div>
    </div>
  );
};

export default Action;