import { useEffect, useState, useRef } from "react";

/**
 * Hook customizado para obtenção de geolocalização e endereço
 * @param {boolean} isLastPost - Indica se é o último poste (usa coordenadas mockadas)
 * @returns {object} - Retorna coordenadas, endereço, precisão e erros
 */
function useGetLocation(isLastPost) {
    // Estados melhor organizados
    const [state, setState] = useState({
        coords: null,
        endereco: null,
        accuracy: null,
        error: null,
        isLoading: false
    });

    const watchIdRef = useRef(null);

    // Coordenadas mockadas centralizadas
    const MOCK_COORDS = [-23.5505, -46.6333];
    const MOCK_ACCURACY = 10;

    /**
     * Busca endereço reverso na API Nominatim
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     */
    const buscarEndereco = async (lat, lon) => {
        try {
            setState(prev => ({ ...prev, isLoading: true }));
            
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`,
                { signal: controller.signal }
            );

            clearTimeout(timeout);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            setState(prev => ({
                ...prev,
                endereco: {
                    rua: data.address?.road || "Rua desconhecida",
                    cidade: data.address?.city || 
                           data.address?.town || 
                           data.address?.village || 
                           "Cidade desconhecida",
                    cep: data.address?.postcode || "CEP não disponível",
                    numero: data.address?.house_number || "",
                    bairro: data.address?.suburb || 
                           data.address?.neighbourhood || 
                           null,
                },
                isLoading: false
            }));

        } catch (err) {
            console.error("Erro ao buscar endereço:", err);
            setState(prev => ({
                ...prev,
                endereco: {
                    rua: "Erro ao buscar endereço",
                    cidade: "Erro",
                    cep: "Erro",
                    numero: "",
                    bairro: null
                },
                error: "Não foi possível obter o endereço",
                isLoading: false
            }));
        }
    };

    useEffect(() => {
        const obterLocalizacao = async () => {
            try {
                setState(prev => ({ ...prev, isLoading: true }));

                if (isLastPost) {
                    setState({
                        coords: MOCK_COORDS,
                        accuracy: MOCK_ACCURACY,
                        error: null,
                        isLoading: false
                    });
                    await buscarEndereco(...MOCK_COORDS);
                    return;
                }

                if (!navigator.geolocation) {
                    throw new Error("Geolocalização não suportada pelo navegador");
                }

                const options = {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 15000,
                };

                // Limpa watch anterior se existir
                if (watchIdRef.current) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }

                watchIdRef.current = navigator.geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude, accuracy } = position.coords;
                        setState(prev => ({
                            ...prev,
                            coords: [latitude, longitude],
                            accuracy,
                            error: null
                        }));
                        buscarEndereco(latitude, longitude);
                    },
                    (err) => {
                        let errorMsg = "Erro na geolocalização";
                        
                        if (err.code === err.PERMISSION_DENIED) {
                            errorMsg = "Permissão de localização negada";
                        } else if (err.code === err.TIMEOUT) {
                            errorMsg = "Tempo de espera excedido";
                        }

                        setState(prev => ({
                            ...prev,
                            error: `${errorMsg}: ${err.message}`,
                            coords: null,
                            isLoading: false
                        }));
                    },
                    options
                );

            } catch (error) {
                console.error("Erro no hook useGetLocation:", error);
                setState(prev => ({
                    ...prev,
                    error: error.message,
                    isLoading: false
                }));
            }
        };

        obterLocalizacao();

        return () => {
            if (watchIdRef.current) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [isLastPost]);

    return { 
        coords: state.coords, 
        endereco: state.endereco, 
        accuracy: state.accuracy, 
        error: state.error,
        isLoading: state.isLoading
    };
}

export default useGetLocation;