import React, { useState, useEffect, useRef, useReducer, useCallback, useMemo } from "react";
import useGetLocation from "../../hooks/useGetLocation";
import Checkbox from "../../components/checkBox.jsx";
import BotaoCamera from "../../components/botaoCamera.jsx";
import ComboBox from "../../components/ComboBox.jsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { FaTrash } from "react-icons/fa6";
import { FaSave, FaRecycle, FaCheck, FaTimes, FaCamera, FaCheckCircle } from 'react-icons/fa';
import MedidorCamera from "../../components/MedidorCamera.jsx";

// Tipos de fotos permitidas
const TIPOS_FOTO = {
    PANORAMICA: 'PANORAMICA',
    LUMINARIA: 'LUMINARIA',
    ARVORE: 'ARVORE',
    TELECOM: 'TELECOM',
    LAMPADA: 'LAMPADA',
};

// Reducer para gerenciar o estado do formulário
function formReducer(state, action) {
    switch (action.type) {
        case 'UPDATE_FIELD':
            return { ...state, [action.field]: action.value };
        case 'RESET':
            return {
                ...initialState,
                ...(action.payload || {}), // Aceita os dados passados
                numeroIdentificacao: action.payload?.numeroIdentificacao || gerarNumeroAutomatico()
            };
        default:
            return state;
    }
}

const initialState = {
    cidade: "",
    enderecoInput: "",
    endereco: "",
    numero: "",
    cep: "",
    localizacao: "",
    emFrente: "",
    transformador: "",
    medicao: "",
    telecom: "",
    concentrador: "",
    poste: "",
    alturaposte: "",
    estruturaposte: "",
    tipoBraco: "",
    tamanhoBraco: "",
    quantidadePontos: "",
    tipoLampada: "",
    potenciaLampada: "",
    tipoReator: "",
    tipoComando: "",
    tipoRede: "",
    tipoCabo: "",
    numeroFases: "",
    tipoVia: "",
    hierarquiaVia: "",
    tipoPavimento: "",
    quantidadeFaixas: "",
    tipoPasseio: "",
    canteiroCentral: "",
    larguraCanteiro: "",
    finalidadeInstalacao: "",
    especieArvore: "",
    distanciaEntrePostes: "",
    numeroIdentificacao: "",
};

// Função para gerar número automático (movida para fora do componente)
const gerarNumeroAutomatico = () => {
    const numeroBase = Math.floor(10000 + Math.random() * 90000);
    const digitoVerificador = Math.floor(Math.random() * 10);
    return `${numeroBase}-${digitoVerificador}`;
};


