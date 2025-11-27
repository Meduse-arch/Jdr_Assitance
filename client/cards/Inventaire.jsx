import React from 'react';

const Inventaire = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] animate-fade-in text-gray-500">
      <span className="text-6xl mb-4 opacity-20">🎒</span>
      <h3 className="text-xl font-bold mb-2">Sac à dos</h3>
      <p className="text-sm italic">Emplacements d'objets vides...</p>
      <p className="text-xs mt-4 opacity-50">(Système d'items à venir)</p>
    </div>
  );
};

export default Inventaire;