import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Carousel from './Carousel';
import Hub from './Hub';
import Start from './Start';

// Import des cartes depuis le dossier "cards"
import Fiche from './cards/Fiche';
import Argent from './cards/Argent';
import Action from './cards/Action';

import "./style.css";

const discordSdk = new DiscordSDK(process.env.CLIENT_ID);

function App() {
  const [auth, setAuth] = useState(null);
  const [status, setStatus] = useState("Démarrage...");
  
  // Données
  const [sessionList, setSessionList] = useState([]);
  const [playerData, setPlayerData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Navigation
  const [currentSession, setCurrentSession] = useState(null);
  const [activeIndex, setActiveIndex] = useState(1);
  const [openedCategory, setOpenedCategory] = useState(null);

  const menuItems = [
    { id: 'outils', label: 'Action', icon: '🎲' },
    { id: 'fiche', label: 'Statut', icon: '📜' },
    { id: 'argent', label: 'Argent', icon: '💰' }
  ];

  useEffect(() => {
    async function setupDiscord() {
      try {
        setStatus("Connexion Discord...");
        await discordSdk.ready();
        const { code } = await discordSdk.commands.authorize({
          client_id: process.env.CLIENT_ID,
          response_type: "code", state: "", prompt: "none", 
          scope: ["identify", "guilds", "guilds.members.read"],
        });
        const response = await fetch("/api/token", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();
        const authData = await discordSdk.commands.authenticate({ access_token });
        setAuth(authData);
        setStatus("Connecté");
        
        fetchSessions();
        checkAdminStatus(access_token);
      } catch (error) {
        console.error(error);
        setStatus("Erreur (Relance l'activité)");
      }
    }
    setupDiscord();
  }, []);

  const checkAdminStatus = async (token) => {
    try {
      const res = await fetch("/api/check-admin", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: token, guild_id: discordSdk.guildId }),
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (e) { console.error("Admin check error", e); }
  };

  const fetchSessions = async (newList = null) => {
    if (newList) { setSessionList(newList); return; }
    try {
      const res = await fetch("/api/sessions");
      const list = await res.json();
      setSessionList(list);
    } catch (e) { console.error("Erreur sessions", e); }
  };

  const fetchPlayerData = async () => {
    if (!auth || !currentSession) return;
    try {
      const res = await fetch("/api/player", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: currentSession }),
      });
      const data = await res.json();
      setPlayerData(data);
    } catch (e) { console.error("Erreur player data", e); }
  };

  useEffect(() => {
    if (currentSession) fetchPlayerData();
  }, [currentSession, openedCategory]);

  const handleJoinSession = async (sessionId) => {
    setStatus(`Connexion à ${sessionId}...`);
    try {
      const res = await fetch("/api/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: auth.user.id, session_id: sessionId }),
      });
      const data = await res.json();
      if (data.success) setCurrentSession(data.session_id);
    } catch (e) { setStatus("Erreur serveur"); }
  };

  // --- RENDER LOGIC ---

  if (!auth) return <div className="flex h-screen items-center justify-center text-xl text-gray-400 animate-pulse"><p>{status}</p></div>;

  // 1. Hub de sélection de session
  if (!currentSession) {
    return (
      <Hub 
        user={auth.user} isAdmin={isAdmin} sessionList={sessionList}
        onJoin={handleJoinSession} onRefresh={fetchSessions}
        accessToken={auth.access_token} guildId={discordSdk.guildId}
      />
    );
  }

  // 2. Fonction pour afficher le contenu d'une carte ouverte
  const renderDetailPage = () => {
    // Cas A : Création de personnage (si pas de données)
    if (!playerData) {
      return (
        <Start 
          userId={auth.user.id} 
          sessionId={currentSession} 
          onValidation={fetchPlayerData} 
        />
      );
    }

    // Cas B : Affichage des pages
    const activeItem = menuItems.find(i => i.id === openedCategory);

    if (openedCategory === 'fiche') {
      return <Fiche playerData={playerData} />;
    }

    if (openedCategory === 'argent') {
      return <Argent playerData={playerData} onRefresh={fetchPlayerData} auth={auth} sessionId={currentSession} />;
    }

    // Par défaut : Action
    // On passe bien TOUTES les props nécessaires pour le repos
    return (
      <Action 
        sessionName={currentSession} 
        icon={activeItem?.icon} 
        playerData={playerData}
        auth={auth}
        sessionId={currentSession}
        onRefresh={fetchPlayerData} 
      />
    );
  };

  // 3. Affichage conditionnel : Page Détail OU Menu Principal
  if (openedCategory || (!playerData && currentSession)) {
    const currentItem = menuItems.find(i => i.id === openedCategory);
    
    return (
      <div className="w-full max-w-2xl mx-auto min-h-screen flex flex-col">
        
        {/* Header Navigation (Seulement si le perso existe déjà) */}
        {playerData && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]/80 backdrop-blur sticky top-0 z-50">
            <button 
              onClick={() => setOpenedCategory(null)} 
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5 text-xs font-bold uppercase tracking-widest"
            >
              <span>&#8592;</span> Retour
            </button>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>{currentItem?.icon}</span> {currentItem?.label}
            </h2>
            <div className="w-16"></div>
          </div>
        )}

        {/* Contenu de la page */}
        <div className="flex-1 p-4 overflow-y-auto">
          {renderDetailPage()}
        </div>
      </div>
    );
  }

  // 4. Menu Principal (Carrousel)
  return (
    <div className="w-full max-w-2xl mx-auto pb-10 pt-4 px-4 flex flex-col min-h-screen">
      <div className="flex justify-between items-center mb-6 px-4 py-3 bg-[#1a1a1a] rounded-full border border-gray-800 shadow-md">
        <span className="text-sm text-gray-400">Session: <strong className="text-white ml-1">{currentSession}</strong></span>
        <button onClick={() => setCurrentSession(null)} className="px-4 py-1 text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors">
          Menu
        </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-gray-500 mb-2">Menu Principal</h2>
        <p className="text-gray-600 text-sm mb-8">Choisis une catégorie</p>
        <Carousel items={menuItems} activeIndex={activeIndex} onNavigate={setActiveIndex} onOpen={(item) => setOpenedCategory(item.id)} />
      </div>
    </div>
  );
}

export default App;