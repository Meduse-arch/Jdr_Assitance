import React from 'react';

const Carousel = ({ items, activeIndex, onNavigate, onOpen }) => {
  
  const getPrevIndex = (current, total) => (current - 1 + total) % total;
  const getNextIndex = (current, total) => (current + 1) % total;

  return (
    <div className="flex items-center justify-center gap-4 my-8 h-[220px] perspective-[1000px]">
      
      {/* Flèche Gauche */}
      <button 
        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/10 hover:border-indigo-500 transition-all z-50 text-xl pb-1"
        onClick={(e) => { e.stopPropagation(); onNavigate(getPrevIndex(activeIndex, items.length)); }}
      >
        &#8592;
      </button>

      {/* Zone des cartes */}
      <div className="relative flex justify-center items-center w-[300px] h-full">
        {items.map((item, index) => {
          let baseClasses = "absolute w-[160px] h-[200px] rounded-xl flex flex-col justify-center items-center transition-all duration-500 ease-out shadow-2xl border-2";
          let stateClasses = "";
          let isActive = index === activeIndex;

          if (isActive) {
            // ACTIVE (Centre) - Curseur pointeur pour dire "clique-moi"
            stateClasses = "z-20 scale-110 bg-[#2a2a2a] border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] opacity-100 translate-x-0 cursor-pointer hover:scale-115";
          } else if (index === getPrevIndex(activeIndex, items.length)) {
            // GAUCHE
            stateClasses = "z-10 scale-90 bg-[#1e1e1e] border-gray-700 opacity-50 blur-[1px] -translate-x-[120%] [transform:rotateY(25deg)] cursor-pointer";
          } else if (index === getNextIndex(activeIndex, items.length)) {
            // DROITE
            stateClasses = "z-10 scale-90 bg-[#1e1e1e] border-gray-700 opacity-50 blur-[1px] translate-x-[120%] [transform:rotateY(-25deg)] cursor-pointer";
          } else {
            return null; 
          }

          return (
            <div 
              key={item.id} 
              className={`${baseClasses} ${stateClasses}`}
              onClick={() => {
                if (isActive) {
                  onOpen(item); // Ouvre la page si c'est la carte du centre
                } else {
                  onNavigate(index); // Tourne si c'est une carte de côté
                }
              }}
            >
              <span className="text-5xl mb-3">{item.icon}</span>
              <h3 className="text-lg font-bold text-gray-100">{item.label}</h3>
              {isActive && <span className="mt-2 text-xs text-indigo-400 uppercase tracking-wider font-bold animate-pulse">Ouvrir</span>}
            </div>
          );
        })}
      </div>

      {/* Flèche Droite */}
      <button 
        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/10 hover:border-indigo-500 transition-all z-50 text-xl pb-1"
        onClick={(e) => { e.stopPropagation(); onNavigate(getNextIndex(activeIndex, items.length)); }}
      >
        &#8594;
      </button>
    </div>
  );
};

export default Carousel;