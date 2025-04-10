/*import { useEffect, useState } from "react";

function useGetLocation(isLastPost) {
  const [coords, setCoords] = useState(null);
  const [endereco, setEndereco] = useState(null);

  useEffect(() => {
    if (isLastPost) {
      // Coordenadas mockadas para o último poste
      const mockCoords = [-23.5505, -46.6333];
      setCoords(mockCoords);
      buscarEndereco(mockCoords[0], mockCoords[1]); // Busca o endereço das coordenadas mockadas
    } else {
      if (!navigator.geolocation) {
        console.error("Geolocalização não suportada pelo navegador.");
        return;
      }

      // Obtém as coordenadas atuais do usuário
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          setCoords([lat, lon]);
          buscarEndereco(lat, lon); // Busca o endereço com base nas coordenadas
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isLastPost]);*/
  import { useEffect, useState, useRef } from "react";

  function useGetLocation(isLastPost) {
    const [coords, setCoords] = useState(null);
    const [endereco, setEndereco] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [error, setError] = useState(null);
    const watchIdRef = useRef(null);
  
    useEffect(() => {
      if (isLastPost) {
        const mockCoords = [-23.5505, -46.6333];
        setCoords(mockCoords);
        buscarEndereco(mockCoords[0], mockCoords[1]);
        return;
      }
  
      if (!navigator.geolocation) {
        setError("Geolocalização não suportada pelo navegador.");
        return;
      }
  
      const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      };
  
      // Limpa watch anterior se existir
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
  
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setCoords([latitude, longitude]);
          setAccuracy(accuracy);
          buscarEndereco(latitude, longitude);
        },
        (err) => {
          setError(err.message);
          console.error("Erro ao obter localização:", err);
        },
        options
      );
  
      return () => {
        if (watchIdRef.current) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    }, [isLastPost]);  

  // Função para buscar o endereço com base nas coordenadas
  const buscarEndereco = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
      );
      const data = await response.json();

      if (data?.address) {
        const { road, city, town, village, postcode, house_number } = data.address;
        setEndereco({
          rua: road || "Rua desconhecida",
          cidade: city || town || village || "Cidade desconhecida",
          cep: postcode || "CEP não disponível",
          numero: house_number || "",
        });
      } else {
        setEndereco({
          rua: "Endereço não encontrado",
          cidade: "Cidade não encontrada",
          cep: "CEP não disponível",
          numero: "",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar endereço:", error);
      setEndereco({
        rua: "Erro ao buscar endereço",
        cidade: "Erro",
        cep: "Erro",
        numero: "Erro",
      });
    }
  };

  return { coords, endereco, accuracy, error };
  
}

export default useGetLocation;