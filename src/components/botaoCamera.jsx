 import React, { useRef, useState, useEffect } from "react";
 import { FaCamera, FaSave, FaTimes } from "react-icons/fa";
 
 const BotaoCamera = ({ label, onFotoCapturada }) => {
   const videoRef = useRef(null);
   const [fotoCapturada, setFotoCapturada] = useState(null);
   const [stream, setStream] = useState(null);
   const [modoCamera, setModoCamera] = useState(false);
 
 // Atualize o useEffect de limpeza:
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
      // Já temos o File da foto capturada em capturarFoto
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