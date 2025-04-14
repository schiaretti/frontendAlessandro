import React, { useState, useRef } from 'react';

/**
 * Componente BotaoCamera - Permite capturar fotos usando a câmera do dispositivo
 * 
 * Props:
 * @param {string} label - Rótulo exibido no botão
 * @param {function} onFotoCapturada - Callback chamado quando uma foto é capturada
 * @param {boolean} obrigatorio - Se true, mostra indicador de campo obrigatório
 */
const BotaoCamera = ({ label, onFotoCapturada, obrigatorio = false }) => {
  // Estados do componente
  const [capturedImage, setCapturedImage] = useState(null); // URL da imagem capturada
  const [fotoCapturada, setFotoCapturada] = useState(false); // Se foto foi tirada
  const [error, setError] = useState(null); // Mensagens de erro
  
  // Referência para o input de arquivo oculto
  const fileInputRef = useRef(null);

  /**
   * Função principal para abrir a câmera
   * Tenta primeiro o método ideal (com capture) e depois fallbacks
   */
  const abrirCamera = () => {
    setError(null); // Reseta erros anteriores
    
    // 1. Tenta o método preferencial (funciona na maioria dos celulares)
    if (supportsCameraCapture()) {
      abrirCameraIdeal();
    } 
    // 2. Fallback para API de mídia (navegadores desktop)
    else if (supportsMediaDevices()) {
      abrirCameraFallback();
    } 
    // 3. Último fallback - input de arquivo simples
    else {
      abrirInputArquivoSimples();
    }
  };

  // Verifica se o navegador suporta o atributo capture
  const supportsCameraCapture = () => {
    return 'capture' in document.createElement('input');
  };

  // Verifica se o navegador suporta a API MediaDevices
  const supportsMediaDevices = () => {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
  };

  /**
   * Método ideal - usa input com atributo capture
   * Abre diretamente a câmera em dispositivos móveis
   */
  const abrirCameraIdeal = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 'user' para frontal, 'environment' para traseira
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        processarFoto(file);
      }
    };
    
    input.click();
  };

  /**
   * Fallback para navegadores que suportam MediaDevices (como Chrome no PC)
   */
  const abrirCameraFallback = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        // Cria elementos temporários para captura
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.backgroundColor = 'rgba(0,0,0,0.8)';
        container.style.zIndex = '1000';
        
        const btnCapturar = document.createElement('button');
        btnCapturar.textContent = 'Capturar Foto';
        btnCapturar.style.position = 'fixed';
        btnCapturar.style.bottom = '20px';
        btnCapturar.style.left = '50%';
        btnCapturar.style.transform = 'translateX(-50%)';
        btnCapturar.style.padding = '10px 20px';
        btnCapturar.style.backgroundColor = 'white';
        btnCapturar.style.borderRadius = '5px';
        
        btnCapturar.onclick = () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          
          canvas.toBlob(blob => {
            const file = new File([blob], `foto-${Date.now()}.jpg`, {
              type: 'image/jpeg'
            });
            
            processarFoto(file);
            
            // Limpa os elementos temporários
            stream.getTracks().forEach(track => track.stop());
            document.body.removeChild(container);
          }, 'image/jpeg', 0.9);
        };
        
        container.appendChild(video);
        container.appendChild(btnCapturar);
        document.body.appendChild(container);
      })
      .catch(err => {
        setError('Não foi possível acessar a câmera');
        console.error(err);
        // Tenta o método mais simples como último recurso
        abrirInputArquivoSimples();
      });
  };

  /**
   * Método mais simples - input de arquivo sem captura direta
   */
  const abrirInputArquivoSimples = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        processarFoto(file);
      }
    };
    
    input.click();
  };

  /**
   * Processa o arquivo de foto após captura
   * @param {File} file - Arquivo da foto capturada
   */
  const processarFoto = (file) => {
    // Validações básicas do arquivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('A imagem é muito grande (máx. 5MB)');
      return;
    }
    
    // Cria URL para pré-visualização
    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);
    setFotoCapturada(true);
    
    // Chama o callback com o arquivo
    onFotoCapturada(file);
  };

  /**
   * Reseta o componente para permitir nova captura
   */
  const resetarCamera = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage); // Libera memória
    }
    setCapturedImage(null);
    setFotoCapturada(false);
  };

  return (
    <div className={`camera-container ${obrigatorio && !fotoCapturada ? 'campo-obrigatorio' : ''}`}>
      {/* Label do campo */}
      <label className="camera-label">
        {label} {obrigatorio && <span className="obrigatorio-asterisco">*</span>}
      </label>
      
      {/* Mensagem de erro */}
      {error && <div className="camera-error">{error}</div>}
      
      {/* Pré-visualização ou botão de captura */}
      {capturedImage ? (
        <div className="camera-preview-container">
          <img src={capturedImage} alt="Pré-visualização" className="camera-preview" />
          <button onClick={resetarCamera} className="camera-btn camera-btn-retry">
            <svg xmlns="http://www.w3.org/2000/svg" className="camera-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Tirar Novamente
          </button>
        </div>
      ) : (
        <button onClick={abrirCamera} className="camera-btn camera-btn-open">
          <svg xmlns="http://www.w3.org/2000/svg" className="camera-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Abrir Câmera
        </button>
      )}
      
      {/* Input de arquivo oculto para fallback */}
      <input 
        type="file" 
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) processarFoto(file);
        }}
      />
    </div>
  );
};

// Estilos recomendados (pode colocar em um arquivo CSS separado)
const styles = `
  .camera-container {
    margin: 1rem 0;
  }
  
  .campo-obrigatorio {
    border: 2px solid #ef4444;
    border-radius: 0.5rem;
    padding: 0.5rem;
  }
  
  .camera-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #374151;
  }
  
  .obrigatorio-asterisco {
    color: #ef4444;
  }
  
  .camera-error {
    color: #ef4444;
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .camera-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .camera-btn-open {
    background-color: #3b82f6;
    color: white;
    border: none;
  }
  
  .camera-btn-open:hover {
    background-color: #2563eb;
  }
  
  .camera-btn-retry {
    background-color: #ef4444;
    color: white;
    border: none;
    margin-top: 0.5rem;
  }
  
  .camera-btn-retry:hover {
    background-color: #dc2626;
  }
  
  .camera-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.5rem;
  }
  
  .camera-preview-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .camera-preview {
    max-width: 100%;
    max-height: 300px;
    border-radius: 0.375rem;
    border: 1px solid #e5e7eb;
  }
`;

// Adiciona os estilos ao documento
const styleElement = document.createElement('style');
styleElement.innerHTML = styles;
document.head.appendChild(styleElement);

export default BotaoCamera;