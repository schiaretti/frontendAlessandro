/*import React, { useRef, useState } from "react";
import { FaCamera, FaSave, FaTimes } from "react-icons/fa";

const BotaoArvore = ({ label, onFotoCapturada }) => {
  const videoRef = useRef(null); // Referência para o elemento <video>
  const [fotoCapturada, setFotoCapturada] = useState(null); // Estado para armazenar a foto capturada
  const [cameraAberta, setCameraAberta] = useState(false); // Estado para controlar se a câmera está aberta
  const [proximoId, setProximoId] = useState(1); // Estado para gerar IDs únicos
  const [botaoDesabilitado, setBotaoDesabilitado] = useState(false); // Estado para desabilitar o botão "Tirar Foto"
  const [fotosSalvas, setFotosSalvas] = useState([]); // Estado para armazenar as fotos salvas

  // Função para abrir a câmera traseira
  const abrirCamera = async () => {
    try {
      // Solicita acesso à câmera traseira
      const constraints = {
        video: {
          facingMode: "environment", // Prioriza a câmera traseira
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
    setBotaoDesabilitado(true); // Desabilita o botão "Tirar Foto"

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Converte a imagem capturada para uma URL (base64)
    const fotoURL = canvas.toDataURL("image/png");

    // Obtém a localização atual
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Cria um objeto com os dados da foto
        const novaFoto = {
          id: proximoId, // ID único
          fotoURL, // URL da foto
          localizacao: { latitude, longitude }, // Localização
        };

        console.log("Dados da foto capturada:", novaFoto); // Depuração

        // Atualiza o estado das fotos
        setFotoCapturada(fotoURL);

        // Incrementa o ID para a próxima foto
        setProximoId((prevId) => prevId + 1);

        // Chama a função onFotoCapturada passada como prop
        if (onFotoCapturada) {
          onFotoCapturada(novaFoto);
        }

        // Fecha a câmera após a foto ser capturada
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject;
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop()); // Para todas as tracks do stream
        }

        setCameraAberta(false); // Fecha a câmera
      },
      (error) => {
        console.error("Erro ao obter localização:", error);
        alert("Não foi possível obter a localização. Verifique as permissões.");
        setBotaoDesabilitado(false); // Reabilita o botão "Tirar Foto" em caso de erro
      }
    );
  };

  // Função para salvar a foto
  const salvarFoto = () => {
    const novaFotoSalva = {
      id: proximoId - 1, // Usa o ID da última foto capturada
      fotoURL: fotoCapturada,
    };

    // Adiciona a foto à lista de fotos salvas
    setFotosSalvas((prevFotos) => [...prevFotos, novaFotoSalva]);

    console.log("Foto salva:", novaFotoSalva);
    alert("Foto salva com sucesso!");

    // Limpa a foto capturada e reabilita o botão "Tirar Foto"
    setFotoCapturada(null);
    setBotaoDesabilitado(false);
  };

  // Função para cancelar a foto
  const cancelarFoto = () => {
    setFotoCapturada(null); // Remove a foto capturada
    setCameraAberta(false); // Fecha a câmera
    setBotaoDesabilitado(false); // Reabilita o botão "Tirar Foto"
  };

  return (
    <div className="mb-8">
      {/* Botão para abrir a câmera */
     /* {!cameraAberta && !fotoCapturada && (
        /*<div className="flex justify-between items-center">
          <span className="text-gray-700">{label}</span> {/* Label à esquerda */
          /*<button
            onClick={handleAbrirCamera}
            className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FaCamera className="text-lg" /> {/* Ícone de câmera */
         // </button>
       /* </div>
      )}

      {/* Elemento para exibir o vídeo da câmera */
     /* {cameraAberta && (
        <div>
          <video
            ref={videoRef}
            width="400"
            height="300"
            className="block mt-4 border border-gray-300 rounded-md"
            muted // Adiciona o atributo muted para evitar problemas de autoplay
          />
          {/* Botão para capturar a foto */
         /* <button
            onClick={capturarFoto}
            disabled={botaoDesabilitado} // Desabilita o botão após a captura
            className={`mt-4 flex items-center justify-center bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 ${
              botaoDesabilitado ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FaCamera /> Tirar Foto
          </button>
        </div>
      )}

      {/* Exibe a foto capturada em tamanho reduzido */
     /* {fotoCapturada && (
        <div className="mt-4 text-center">
          <img
            src={fotoCapturada}
            alt="Foto capturada"
            className="w-1/4 mx-auto border border-gray-300 rounded-md"
          />
          {/* Botões Salvar e Cancelar */
        /*  <div className="mt-4 flex justify-center gap-20">
            <button
              onClick={salvarFoto}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <FaSave /> Salvar
            </button>
            <button
              onClick={cancelarFoto}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <FaTimes /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Exibe as fotos salvas lado a lado */
    /*  {fotosSalvas.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-bold mb-4">Fotos Salvas</h3>
          <div className="flex flex-wrap gap-4">
            {fotosSalvas.map((foto) => (
              <div key={foto.id} className="flex flex-col items-center">
                <img
                  src={foto.fotoURL}
                  alt={`Foto salva ${foto.id}`}
                  className="w-32 h-32 object-cover border border-gray-300 rounded-md"
                />
                <p className="text-center mt-2">ID: {foto.id}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão para tirar uma nova foto */
    /*  {fotosSalvas.length > 0 && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={handleAbrirCamera}
            className="flex items-center justify-center bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FaCamera className="text-lg" /> Tirar Nova Foto
          </button>
        </div>
      )}
    </div>
  );
};

export default BotaoArvore;*/

