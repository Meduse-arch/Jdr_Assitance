import React, { useState, useEffect } from 'react';
import Carousel from './Carousel';
import AdminConsole from './cards/admin/AdminConsole';
import AdminSession from './cards/admin/AdminSession';

const Admin = ({ accessToken, guildId, sessionList, onRefresh, onQuit }) => {
  const [logs, setLogs] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  // --- POLLING DES LOGS ---
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/admin/logs");
        const data = await res.json();
        setLogs(data);
      } catch (e) { console.error("Logs error", e); }
    };

    fetchLogs(); // Appel immédiat
    const interval = setInterval(fetchLogs, 2000); // Rafraîchissement toutes les 2s
    return () => clearInterval(interval);
  }, []);

  // --- MENU ADMIN ---
  const menuItems = [
    { id: 'session', label: 'Session', icon: '🌍' }
    // On pourra ajouter d'autres cartes admin ici (ex: 'joueurs', 'backup')
  ];

  // --- RENDU DES CARTES ---
  const renderAdminCard = () => {
    switch (activeCategory) {
      case 'session':
        return (
          <AdminSession 
            accessToken={accessToken}
            guildId={guildId}
            sessionList={sessionList}
            onRefresh={onRefresh}
            onBack={() => setActiveCategory(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen p-4 gap-4 animate-fade-in bg-[#0a0a0a] w-full max-w-6xl mx-auto">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-2 flex-none">
        <h1 className="text-xl font-bold text-orange-500 flex items-center gap-2"><span>👑</span> Panneau Admin</h1>
        <button 
          onClick={onQuit} 
          className="px-3 py-1 bg-[#222] border border-gray-700 rounded text-sm text-gray-400 hover:text-white transition-colors"
        >
          Quitter le mode Admin
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        
        {/* COLONNE GAUCHE : CONSOLE */}
        <AdminConsole logs={logs} />

        {/* COLONNE DROITE : GESTION */}
        <div className="md:w-1/3 min-w-[320px] flex flex-col bg-[#111] border border-gray-800 rounded-xl p-4 h-full">
          <h2 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider text-center">
            {activeCategory ? 'Gestion Session' : 'Menu Gestion'}
          </h2>
          
          {/* Si aucune catégorie ouverte, afficher le carrousel */}
          {!activeCategory ? (
            <div className="flex-1 flex flex-col justify-center">
              <Carousel 
                items={menuItems} 
                activeIndex={0} 
                onNavigate={() => {}} 
                onOpen={(item) => setActiveCategory(item.id)} 
              />
            </div>
          ) : (
            // Affichage de la carte sélectionnée
            renderAdminCard()
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;