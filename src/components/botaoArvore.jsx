import React, { useRef, useState, useEffect } from "react";
import { FaCamera, FaTrash, FaCheck } from "react-icons/fa";

const BotaoArvore = ({ label, onFotoCapturada, userCoords, obrigatorio, erro }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [modoCamera, setModoCamera] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [especie, setEspecie] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erroCamera, setErroCamera] = useState(null);

  const especiesOptions = [
    { value: "Sibipuruna", label: "Sibipuruna" },
    { value: "Oiti", label: "Oiti" },
    { value: "Sete Copas", label: "Sete Copas" },
    { value: "Coqueiro", label: "Coqueiro" },
    { value: "Nativa", label: "Nativa" }
  ];

  const iniciarCamera = async () => {
    try {
      setErroCamera(null);
      setModoCamera(true);
      setCarregando(true);
  
      // Constraints mais tolerantes
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: 1.7777777777777777
        }
      };
  
      console.log('Tentando acessar câmera com constraints:', constraints);
  
      // Tentativa principal
      try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          await new Promise(resolve => {
            videoRef.current.onloadedmetadata = resolve;
          });
        }
      } catch (error) {
        console.warn("Falha na câmera traseira, tentando fallback...", error);
        
        // Fallback mais simples
        const fallbackConstraints = {
          video: {
            facingMode: { ideal: "environment" },
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 }
          }
        };
  
        const newStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        setStream(newStream);
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
      }
    } catch (error) {
      console.error("Erro fatal ao acessar câmera:", error);
      setErroCamera(`Erro: ${error.message}`);
      setModoCamera(false);
    } finally {
      setCarregando(false);
    }
  };

  const capturarFoto = () => {
    if (!videoRef.current || !stream) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) return;

        const file = new File([blob], `arvore-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });

        setFotoCapturada(URL.createObjectURL(blob));
        encerrarCamera();
      }, "image/jpeg", 0.85);
    } catch (error) {
      console.error("Erro ao capturar foto:", error);
      setErroCamera("Erro ao capturar foto");
    }
  };

  const encerrarCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setModoCamera(false);
  };

  const confirmarFoto = async () => {
    try {
      setCarregando(true);
      
      // Debug para mobile
      if (debugMode) {
        console.log('[confirmarFoto] Dispositivo:', 
          /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
      }
  
      const response = await fetch(fotoCapturada);
      const blob = await response.blob();
  
      const file = new File([blob], `arvore-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now()
      });
  
      // Estrutura compatível com ambos
      const dadosEnvio = {
        file,
        especie,
        coords: props.userCoords,
        tipo: 'ARVORE',
        timestamp: Date.now()
      };
  
      if (debugMode) {
        console.log('[confirmarFoto] Dados enviados:', dadosEnvio);
      }
  
      await props.onFotoCapturada(dadosEnvio);
  
      setFotoCapturada(null);
      setEspecie("");
  
    } catch (error) {
      if (debugMode) {
        console.error('[confirmarFoto] Erro detalhado:', {
          error: error.toString(),
          userAgent: navigator.userAgent,
          fotoDisponível: !!fotoCapturada,
          streamAtivo: !!stream
        });
      }
      setErroCamera(`Erro: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const cancelarFoto = () => {
    encerrarCamera();
    setFotoCapturada(null);
    setEspecie("");
  };

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (fotoCapturada) {
        URL.revokeObjectURL(fotoCapturada);
      }
    };
  }, [stream, fotoCapturada]);

 

  return (
    <div className={`mb-4 ${erro ? 'border-2 border-red-500 rounded-lg p-2' : ''}`}>
      {/* Mensagem de erro */}
      {erroCamera && (
        <div className="mb-2 p-2 bg-red-100 text-red-700 rounded-md text-sm">
          {erroCamera}
        </div>
      )}

      {/* Botão inicial */}
      {!modoCamera && !fotoCapturada && (
        <button
        onClick={iniciarCamera}
        className={`flex items-center justify-center gap-2 w-full ${
          erro ? 'bg-red-100 text-red-700' : 'bg-blue-600 text-white'
        } px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors`}
      >
        {label}
        <FaCamera />
        </button>
      )}

      {/* Visualização da câmera */}
      {modoCamera && (
        <div className="relative border border-gray-300 rounded-lg overflow-hidden bg-black">
          {carregando ? (
            <div className="flex items-center justify-center h-64 text-white">
              Carregando câmera...
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-96 object-contain"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 flex flex-col items-center">
                <button
                  onClick={capturarFoto}
                  className="bg-white rounded-full p-3 mb-2 shadow-lg hover:bg-gray-100 transition-colors"
                  aria-label="Capturar foto"
                >
                  <FaCamera className="text-2xl text-gray-800" />
                </button>
                <button
                  onClick={cancelarFoto}
                  className="text-white text-sm underline hover:text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Pré-visualização e confirmação */}
      {fotoCapturada && (
        <div className="border border-gray-300 rounded-lg overflow-hidden shadow-md">
          <div className="relative">
            <img
              src={fotoCapturada}
              alt="Pré-visualização da árvore"
              className="w-full h-auto max-h-96 object-contain"
            />
            <button
              onClick={cancelarFoto}
              className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
              aria-label="Refazer foto"
            >
              <FaTrash />
            </button>
          </div>

          <div className="p-4 bg-gray-50">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Espécie da árvore
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              value={especie}
              onChange={(e) => setEspecie(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              required
              disabled={carregando}
            >
              <option value="">Selecione uma espécie</option>
              {especiesOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={cancelarFoto}
                disabled={carregando}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <FaTrash /> Refazer
              </button>
              <button
                onClick={confirmarFoto}
                disabled={!especie || carregando}
                className={`flex items-center gap-2 ${especie ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'
                  } text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50`}
              >
                {carregando ? (
                  'Salvando...'
                ) : (
                  <>
                    <FaCheck /> Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotaoArvore;