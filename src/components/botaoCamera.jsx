/*import React, { useRef, useState } from "react";
import { FaCamera, FaSave, FaTimes } from "react-icons/fa";

const BotaoCamera = ({ label, onFotoCapturada }) => {
  const videoRef = useRef(null);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [cameraAberta, setCameraAberta] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const abrirCamera = async () => {
    try {
      const constraints = {
        video: { facingMode: "environment" },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    } catch (error) {
      console.error("Erro ao acessar a câmera:", error);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converter para Blob primeiro
    canvas.toBlob((blob) => {
      if (!blob) return;

       // Verifica se é uma imagem
    if (!blob.type.startsWith('image/')) {
      alert('Formato de arquivo inválido!');
      return;
  }

      // Criar um File a partir do Blob
      const file = new File([blob], `foto-${Date.now()}.png`, {
        type: "image/png",
      });

      // Atualizar estados
      const fotoURL = URL.createObjectURL(blob);
      setFotoCapturada(fotoURL);
      
      // Chamar callback com o File
      if (onFotoCapturada) {
        onFotoCapturada(file);
      }

      // Fechar câmera
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      setCameraAberta(false);
    }, "image/png", 0.8); // 0.8 = qualidade
  };

  const salvarFoto = () => {
    setSalvo(true);
    //alert("Foto pronta para envio!");
  };

  const cancelarFoto = () => {
    setFotoCapturada(null);
    setCameraAberta(false);
    setSalvo(false);
    if (onFotoCapturada) onFotoCapturada(null);
  };

  return (
    <div className="mb-8">
      {!cameraAberta && !fotoCapturada && (
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{label}</span>
          <button
            onClick={async () => {
              setCameraAberta(true);
              await abrirCamera();
            }}
            className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FaCamera className="text-lg" />
          </button>
        </div>
      )}

      {cameraAberta && (
        <div>
          <video
            ref={videoRef}
            width="400"
            height="300"
            className="block mt-4 border border-gray-300 rounded-md"
            muted
          />
          <div className="flex justify-between items-center mt-4">
            <span className="text-gray-700">Tirar Foto</span>
            <button
              onClick={capturarFoto}
              className="flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <FaCamera />
            </button>
          </div>
        </div>
      )}

      {fotoCapturada && (
        <div className="mt-4 text-center">
          <img
            src={fotoCapturada}
            alt="Foto capturada"
            className="w-1/4 mx-auto border border-gray-300 rounded-md"
          />
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={salvarFoto}
              disabled={salvo}
              className={`flex items-center gap-2 ${
                salvo ? "bg-green-700 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              } text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500`}
            >
              <FaSave /> {salvo ? "Pronto" : "Confirmar"}
            </button>
            <button
              onClick={cancelarFoto}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <FaTimes /> Refazer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotaoCamera;*/

import React, { useRef, useState, useEffect } from "react";
import { FaCamera, FaSave, FaTimes } from "react-icons/fa";

const BotaoCamera = ({ label, onFotoCapturada }) => {
  const videoRef = useRef(null);
  const [fotoCapturada, setFotoCapturada] = useState(null);
  const [stream, setStream] = useState(null);
  const [modoCamera, setModoCamera] = useState(false);

  // Limpar recursos ao desmontar
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const iniciarCamera = async () => {
    try {
      setFotoCapturada(null);
      setModoCamera(true);
      
      const constraints = { 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
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

      const file = new File([blob], `foto-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      setFotoCapturada(URL.createObjectURL(blob));
      setModoCamera(false);
      
      // Parar a câmera
      stream.getTracks().forEach(track => track.stop());
      setStream(null);

    }, "image/jpeg", 0.8);
  };

  const confirmarFoto = () => {
    if (fotoCapturada && onFotoCapturada) {
      // Converter a foto capturada em File novamente para enviar
      fetch(fotoCapturada)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `foto-${Date.now()}.jpg`, {
            type: "image/jpeg",
          });
          onFotoCapturada(file);
          setFotoCapturada(null);
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

  return (
    <div className="mb-4">
      {!modoCamera && !fotoCapturada && (
        <button
          onClick={iniciarCamera}
          className="flex items-center justify-between w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none"
        >
          <span>{label}</span>
          <FaCamera className="text-lg" />
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
          
          <div className="flex justify-between p-2 bg-gray-100">
            <button
              onClick={cancelarFoto}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
            >
              <FaTimes /> Refazer
            </button>
            <button
              onClick={confirmarFoto}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              <FaSave /> Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotaoCamera;