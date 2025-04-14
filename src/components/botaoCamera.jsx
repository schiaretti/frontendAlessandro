import React, { useState, useRef, useEffect } from 'react';

const BotaoCamera = ({ label, onFotoCapturada, obrigatorio = false }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [fotoCapturada, setFotoCapturada] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Detecta se é mobile
  const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Processa a foto de forma consistente
  const processarFoto = async (file) => {
    try {
      // Correção crucial para mobile - garante que o arquivo tenha nome e tipo
      if (isMobile() && (!file.name || !file.type)) {
        file = new File([file], `foto-${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
      }

      // Cria URL para preview
      const imageUrl = URL.createObjectURL(file);
      setCapturedImage(imageUrl);
      setFotoCapturada(true);
      
      // Chama callback após pequeno delay no mobile
      if (isMobile()) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      onFotoCapturada(file);
    } catch (err) {
      console.error('Erro ao processar foto:', err);
      setError('Erro ao processar a foto');
    }
  };

  // Abre a câmera de forma apropriada para cada dispositivo
  const abrirCamera = () => {
    setError(null);
    
    if (isMobile()) {
      // Método otimizado para mobile
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (e) => {
        if (e.target.files && e.target.files[0]) {
          await processarFoto(e.target.files[0]);
        }
      };
      
      input.click();
    } else {
      // Método para desktop
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Usa webcam se disponível
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            // Implementação da captura via webcam...
          })
          .catch(() => {
            // Fallback para input de arquivo simples
            fileInputRef.current.click();
          });
      } else {
        // Fallback para todos os casos
        fileInputRef.current.click();
      }
    }
  };

  // Limpeza
  const resetarCamera = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setFotoCapturada(false);
  };

  return (
    <div className={`camera-container ${obrigatorio && !fotoCapturada ? 'campo-obrigatorio' : ''}`}>
      <label className="camera-label">
        {label} {obrigatorio && <span className="obrigatorio-asterisco">*</span>}
      </label>
      
      {error && <div className="camera-error">{error}</div>}
      
      {capturedImage ? (
        <div className="camera-preview-container">
          <img 
            src={capturedImage} 
            alt="Pré-visualização" 
            className="camera-preview"
            onLoad={() => {
              // Força atualização no mobile se necessário
              if (isMobile()) setCapturedImage(prev => prev ? prev + '?' + Date.now() : prev);
            }}
          />
          <button onClick={resetarCamera} className="camera-btn camera-btn-retry">
            Tirar Novamente
          </button>
        </div>
      ) : (
        <button onClick={abrirCamera} className="camera-btn camera-btn-open">
          Abrir Câmera
        </button>
      )}
      
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          if (e.target.files && e.target.files[0]) {
            await processarFoto(e.target.files[0]);
          }
        }}
      />
    </div>
  );
};

// Estilos (adicione ao seu CSS)
const styles = `
  .camera-container {
    margin: 1rem 0;
    position: relative;
  }
  
  .campo-obrigatorio {
    border: 2px solid #ff0000;
    border-radius: 8px;
    padding: 8px;
  }
  
  .camera-label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
  }
  
  .obrigatorio-asterisco {
    color: #ff0000;
  }
  
  .camera-error {
    color: #ff0000;
    font-size: 14px;
    margin: 8px 0;
  }
  
  .camera-preview-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .camera-preview {
    max-width: 100%;
    max-height: 300px;
    border-radius: 8px;
    border: 1px solid #ddd;
  }
  
  .camera-btn {
    padding: 10px 15px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  
  .camera-btn-open {
    background: #2196F3;
    color: white;
  }
  
  .camera-btn-retry {
    background: #f44336;
    color: white;
  }
`;

// Adiciona estilos ao documento
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default BotaoCamera;