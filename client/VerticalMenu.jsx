import React, { useEffect, useRef } from 'react';

const VerticalMenu = ({ items, activeIndex, onNavigate, onSelect }) => {
  const containerRef = useRef(null);

  // Gestion du scroll souris (Molette)
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        onNavigate((prev) => (prev + 1) % items.length);
      } else {
        onNavigate((prev) => (prev - 1 + items.length) % items.length);
      }
    };

    const el = containerRef.current;
    if (el) el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el?.removeEventListener('wheel', handleWheel);
  }, [items.length, onNavigate]);

  return (
    <div 
      ref={containerRef}
      className="relative h-[300px] w-full flex items-center justify-center overflow-hidden cursor-ns-resize"
    >
      {/* Zone centrale de sélection (visuel) */}
      <div className="absolute w-full h-[80px] bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-0" />

      {items.map((item, index) => {
        let offset = index - activeIndex;
        // Boucle infini visuelle
        if (offset < -2) offset += items.length;
        if (offset > 2) offset -= items.length;

        // On cache ceux qui sont trop loin
        if (Math.abs(offset) > 2) return null;

        const isActive = offset === 0;
        
        const style = {
          transform: `translateY(${offset * 100}%) scale(${1 - Math.abs(offset) * 0.15}) perspective(500px) rotateX(${offset * -10}deg)`,
          opacity: 1 - Math.abs(offset) * 0.4,
          zIndex: 10 - Math.abs(offset),
        };

        return (
          <div
            key={item.id}
            onClick={() => isActive ? onSelect(item) : onNavigate(index)}
            className={`absolute transition-all duration-300 ease-out flex items-center gap-4 p-4 rounded-xl border w-[240px] shadow-xl backdrop-blur-sm cursor-pointer
              ${isActive 
                ? 'bg-[#222] border-indigo-500 text-white scale-105 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                : 'bg-[#151515] border-gray-800 text-gray-500'
              }`}
            style={{ top: '35%', ...style }} 
          >
            <span className="text-3xl">{item.icon}</span>
            <div className="flex flex-col text-left">
              <span className={`font-bold uppercase tracking-wider text-sm ${isActive ? 'text-white' : 'text-gray-500'}`}>
                {item.label}
              </span>
              {/* Texte supprimé ici pour un design plus épuré */}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VerticalMenu;