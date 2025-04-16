import React, { useState, useEffect, useRef, useReducer } from "react";
import useGetLocation from "../../hooks/useGetLocation";
import Checkbox from "../../components/checkBox.jsx";
import BotaoCamera from "../../components/botaoCamera.jsx";
import ComboBox from "../../components/ComboBox.jsx";
import BotaoArvore from "../../components/botaoArvore.jsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MarkerClusterGroup } from 'leaflet.markercluster';

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
            return initialState;
        default:
            return state;
    }
}

const initialState = {
    cidade: "",
    enderecoInput: "",
    numero: "",
    cep: "",
    localizacao: "",
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
    finalidadeInstalacao: "",
    especieArvore: "",
    distanciaEntrePostes: "",
};

function Cadastro() {
    // ==============================================
    // SEÇÃO 1: AUTENTICAÇÃO E VERIFICAÇÃO DE USUÁRIO
    // ==============================================

    const [token, setToken] = useState(localStorage.getItem('token'));
    const decoded = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const usuarioId = decoded?.id;

    // Redireciona se não autenticado
    if (!usuarioId) {
        alert('Usuário não autenticado. Redirecionando para login...');
        window.location.href = '/login';
        return null;
    }

    // ==============================================
    // SEÇÃO 2: ESTADOS E REFERÊNCIAS
    // ==============================================

    // Referências do mapa
    const mapRef = useRef(null);
    const markersGroupRef = useRef(null);

    // Estados de controle
    const [state, dispatch] = useReducer(formReducer, initialState);
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

    // Hook de localização
    const { coords: liveCoords, endereco, accuracy, error: locationError } = useGetLocation(isLastPost || isFirstPostRegistered);

    // ==============================================
    // SEÇÃO 3: EFEITOS COLATERAIS
    // ==============================================

    // Atualiza coordenadas quando o hook retorna novas
    useEffect(() => {
        if (liveCoords && !isLastPost && !arraysEqual(liveCoords, userCoords)) {
            setUserCoords(liveCoords);
            setUserAccuracy(accuracy);
            updateUserMarker(liveCoords);
        }
    }, [liveCoords, accuracy, isLastPost, userCoords]);

    // Função auxiliar para comparar arrays
    function arraysEqual(a, b) {
        return a && b && a.length === b.length && a.every((val, index) => val === b[index]);
    }
    // Preenche campos do endereço automaticamente
    useEffect(() => {
        if (endereco) {
            dispatch({ type: 'UPDATE_FIELD', field: 'cidade', value: endereco.cidade || state.cidade });
            dispatch({ type: 'UPDATE_FIELD', field: 'enderecoInput', value: endereco.rua || state.enderecoInput });
            dispatch({ type: 'UPDATE_FIELD', field: 'endereco', value: endereco.rua || state.endereco }); // Novo
            dispatch({ type: 'UPDATE_FIELD', field: 'cep', value: endereco.cep || state.cep });

            if (!isNumeroManual) {
                dispatch({ type: 'UPDATE_FIELD', field: 'numero', value: endereco.numero || state.numero });
            }

            if (endereco.bairro && !state.localizacao) {
                dispatch({ type: 'UPDATE_FIELD', field: 'localizacao', value: endereco.bairro });
            }
        }
    }, [endereco, isNumeroManual]);

    // Gerencia o ciclo de vida do mapa
    useEffect(() => {
        if (mostrarMapa && userCoords) {
            if (!mapRef.current) {
                initMap();
            } else {
                mapRef.current.setView(userCoords, 18);
                updateUserMarker(userCoords);
            }
        }

        return () => {
            // Mantenha a limpeza como está
        };
    }, [mostrarMapa, userCoords]);

    // Atualiza marcadores quando postes mudam
    useEffect(() => {
        if (mapRef.current && markersGroupRef.current && postesCadastrados.length > 0) {
            addPostMarkers();
        }
    }, [postesCadastrados]);

    // ==============================================
    // SEÇÃO 4: FUNÇÕES PRINCIPAIS
    // ==============================================

    // Busca postes cadastrados
    const fetchPostesCadastrados = async () => {
        try {
            const response = await axios.get('https://backendalesandro-production.up.railway.app/api/listar-postes', {
                headers: { Authorization: `Bearer ${token}` }
            });

            const postesProcessados = response.data.data.map(poste => {
                const coords = poste.coords ||
                    (poste.latitude && poste.longitude ?
                        [poste.latitude, poste.longitude] :
                        null);

                return {
                    ...poste,
                    coords: coords ? coords.map(Number) : null
                };
            });

            const postesValidos = postesProcessados.filter(poste =>
                poste.coords &&
                !isNaN(poste.coords[0]) &&
                !isNaN(poste.coords[1])
            );

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

    // Inicializa o mapa
    const initMap = () => {
        if (mapRef.current) {
            mapRef.current.setView(userCoords, 18);
            return;
        }

        mapRef.current = L.map('mapa', {
            zoomControl: true,
            preferCanvas: true
        }).setView(userCoords, 18);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapRef.current);

        markersGroupRef.current = new MarkerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 0,
            iconCreateFunction: function (cluster) {
                return L.divIcon({
                    html: `
            <div class="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500/60">
              <div class="flex items-center justify-center w-8 h-8 rounded-full bg-orange-600/90 text-white font-bold">
                ${cluster.getChildCount()}
              </div>
            </div>
          `,
                    iconSize: L.point(40, 40)
                });
            }
        });

        mapRef.current.addLayer(markersGroupRef.current);
        updateUserMarker(userCoords);
        addPostMarkers();
    };

    // Atualiza marcador do usuário
    const updateUserMarker = (coords) => {
        if (!mapRef.current) return;

        if (mapRef.current.userMarker) {
            mapRef.current.removeLayer(mapRef.current.userMarker);
        }

        mapRef.current.userMarker = L.circleMarker(coords, {
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 1,
            radius: 8,
            className: 'shadow-lg'
        }).addTo(mapRef.current)
            .bindPopup('<div class="text-sm font-medium text-blue-600">Sua localização atual</div>');
    };

    // Adiciona marcadores dos postes
    const addPostMarkers = () => {
        if (!mapRef.current || !markersGroupRef.current) return;

        markersGroupRef.current.clearLayers();
        const bounds = L.latLngBounds(userCoords ? [userCoords] : []);

        postesCadastrados.forEach((poste, index) => {
            if (!poste.coords || !Array.isArray(poste.coords)) return;

            const coords = poste.coords.map(Number);
            if (coords.some(isNaN)) return;

            const marker = L.marker(coords, {
                icon: L.divIcon({
                    html: `
                    <div class="flex items-center justify-center w-3 h-3 rounded-full bg-green-800"></div>
                `,
                    iconSize: [10, 10], // Tamanho reduzido
                    className: 'leaflet-marker-icon-no-border' // Remove bordas padrão
                })
            }).bindPopup(`
            <div class="text-sm">
                <b>Poste #${index + 1}</b><br>
                ${poste.endereco || 'Endereço não disponível'}<br>
                <small>Cidade: ${poste.cidade || 'Não informada'}</small>
            </div>
        `);

            markersGroupRef.current.addLayer(marker);
            bounds.extend(coords);
        });

        if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds.pad(0.2));
        }
    };

    // Obtém localização do usuário
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

    // Adiciona foto ao estado
    const adicionarFoto = (tipo, fotoFile) => {
        if (!fotoFile) {
            console.error(`Nenhum arquivo recebido para: ${tipo}`);
            return;
        }

        if (!(fotoFile instanceof File)) {
            console.error(`Tipo de arquivo inválido para: ${tipo}`, fotoFile);
            alert(`O arquivo para ${tipo} não é válido`);
            return;
        }

        if (fotoFile.size > 5 * 1024 * 1024) {
            alert('A foto é muito grande (máximo 5MB)');
            return;
        }

        // Verifica tipo de imagem
        if (!fotoFile.type.startsWith('image/')) {
            alert('Por favor, envie apenas imagens');
            return;
        }

        setFotos(prev => [
            ...prev.filter(f => f.tipo !== tipo),
            {
                arquivo: fotoFile,
                tipo: tipo,
                coords: userCoords,
                id: `${tipo}-${Date.now()}`,
                nome: tipo === TIPOS_FOTO.PANORAMICA ? 'Panorâmica' :
                    tipo === TIPOS_FOTO.LUMINARIA ? 'Luminária' :
                        tipo === TIPOS_FOTO.TELECOM ? 'Telecom' :
                            '2° Tipo Luminária'
            }
        ]);
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

    // Handlers para fotos (agora assíncronos)
    const handleFotoPanoramica = async (fotoFile) => {
        try {
            console.log('Antes de adicionar - Panorâmica:', file);
            await adicionarFoto(TIPOS_FOTO.PANORAMICA, fotoFile);
            console.log('Depois de adicionar - Panorâmica:', fotos);
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    };

    const handleFotoLuminaria = async (fotoFile) => {
        try {
            console.log('Antes de adicionar - Luminaria:', file);
            await adicionarFoto(TIPOS_FOTO.LUMINARIA, fotoFile);
            console.log('Depois de adicionar - Luminaria:', fotos);
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    };

    const handleFotoTelecon = async (fotoFile) => {
        try {
            await adicionarFoto(TIPOS_FOTO.TELECOM, fotoFile);
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    };

    const handleFoto2TipoLuminaria = async (fotoFile) => {
        try {
            await adicionarFoto(TIPOS_FOTO.LAMPADA, fotoFile);
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    };

    // Verificação robusta de fotos obrigatórias
    const verificarFotos = () => {
        const tiposObrigatorios = [TIPOS_FOTO.PANORAMICA, TIPOS_FOTO.LUMINARIA];
        const nomesObrigatorios = tiposObrigatorios.map(getNomeTipoFoto);

        // Filtra apenas fotos válidas (com arquivo real)
        const fotosValidas = fotos.filter(foto =>
            foto.arquivo instanceof File &&
            foto.arquivo.size > 0 &&
            foto.arquivo.type.startsWith('image/')
        );

        const tiposPresentes = fotosValidas.map(f => f.tipo);
        const fotosFaltantes = tiposObrigatorios.filter(
            tipo => !tiposPresentes.includes(tipo)
        );

        if (fotosFaltantes.length > 0) {
            const mensagem = `Fotos obrigatórias faltando:\n${fotosFaltantes.map(t => `- ${getNomeTipoFoto(t)}`).join('\n')}`;

            // Melhor feedback visual (substitua por seu sistema de notificação)
            const faltantesStr = fotosFaltantes.map(getNomeTipoFoto).join(', ');
            setErroFotos(`Adicione: ${faltantesStr}`);

            // Rolagem para a primeira foto faltante
            setTimeout(() => {
                const primeiroTipoFaltante = fotosFaltantes[0];
                const elemento = document.getElementById(`botao-camera-${primeiroTipoFaltante}`);
                elemento?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);

            return false;
        }

        setErroFotos(null);
        return true;
    };

    // Calcula distância entre coordenadas
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

    // Logout
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Salva o cadastro
    const handleSalvarCadastro = async () => {
        // Verifica fotos obrigatórias primeiro
        if (!verificarFotos()) return;

        if (!userCoords || userCoords.length < 2) {
            alert("Não foi possível obter coordenadas válidas!");
            return;
        }

        // Lista de campos obrigatórios e seus nomes para exibição
        const camposObrigatorios = [
            { campo: 'cidade', nome: 'Cidade' },
            { campo: 'endereco', nome: 'Endereço' }, // Alterado de enderecoInput para endereco
            { campo: 'numero', nome: 'Número' },
            { campo: 'cep', nome: 'CEP' },
            { campo: 'transformador', nome: 'Transformador' },
            { campo: 'medicao', nome: 'Medição' },
            { campo: 'poste', nome: 'Tipo de Poste' },
            { campo: 'alturaposte', nome: 'Altura do Poste' },
            { campo: 'tipoLampada', nome: 'Tipo de Lâmpada' },
            { campo: 'potenciaLampada', nome: 'Potência da Lâmpada' }
        ];

        // Verifica campos faltantes
        const camposFaltantes = camposObrigatorios
            .filter(({ campo }) => !state[campo])
            .map(({ nome }) => nome);

        if (camposFaltantes.length > 0) {
            alert(`Preencha todos os campos obrigatórios!\nFaltando: ${camposFaltantes.join(', ')}`);
            return;
        }

        try {
            // Calcula distância se tiver poste anterior
            let distancia = 0;
            if (posteAnterior && userCoords) {
                distancia = calcularDistancia(
                    posteAnterior.coords[0],
                    posteAnterior.coords[1],
                    userCoords[0],
                    userCoords[1]
                );
                dispatch({ type: 'UPDATE_FIELD', field: 'distanciaEntrePostes', value: distancia.toString() });
            }

            const formData = new FormData();

            // Adiciona campos ao formData - agora mapeando enderecoInput para endereco
            Object.entries({
                ...state,
                endereco: state.enderecoInput // Mapeia enderecoInput para endereco
            }).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value);
                }
            });

            formData.append('coords', JSON.stringify(userCoords));
            formData.append('usuarioId', usuarioId);
            formData.append('isLastPost', isLastPost.toString());

            // Adiciona fotos
            fotos.forEach((foto) => {
                formData.append('fotos', foto.arquivo);
                formData.append('tipos', foto.tipo);
            });

            console.log("Dados a serem enviados:", {
                ...state,
                endereco: state.enderecoInput,
                fotos: fotos.map(f => f.tipo)
            });

            const response = await axios.post(
                'https://backendalesandro-production.up.railway.app/api/postes',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    },
                    timeout: 10000
                }
            );

            if (response.data.success) {
                // Atualiza estado para próximo poste
                setPosteAnterior({
                    coords: [...userCoords],
                    timestamp: Date.now()
                });

                // Limpa o formulário
                setFotos([]);
                dispatch({ type: 'RESET' });

                // Atualiza mapa
                await fetchPostesCadastrados();
                setMostrarMapa(false);
                setTimeout(() => setMostrarMapa(true), 100);

                alert("Cadastro salvo com sucesso!");
            }
        } catch (error) {
            console.error("Erro ao cadastrar:", error);
            if (error.response?.status === 401) {
                handleLogout();
            } else {
                alert(error.response?.data?.message || 'Erro ao cadastrar. Tente novamente.');
            }
        }
    };

    // Handler genérico para campos do formulário
    const handleFieldChange = (field, value) => {
        dispatch({ type: 'UPDATE_FIELD', field, value });
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

                    {/* Seção de Localização */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h2 className="text-xl font-semibold mb-3">Localização</h2>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={obterLocalizacaoUsuario}
                                disabled={isLoadingLocation}
                                className={`px-4 py-2 rounded-md text-white ${isLoadingLocation ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isLoadingLocation ? 'Obtendo localização...' : 'Obter Localização'}
                            </button>

                            {userCoords && (
                                <button
                                    onClick={() => setMostrarMapa(!mostrarMapa)}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                >
                                    {mostrarMapa ? 'Ocultar Mapa' : 'Mostrar Mapa'}
                                </button>
                            )}
                        </div>

                        {localizacaoError && (
                            <div className="mt-2 text-red-600">{localizacaoError}</div>
                        )}

                        {userAccuracy && (
                            <div className="mt-2 text-sm text-gray-600">
                                Precisão: ~{Math.round(userAccuracy)} metros
                            </div>
                        )}
                    </div>

                    {/* Mapa */}
                    {mostrarMapa && (
                        <div className="mb-6">
                            <div id="mapa" className="h-96 w-full rounded-lg border border-gray-300"></div>
                            <button
                                onClick={fecharMapa}
                                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                            >
                                Fechar Mapa
                            </button>
                        </div>
                    )}

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Endereço</label>
                            <input
                                type="text"
                                value={state.enderecoInput}
                                onChange={(e) => {
                                    dispatch({ type: 'UPDATE_FIELD', field: 'enderecoInput', value: e.target.value });
                                    dispatch({ type: 'UPDATE_FIELD', field: 'endereco', value: e.target.value }); // Atualiza ambos
                                }}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                            onChange={(value) => handleFieldChange('especieArvore', value)}
                        />

                    </div>

                    {/* Seção de Fotos */}

                    {/* Foto Panorâmica */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <BotaoCamera
                            id="foto-panoramica"
                            label="Foto Panorâmica"
                            onFotoCapturada={(file) => {
                                console.log('Arquivo recebido (Panorâmica):', file);
                                adicionarFoto(TIPOS_FOTO.PANORAMICA, file);
                            }}
                            obrigatorio={true}
                            erro={erroFotos?.includes('Panorâmica')}
                        />
                        <p className="text-center text-sm mt-2 font-medium">
                            PANORÂMICA <span className="text-red-500">*</span>
                            {fotos.some(f => f.tipo === TIPOS_FOTO.PANORAMICA) && (
                                <span className="text-green-500 ml-2">✓</span>
                            )}
                        </p>
                    </div>

                    {/* Foto da Luminária */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <BotaoCamera
                            id="foto-luminaria"
                            label="Foto da Luminária"
                            onFotoCapturada={(file) => {
                                console.log('Arquivo recebido (Luminária):', file);
                                adicionarFoto(TIPOS_FOTO.LUMINARIA, file);
                            }}
                            obrigatorio={true}
                            erro={erroFotos?.includes('Luminária')}
                        />
                        <p className="text-center text-sm mt-2 font-medium">
                            LUMINÁRIA <span className="text-red-500">*</span>
                            {fotos.some(f => f.tipo === TIPOS_FOTO.LUMINARIA) && (
                                <span className="text-green-500 ml-2">✓</span>
                            )}
                        </p>
                    </div>


                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* Foto Telecon (opcional) */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <BotaoCamera
                            id="foto-telecom"
                            label="Foto Telecom ( Opcional )"
                            onFotoCapturada={(file) => {
                                console.log('Arquivo recebido (Telecom):', file);
                                adicionarFoto(TIPOS_FOTO.TELECOM, file);
                            }}
                            obrigatorio={false}
                            erro={erroFotos?.includes('Telecom')}
                        />
                        <p className="text-center text-sm mt-2 font-medium">
                            TELECOM <span className="text-red-500">*</span>
                            {fotos.some(f => f.tipo === TIPOS_FOTO.TELECOM) && (
                                <span className="text-green-500 ml-2">✓</span>
                            )}
                        </p>

                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* 2° Tipo de lâmpada (opcional) */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                        <BotaoCamera
                            id="foto-Lampada"
                            label="Foto Lâmpada ( Opcional )"
                            onFotoCapturada={(file) => {
                                console.log('Arquivo recebido (Lampada):', file);
                                adicionarFoto(TIPOS_FOTO.LAMPADA, file);
                            }}
                            obrigatorio={false}
                            erro={erroFotos?.includes('Lampada')}
                        />

                        <p className="text-center text-sm mt-2 font-medium">
                            LAMPADA <span className="text-red-500">*</span>
                            {fotos.some(f => f.tipo === TIPOS_FOTO.LAMPADAS) && (
                                <span className="text-green-500 ml-2">✓</span>
                            )}
                        </p>

                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />


                    <div className="p-4 bg-gray-50 rounded-lg">
                        <BotaoArvore
                            id="foto-arvore"
                            label="Foto da Árvore ( Opcional )"
                            onFotoCapturada={(file) => {
                                console.log('Arquivo recebido (Árvore):', file);
                                adicionarFoto(TIPOS_FOTO.ARVORE, file);
                            }}
                            obrigatorio={false}
                            erro={erroFotos?.includes('Árvore')}
                            userCoords={userCoords}
                        />
                        <p className="text-center text-sm mt-2 font-medium">
                            ÁRVORE <span className="text-red-500">*</span>
                            {fotos.some(f => f.tipo === TIPOS_FOTO.ARVORE) && (
                                <span className="text-green-500 ml-2">✓</span>
                            )}
                        </p>
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* Mensagem de validação */}
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
                                { value: "70 W", label: "70 W" },
                                { value: "80 W", label: "80 W" },
                                { value: "100 W", label: "100 W" },
                                { value: "125 W", label: "125 W" },
                                { value: "150 W", label: "150 W" },
                                { value: "250 W", label: "250 W" },
                                { value: "400 W", label: "400 W" },
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
                                { value: "Alumínio isolado XLPE", label: "Alumínio isolado XLPE" },
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
                                { value: "Avenida", label: "Avenida" },
                                { value: "Estrada", label: "Estrada" },
                                { value: "LMG", label: "LMG" },
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

                        <div className="col-span-1 md:col-span-2 mb-4 text-center">
                            <label className="mb-4 text-gray-700 font-extrabold">Largura do canteiro central ?</label>
                            <input
                                placeholder="Em Metros"
                                type="text"
                                className="w-full px-3 py-2 border mt-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <div className="col-span-1 md:col-span-2 text-center">
                            <label className="mb-4 text-gray-700 font-extrabold">Distância entre postes</label>
                            <input
                                placeholder="Em Metros (calculado automaticamente)"
                                type="text"
                                value={state.distanciaEntrePostes}
                                readOnly
                                className="w-full px-3 py-2 border mt-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                            />
                            <small className="text-gray-500">
                                {state.distanciaEntrePostes ?
                                    "Distância calculada automaticamente do poste anterior" :
                                    "Será calculado após o próximo poste"}
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

                    {/* Botão de Salvar */}
                    <div className="mt-6">
                        <Checkbox
                            label="Este é o último poste da rua"
                            checked={isLastPost}
                            onChange={(e) => setIsLastPost(e.target.checked)}
                            className="mb-4"
                        />

                        <button
                            onClick={handleSalvarCadastro}
                            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Salvar Cadastro
                        </button>
                    </div>
                </div>
            </div >
        </div >


    );
}

export default Cadastro;