import { useEffect, useState } from 'react';
import { DiscordSDK } from "@discord/embedded-app-sdk";
import rocketLogo from '/rocket.png';
import "./style.css";

// Initialisation du SDK en dehors du composant pour éviter de le recréer
const discordSdk = new DiscordSDK(import.meta.env.CLIENT_ID);

function App() {
  const [auth, setAuth] = useState(null);
  const [channelName, setChannelName] = useState("Inconnu");
  const [status, setStatus] = useState("Initialisation...");

  useEffect(() => {
    // Cette fonction se lance une seule fois au démarrage (équivalent de ton ancien script)
    async function setupDiscord() {
      try {
        await discordSdk.ready();
        setStatus("SDK Prêt");

        // 1. Autorisation
        const { code } = await discordSdk.commands.authorize({
          client_id: import.meta.env.CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds"],
        });

        // 2. Échange de token via ton serveur
        const response = await fetch("/.proxy/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const { access_token } = await response.json();

        // 3. Authentification finale
        const authData = await discordSdk.commands.authenticate({ access_token });
        setAuth(authData);
        setStatus("Authentifié ✅");

        // 4. Récupérer le nom du channel (si possible)
        if (discordSdk.channelId && discordSdk.guildId) {
          const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId });
          if (channel.name) setChannelName(channel.name);
        }
      } catch (error) {
        console.error(error);
        setStatus("Erreur de connexion ❌");
      }
    }

    setupDiscord();
  }, []);

  return (
    <div>
      <img src={rocketLogo} className="logo" alt="Discord" />
      <h1>JDR Assistance</h1>
      
      <div className="card">
        <p>Status : <strong>{status}</strong></p>
        <p>Activity Channel : "<strong>{channelName}</strong>"</p>
        
        {auth && (
           <p>Bonjour, utilisateur connecté !</p>
        )}
      </div>
    </div>
  );
}

export default App;