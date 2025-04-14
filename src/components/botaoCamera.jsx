import React, { useState, useRef } from 'react';

const BotaoCamera = ({ label, onFotoCapturada, obrigatorio = false }) => {
  const [capturedImage, setCapturedImage] = useState(null);
  const [fotoCapturada, setFotoCapturada] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  /**
   * Abre diretamente a câmera nativa sem opções
   */
  const abrirCameraDireta = () => {
    setError(null);
    
    // Método 1: Usando input file com capture (funciona na maioria dos dispositivos)
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 'user' para frontal
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const imageUrl = URL.createObjectURL(file);
        setCapturedImage(imageUrl);
        setFotoCapturada(true);
        onFotoCapturada(file); // Chama o callback imediatamente
      }
    };
    
    input.onerror = () => {
      // Fallback para dispositivos que não suportam capture
      abrirCameraFallback();
    };
    
    input.click();
  };

  /**
   * Fallback para dispositivos que não suportam o atributo capture
   */
  const abrirCameraFallback = () => {
    // Método alternativo usando a API MediaDevices
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          // Cria um elemento de vídeo temporário
          const video = document.createElement('video');
          video.srcObject = stream;
          video.play();
          
          // Cria um botão para capturar a foto
          const captureBtn = document.createElement('button');
          captureBtn.textContent = 'Capturar Foto';
          captureBtn.onclick = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            
            canvas.toBlob(blob => {
              const file = new File([blob], `foto-${Date.now()}.jpg`, {
                type: 'image/jpeg'
              });
              
              setCapturedImage(URL.createObjectURL(blob));
              setFotoCapturada(true);
              onFotoCapturada(file);
              
              // Limpa
              stream.getTracks().forEach(track => track.stop());
              document.body.removeChild(video);
              document.body.removeChild(captureBtn);
            }, 'image/jpeg', 0.9);
          };
          
          document.body.appendChild(video);
          document.body.appendChild(captureBtn);
        })
        .catch(err => {
          setError('Não foi possível acessar a câmera: ' + err.message);
        });
    } else {
      setError('Seu dispositivo não suporta acesso direto à câmera');
    }
  };

  const handleCancel = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setFotoCapturada(false);
  };

  return (
    <div className={`mb-4 ${obrigatorio && !fotoCapturada ? 'border-2 border-red-500 p-2 rounded' : ''}`}>
      <label className="block text-sm font-medium mb-1">
        {label} {obrigatorio && <span className="text-red-500">*</span>}
      </label>
      
      {error && (
        <div className="text-red-500 text-sm mb-2">{error}</div>
      )}
      
      {!capturedImage ? (
        <button
          onClick={abrirCameraDireta}
          type="button"
          className="flex items-center justify-center p-2 bg-blue-500 text-white rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Abrir Câmera
        </button>
      ) : (
        <div>
          <img src={capturedImage} alt="Preview" className="max-w-full mb-2 rounded" />
          <button
            onClick={handleCancel}
            type="button"
            className="bg-red-500 text-white p-2 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Tirar Novamente
          </button>
        </div>
      )}
      
      {/* Input oculto para fallback */}
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
            onFotoCapturada(file);
          }
        }}
      />
    </div>
  );
};

export default BotaoCamera;