function Cadastro() {
    // ==============================================
    // SEÇÃO 1: ESTADOS E REFERÊNCIAS (OTIMIZADO)
    // ==============================================

    // Referências do mapa
    const mapRef = useRef(null);
    const markersGroupRef = useRef(null);
    const mapInitialized = useRef(false);
    const mapClickHandler = useRef(null);
    const numerosUtilizadosRef = useRef([]);

    // Estados (mantidos iguais)
    const [state, dispatch] = useReducer(formReducer, {
        ...initialState,
        numeroIdentificacao: gerarNumeroAutomatico()
    });
    const [isLastPost, setIsLastPost] = useState(false);
    const [isFirstPostRegistered, setIsFirstPostRegistered] = useState(false);
    const [mostrarMapa, setMostrarMapa] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [localizacaoError, setLocalizacaoError] = useState(null);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [postesCadastrados, setPostesCadastrados] = useState([]);
    const [userAccuracy, setUserAccuracy] = useState(10);
    const [posteAnterior, setPosteAnterior] = useState(null);
    const [fotos, setFotos] = useState([]);
    const [isNumeroManual, setIsNumeroManual] = useState(false);
    const [erroFotos, setErroFotos] = useState(null);
    const [reutilizarDados, setReutilizarDados] = useState(false);
    const [fotoArvore, setFotoArvore] = useState(null);
    const [especieArvore, setEspecieArvore] = useState("");
    const [especieCustom, setEspecieCustom] = useState("");
    const [erroFotoArvore, setErroFotoArvore] = useState(null);
    const [erroEspecieArvore, setErroEspecieArvore] = useState(null);
    const [editingMarker, setEditingMarker] = useState(null);
    const [showEditButtons, setShowEditButtons] = useState(false);
    const [mapDraggingEnabled, setMapDraggingEnabled] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [enderecoEditado, setEnderecoEditado] = useState(false);
    const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
    const [modoMedicao, setModoMedicao] = useState(null); // 'referencia' ou 'canteiro'
    const [pontos, setPontos] = useState({ referencia: [], canteiro: [] });
    const [imagemMedida, setImagemMedida] = useState(null);
    const [tamanhoReferencia, setTamanhoReferencia] = useState(1); // 1 metro padrão
    const [isMedindo, setIsMedindo] = useState(false);
    const [fotoTemporaria, setFotoTemporaria] = useState(null);
    // Estados para notificação
    const [notificacao, setNotificacao] = useState({
        mostrar: false,
        mensagem: '',
        tipo: 'sucesso' // 'sucesso' | 'erro'
    });

    // Função para mostrar notificação
    const mostrarNotificacao = (mensagem, tipo = 'sucesso') => {
        setNotificacao({
            mostrar: true,
            mensagem,
            tipo
        });

        setTimeout(() => {
            setNotificacao(prev => ({ ...prev, mostrar: false }));
        }, 3000);
    };


    // Autenticação (otimizada com useMemo)
    const [token, setToken] = useState(localStorage.getItem('token'));
    const decoded = useMemo(() => token ? JSON.parse(atob(token.split('.')[1])) : null, [token]);
    const usuarioId = decoded?.id;

    // Redireciona se não autenticado (igual)
    if (!usuarioId) {
        alert('Usuário não autenticado. Redirecionando para login...');
        window.location.href = '/login';
        return null;
    }

    // Hook de localização (igual)
    const { coords: liveCoords, endereco, accuracy, error: locationError } = useGetLocation(isLastPost || isFirstPostRegistered);

    // ==============================================
    // SEÇÃO 2: FUNÇÕES AUXILIARES (OTIMIZADAS)
    // ==============================================

    const handleFieldChange = (field, value) => {
        dispatch({ type: 'UPDATE_FIELD', field, value });
    };


    // Função auxiliar para comparar arrays (otimizada)
    const arraysEqual = useCallback((a, b) => {
        if (!a || !b) return false;
        return a.length === b.length && a.every((val, index) => val === b[index]);
    }, []);

    // Preenche campos do endereço automaticamente
    useEffect(() => {
        if (endereco && !enderecoEditado) {
            dispatch({ type: 'UPDATE_FIELD', field: 'cidade', value: endereco.cidade || state.cidade });
            dispatch({ type: 'UPDATE_FIELD', field: 'enderecoInput', value: endereco.rua || state.enderecoInput });
            dispatch({ type: 'UPDATE_FIELD', field: 'endereco', value: endereco.rua || state.endereco });
            dispatch({ type: 'UPDATE_FIELD', field: 'cep', value: endereco.cep || state.cep });

            if (!isNumeroManual) {
                dispatch({ type: 'UPDATE_FIELD', field: 'numero', value: endereco.numero || state.numero });
            }

            if (endereco.bairro && !state.localizacao) {
                dispatch({ type: 'UPDATE_FIELD', field: 'localizacao', value: endereco.bairro });
            }
        }
    }, [endereco, isNumeroManual, enderecoEditado]);


    // Busca postes cadastrados - Versão otimizada
    const fetchPostesCadastrados = async () => {
        try {
            const response = await axios.get('https://backendalesandro-production.up.railway.app/api/listar-postes', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Processamento seguro dos postes
            const postesValidos = response.data.data
                .filter(poste => {
                    // Verifica se tem coordenadas válidas
                    const coords = poste.coords ||
                        (poste.latitude && poste.longitude ?
                            [poste.latitude, poste.longitude] :
                            null);

                    return coords &&
                        !isNaN(Number(coords[0])) &&
                        !isNaN(Number(coords[1]));
                })
                .map(poste => {
                    const coords = poste.coords || [poste.latitude, poste.longitude];
                    return {
                        ...poste,
                        coords: coords.map(Number),
                        numeroIdentificacao: poste.numeroIdentificacao || `Poste-${poste.id.slice(0, 8)}`
                    };
                });

            setPostesCadastrados(postesValidos);
            return postesValidos;
        } catch (error) {
            console.error("Erro ao buscar postes:", error);
            if (error.response?.status === 401) {
                handleLogout();
            }
            return [];
        }
    };

    // Função para atualizar a posição no backend
    const atualizarPosicaoPoste = async (posteId, lat, lng) => {
        try {
            console.log('Enviando atualização para API - Poste:', posteId, 'Coords:', { lat, lng });

            const resposta = await axios.put(
                `https://backendalesandro-production.up.railway.app/api/postes/${posteId}/localizacao`,
                { latitude: lat, longitude: lng },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            if (!resposta.data?.success) {
                throw new Error(resposta.data?.message || 'Resposta do servidor sem sucesso');
            }

            console.log('Atualização no backend realizada com sucesso');
            return resposta.data;

        } catch (erro) {
            console.error('[API ERRO] Detalhes do erro:', {
                message: erro.message,
                status: erro.response?.status,
                data: erro.response?.data
            });

            let mensagemErro = 'Erro ao atualizar posição';
            if (erro.response) {
                if (erro.response.status === 401) {
                    mensagemErro = 'Autenticação falhou - faça login novamente';
                } else if (erro.response.data?.message) {
                    mensagemErro = erro.response.data.message;
                }
            }

            throw new Error(mensagemErro);
        }
    };


    // ==============================================
    // SEÇÃO 3: FUNÇÕES DO MAPA (CORRIGIDAS)
    // ==============================================

    // Inicialização otimizada do mapa
    const initMap = useCallback(() => {
        const mapContainer = document.getElementById('mapa');
        if (!mapContainer || mapInitialized.current) return;

        // Cria o mapa
        mapRef.current = L.map('mapa', {
            zoomControl: true,
            preferCanvas: true
        }).setView(userCoords, 18);

        // Adiciona camada de tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapRef.current);

        // Inicializa grupo de marcadores
        markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
        mapInitialized.current = true;

        // Atualiza marcadores
        updateUserMarker(userCoords);
        addPostMarkers();
    }, [userCoords]);

    // Atualização otimizada do marcador do usuário
    const updateUserMarker = useCallback((coords) => {
        if (!mapRef.current || !coords || coords.length !== 2) return;

        // Se o marcador já existe, apenas atualiza sua posição
        if (mapRef.current.userMarker) {
            mapRef.current.userMarker.setLatLng(coords);
        } else {
            // Cria novo marcador apenas se não existir
            mapRef.current.userMarker = L.circleMarker(coords, {
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 1,
                radius: 8
            }).addTo(mapRef.current)
                .bindPopup('Sua localização atual');
        }

        // Lógica de edição
        if (editMode && selectedMarker) {
            const newPos = L.latLng(coords);
            selectedMarker.setLatLng(newPos);
            selectedMarker._posteData.tempPosition = newPos;

            selectedMarker.setPopupContent(`
                <div class="p-2">
                    <strong>${selectedMarker.options.posteId}</strong>
                    <div class="text-yellow-600 text-xs font-bold">
                        Nova posição:<br>
                        Lat: ${newPos.lat.toFixed(6)}<br>
                        Lng: ${newPos.lng.toFixed(6)}
                    </div>
                </div>
            `);
        }
    }, [editMode, selectedMarker]);

    // Adição de marcadores otimizada
    const addPostMarkers = useCallback(() => {
        try {
            if (!mapRef.current || !markersGroupRef.current) {
                console.warn('Referências do mapa não disponíveis');
                return;
            }

            // Remove o handler de clique anterior se existir
            if (mapClickHandler.current) {
                mapRef.current.off('click', mapClickHandler.current);
            }

            // Se já temos marcadores e não estamos editando, não recrie
            if (markersGroupRef.current.getLayers().length > 0 && !editMode) {
                return;
            }

            // Cria um novo handler de clique
            const handleMapClick = (e) => {
                if (editingMarker) {
                    console.log('Marcador em edição:', editingMarker.options.posteId);
                }
            };

            // Registra o novo handler
            mapRef.current.on('click', handleMapClick);
            mapClickHandler.current = handleMapClick;

            // Limpa marcadores existentes
            markersGroupRef.current.clearLayers();

            // Cria novos marcadores
            postesCadastrados.forEach((poste) => {
                const [lat, lng] = poste.coords || [poste.latitude, poste.longitude];
                if (!lat || !lng) return;

                // Cria um ícone personalizado com o número do poste
                const numeroDisplay = poste.numeroIdentificacao
                    ? poste.numeroIdentificacao.split('-')[0]
                    : poste.id.slice(0, 4);

                const marker = L.marker([lat, lng], {
                    draggable: false,
                    posteId: poste.id,
                    icon: L.divIcon({
                        html: '<div class="bg-green-600 rounded-full w-4 h-4 border border-black absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>',
                        className: '',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                });

                // Armazena dados do poste
                marker._posteData = {
                    originalPosition: { lat, lng },
                    tempPosition: { lat, lng },
                    isEditing: false
                };

                marker.on('click', () => {
                    if (editMode) {
                        selectMarkerForEdit(marker);
                    } else {
                        marker.openPopup();
                    }
                });

                marker.bindPopup(`
                    <div class="p-2">
                        <strong>${poste.numeroIdentificacao || poste.id}</strong>
                        <div class="text-xs">
                            Lat: ${lat.toFixed(6)}<br>
                            Lng: ${lng.toFixed(6)}
                        </div>
                    </div>
                `);

                markersGroupRef.current.addLayer(marker);
            });

        } catch (error) {
            console.error('Erro ao adicionar marcadores:', error);
        }
    }, [postesCadastrados, editMode, editingMarker]);


    // Funções de edição otimizadas
    const startEditMode = useCallback(() => {
        setEditMode(true);
        setShowEditButtons(false);

        if (mapRef.current) {
            mapRef.current.getContainer().style.cursor = 'pointer';
        }
    }, []);

    const selectMarkerForEdit = useCallback((marker) => {
        if (!editMode) return;

        if (selectedMarker) {
            selectedMarker.setIcon(L.divIcon({
                html: '<div class="bg-green-600 rounded-full w-6 h-6 border-2 border-white"></div>',
                className: ''
            }));
        }

        setSelectedMarker(marker);

        marker.setIcon(L.divIcon({
            html: '<div class="bg-yellow-500 rounded-full w-8 h-8 border-2 border-white animate-pulse"></div>',
            className: ''
        }));

        if (mapRef.current?.userMarker) {
            const userPos = mapRef.current.userMarker.getLatLng();
            marker.setLatLng(userPos);
            marker._posteData.tempPosition = userPos;

            marker.setPopupContent(`
                <div class="p-2">
                    <strong>${marker.options.posteId}</strong>
                    <div class="text-yellow-600 text-xs font-bold">
                        Nova posição:<br>
                        Lat: ${userPos.lat.toFixed(6)}<br>
                        Lng: ${userPos.lng.toFixed(6)}
                    </div>
                </div>
            `);
        }

        setShowEditButtons(true);
        marker.openPopup();
    }, [editMode, selectedMarker]);

    const exitEditMode = useCallback(() => {
        setEditMode(false);
        setSelectedMarker(null);
        setShowEditButtons(false);

        if (mapRef.current) {
            mapRef.current.getContainer().style.cursor = '';
        }
    }, []);

    const cancelEdit = useCallback(() => {
        if (selectedMarker) {
            selectedMarker.setLatLng(selectedMarker._posteData.originalPosition);
            selectedMarker.setIcon(L.divIcon({
                html: '<div class="bg-green-600 rounded-full w-6 h-6 border-2 border-white"></div>',
                className: ''
            }));
        }
        exitEditMode();
    }, [selectedMarker, exitEditMode]);

    const savePosition = useCallback(async () => {
        if (!selectedMarker) return;

        try {
            const newPos = selectedMarker._posteData.tempPosition;

            await atualizarPosicaoPoste(selectedMarker.options.posteId, newPos.lat, newPos.lng);

            setPostesCadastrados(prev =>
                prev.map(poste =>
                    poste.id === selectedMarker.options.posteId
                        ? {
                            ...poste,
                            latitude: newPos.lat,
                            longitude: newPos.lng,
                            coords: [newPos.lat, newPos.lng]
                        }
                        : poste
                )
            );

            selectedMarker.setIcon(L.divIcon({
                html: '<div class="bg-yellow-500 rounded-full w-6 h-6 border border-black animate-pulse absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>',
                className: '',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            }));

            selectedMarker._posteData.originalPosition = newPos;
            exitEditMode();

        } catch (error) {
            console.error('Erro ao salvar posição:', error);
            alert(`Erro: ${error.message}`);
            cancelEdit();
        }
    }, [selectedMarker, exitEditMode, cancelEdit]);

    // ==============================================
    // SEÇÃO 4: EFEITOS COLATERAIS (OTIMIZADOS)
    // ==============================================

    // Atualiza coordenadas quando o hook retorna novas
    useEffect(() => {
        if (liveCoords && !isLastPost && !arraysEqual(liveCoords, userCoords)) {
            setUserCoords(liveCoords);
            setUserAccuracy(accuracy);

            if (mostrarMapa && mapInitialized.current) {
                updateUserMarker(liveCoords);
            }
        }
    }, [liveCoords, accuracy, isLastPost, userCoords, mostrarMapa, updateUserMarker, arraysEqual]);

    // Inicialização do mapa
    useEffect(() => {
        if (mostrarMapa && userCoords && !mapInitialized.current) {
            initMap();
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.off();
                mapRef.current.remove();
                mapRef.current = null;
                markersGroupRef.current = null;
                mapInitialized.current = false;
            }
        };
    }, [mostrarMapa, userCoords, initMap]);

    // Atualiza marcadores quando postes mudam
    useEffect(() => {
        if (mapInitialized.current) {
            const timer = setTimeout(() => {
                addPostMarkers();
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [postesCadastrados, addPostMarkers]);

    useEffect(() => {
        if (mapInitialized.current && postesCadastrados.length > 0) {
            addPostMarkers();
        }
    }, [postesCadastrados, addPostMarkers]);

    const handleEnderecoChange = (e) => {
        setEnderecoEditado(true); // Marca que o usuário editou manualmente
        dispatch({ type: 'UPDATE_FIELD', field: 'enderecoInput', value: e.target.value });
        dispatch({ type: 'UPDATE_FIELD', field: 'endereco', value: e.target.value });
    };




    const reutilizarDadosPosteAnterior = async () => {
        // Verificação segura dos dados necessários
        if (!posteAnterior || !Array.isArray(userCoords) || userCoords.length !== 2) {
            alert(posteAnterior
                ? "Localização atual inválida. Obtenha uma nova localização primeiro."
                : "Nenhum poste anterior disponível para reutilização.");
            return;
        }

        try {
            // 1. Calcula distância com validação
            const distancia = posteAnterior.coords?.length === 2
                ? calcularDistancia(
                    posteAnterior.coords[0],
                    posteAnterior.coords[1],
                    userCoords[0],
                    userCoords[1]
                )
                : null;

            // 2. Prepara os dados com proteção contra undefined
            const dadosReutilizados = {
                ...initialState, // Garante todos os campos do estado
                ...posteAnterior, // Sobrescreve com dados do poste anterior
                numeroIdentificacao: gerarNumeroAutomatico(),
                coords: [...userCoords], // Cópia do array
                latitude: userCoords[0],
                longitude: userCoords[1],
                distanciaEntrePostes: distancia,
                fotos: []
            };

            // 3. Remove campos não utilizados no formulário
            const camposParaManter = Object.keys(initialState);
            Object.keys(dadosReutilizados).forEach(key => {
                if (!camposParaManter.includes(key)) {
                    delete dadosReutilizados[key];
                }
            });

            // 4. Atualização otimizada do estado
            dispatch({
                type: 'RESET',
                payload: dadosReutilizados // Sobrescreve todo o estado
            });

            // 5. Atualiza o mapa de forma segura
            try {
                await fetchPostesCadastrados();
            } catch (error) {
                console.warn("Erro ao atualizar postes no mapa:", error);
                // Não impede o fluxo principal
            }

            // Feedback visual (opcional)
            setFotos([]);
            setReutilizarDados(true);

        } catch (error) {
            console.error("Falha crítica ao reutilizar dados:", {
                error: error.message,
                posteAnterior,
                userCoords
            });
            alert(`Falha ao reutilizar dados: ${error.message || 'Erro desconhecido'}`);
        }
    };

    const obterLocalizacaoUsuario = async () => {
        setLocalizacaoError(null);
        setIsLoadingLocation(true);
        setMostrarMapa(false);

        try {
            if (!navigator.geolocation) {
                throw new Error("Geolocalização não suportada pelo navegador");
            }

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            });

            const { latitude, longitude, accuracy } = position.coords;
            const newCoords = [latitude, longitude];

            setUserCoords(newCoords);
            setUserAccuracy(accuracy);

            if (reutilizarDados) {
                setFotos([]);
                setReutilizarDados(false);
            } else {
                dispatch({ type: 'RESET' });
                setFotos([]);
            }

            try {
                await fetchPostesCadastrados();
            } catch (error) {
                console.warn("Erro ao carregar postes", error);
            }

            setMostrarMapa(true);
        } catch (error) {
            console.error("Falha na obtenção de localização:", error);
            handleLocationError(error);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Trata erros de localização
    const handleLocationError = (error) => {
        let errorMessage = "Não foi possível obter localização precisa.";

        if (error.code === error.PERMISSION_DENIED) {
            errorMessage = "Permissão de localização negada. Por favor, habilite no navegador.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = "Localização indisponível. Verifique sua conexão ou GPS.";
        } else if (error.code === error.TIMEOUT) {
            errorMessage = "Tempo de espera excedido. Tente novamente em área aberta.";
        } else if (error.message.includes('token')) {
            errorMessage = "Sessão expirada. Redirecionando para login...";
            handleLogout();
        }

        setLocalizacaoError(errorMessage);

        if (!userCoords) {
            setUserCoords([-23.5505, -46.6333]);
            setMostrarMapa(true);
        }
    };

    // Fecha o mapa
    const fecharMapa = () => {
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
            markersGroupRef.current = null;
        }
        setMostrarMapa(false);
    };

    const MedicaoCamera = () => {
        const canvasRef = useRef(null);

        const handleFotoTirada = (foto) => {
            setImagemMedida(foto);
            setModoMedicao('referencia');
        };

        const handleClickImagem = (e) => {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (modoMedicao === 'referencia' && pontos.referencia.length < 2) {
                setPontos(prev => ({ ...prev, referencia: [...prev.referencia, { x, y }] }));
            } else if (modoMedicao === 'canteiro' && pontos.canteiro.length < 2) {
                setPontos(prev => ({ ...prev, canteiro: [...prev.canteiro, { x, y }] }));
            }
        };

        // Calcula distância em pixels entre dois pontos
        const calcularDistanciaPixels = (pontoA, pontoB) => {
            return Math.sqrt(Math.pow(pontoB.x - pontoA.x, 2) + Math.pow(pontoB.y - pontoA.y, 2));
        };

        // Calcula a largura real
        const calcularLargura = () => {
            if (pontos.referencia.length === 2 && pontos.canteiro.length === 2) {
                const pixelsReferencia = calcularDistanciaPixels(pontos.referencia[0], pontos.referencia[1]);
                const pixelsCanteiro = calcularDistanciaPixels(pontos.canteiro[0], pontos.canteiro[1]);
                return (pixelsCanteiro * tamanhoReferencia) / pixelsReferencia;
            }
            return null;
        };

        return (
            <div>
                <BotaoCamera onFotoCapturada={handleFotoTirada} label="Tirar foto para medição" />

                {imagemMedida && (
                    <div className="relative">
                        <img
                            src={imagemMedida}
                            alt="Medição"
                            className="max-w-full h-auto"
                        />
                        <canvas
                            ref={canvasRef}
                            onClick={handleClickImagem}
                            className="absolute inset-0 w-full h-full cursor-crosshair"
                        />

                        <div className="my-2">
                            {modoMedicao === 'referencia' && (
                                <div>
                                    <p>Marque <strong>dois pontos</strong> no objeto de referência (ex: trena de 1m)</p>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={tamanhoReferencia}
                                        onChange={(e) => setTamanhoReferencia(parseFloat(e.target.value))}
                                        placeholder="Tamanho real da referência (metros)"
                                    />
                                </div>
                            )}

                            {pontos.referencia.length === 2 && (
                                <button onClick={() => setModoMedicao('canteiro')}>
                                    Agora marque a largura do canteiro
                                </button>
                            )}

                            {pontos.canteiro.length === 2 && (
                                <div className="bg-green-100 p-2">
                                    Largura calculada: <strong>{calcularLargura().toFixed(2)} metros</strong>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Helper para nomes de tipos de foto
    const getNomeTipoFoto = (tipo) => {
        const nomes = {
            [TIPOS_FOTO.PANORAMICA]: 'Panorâmica',
            [TIPOS_FOTO.LUMINARIA]: 'Luminária',
            [TIPOS_FOTO.TELECOM]: 'Telecom',
            [TIPOS_FOTO.ARVORE]: 'Árvore',
            [TIPOS_FOTO.LAMPADA]: '2° Tipo Luminária'
        };
        return nomes[tipo] || 'Desconhecido';
    };



    const handleAdicionarFoto = async (tipo, arquivoOuObjeto, metadados = {}) => {
        try {
            let arquivo, dadosAdicionais = {};

            // Aceita File OU objeto com { file, especie, coords }
            if (arquivoOuObjeto instanceof File) {
                arquivo = arquivoOuObjeto;
                if (tipo === TIPOS_FOTO.ARVORE) {
                    throw new Error('Para árvores, envie um objeto com { file, especie, coords }');
                }
            } else if (arquivoOuObjeto?.file instanceof File) {
                arquivo = arquivoOuObjeto.file;

                // Validação reforçada para árvores
                if (tipo === TIPOS_FOTO.ARVORE) {
                    if (!arquivoOuObjeto.especie?.trim()) {
                        throw new Error('Espécie da árvore é obrigatória');
                    }

                    // CORREÇÃO PRINCIPAL: Garante o formato [latitude, longitude] para as coordenadas
                    const coords = arquivoOuObjeto.coords || userCoords;
                    if (!coords || coords.length !== 2) {
                        throw new Error('Coordenadas inválidas para a árvore');
                    }

                    dadosAdicionais = {
                        especie: arquivoOuObjeto.especie,
                        coords: coords, // Armazena como array [lat, lng]

                    };
                }
            } else {
                throw new Error('Formato inválido. Envie um File ou { file: File, especie: string, coords? }');
            }

            const novaFoto = {
                arquivo,
                tipo,
                ...dadosAdicionais,
                ...metadados,
                id: `${tipo}-${Date.now()}`,
                nome: getNomeTipoFoto(tipo),
            };

            setFotos(prev => [...prev, novaFoto]);
            return true;

        } catch (error) {
            console.error('Erro ao adicionar foto:', error);
            setErroFotos(error.message);
            return false;
        }
    };

    // ==============================================
    // CÁLCULOS GEOESPACIAIS
    // ==============================================

    const calcularDistancia = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Raio da Terra em metros
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c);
    };

    // Monitora mudanças de posição para cálculo automático de distância

    useEffect(() => {
        // 1. Verificação inicial simplificada
        if (!posteAnterior?.coords || !userCoords) {
            dispatch({
                type: 'UPDATE_FIELD',
                field: 'distanciaEntrePostes',
                value: ''
            });
            return;
        }

        // 2. Verificação de coordenadas iguais
        if (arraysEqual(posteAnterior.coords, userCoords)) {
            dispatch({
                type: 'UPDATE_FIELD',
                field: 'distanciaEntrePostes',
                value: '0 metros (mesma localização)'
            });
            return;
        }

        // 3. Cálculo seguro da distância
        try {
            const [lat1, lon1] = posteAnterior.coords;
            const [lat2, lon2] = userCoords;

            // Verificação adicional de coordenadas válidas
            if (
                typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
                typeof lat2 !== 'number' || typeof lon2 !== 'number' ||
                isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)
            ) {
                throw new Error('Coordenadas inválidas');
            }

            const distancia = Math.round(calcularDistancia(lat1, lon1, lat2, lon2));
            dispatch({
                type: 'UPDATE_FIELD',
                field: 'distanciaEntrePostes',
                value: distancia > 0 ? `${distancia} metros` : '0 metros (mesma localização)'
            });

        } catch (error) {
            console.error("Erro no cálculo de distância:", {
                error: error.message,
                coordsAnterior: posteAnterior?.coords,
                coordsAtual: userCoords
            });

            dispatch({
                type: 'UPDATE_FIELD',
                field: 'distanciaEntrePostes',
                value: 'Erro no cálculo'
            });
        }
    }, [userCoords, posteAnterior]);


    const handleSalvarCadastro = async () => {
        // Primeiro, definimos todos os campos obrigatórios do formulário
        const camposObrigatorios = [
            { campo: 'cidade', nome: 'Cidade' },
            { campo: 'endereco', nome: 'Endereço' },
            { campo: 'numero', nome: 'Número' },
            { campo: 'cep', nome: 'CEP' },
            { campo: 'transformador', nome: 'Transformador' },
            { campo: 'medicao', nome: 'Medição' },
            { campo: 'poste', nome: 'Tipo de Poste' },
            { campo: 'alturaposte', nome: 'Altura do Poste' },
            { campo: 'tipoLampada', nome: 'Tipo de Lâmpada' },
            { campo: 'potenciaLampada', nome: 'Potência da Lâmpada' }
        ];

        // Verificamos quais campos obrigatórios não foram preenchidos
        const camposNaoPreenchidos = camposObrigatorios
            .filter((item) => !state[item.campo]?.toString().trim())
            .map((item) => item.nome);

        // Se houver campos não preenchidos, mostramos um alerta e interrompemos a função
        if (camposNaoPreenchidos.length > 0) {
            alert(`Por favor, preencha os seguintes campos obrigatórios:\n${camposNaoPreenchidos.join(', ')}`);
            return;
        }

        try {
            // Calculamos a distância entre postes se existir um poste anterior
            let distanciaEntrePostesCalculada = null;
            if (posteAnterior?.coords) {
                distanciaEntrePostesCalculada = Math.round(
                    calcularDistancia(
                        posteAnterior.coords[0],
                        posteAnterior.coords[1],
                        userCoords[0],
                        userCoords[1]
                    )
                );
            }

            // Criamos um novo objeto FormData para enviar os dados
            const formularioDados = new FormData();

            // Preparamos todos os dados que serão enviados
            const dadosParaEnviar = {
                cidade: state.cidade,
                endereco: state.endereco,
                numero: state.numero,
                cep: state.cep,
                localizacao: state.localizacao || null,
                emFrente: state.emFrente || null,
                transformador: state.transformador,
                medicao: state.medicao,
                telecom: state.telecom,
                concentrador: state.concentrador,
                poste: state.poste,
                alturaposte: state.alturaposte ? parseFloat(state.alturaposte) : null,
                estruturaposte: state.estruturaposte,
                tipoBraco: state.tipoBraco,
                tamanhoBraco: state.tamanhoBraco ? parseFloat(state.tamanhoBraco) : null,
                quantidadePontos: state.quantidadePontos ? parseInt(state.quantidadePontos) : null,
                tipoLampada: state.tipoLampada,
                potenciaLampada: state.potenciaLampada ? parseInt(state.potenciaLampada) : null,
                tipoReator: state.tipoReator,
                tipoComando: state.tipoComando,
                tipoRede: state.tipoRede,
                tipoCabo: state.tipoCabo,
                numeroFases: state.numeroFases,
                tipoVia: state.tipoVia,
                hierarquiaVia: state.hierarquiaVia,
                tipoPavimento: state.tipoPavimento,
                quantidadeFaixas: state.quantidadeFaixas ? parseInt(state.quantidadeFaixas) : null,
                tipoPasseio: state.tipoPasseio,
                canteiroCentral: state.canteiroCentral === 'Sim',
                larguraCanteiro: state.larguraCanteiro ? parseInt(state.larguraCanteiro) : null,
                finalidadeInstalacao: state.finalidadeInstalacao,
                numeroIdentificacao: state.numeroIdentificacao,
                coords: JSON.stringify([userCoords[0], userCoords[1]]),
                latitude: userCoords[0],
                longitude: userCoords[1],
                usuarioId: usuarioId,
                isLastPost: state.isLastPost === 'true',
                distanciaEntrePostes: distanciaEntrePostesCalculada
            };

            // Adicionamos cada campo ao FormData
            Object.entries(dadosParaEnviar).forEach(([chave, valor]) => {
                if (valor !== null && valor !== undefined) {
                    formularioDados.append(chave, valor.toString());
                }
            });

            // Verificamos se as fotos obrigatórias foram adicionadas
            const tiposDeFotosEnviadas = fotos.map((foto) => foto.tipo);
            const fotosObrigatorias = ['PANORAMICA', 'LUMINARIA'];
            const fotosFaltando = fotosObrigatorias.filter(
                (tipo) => !tiposDeFotosEnviadas.includes(tipo)
            );

            if (fotosFaltando.length > 0) {
                throw new Error(`Fotos obrigatórias não adicionadas: ${fotosFaltando.join(', ')}`);
            }

            // Adicionamos cada foto ao FormData
            fotos.forEach((foto, indice) => {
                formularioDados.append(`fotos`, foto.arquivo);
                formularioDados.append(`tipos`, foto.tipo);

                if (foto.tipo === 'ARVORE') {
                    formularioDados.append(`especies`, foto.especie);
                    const coordenadas = foto.coords || userCoords;
                    formularioDados.append(`latitudes`, coordenadas[0].toString());
                    formularioDados.append(`longitudes`, coordenadas[1].toString());
                }
            });

            // Mostramos os dados no console para debug
            console.log('Dados que serão enviados:', {
                dadosPrincipais: dadosParaEnviar,
                fotos: {
                    total: fotos.length,
                    panoramica: fotos.some((f) => f.tipo === 'PANORAMICA'),
                    luminaria: fotos.some((f) => f.tipo === 'LUMINARIA'),
                    arvores: fotos.filter((f) => f.tipo === 'ARVORE').length
                }
            });

            // Enviamos os dados para o servidor
            const resposta = await axios.post(
                'https://backendalesandro-production.up.railway.app/api/postes',
                formularioDados,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            // Se a resposta for positiva
            if (resposta.data.success) {
                const mostrarNotificacao = (mensagem, tipo = 'sucesso') => {
                    setNotificacao({
                        mostrar: true,
                        mensagem,
                        tipo
                    });

                    setTimeout(() => {
                        setNotificacao(prev => ({ ...prev, mostrar: false }));
                    }, 3000);
                };;

                const novoPoste = {
                    ...state,
                    id: resposta.data.id || Date.now().toString(),
                    coords: userCoords,
                    latitude: userCoords[0],
                    longitude: userCoords[1],
                    numeroIdentificacao: state.numeroIdentificacao
                };

                // Atualizamos o poste anterior com os dados atuais
                setPosteAnterior(
                    novoPoste
                );

                setPostesCadastrados(prevPostes => [...prevPostes, novoPoste]);

                // Limpamos as fotos
                setFotos([]);
                dispatch({
                    type: 'UPDATE_FIELD',
                    field: 'localizacao',
                    value: ""
                });

                // Atualiza o mapa para mostrar o novo marcador
                if (mapRef.current && markersGroupRef.current) {
                    addPostMarkers();
                }

            } else {
                throw new Error(resposta.data.message || 'Erro ao cadastrar no servidor');
            }

        } catch (erro) {
            console.error('Erro ao salvar cadastro:', erro);

            let mensagemErro = 'Erro ao cadastrar poste';
            if (erro.response?.data?.message) {
                mensagemErro = erro.response.data.message;
            } else if (erro.message) {
                mensagemErro = erro.message;
            }

            alert(mensagemErro);
        }
    };

    // ==============================================
    // SEÇÃO 5: RENDERIZAÇÃO
    // ==============================================

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                    <h1 className="text-2xl font-bold text-center mb-6 bg-slate-600 text-white p-2 rounded-lg">
                        Cadastro de Postes
                    </h1>



                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Número do Poste
                        </label>
                        <input
                            type="text"
                            value={state.numeroIdentificacao || ""}
                            onChange={(e) => handleFieldChange('numeroIdentificacao', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Número gerado automaticamente - edite se necessário
                        </p>
                    </div>




                    {/* Campos de Localização */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Latitude</label>
                            <input
                                type="text"
                                value={userCoords ? userCoords[0] : ""}
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Longitude</label>
                            <input
                                type="text"
                                value={userCoords ? userCoords[1] : ""}
                                readOnly
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cidade</label>
                            <input
                                type="text"
                                value={state.cidade}
                                onChange={(e) => handleFieldChange('cidade', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                value={state.enderecoInput || ""}
                                onChange={handleEnderecoChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                            />
                            {enderecoEditado && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEnderecoEditado(false);
                                        // Disparar o preenchimento automático novamente
                                        if (endereco) {
                                            dispatch({ type: 'UPDATE_FIELD', field: 'enderecoInput', value: endereco.rua });
                                            dispatch({ type: 'UPDATE_FIELD', field: 'endereco', value: endereco.rua });
                                        }
                                    }}
                                    className="absolute right-2 top-2 text-xs text-blue-500 hover:text-blue-700"
                                >
                                    Restaurar automático
                                </button>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Número</label>
                            <input
                                type="text"
                                value={state.numero}
                                onChange={(e) => {
                                    handleFieldChange('numero', e.target.value);
                                    setIsNumeroManual(true);
                                }}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">CEP</label>
                            <input
                                type="text"
                                value={state.cep}
                                onChange={(e) => handleFieldChange('cep', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">BAIRRO</label>
                            <input
                                type="text"
                                value={state.localizacao}
                                onChange={(e) => handleFieldChange('localizacao', e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <ComboBox
                            label="Selecione:"
                            options={[
                                { value: "Em frente", label: "Em frente" },
                                { value: "Sem número", label: "Sem número" },
                                { value: "Em frente ao oposto", label: "Em frente ao oposto" },
                            ]}
                            onChange={(value) => handleFieldChange('emFrente', value)}
                        />
                    </div>

                    {/* Seção de Fotos */}
                    <div className="space-y-4"> {/* Adiciona espaçamento consistente entre as seções */}

                        {/* Foto Panorâmica */}
                        <div className="bg-gray-50 rounded-lg overflow-hidden"> {/* Remove borda e padding interno */}
                            <div className="p-4">
                                <BotaoCamera
                                    id="foto-panoramica"
                                    label="Foto Panorâmica"
                                    onFotoCapturada={(file) => handleAdicionarFoto(TIPOS_FOTO.PANORAMICA, file)}
                                    obrigatorio={true}
                                    erro={erroFotos?.includes('Panorâmica')}
                                />
                                <p className="text-center text-sm mt-2 font-medium">
                                    PANORÂMICA<span className="text-red-500">*</span>
                                    {fotos.some(f => f.tipo === TIPOS_FOTO.PANORAMICA) ? (
                                        <span className="text-green-500 ml-2">✓ Adicionada</span>
                                    ) : (
                                        <span className="text-gray-500 ml-2">(Obrigatória)</span>
                                    )}
                                </p>
                            </div>
                            <div className="border-t border-gray-200 h-[3px]"></div> {/* Substitui o hr */}
                        </div>

                        {/* Foto Luminária */}
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <div className="p-4">
                                <BotaoCamera
                                    id="foto-Luminaria"
                                    label="Foto Luminária"
                                    onFotoCapturada={(file) => handleAdicionarFoto(TIPOS_FOTO.LUMINARIA, file)}
                                    obrigatorio={true}
                                    erro={erroFotos?.includes('Luminária')}
                                />
                                <p className="text-center text-sm mt-2 font-medium">
                                    LUMINÁRIA<span className="text-red-500">*</span>
                                    {fotos.some(f => f.tipo === TIPOS_FOTO.LUMINARIA) ? (
                                        <span className="text-green-500 ml-2">✓ Adicionada</span>
                                    ) : (
                                        <span className="text-gray-500 ml-2">(Obrigatória)</span>
                                    )}
                                </p>
                            </div>
                            <div className="border-t border-gray-200 h-[3px]"></div>
                        </div>

                        {/* Foto Telecom */}
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <div className="p-4">
                                <BotaoCamera
                                    id="foto-telecom"
                                    label="Foto Telecom (Opcional)"
                                    onFotoCapturada={(file) => handleAdicionarFoto(TIPOS_FOTO.TELECOM, file)}
                                    obrigatorio={false}
                                    erro={erroFotos?.includes('Telecom')}
                                />
                                <p className="text-center text-sm mt-2 font-medium">
                                    TELECOM
                                    {fotos.some(f => f.tipo === TIPOS_FOTO.TELECOM) ? (
                                        <span className="text-green-500 ml-2">✓ Adicionada</span>
                                    ) : (
                                        <span className="text-gray-500 ml-2">(Opcional)</span>
                                    )}
                                </p>
                            </div>
                            <div className="border-t border-gray-200 h-[3px]"></div>
                        </div>

                        {/* Foto Lâmpada */}
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <div className="p-4">
                                <BotaoCamera
                                    id="foto-Lampada"
                                    label="Foto Lâmpada (Opcional)"
                                    onFotoCapturada={(file) => handleAdicionarFoto(TIPOS_FOTO.LAMPADA, file)}
                                    obrigatorio={false}
                                    erro={erroFotos?.includes('Lampada')}
                                />
                                <p className="text-center text-sm mt-2 font-medium">
                                    LÂMPADA
                                    {fotos.some(f => f.tipo === TIPOS_FOTO.LAMPADA) ? (
                                        <span className="text-green-500 ml-2">✓ Adicionada</span>
                                    ) : (
                                        <span className="text-gray-500 ml-2">(Opcional)</span>
                                    )}
                                </p>
                            </div>
                        </div>

                    </div>
                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* Seção de Árvore */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mb-4">
                        <h3 className="text-lg font-medium mb-3">Registro de Árvores *</h3>

                        {/* Lista de árvores cadastradas */}
                        <div className="mb-4 space-y-2 max-h-60 overflow-y-auto p-2 bg-gray-100 rounded">
                            {fotos
                                .filter(f => f.tipo === TIPOS_FOTO.ARVORE)
                                .map((foto, index) => (
                                    <div key={`arvore-${index}-${foto.coords?.join(',')}`} className="flex items-center gap-3 p-2 bg-white rounded border">
                                        <img
                                            src={URL.createObjectURL(foto.arquivo)}
                                            alt={`Árvore ${index + 1}`}
                                            className="w-12 h-12 object-cover rounded border"
                                        />
                                        <div className="flex-grow">
                                            <p className="font-medium">Árvore {index + 1}</p>
                                            <p className="text-sm">
                                                <span className="text-gray-600">Espécie: </span>
                                                <strong>{foto.especie}</strong>
                                            </p>
                                            {foto.coords && (
                                                <p className="text-xs text-gray-500">
                                                    Local: {foto.coords[0]?.toFixed(6)}, {foto.coords[1]?.toFixed(6)}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setFotos(prev => prev.filter((f, i) => (
                                                f.tipo !== TIPOS_FOTO.ARVORE ||
                                                i !== index
                                            )))}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <FaTrash size={14} />
                                        </button>
                                    </div>
                                ))}

                            {fotos.filter(f => f.tipo === TIPOS_FOTO.ARVORE).length === 0 && (
                                <p className="text-center text-gray-500 py-4">Nenhuma árvore registrada</p>
                            )}
                        </div>

                        {/* Formulário de nova árvore */}
                        <div className="border-t pt-4">
                            <div className="flex justify-center mb-3">
                                <BotaoCamera
                                    onFotoCapturada={(file) => {
                                        setFotoArvore(file);
                                        setEspecieArvore('');
                                    }}
                                    label={fotoArvore ? "🔄 Tirar outra foto" : "📷 Adicionar árvore"}
                                />
                            </div>

                            {fotoArvore && (
                                <div className="space-y-3">
                                    <div className="flex flex-col items-center">
                                        <img
                                            src={URL.createObjectURL(fotoArvore)}
                                            alt="Pré-visualização"
                                            className="w-24 h-24 object-cover rounded border-2 border-blue-300"
                                        />
                                    </div>

                                    <ComboBox
                                        label="Espécie *"
                                        value={especieArvore}
                                        options={[
                                            { value: "Sibipuruna", label: "Sibipuruna" },
                                            { value: "Oiti", label: "Oiti" },
                                            { value: "Mangueira", label: "Mangueira" },
                                            { value: "Sete Copas", label: "Sete Copas" },
                                            { value: "Coqueiro", label: "Coqueiro" },
                                            { value: "Desconhecida", label: "Desconhecida" },
                                            { value: "Outra", label: "Outra espécie" },
                                        ]}
                                        onChange={setEspecieArvore}
                                        required
                                    />

                                    {especieArvore === "Outra" && (
                                        <input
                                            type="text"
                                            value={especieCustom}
                                            onChange={(e) => setEspecieCustom(e.target.value)}
                                            placeholder="Digite o nome da espécie *"
                                            className="w-full p-2 border rounded"
                                            required
                                        />
                                    )}

                                    <button
                                        onClick={() => {
                                            const especie = especieArvore === "Outra"
                                                ? especieCustom
                                                : especieArvore;

                                            if (!especie?.trim()) {
                                                alert("Selecione ou digite a espécie!");
                                                return;
                                            }

                                            // DEBUG: Verifique os dados antes de enviar
                                            console.log('Dados da árvore:', {
                                                file: fotoArvore,
                                                especie,
                                                coords: userCoords
                                            });

                                            handleAdicionarFoto(TIPOS_FOTO.ARVORE, {
                                                file: fotoArvore,
                                                especie,
                                                coords: userCoords,
                                            });

                                            // Reset do formulário
                                            setFotoArvore(null);
                                            setEspecieArvore('');
                                            setEspecieCustom('');
                                        }}
                                        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
                                    >
                                        Confirmar Árvore
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>


                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    <div className="mt-4 text-center border rounded-lg bg-black p-2 text-sm text-blue-50">
                        <p>Fotos marcadas com <span className="font-bold">*</span> são obrigatórias</p>
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* Seção de Características Técnicas */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4 border rounded-md p-4 shadow-lg bg-slate-400 text-center">Dados da Postiação</h2>
                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Poste com Transformador?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={(value) => handleFieldChange('transformador', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Poste com medição?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={(value) => handleFieldChange('medicao', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Poste com telecom?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={(value) => handleFieldChange('telecom', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Poste com concentrador?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={(value) => handleFieldChange('concentrador', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Poste de:"
                            options={[
                                { value: "Circular concreto", label: "Circular concreto" },
                                { value: "Madeira", label: "Madeira" },
                                { value: "Concreto DT", label: "Concreto DT" },
                                { value: "Circular metal", label: "Circular metal" },
                                { value: "Ornamental", label: "Ornamental" },
                                { value: "Circular fibra", label: "Circular fibra" },
                                { value: "Desconhecido", label: "Desconhecido" },
                            ]}
                            onChange={(value) => handleFieldChange('poste', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Altura do poste?"
                            options={[
                                { value: "5", label: "5" },
                                { value: "6", label: "6" },
                                { value: "7", label: "7" },
                                { value: "8", label: "8" },
                                { value: "9", label: "9" },
                                { value: "10", label: "10" },
                                { value: "11", label: "11" },
                                { value: "12", label: "12" },
                                { value: "13", label: "13" },
                                { value: "14", label: "14" },
                                { value: "15", label: "15" },
                                { value: "16", label: "16" },
                                { value: "17", label: "17" },
                                { value: "18", label: "18" },
                            ]}
                            onChange={(value) => handleFieldChange('alturaposte', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Estrutura da postiação ?"
                            options={[
                                { value: "Unilateral", label: "Unilateral" },
                                { value: "Bilateral", label: "Bilateral" },
                                { value: "Canteiro central", label: "Canteiro central" },
                                { value: "Praça", label: "Praça" },
                                { value: "Em frente ao oposto", label: "Em frente ao oposto" },
                            ]}
                            onChange={(value) => handleFieldChange('estruturaposte', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Selecione o tipo do braço ?"
                            options={[
                                { value: "Braço Curto", label: "Braço Curto" },
                                { value: "Braço Médio", label: "Braço Médio" },
                                { value: "Braço Longo", label: "Braço Longo" },
                                { value: "Level 1", label: "Level 1" },
                                { value: "Level 2", label: "Level 2" },
                                { value: "Suporte com 1", label: "Suporte com 1" },
                                { value: "Suporte com 2", label: "Suporte com 2" },
                                { value: "Suporte com 3", label: "Suporte com 3" },
                                { value: "Suporte com 4", label: "Suporte com 4" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoBraco', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tamanho do Braço ?"
                            options={[
                                { value: "0.50", label: "0.50" },
                                { value: "1.20", label: "1.20" },
                                { value: "2.20", label: "2.20" },
                                { value: "3.20", label: "3.20" },
                                { value: "4.20", label: "4.20" },
                            ]}
                            onChange={(value) => handleFieldChange('tamanhoBraco', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Quantidade de Pontos ?"
                            options={[
                                { value: "1", label: "1" },
                                { value: "2", label: "2" },
                                { value: "3", label: "3" },
                                { value: "4", label: "4" },
                            ]}
                            onChange={(value) => handleFieldChange('quantidadePontos', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo da Lâmpada ?"
                            options={[
                                { value: "Vapor de Sodio VS", label: "Vapor de Sodio VS" },
                                { value: "Vapor de Mercúrio VM", label: "Vapor de Mercúrio VM" },
                                { value: "Mista", label: "Mista" },
                                { value: "Led", label: "Led" },
                                { value: "Desconhecida", label: "Desconhecida" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoLampada', value)} />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Potência da lâmpada ?"
                            options={[
                                { value: "70", label: "70" },
                                { value: "80", label: "80" },
                                { value: "100", label: "100" },
                                { value: "125", label: "125" },
                                { value: "150", label: "150" },
                                { value: "250", label: "250" },
                                { value: "400", label: "400" },
                                { value: "Desconhecida", label: "Desconhecida" },
                            ]}
                            onChange={(value) => handleFieldChange('potenciaLampada', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo do Reator ?"
                            options={[
                                { value: "Reator Externo", label: "Reator Externo" },
                                { value: "Reator Integrado", label: "Reator Integrado" },
                                { value: "Módulo", label: "Módulo" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoReator', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Comando ?"
                            options={[
                                { value: "Individual", label: "Individual" },
                                { value: "Coletivo", label: "Coletivo" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoComando', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Rede ?"
                            options={[
                                { value: "Aérea BT", label: "Aérea BT" },
                                { value: "Convencional", label: "Convencional" },
                                { value: "Subterrânea", label: "Subterrânea" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoRede', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Cabo ?"
                            options={[
                                { value: "Alumínio Nú", label: "Alumínio Nú" },
                                { value: "Isolado XLPE", label: "Isolado XLPE" },
                                { value: "Multiplexado", label: "Multiplexado" },
                                { value: "Cobre Nú", label: "Cobre Nú" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoCabo', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Número de fases ?"
                            options={[
                                { value: "Monofásico", label: "Monofásico" },
                                { value: "Bifásico", label: "Bifásico" },
                                { value: "Trifásico", label: "Trifásico" },
                            ]}
                            onChange={(value) => handleFieldChange('numeroFases', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <h2 className="col-span-1 md:col-span-2 text-lg font-semibold text-center bg-gray-200 p-2 rounded-md">
                            Informações da via
                        </h2>

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Via ?"
                            options={[
                                { value: "Via Rápida", label: "Via Rápida" },
                                { value: "Via Local", label: "Via Local" },
                                { value: "Via Arterial", label: "Via Arterial" },
                                { value: "Via Coletora", label: "Via Coletora" },
                                { value: "Via Rural", label: "Via Rural" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoVia', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Hierarquia de Via ?"
                            options={[
                                { value: "Acesso", label: "Acesso" },
                                { value: "Alameda", label: "Alameda" },
                                { value: "Anel Viário", label: "Anel Viário" },
                                { value: "Avenida", label: "Avenida" },
                                { value: "Estrada", label: "Estrada" },
                                { value: "Rodovia", label: "Rodovia" },
                                { value: "Rua", label: "Rua" },
                                { value: "Travessa", label: "Travessa" },
                                { value: "Viaduto", label: "Viaduto" },
                            ]}
                            onChange={(value) => handleFieldChange('hierarquiaVia', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de pavimento ?"
                            options={[
                                { value: "Asfalto", label: "Asfalto" },
                                { value: "Paralelepipedo", label: "Paralelepipedo" },
                                { value: "Terra", label: "Terra" },
                                { value: "Bloquete", label: "Bloquete" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoPavimento', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Quantidade de faixas ?"
                            options={[
                                { value: "1", label: "1" },
                                { value: "2", label: "2" },
                                { value: "3", label: "3" },
                                { value: "4", label: "4" },
                                { value: "5", label: "5" },
                                { value: "6", label: "6" },
                            ]}
                            onChange={(value) => handleFieldChange('quantidadeFaixas', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Passeio ?"
                            options={[
                                { value: "Concreto", label: "Concreto" },
                                { value: "Pedra", label: "Pedra" },
                                { value: "Terra", label: "Terra" },
                                { value: "Bloquete", label: "Bloquete" },
                                { value: "Cerâmico", label: "Cerâmico" },
                            ]}
                            onChange={(value) => handleFieldChange('tipoPasseio', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Canteiro central existente ?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={(value) => handleFieldChange('canteiroCentral', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-gray-700 font-extrabold mb-2">
                                Largura do canteiro central
                            </label>

                            {/* Input principal */}
                            <input
                                type="number"
                                step="0.1"
                                value={state.larguraCanteiro || ''}
                                onChange={(e) => handleFieldChange('larguraCanteiro', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Digite o valor em metros"
                            />

                            {/* Botão de medição */}
                            <button
                                onClick={() => setIsMedindo(true)}
                                className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
                            >
                                <FaCamera className="h-5 w-5" />
                                Medir com câmera
                            </button>

                            {/* Modal de medição */}
                            {isMedindo && (
                                <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
                                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                                        <MedidorCamera
                                            onFinish={(medida) => {
                                                handleFieldChange('larguraCanteiro', medida);
                                                setIsMedindo(false);
                                            }}
                                            onCancel={() => setIsMedindo(false)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <div className="col-span-1 md:col-span-2 text-center">
                            <label className="mb-4 text-gray-700 font-extrabold">Distância entre postes</label>
                            <input
                                placeholder="Em Metros (calculado automaticamente)"
                                type="text"
                                value={state.distanciaEntrePostes || ''}
                                readOnly
                                className={`w-full px-3 py-2 border mt-2 rounded-md focus:ring-blue-500 focus:border-blue-500 ${state.distanciaEntrePostes
                                    ? "border-green-300 bg-green-50"
                                    : "border-gray-300 bg-gray-100"
                                    }`}
                            />
                            <small className={`block mt-1 text-sm ${state.distanciaEntrePostes
                                ? "text-green-600 font-medium"
                                : "text-gray-500"
                                }`}>
                                {state.distanciaEntrePostes ?
                                    "✔ Distância calculada automaticamente" :
                                    "Será calculado quando você registrar o próximo poste"}
                            </small>
                        </div>

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Finalidade da Instalação ?"
                            options={[
                                { value: "Viária", label: "Viária" },
                                { value: "Cemitério", label: "Cemitério" },
                                { value: "Praça", label: "Praça" },
                                { value: "Espaço municipal", label: "Espaço municipal" },
                                { value: "Ciclo via", label: "Ciclo via" },
                                { value: "Pista de caminhada", label: "Pista de caminhada" },
                            ]}
                            onChange={(value) => handleFieldChange('finalidadeInstalacao', value)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />
                    </div>

                    {/* Seção de Botões com Notificação Integrada */}
                    <div className="mt-8 space-y-4">
                        {/* Checkbox Estilizado */}
                        <div className="flex items-center mb-5">
                            <Checkbox
                                id="ultimoPoste"
                                label="Este é o último poste da rua"
                                checked={isLastPost}
                                onChange={(e) => setIsLastPost(e.target.checked)}
                                className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                        </div>

                        {/* Container de Notificação (será mostrado quando necessário) */}
                        {notificacao.mostrar && (
                            <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl flex items-center space-x-2
      ${notificacao.tipo === 'sucesso' ?
                                    'bg-green-500 border-l-4 border-green-700' :
                                    'bg-red-500 border-l-4 border-red-700'} 
      text-white animate-fade-in`}>
                                {notificacao.tipo === 'sucesso' ? (
                                    <FaCheckCircle className="text-xl" />
                                ) : (
                                    <FaExclamationCircle className="text-xl" />
                                )}
                                <span className="font-medium">{notificacao.mensagem}</span>
                            </div>
                        )}

                        {/* Botão Salvar Cadastro */}
                        <button
                            onClick={async () => {
                                try {
                                    await handleSalvarCadastro();
                                    mostrarNotificacao('Poste cadastrado com sucesso!', 'sucesso');
                                } catch (error) {
                                    mostrarNotificacao(error.message || 'Erro ao cadastrar poste', 'erro');
                                }
                            }}
                            className="flex items-center justify-center w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-lg 
               hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
               transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] group"
                        >
                            <FaSave className="mr-3 transition-transform group-hover:scale-110" />
                            <span className="font-medium tracking-wide">Salvar Cadastro</span>
                        </button>

                        {/* Botão Reutilizar Dados */}
                        {!mostrarConfirmacao ? (
                            <button
                                onClick={() => setMostrarConfirmacao(true)}
                                className="flex items-center justify-center w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white py-3 px-6 rounded-lg 
                 hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 
                 transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] group"
                            >
                                <FaRecycle className="mr-3 transition-transform group-hover:rotate-180" />
                                <span className="font-medium tracking-wide">Reutilizar Dados Anteriores</span>
                            </button>
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => {
                                        reutilizarDadosPosteAnterior();
                                        setMostrarConfirmacao(false);
                                        mostrarNotificacao('Dados reutilizados com sucesso!', 'sucesso');
                                    }}
                                    className="flex-1 flex items-center justify-center bg-gradient-to-r from-green-500 to-green-600 text-white py-3 px-6 rounded-lg 
                   hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                   transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] group"
                                >
                                    <FaCheck className="mr-2 group-hover:scale-125 transition-transform" />
                                    <span>Confirmar</span>
                                </button>
                                <button
                                    onClick={() => setMostrarConfirmacao(false)}
                                    className="flex-1 flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-lg 
                   hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                   transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98] group"
                                >
                                    <FaTimes className="mr-2 group-hover:scale-125 transition-transform" />
                                    <span>Cancelar</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}

export default Cadastro;