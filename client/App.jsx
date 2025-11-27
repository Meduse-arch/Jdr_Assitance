import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Carousel from './Carousel';
import Hub from './Hub';
import Start from './Start';
import GameHome from './GameHome';

// Import des cartes
import Fiche from './cards/Fiche';
import Inventaire from './cards/Inventaire';
import Money from './cards/Money';
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
  const [menuSection, setMenuSection] = useState(null); // 'game' | 'info' | null
  const [activeIndex, setActiveIndex] = useState(0); 
  const [openedCategory, setOpenedCategory] = useState(null);

  // Définition des items pour chaque section
  const itemsGame = [
    { id: 'outils', label: 'Action', icon: '🎲' }
  ];

  const itemsInfo = [
    { id: 'fiche', label: 'Statut', icon: '📜' },
    { id: 'money', label: 'Argent', icon: '💰' },
    { id: 'inventaire', label: 'Inventaire', icon: '🎒' }
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
      if (data.success) {
        setCurrentSession(data.session_id);
        setMenuSection(null);
        setOpenedCategory(null);
      }
    } catch (e) { setStatus("Erreur serveur"); }
  };

  // --- NOUVELLE FONCTION DE NAVIGATION ---
  const handleMenuSelect = (section) => {
    if (section === 'game') {
      // Si on clique sur JEU, on ouvre directement la page Action ('outils')
      // sans passer par le carrousel
      setOpenedCategory('outils');
    } else {
      // Sinon (INFOS), on affiche le carrousel normalement
      setMenuSection(section);
    }
  };

  // --- RENDU ---

  if (!auth) return <div className="flex h-screen items-center justify-center text-xl text-gray-400 animate-pulse"><p>{status}</p></div>;

  // 1. Choix de session (Hub)
  if (!currentSession) {
    return (
      <Hub 
        user={auth.user} isAdmin={isAdmin} sessionList={sessionList}
        onJoin={handleJoinSession} onRefresh={fetchSessions}
        accessToken={auth.access_token} guildId={discordSdk.guildId}
      />
    );
  }

  // 2. Création de personnage (si inexistant)
  if (!playerData) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => setCurrentSession(null)} className="text-sm text-gray-500 hover:text-white underline">Retour Hub</button>
        </div>
        <Start 
          userId={auth.user.id} 
          sessionId={currentSession} 
          onValidation={fetchPlayerData} 
        />
      </div>
    );
  }

  // 3. Affichage d'une Carte Détail (Action, Fiche...)
  if (openedCategory) {
    let content;
    switch (openedCategory) {
      case 'fiche': content = <Fiche playerData={playerData} />; break;
      case 'money': content = <Money playerData={playerData} onRefresh={fetchPlayerData} auth={auth} sessionId={currentSession} />; break;
      case 'inventaire': content = <Inventaire />; break;
      default: // 'outils' (Action)
        content = <Action sessionName={currentSession} icon="🎲" playerData={playerData} auth={auth} sessionId={currentSession} onRefresh={fetchPlayerData} />;
    }

    const currentItemLabel = [...itemsGame, ...itemsInfo].find(i => i.id === openedCategory)?.label;

    return (
      <div className="w-full max-w-2xl mx-auto min-h-screen flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1a]/80 backdrop-blur sticky top-0 z-50">
          <button 
            onClick={() => setOpenedCategory(null)} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/5 text-xs font-bold uppercase tracking-widest"
          >
            <span>&#8592;</span> Retour
          </button>
          <h2 className="text-lg font-bold text-white">{currentItemLabel}</h2>
          <div className="w-16"></div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          {content}
        </div>
      </div>
    );
  }

  // 4. Choix "Jeu" vs "Infos" (GameHome)
  if (!menuSection) {
    // On passe notre nouvelle fonction handleMenuSelect ici
    return <GameHome onSelect={handleMenuSelect} sessionName={currentSession} onQuit={() => setCurrentSession(null)} />;
  }

  // 5. Carrousel (Menu Info uniquement désormais, car Game saute cette étape)
  const currentItems = menuSection === 'game' ? itemsGame : itemsInfo;
  const sectionTitle = menuSection === 'game' ? 'Zone de Jeu' : 'Zone d\'Infos';

  return (
    <div className="w-full max-w-2xl mx-auto pb-10 pt-4 px-4 flex flex-col min-h-screen">
      
      <div className="flex justify-between items-center mb-6 px-4 py-3 bg-[#1a1a1a] rounded-full border border-gray-800 shadow-md">
        <button onClick={() => setMenuSection(null)} className="px-4 py-1 text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors flex items-center gap-2">
          <span>&#8592;</span> Retour
        </button>
        <span className="text-sm font-bold text-gray-300">{sectionTitle}</span>
        <div className="w-16"></div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <Carousel 
          items={currentItems} 
          activeIndex={activeIndex % currentItems.length} 
          onNavigate={setActiveIndex} 
          onOpen={(item) => setOpenedCategory(item.id)} 
        />
      </div>
    </div>
  );
}

export default App;