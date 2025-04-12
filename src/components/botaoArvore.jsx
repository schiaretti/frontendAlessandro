import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FaCamera, FaCheck, FaTimes, FaMapMarkerAlt } from 'react-icons/fa';

const BotaoArvore = ({ label, onFotoCapturada, posteId = null, className = '' }) => {
  const [state, setState] = useState({
    fotosTemporarias: [], // Fotos não confirmadas
    fotosConfirmadas: [], // Fotos que serão enviadas
    fotoAtual: null,
    modoCamera: false,
    stream: null,
    error: null,
    isLoading: false,
    proximoId: 1,
    coords: null // Coordenadas GPS atuais
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(document.createElement('canvas'));

  // Obter coordenadas GPS
  const obterCoordenadas = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalização não suportada"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          resolve({
            latitude,
            longitude,
            accuracy,
            timestamp: new Date(position.timestamp).toISOString()
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }, []);

  // Gera ID único com coordenadas
  const gerarIdUnico = useCallback(async () => {
    try {
      const coords = await obterCoordenadas();
      setState(prev => ({ ...prev, coords }));
      
      const id = `${coords.latitude.toFixed(6)}-${coords.longitude.toFixed(6)}-${Date.now()}`;
      return { id, coords };
    } catch (error) {
      console.error("Erro ao obter coordenadas:", error);
      const id = `no-gps-${Date.now()}`;
      return { id, coords: null };
    }
  }, [obterCoordenadas]);

  // Limpeza de recursos
  useEffect(() => {
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [state.stream]);

  const iniciarCamera = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(prev => ({
        ...prev,
        stream,
        modoCamera: true,
        isLoading: false
      }));

    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      setState(prev => ({
        ...prev,
        error: "Não foi possível acessar a câmera. Verifique as permissões.",
        isLoading: false
      }));
    }
  }, []);

  const capturarFoto = useCallback(async () => {
    try {
      const video = videoRef.current;
      if (!video || !state.stream) return;

      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Obter metadados com geolocalização
      const { id, coords } = await gerarIdUnico();
      
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Não foi possível gerar a imagem");

        const fotoURL = URL.createObjectURL(blob);
        const nomeArquivo = `arvore-${posteId || 'na'}-${id}.jpg`;
        const file = new File([blob], nomeArquivo, { type: "image/jpeg" });

        const novaFoto = {
          id,
          file,
          fotoURL,
          posteId,
          coords, // Inclui coordenadas
          timestamp: new Date().toISOString(),
          confirmada: false // Não confirmada ainda
        };

        // Parar a câmera
        state.stream.getTracks().forEach(track => track.stop());

        setState(prev => ({
          ...prev,
          fotoAtual: novaFoto,
          fotosTemporarias: [...prev.fotosTemporarias, novaFoto],
          stream: null,
          modoCamera: false
        }));

      }, 'image/jpeg', 0.8);

    } catch (error) {
      console.error("Erro ao capturar foto:", error);
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [state.stream, posteId, gerarIdUnico]);

  // Confirmar foto para envio
  const confirmarFoto = useCallback((fotoId) => {
    setState(prev => {
      const fotoIndex = prev.fotosTemporarias.findIndex(f => f.id === fotoId);
      if (fotoIndex === -1) return prev;

      const foto = { ...prev.fotosTemporarias[fotoIndex], confirmada: true };
      
      return {
        ...prev,
        fotosTemporarias: prev.fotosTemporarias.filter(f => f.id !== fotoId),
        fotosConfirmadas: [...prev.fotosConfirmadas, foto],
        fotoAtual: null
      };
    });
  }, []);

  // Remover foto temporária
  const removerFotoTemporaria = useCallback((fotoId) => {
    setState(prev => ({
      ...prev,
      fotosTemporarias: prev.fotosTemporarias.filter(f => f.id !== fotoId),
      fotoAtual: prev.fotoAtual?.id === fotoId ? null : prev.fotoAtual
    }));
  }, []);

  // Cancelar captura atual
  const cancelarCaptura = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }
    
    setState(prev => ({
      ...prev,
      stream: null,
      modoCamera: false,
      fotoAtual: null,
      error: null
    }));
  }, [state.stream]);

  // Enviar fotos confirmadas
  const enviarFotos = useCallback(() => {
    if (state.fotosConfirmadas.length > 0 && onFotoCapturada) {
      onFotoCapturada(state.fotosConfirmadas);
      setState(prev => ({ ...prev, fotosConfirmadas: [] }));
    }
  }, [state.fotosConfirmadas, onFotoCapturada]);

  return (
    <div className={`arvore-container ${className}`}>
      {/* Modo Câmera */}
      {state.modoCamera && (
        <div className="camera-mode">
          <video ref={videoRef} autoPlay muted playsInline />
          <div className="camera-controls">
            <button onClick={capturarFoto} className="btn-capture">
              <FaCamera />
            </button>
            <button onClick={cancelarCaptura} className="btn-cancel">
              <FaTimes />
            </button>
          </div>
        </div>
      )}

      {/* Fotos Temporárias (pré-visualização) */}
      {state.fotosTemporarias.length > 0 && (
        <div className="preview-mode">
          <h4>Fotos capturadas (não confirmadas)</h4>
          <div className="photo-grid">
            {state.fotosTemporarias.map(foto => (
              <div key={foto.id} className="photo-item">
                <img src={foto.fotoURL} alt={`Árvore ${foto.id}`} />
                <div className="photo-meta">
                  {foto.coords && (
                    <span>
                      <FaMapMarkerAlt /> 
                      {foto.coords.latitude.toFixed(6)}, {foto.coords.longitude.toFixed(6)}
                    </span>
                  )}
                  <span>ID: {foto.id.split('-').slice(-1)[0]}</span>
                </div>
                <div className="photo-actions">
                  <button 
                    onClick={() => confirmarFoto(foto.id)} 
                    className="btn-confirm"
                  >
                    <FaCheck /> Confirmar
                  </button>
                  <button 
                    onClick={() => removerFotoTemporaria(foto.id)} 
                    className="btn-remove"
                  >
                    <FaTimes /> Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fotos Confirmadas */}
      {state.fotosConfirmadas.length > 0 && (
        <div className="confirmed-photos">
          <h4>Fotos confirmadas para envio ({state.fotosConfirmadas.length})</h4>
          <button onClick={enviarFotos} className="btn-submit">
            Enviar Todas as Fotos
          </button>
        </div>
      )}

      {/* Botão Inicial */}
      {!state.modoCamera && state.fotosTemporarias.length === 0 && (
        <button onClick={iniciarCamera} className="btn-start">
          <FaCamera /> {label}
        </button>
      )}
    </div>
  );
};

// Estilos (simplificados para exemplo)
const styles = `
  .arvore-container {
    border: 1px solid #ddd;
    padding: 1rem;
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .camera-mode {
    position: relative;
  }
  
  .camera-mode video {
    width: 100%;
    max-height: 400px;
    background: #000;
  }
  
  .camera-controls {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .photo-item {
    border: 1px solid #eee;
    padding: 0.5rem;
    border-radius: 4px;
  }
  
  .photo-item img {
    width: 100%;
    height: 120px;
    object-fit: cover;
  }
  
  .photo-meta {
    font-size: 0.8rem;
    margin: 0.5rem 0;
  }
  
  .photo-actions {
    display: flex;
    gap: 0.5rem;
  }
  
  .btn-start, .btn-capture, .btn-confirm, .btn-submit {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .btn-cancel, .btn-remove {
    background: #f44336;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
`;

// Adiciona estilos
const styleSheet = document.createElement("style");
styleSheet.innerHTML = styles;
document.head.appendChild(styleSheet);

export default BotaoArvore;