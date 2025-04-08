import React, { useRef, useState } from "react";
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

export default BotaoCamera;