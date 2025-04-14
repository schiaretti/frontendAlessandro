import React, { useState } from 'react';

/**
 * Componente BotaoCamera - Permite capturar fotos usando a câmera nativa do dispositivo
 * 
 * Props:
 * @param {string} label - Rótulo para identificar a foto
 * @param {function} onFotoCapturada - Callback chamado quando a foto é salva
 * @param {boolean} obrigatorio - Indica se a foto é obrigatória
 */
const BotaoCamera = ({ label, onFotoCapturada, obrigatorio = false }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [fotoCapturada, setFotoCapturada] = useState(false);
  const [error, setError] = useState(null);
  
  // Referência para o input de arquivo oculto
  const fileInputRef = React.useRef(null);

  /**
   * Abre a câmera nativa do dispositivo
   */
  const abrirCameraNativa = () => {
    try {
      // Limpa estados anteriores
      setCapturedImage(null);
      setFotoCapturada(false);
      setError(null);
      
      // Cria um input do tipo file com captura pela câmera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      // Configura para usar a câmera (em dispositivos móveis)
      input.capture = 'environment'; // 'user' para frontal, 'environment' para traseira
      
      // Evento quando uma imagem é selecionada
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          setCapturedImage(imageUrl);
          setFotoCapturada(true);
        }
      };
      
      // Evento para tratar erros
      input.onerror = () => {
        setError('Não foi possível acessar a câmera. Por favor, verifique as permissões.');
      };
      
      // Dispara o clique no input
      input.click();
      
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      setError(`Erro ao acessar a câmera: ${err.message}`);
    }
  };

  /**
   * Salva a foto capturada
   */
  const handleSave = () => {
    try {
      if (capturedImage) {
        // Cria um arquivo a partir da URL (simulação)
        fetch(capturedImage)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `foto-${Date.now()}.jpg`, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            // Chama a função passada via props
            onFotoCapturada(file);
            
            // Limpa a pré-visualização
            URL.revokeObjectURL(capturedImage);
            setCapturedImage(null);
            setFotoCapturada(false);
          });
      }
    } catch (err) {
      console.error("Erro ao salvar foto:", err);
      setError(`Erro ao salvar foto: ${err.message}`);
    }
  };

  /**
   * Cancela a foto capturada
   */
  const handleCancel = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setFotoCapturada(false);
  };

  return (
    <div className={`relative ${obrigatorio && !fotoCapturada ? 'ring-2 ring-red-500 rounded-lg p-1' : ''}`}>
      {/* Cabeçalho com label e indicador de obrigatoriedade */}
      <div className="flex items-center w-full">
        <span className={`font-medium ${obrigatorio ? 'text-red-500' : 'text-gray-600'}`}>
          {label} {obrigatorio && '*'}
        </span>
        {fotoCapturada && (
          <span className="ml-2 text-green-500">✓</span>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="w-full p-2 bg-red-100 text-red-700 rounded-md text-center text-sm">
          {error}
        </div>
      )}

      {/* Botão para abrir a câmera nativa */}
      {!fotoCapturada && (
        <button
          onClick={abrirCameraNativa}
          className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md mt-2"
          title="Abrir câmera"
          aria-label="Abrir câmera"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Pré-visualização da imagem capturada */}
      {capturedImage && (
        <div className="flex flex-col items-center gap-3 w-full mt-2">
          <div className="w-full max-w-xs border border-gray-200 rounded-lg overflow-hidden">
            <img 
              src={capturedImage} 
              alt="Pré-visualização da foto capturada" 
              className="w-full h-auto"
            />
          </div>

          {/* Botões de ação após captura */}
          <div className="flex gap-4">
            <button
              onClick={handleSave}
              className="flex items-center justify-center p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors px-4"
              title="Salvar foto"
              aria-label="Salvar foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Salvar
            </button>

            <button
              onClick={handleCancel}
              className="flex items-center justify-center p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors px-4"
              title="Repetir foto"
              aria-label="Repetir foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Repetir
            </button>
          </div>
        </div>
      )}
      
      {/* Input de arquivo oculto */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*" 
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const imageUrl = URL.createObjectURL(file);
            setCapturedImage(imageUrl);
            setFotoCapturada(true);
          }
        }}
      />
    </div>
  );
};

export default BotaoCamera;