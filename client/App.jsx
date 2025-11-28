import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import Carousel from './Carousel';
import VerticalMenu from './VerticalMenu'; // Assure-toi d'avoir créé ce fichier comme demandé avant
import Hub from './Hub';
import Start from './Start';
import GameHome from './GameHome';
import Admin from './Admin'; 

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
  const [adminMode, setAdminMode] = useState(false);
  
  // Navigation & Masquerade
  const [currentSession, setCurrentSession] = useState(null);
  const [menuSection, setMenuSection] = useState(null); 
  const [activeIndex, setActiveIndex] = useState(0); 
  const [openedCategory, setOpenedCategory] = useState(null);
  
  // Masquerade
  const [masqueradeUser, setMasqueradeUser] = useState(null);

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

  const getActiveUser = () => {
    if (masqueradeUser) return masqueradeUser;
    return auth?.user;
  };

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

  const fetchPlayerData = async (directData = null) => {
    if (directData) {
        setPlayerData(directData);
        return;
    }
    const activeUser = getActiveUser();
    if (!activeUser || !currentSession) return;
    try {
      const res = await fetch("/api/player", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: activeUser.id, session_id: currentSession }),
      });
      const data = await res.json();
      setPlayerData(data);
    } catch (e) { console.error("Erreur player data", e); }
  };

  useEffect(() => {
    if (currentSession) fetchPlayerData();
  }, [currentSession, openedCategory, masqueradeUser]); 

  const handleJoinSession = async (sessionId) => {
    const activeUser = getActiveUser();
    setStatus(`Connexion à ${sessionId}...`);
    try {
      const res = await fetch("/api/join", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: activeUser.id, 
          username: activeUser.username,
          session_id: sessionId 
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrentSession(data.session_id);
        setMenuSection(null);
        setOpenedCategory(null);
      }
    } catch (e) { setStatus("Erreur serveur"); }
  };

  const handleMasquerade = (id, username, sessionId) => {
      setMasqueradeUser({ id, username }); // 1. On définit l'identité
      setCurrentSession(sessionId);        // 2. On définit la session
      setAdminMode(false);                 // 3. On quitte l'admin
      
      // 4. NAVIGATION VERS GAMEHOME
      setMenuSection(null);       // null = Affiche le menu GameHome (Choix Jeu/Infos)
      setOpenedCategory(null);    // null = Aucune carte ouverte
    };

  const handleQuitMasquerade = () => {
    setMasqueradeUser(null);
    setCurrentSession(null);
    setMenuSection(null);
    setOpenedCategory(null);
    setAdminMode(true);
  };

  const handleMenuSelect = (section) => {
    if (section === 'game') {
      setOpenedCategory('outils');
    } else {
      setMenuSection(section);
    }
  };

  if (!auth) return <div className="flex h-screen items-center justify-center text-xl text-gray-400 animate-pulse"><p>{status}</p></div>;

  if (adminMode) {
    return (
      <Admin 
        accessToken={auth.access_token}
        guildId={discordSdk.guildId}
        sessionList={sessionList}
        onRefresh={fetchSessions}
        onQuit={() => setAdminMode(false)}
        onMasquerade={handleMasquerade} 
      />
    );
  }

  const effectiveAuth = masqueradeUser 
    ? { ...auth, user: { ...auth.user, id: masqueradeUser.id, username: masqueradeUser.username } } 
    : auth;

  // Choix Session
  if (!currentSession) {
    return (
      <Hub 
        user={auth.user} 
        isAdmin={isAdmin} 
        sessionList={sessionList}
        onJoin={handleJoinSession} 
        onRefresh={fetchSessions}
        onAdminMode={() => setAdminMode(true)}
      />
    );
  }

  // --- CORRECTION CRITIQUE ICI ---
  // On vérifie si playerData existe ET si les stats (joueur) sont présentes.
  // Si on a juste le username (comme dans ton image), on force l'affichage de Start.
  if (!playerData || !playerData.joueur) {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 min-h-screen flex flex-col">
        <div className="flex justify-between items-center mb-6">
           <button onClick={() => setCurrentSession(null)} className="text-sm text-gray-500 hover:text-white underline">Retour Hub</button>
        </div>
        <Start 
          userId={effectiveAuth.user.id} 
          sessionId={currentSession} 
          onValidation={fetchPlayerData} 
        />
      </div>
    );
  }

  // Affichage Carte Détail
  if (openedCategory) {
    let content;
    switch (openedCategory) {
      case 'fiche': content = <Fiche playerData={playerData} />; break;
      case 'money': content = <Money playerData={playerData} onRefresh={fetchPlayerData} auth={effectiveAuth} sessionId={currentSession} />; break;
      case 'inventaire': content = <Inventaire />; break;
      default:
        content = <Action sessionName={currentSession} icon="🎲" playerData={playerData} auth={effectiveAuth} sessionId={currentSession} onRefresh={fetchPlayerData} />;
    }

    const currentItemLabel = [...itemsGame, ...itemsInfo].find(i => i.id === openedCategory)?.label;

    return (
      <div className="w-full max-w-2xl mx-auto min-h-screen flex flex-col">
        {masqueradeUser && (
           <div className="bg-orange-600 text-white text-xs font-bold text-center py-1 sticky top-0 z-[60]">
             MODE INCARNATION: {masqueradeUser.username} 
             <button onClick={handleQuitMasquerade} className="ml-2 underline text-black">Quitter</button>
           </div>
        )}
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

  // Menu Choix (Jeu / Info)
  if (!menuSection) {
    return (
    <>
        {masqueradeUser && (
           <div className="bg-orange-600 text-white text-xs font-bold text-center py-1 sticky top-0 z-[60]">
             MODE INCARNATION: {masqueradeUser.username} 
             <button onClick={handleQuitMasquerade} className="ml-2 underline text-black">Quitter</button>
           </div>
        )}
        <GameHome onSelect={handleMenuSelect} sessionName={currentSession} onQuit={() => setCurrentSession(null)} />
    </>
    );
  }

  const currentItems = menuSection === 'game' ? itemsGame : itemsInfo;
  const sectionTitle = menuSection === 'game' ? 'Zone de Jeu' : 'Zone d\'Infos';

  return (
    <div className="w-full max-w-2xl mx-auto pb-10 pt-4 px-4 flex flex-col min-h-screen">
      {masqueradeUser && (
           <div className="bg-orange-600 text-white text-xs font-bold text-center py-1 mb-2 rounded">
             MODE INCARNATION: {masqueradeUser.username} 
             <button onClick={handleQuitMasquerade} className="ml-2 underline text-black">Quitter</button>
           </div>
      )}
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