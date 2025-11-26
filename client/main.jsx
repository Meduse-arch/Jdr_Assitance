import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css'; // C'est ici qu'on importe le CSS (et donc Tailwind)

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);