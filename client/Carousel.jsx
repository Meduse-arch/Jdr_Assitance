import React from 'react';

const Carousel = ({ items, activeIndex, onNavigate }) => {
  
  const getPrevIndex = (current, total) => (current - 1 + total) % total;
  const getNextIndex = (current, total) => (current + 1) % total;

  return (
    // Conteneur 3D
    <div className="flex items-center justify-center gap-4 my-8 h-[220px] perspective-[1000px]">
      
      {/* Flèche Gauche */}
      <button 
        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/10 hover:border-indigo-500 transition-all z-50 text-xl pb-1"
        onClick={() => onNavigate(getPrevIndex(activeIndex, items.length))}
      >
        &#8592;
      </button>

      {/* Zone des cartes */}
      <div className="relative flex justify-center items-center w-[300px] h-full">
        {items.map((item, index) => {
          let baseClasses = "absolute w-[160px] h-[200px] rounded-xl flex flex-col justify-center items-center transition-all duration-500 ease-out cursor-pointer shadow-2xl border-2";
          let stateClasses = "";

          if (index === activeIndex) {
            // ACTIVE (Centre)
            stateClasses = "z-20 scale-110 bg-[#2a2a2a] border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.3)] opacity-100 translate-x-0";
          } else if (index === getPrevIndex(activeIndex, items.length)) {
            // GAUCHE
            stateClasses = "z-10 scale-90 bg-[#1e1e1e] border-gray-700 opacity-50 blur-[1px] -translate-x-[120%] [transform:rotateY(25deg)]";
          } else if (index === getNextIndex(activeIndex, items.length)) {
            // DROITE
            stateClasses = "z-10 scale-90 bg-[#1e1e1e] border-gray-700 opacity-50 blur-[1px] translate-x-[120%] [transform:rotateY(-25deg)]";
          } else {
            return null; // Caché
          }

          return (
            <div 
              key={item.id} 
              className={`${baseClasses} ${stateClasses}`}
              onClick={() => onNavigate(index)}
            >
              <span className="text-5xl mb-3">{item.icon}</span>
              <h3 className="text-lg font-bold text-gray-100">{item.label}</h3>
            </div>
          );
        })}
      </div>

      {/* Flèche Droite */}
      <button 
        className="w-10 h-10 flex items-center justify-center rounded-full bg-black/50 border border-white/20 text-white hover:bg-white/10 hover:border-indigo-500 transition-all z-50 text-xl pb-1"
        onClick={() => onNavigate(getNextIndex(activeIndex, items.length))}
      >
        &#8594;
      </button>
    </div>
  );
};

export default Carousel;