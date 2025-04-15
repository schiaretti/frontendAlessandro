import React, { useState, useRef, useEffect } from 'react';

const BotaoCamera = ({ label, onFotoCapturada, obrigatorio, erro, id }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Detecta se é mobile
  const isMobile = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Método universal para abrir câmera
  const abrirCamera = async () => {
    try {
      // Tenta acessar a câmera diretamente (PC e alguns mobiles)
      if (!isMobile() && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } else {
        // Fallback para input file com capture (mobile)
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = (e) => processarFoto(e.target.files[0]);
        input.click();
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      // Fallback final - input file simples
      fileInputRef.current.click();
    }
  };

  // Captura foto da webcam (PC)
  const capturarFoto = () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob(blob => {
      const file = new File([blob], `foto-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
      processarFoto(file);
      setIsCameraActive(false);
    }, 'image/jpeg', 0.9);
  };

  // Processa a foto capturada
  const processarFoto = (file) => {
    if (!file) return;

    // Normalização para mobile
    if (isMobile() && (!file.name || !file.type)) {
      file = new File([file], `foto-${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });
    }

    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);
    onFotoCapturada(file);
  };

  return (
    <div className={`camera-container ${erro ? 'border-red-500 border-2' : ''}`}>
      {!isCameraActive ? (
        !capturedImage ? (
          <button
            id={id}
            onClick={abrirCamera}
            className="bg-blue-500 text-white py-2 px-4 rounded flex items-center"
          >
            <CameraIcon />
            {label} {obrigatorio && '*'}
          </button>
        ) : (
          <div className="flex flex-col items-center">
            <img src={capturedImage} alt="Preview" className="max-h-40 mb-2" />
            <button
              onClick={() => setCapturedImage(null)}
              className="bg-red-500 text-white py-1 px-3 rounded text-sm"
            >
              Refazer
            </button>
          </div>
        )
      ) : (
        <div className="camera-preview">
          <video ref={videoRef} autoPlay playsInline className="w-full" />
          <button
            onClick={capturarFoto}
            className="bg-white rounded-full p-2 absolute bottom-4 left-1/2 transform -translate-x-1/2"
          >
            <CaptureIcon />
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={(e) => processarFoto(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
};

// Componentes auxiliares
const CameraIcon = () => (
  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CaptureIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

export default BotaoCamera;