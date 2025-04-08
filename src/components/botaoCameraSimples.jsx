// components/botaoCameraSimples.jsx
import React, { useRef } from 'react';

const BotaoCameraSimples = ({ label, onFotoCapturada }) => {
  const inputRef = useRef(null);

  const handleClick = () => {
    inputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFotoCapturada(file);
      // Limpa o input para permitir nova seleção do mesmo arquivo
      e.target.value = '';
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={handleClick}
        className="w-full bg-blue-100 text-blue-700 py-2 px-4 rounded-md 
                   hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          Capturar Foto
        </div>
      </button>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment" // Força o uso da câmera traseira
        className="hidden"
      />
    </div>
  );
};

// Exporte como padrão
export default BotaoCameraSimples;