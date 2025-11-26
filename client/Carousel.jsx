// client/Carousel.jsx
import React from 'react';
import './Carousel.css';

const Carousel = ({ items, activeIndex, onNavigate }) => {
  
  // Fonction pour calculer l'index précédent (boucle infinie)
  const getPrevIndex = (current, total) => (current - 1 + total) % total;
  // Fonction pour calculer l'index suivant
  const getNextIndex = (current, total) => (current + 1) % total;

  return (
    <div className="carousel-container">
      {/* Flèche Gauche */}
      <button 
        className="nav-arrow" 
        onClick={() => onNavigate(getPrevIndex(activeIndex, items.length))}
      >
        &#8592;
      </button>

      <div className="cards-wrapper">
        {items.map((item, index) => {
          // Déterminer la classe (active, prev, next)
          let className = "menu-card";
          
          if (index === activeIndex) {
            className += " active";
          } else if (index === getPrevIndex(activeIndex, items.length)) {
            className += " prev";
          } else if (index === getNextIndex(activeIndex, items.length)) {
            className += " next";
          } else {
            // Si on ajoute plus de 3 cartes plus tard, les autres seront cachées
            return null; 
          }

          return (
            <div 
              key={item.id} 
              className={className}
              onClick={() => onNavigate(index)} // Cliquer sur une carte l'active aussi
            >
              <span className="icon">{item.icon}</span>
              <h3>{item.label}</h3>
            </div>
          );
        })}
      </div>

      {/* Flèche Droite */}
      <button 
        className="nav-arrow" 
        onClick={() => onNavigate(getNextIndex(activeIndex, items.length))}
      >
        &#8594;
      </button>
    </div>
  );
};

export default Carousel;