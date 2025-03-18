import React, { useRef, useState } from "react";
import { FaCamera, FaSave, FaTimes } from "react-icons/fa";

const BotaoCamera = ({ label, onFotoCapturada }) => {
  const videoRef = useRef(null); // Referência para o elemento <video>
  const [fotoCapturada, setFotoCapturada] = useState(null); // Estado para armazenar a foto capturada
  const [cameraAberta, setCameraAberta] = useState(false); // Estado para controlar se a câmera está aberta
  const [salvo, setSalvo] = useState(false); // Estado para controlar se a foto foi salva

  // Função para abrir a câmera
  const abrirCamera = async () => {
    try {
      // Solicita acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });

      // Verifica se o componente ainda está montado antes de atribuir o stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Tenta reproduzir o vídeo e trata erros
        videoRef.current.play().catch((error) => {
          console.error("Erro ao reproduzir o vídeo:", error);
        });
      }
    } catch (error) {
      console.error("Erro ao acessar a câmera:", error);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  // Função para lidar com o clique no botão "Abrir Câmera"
  const handleAbrirCamera = async () => {
    setCameraAberta(true); // Abre a câmera
    await abrirCamera(); // Inicia o stream de vídeo
  };

  // Função para capturar a foto
  const capturarFoto = () => {
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converte a imagem capturada para uma URL (base64)
    const fotoURL = canvas.toDataURL("image/png");
    setFotoCapturada(fotoURL);

    // Chama a função onFotoCapturada passada como prop
    if (onFotoCapturada) {
      onFotoCapturada(fotoURL);
    }

    // Fecha a câmera após a foto ser capturada
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop()); // Para todas as tracks do stream
    }

    setCameraAberta(false); // Fecha a câmera
  };

  // Função para salvar a foto
  const salvarFoto = () => {
    console.log("Foto salva:", fotoCapturada);
    alert("Foto salva com sucesso!");
    setSalvo(true); // Marca a foto como salva
  };

  // Função para cancelar a foto
  const cancelarFoto = () => {
    setFotoCapturada(null); // Remove a foto capturada
    setCameraAberta(false); // Fecha a câmera
    setSalvo(false); // Reseta o estado de "salvo"
  };

  return (
    <div className="mb-8">
      {/* Botão para abrir a câmera */}
      {!cameraAberta && !fotoCapturada && (
        <div className="flex justify-between items-center">
          <span className="text-gray-700">{label}</span> {/* Label à esquerda */}
          <button
            onClick={handleAbrirCamera}
            className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FaCamera className="text-lg" /> {/* Ícone de câmera */}
          </button>
        </div>
      )}

      {/* Elemento para exibir o vídeo da câmera */}
      {cameraAberta && (
        <div>
          <video
            ref={videoRef}
            width="400"
            height="300"
            className="block mt-4 border border-gray-300 rounded-md"
            muted // Adiciona o atributo muted para evitar problemas de autoplay
          />
          {/* Botão para capturar a foto */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-gray-700">Tirar Foto</span> {/* Label à esquerda */}
            <button
              onClick={capturarFoto}
              className="flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <FaCamera /> {/* Ícone de câmera */}
            </button>
          </div>
        </div>
      )}

      {/* Exibe a foto capturada em tamanho reduzido */}
      {fotoCapturada && (
        <div className="mt-4 text-center">
          <img
            src={fotoCapturada}
            alt="Foto capturada"
            className="w-1/4 mx-auto border border-gray-300 rounded-md"
          />
          {/* Botões Salvar e Cancelar */}
          <div className="mt-4 flex justify-center gap-4">
            <button
              onClick={salvarFoto}
              disabled={salvo} // Desabilita o botão após ser clicado
              className={`flex items-center gap-2 ${
                salvo ? "bg-green-700 cursor-not-allowed" : "bg-green-500 hover:bg-green-600"
              } text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500`}
            >
              <FaSave /> {salvo ? "Salvo" : "Salvar"} {/* Altera o texto do botão */}
            </button>
            <button
              onClick={cancelarFoto}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <FaTimes /> Cancelar {/* Ícone e label juntos */}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotaoCamera;