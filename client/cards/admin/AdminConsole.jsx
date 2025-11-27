import React from 'react';

const AdminConsole = ({ logs }) => {
  return (
    <div className="flex-1 bg-[#111] border border-gray-800 rounded-xl p-4 flex flex-col min-w-0 h-full">
      <h2 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
        <span>📟</span> Console Serveur
      </h2>
      <div className="flex-1 overflow-y-auto font-mono text-xs space-y-1 bg-black p-3 rounded border border-gray-900 shadow-inner custom-scrollbar">
        {logs.length === 0 ? (
          <p className="text-gray-700 italic">En attente de logs...</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border-b border-gray-900/50 pb-1 mb-1 last:border-0 break-words">
              <span className="text-gray-600 select-none">[{log.time}]</span>{' '}
              <span className="text-gray-300 whitespace-pre-wrap">{log.text}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminConsole;