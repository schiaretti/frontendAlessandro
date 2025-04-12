import React, { useState, useRef, useEffect } from 'react';

/**
 * Componente BotaoCamera - Permite capturar fotos usando a câmera do dispositivo
 * 
 * Props:
 * @param {string} label - Rótulo para identificar a foto
 * @param {function} onFotoCapturada - Callback chamado quando a foto é salva
 * @param {boolean} obrigatorio - Indica se a foto é obrigatória
 */
const BotaoCamera = ({ label, onFotoCapturada, obrigatorio = false }) => {
  // ========== REFERÊNCIAS ==========
  // useRef cria referências para elementos DOM
  const videoRef = useRef(null);    // Referência para o elemento <video>
  const canvasRef = useRef(null);   // Referência para o elemento <canvas> oculto

  // ========== ESTADOS ==========
  const [stream, setStream] = useState(null);          // Stream da câmera
  const [error, setError] = useState(null);            // Mensagens de erro
  const [capturedImage, setCapturedImage] = useState(null); // URL da imagem capturada
  const [isCameraActive, setIsCameraActive] = useState(false); // Se a câmera está ativa
  const [capturedFile, setCapturedFile] = useState(null);     // Arquivo da foto
  const [fotoCapturada, setFotoCapturada] = useState(false); // Se a foto foi capturada

  // ========== FUNÇÕES PRINCIPAIS ==========

  /**
   * Para a câmera e libera os recursos
   */
  const pararCamera = () => {
    if (stream) {
      // Para todas as tracks (áudio/vídeo) da stream
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      
      // Remove a stream do elemento de vídeo
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
    setIsCameraActive(false);
  };

  /**
   * Inicia a câmera do dispositivo
   */
  const iniciarCamera = async () => {
    try {
      // Reseta estados
      setError(null);
      setCapturedImage(null);
      setCapturedFile(null);
      setFotoCapturada(false);
      setIsCameraActive(true);

      // Configurações da câmera
      const constraints = {
        video: {
          width: { ideal: 1280 },  // Largura ideal
          height: { ideal: 720 }   // Altura ideal
        }
      };

      // Solicita acesso à câmera
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Conecta a stream ao elemento de vídeo
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error("Erro ao acessar a câmera:", err);
      setError(`Erro ao acessar a câmera: ${err.message}`);
      setIsCameraActive(false);
    }
  };

  /**
   * Captura uma imagem da câmera
   */
  const capturarImagem = async () => {
    try {
      // Verifica se os elementos existem
      if (!videoRef.current || !canvasRef.current) {
        throw new Error("Elementos de vídeo ou canvas não encontrados");
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Ajusta o canvas para o tamanho do vídeo
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Desenha o frame atual do vídeo no canvas
      const context = canvas.getContext('2d');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Verifica se a imagem foi gerada
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("Não foi possível gerar a imagem");
      }

      // Converte o canvas para um Blob (binário) e depois para File
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          // Cria um objeto File com nome e tipo
          const file = new File([blob], `foto-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });

          // Cria uma URL para pré-visualização
          const imageUrl = URL.createObjectURL(blob);
          
          // Atualiza estados
          setCapturedImage(imageUrl);
          setCapturedFile(file);
          setFotoCapturada(true);
          
          // Para a câmera após captura
          pararCamera();
          
          resolve(file);
        }, 'image/jpeg', 0.9); // 90% de qualidade
      });
    } catch (err) {
      console.error("Erro ao capturar imagem:", err);
      setError(`Erro ao capturar imagem: ${err.message}`);
      throw err;
    }
  };

  /**
   * Salva a foto capturada
   */
  const handleSave = async () => {
    try {
      if (capturedFile) {
        console.log(`Foto ${label} salva:`, capturedFile);
        
        // Chama a função passada via props com o arquivo
        onFotoCapturada(capturedFile);
        
        // Limpa a pré-visualização
        if (capturedImage) {
          URL.revokeObjectURL(capturedImage);
        }
        
        // Reseta estados
        setCapturedImage(null);
        setCapturedFile(null);
        setFotoCapturada(false);
      } else {
        throw new Error("Nenhuma imagem foi capturada");
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
    // Libera a URL da pré-visualização
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    
    // Reseta estados
    setCapturedImage(null);
    setCapturedFile(null);
    setFotoCapturada(false);
  };

  // ========== EFEITOS COLATERAIS ==========
  
  /**
   * Efeito de limpeza quando o componente é desmontado
   */
  useEffect(() => {
    return () => {
      pararCamera();
      // Libera a URL da pré-visualização se existir
      if (capturedImage) {
        URL.revokeObjectURL(capturedImage);
      }
    };
  }, [capturedImage]);

  // ========== RENDERIZAÇÃO ==========
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

      {/* Botão para abrir a câmera (mostra quando a câmera não está ativa) */}
      {!isCameraActive && !capturedImage && (
        <button
          onClick={iniciarCamera}
          className="flex items-center justify-center p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-md"
          title="Abrir câmera"
          aria-label="Abrir câmera"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      )}

      {/* Visualização da câmera (mostra quando a câmera está ativa) */}
      {isCameraActive && (
        <div className="relative w-full max-w-xs bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            aria-label="Visualização da câmera"
          />
          <button
            onClick={capturarImagem}
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center justify-center p-3 bg-white rounded-full hover:bg-gray-200 transition-colors shadow-lg"
            title="Capturar imagem"
            aria-label="Capturar imagem"
          >
            <div className="h-8 w-8 bg-red-500 rounded-full border-2 border-white"></div>
          </button>
        </div>
      )}

      {/* Canvas oculto usado para capturar a imagem */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Pré-visualização da imagem capturada */}
      {capturedImage && (
        <div className="flex flex-col items-center gap-3 w-full">
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
              className="flex items-center justify-center p-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
              title="Salvar foto"
              aria-label="Salvar foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={handleCancel}
              className="flex items-center justify-center p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
              title="Cancelar"
              aria-label="Cancelar foto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotaoCamera;