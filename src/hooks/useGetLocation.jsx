import { useEffect, useState, useRef } from "react";

function useGetLocation(isLastPost) {
    const [state, setState] = useState({
        coords: null,
        endereco: null,
        accuracy: null,
        error: null,
        isLoading: false
    });

    const watchIdRef = useRef(null);
    const lastRequestTime = useRef(0);

    // Coordenadas mockadas
    const MOCK_COORDS = [-23.5505, -46.6333];
    const MOCK_ACCURACY = 10;

    const buscarEndereco = async (lat, lon) => {
        try {
            // Controle de rate limiting
            const now = Date.now();
            const delay = Math.max(0, 500 - (now - lastRequestTime.current));
            await new Promise(resolve => setTimeout(resolve, delay));
            lastRequestTime.current = Date.now();

            // Verifica cache
            const cacheKey = `geocode_${lat.toFixed(4)}_${lon.toFixed(4)}`;
            const cachedData = sessionStorage.getItem(cacheKey);
            
            if (cachedData) {
                setState(prev => ({
                    ...prev,
                    endereco: JSON.parse(cachedData),
                    isLoading: false
                }));
                return;
            }

            setState(prev => ({ ...prev, isLoading: true }));

            const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
              if (!MAPBOX_TOKEN) {
            throw new Error("Mapbox token não configurado");
        }
            console.log("Token carregado:", MAPBOX_TOKEN); // Debug aqui
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=address&language=pt&access_token=${MAPBOX_TOKEN}`
            );

            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const data = await response.json();

            if (!data.features || data.features.length === 0) {
                throw new Error("Nenhum endereço encontrado");
            }

            const features = data.features[0]?.properties || {};
            const context = data.features[0]?.context || [];

            const enderecoData = {
                rua: features.address || "Rua não encontrada",
                cidade: context.find(c => c.id.includes("place"))?.text || "Cidade não encontrada",
                estado: context.find(c => c.id.includes("region"))?.text || null,
                cep: context.find(c => c.id.includes("postcode"))?.text || null,
                numero: features.address_number || null,
                bairro: context.find(c => c.id.includes("neighborhood"))?.text || null,
                completo: data.features[0]?.place_name || null,
            };

            // Armazena no cache
            sessionStorage.setItem(cacheKey, JSON.stringify(enderecoData));

            setState(prev => ({
                ...prev,
                endereco: enderecoData,
                isLoading: false,
                error: null
            }));

        } catch (err) {
            console.error("Erro ao buscar endereço:", err);
            setState(prev => ({
                ...prev,
                error: err.message,
                isLoading: false,
                endereco: null
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