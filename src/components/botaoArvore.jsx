import React, { useRef, useState, useEffect } from "react";
import { FaCamera, FaTrash } from "react-icons/fa";

const BotaoArvore = ({ label, onFotoCapturada, userCoords, obrigatorio, erro }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [modoCamera, setModoCamera] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [especie, setEspecie] = useState("");
  
  const especiesOptions = [
    { value: "Sibipuruna", label: "Sibipuruna" },
    { value: "Oiti", label: "Oiti" },
    { value: "Sete Copas", label: "Sete Copas" },
    { value: "Coqueiro", label: "Coqueiro" },
    { value: "Nativa", label: "Nativa" },
  ];

  const iniciarCamera = async () => {
    try {
      setModoCamera(true);
      const constraints = { 
        video: { facingMode: "environment" } 
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (error) {
      console.error("Erro ao acessar câmera:", error);
      alert(`Erro: ${error.message}`);
      setModoCamera(false);
    }
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video || !stream) return;

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
      setModoCamera(false);
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }, "image/jpeg", 0.8);
  };

  const confirmarFoto = () => {
    if (fotoCapturada && onFotoCapturada) {
      fetch(fotoCapturada)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `foto-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onFotoCapturada(file);
          setFotoCapturada(null);
          setEspecie("");
        });
    }
  };

  const cancelarFoto = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setFotoCapturada(null);
    setModoCamera(false);
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
    <div className={`mb-4 ${erro ? 'border border-red-500 rounded p-2' : ''}`}>
      {!modoCamera && !fotoCapturada && (
        <button
          onClick={iniciarCamera}
          className={`flex items-center justify-between w-full ${erro ? 'bg-red-100 text-red-700' : 'bg-blue-500 text-white'} px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none`}
        >
          <span>{label}</span>
          <FaCamera className="text-lg" />
          {obrigatorio && <span className="text-red-500 ml-1">*</span>}
        </button>
      )}

      {modoCamera && (
        <div className="relative border border-gray-300 rounded-md overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            onClick={capturarFoto}
            className="w-full h-auto max-h-96 cursor-pointer object-contain"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 flex flex-col items-center">
            <button
              onClick={capturarFoto}
              className="bg-white rounded-full p-3 mb-2 shadow-lg"
            >
              <FaCamera className="text-2xl text-gray-800" />
            </button>
            <button
              onClick={cancelarFoto}
              className="text-white text-sm underline"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {fotoCapturada && (
        <div className="relative border border-gray-300 rounded-md overflow-hidden">
          <img
            src={fotoCapturada}
            alt="Preview"
            className="w-full h-auto max-h-96 object-contain"
          />
          <div className="p-4 bg-gray-50">
            <select
              value={especie}
              onChange={(e) => setEspecie(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
              required
            >
              <option value="">Selecione a espécie</option>
              {especiesOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex justify-between mt-3">
              <button
                onClick={cancelarFoto}
                className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                <FaTrash /> Refazer
              </button>
              <button
                onClick={confirmarFoto}
                disabled={!especie}
                className={`flex items-center gap-2 ${especie ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'} text-white px-4 py-2 rounded-md`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotaoArvore;