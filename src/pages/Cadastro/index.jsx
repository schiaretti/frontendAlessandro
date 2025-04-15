import React, { useState, useEffect, useRef, useReducer } from "react";
import useGetLocation from "../../hooks/useGetLocation";
import Checkbox from "../../components/checkBox.jsx";
import BotaoCamera from "../../components/botaoCamera.jsx";
import ComboBox from "../../components/ComboBox.jsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MarkerClusterGroup } from 'leaflet.markercluster';

// ==============================================
// CONSTANTES E CONFIGURAÇÕES
// ==============================================

// Tipos de fotos permitidas com descrições amigáveis
const TIPOS_FOTO = {
    PANORAMICA: 'PANORAMICA',
    LUMINARIA: 'LUMINARIA',
    ARVORE: 'ARVORE',
    TELECOM: 'TELECOM',
    LAMPADA: 'LAMPADA'
};

// Estado inicial do formulário
const initialState = {
    cidade: "",
    endereco: "",
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

// ==============================================
// COMPONENTE PRINCIPAL
// ==============================================

function Cadastro() {
    // ==============================================
    // SEÇÃO 1: AUTENTICAÇÃO E VERIFICAÇÃO DE USUÁRIO
    // ==============================================

    // Obtém token do localStorage e decodifica
    const [token, setToken] = useState(localStorage.getItem('token'));
    const decoded = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const usuarioId = decoded?.id;

    // Redireciona se não estiver autenticado
    if (!usuarioId) {
        alert('Usuário não autenticado. Redirecionando para login...');
        window.location.href = '/login';
        return null;
    }

    // ==============================================
    // SEÇÃO 2: ESTADOS E REFERÊNCIAS
    // ==============================================

    // Referências
    const mapRef = useRef(null);
    const markersGroupRef = useRef(null);
    const fileInputRef = useRef(null);

    // Estados do formulário
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
    const [loading, setLoading] = useState(false);

    // Hook de localização personalizado
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

    // Preenche campos do endereço automaticamente
    useEffect(() => {
        if (endereco) {
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
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [mostrarMapa, userCoords]);

    // Atualiza marcadores quando postes mudam
    useEffect(() => {
        if (mapRef.current && markersGroupRef.current && postesCadastrados.length > 0) {
            addPostMarkers();
        }
    }, [postesCadastrados]);

    // ==============================================
    // SEÇÃO 4: FUNÇÕES AUXILIARES
    // ==============================================

    // Compara se dois arrays são iguais
    const arraysEqual = (a, b) => {
        return a && b && a.length === b.length && a.every((val, index) => val === b[index]);
    };

    // Obtém nome amigável para tipo de foto
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

    // Calcula distância entre coordenadas em metros
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

    // ==============================================
    // SEÇÃO 5: FUNÇÕES DO MAPA
    // ==============================================

    // Inicializa o mapa Leaflet
    const initMap = () => {
        if (mapRef.current) {
            mapRef.current.setView(userCoords, 18);
            return;
        }

        // Cria nova instância do mapa
        mapRef.current = L.map('mapa', {
            zoomControl: true,
            preferCanvas: true
        }).setView(userCoords, 18);

        // Adiciona camada base do OpenStreetMap
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(mapRef.current);

        // Configura cluster de marcadores
        markersGroupRef.current = new MarkerClusterGroup({
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            maxClusterRadius: 40,
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

    // Atualiza marcador do usuário no mapa
    const updateUserMarker = (coords) => {
        if (!mapRef.current) return;

        // Remove marcador existente
        if (mapRef.current.userMarker) {
            mapRef.current.removeLayer(mapRef.current.userMarker);
        }

        // Adiciona novo marcador
        mapRef.current.userMarker = L.circleMarker(coords, {
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 1,
            radius: 8,
            className: 'shadow-lg'
        }).addTo(mapRef.current)
            .bindPopup('<div class="text-sm font-medium text-blue-600">Sua localização atual</div>');
    };

    // Adiciona marcadores dos postes ao mapa
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
                        <div class="flex items-center justify-center w-3 h-3 rounded-full bg-green-700"></div>
                    `,
                    iconSize: [10, 10],
                    className: 'leaflet-marker-icon-no-border'
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

    // ==============================================
    // SEÇÃO 6: FUNÇÕES DE LOCALIZAÇÃO
    // ==============================================

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
            setUserCoords([-23.5505, -46.6333]); // Coordenadas padrão (São Paulo)
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

    // ==============================================
    // SEÇÃO 7: FUNÇÕES DE DADOS
    // ==============================================

    // Busca postes cadastrados na API
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

    // ==============================================
    // SEÇÃO 8: FUNÇÕES DE FOTOS
    // ==============================================

    // Comprime imagem para reduzir tamanho (especialmente útil para mobile)
    const comprimirImagem = (file, maxWidth = 1024, quality = 0.7) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const scale = maxWidth / img.width;

                    canvas.width = maxWidth;
                    canvas.height = img.height * scale;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    }, 'image/jpeg', quality);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });
    };

    // Adiciona foto ao estado (com compressão para mobile)
    const adicionarFoto = async (tipo, fotoFile) => {
        try {
            // Validações básicas
            if (!fotoFile) {
                throw new Error(`Nenhum arquivo recebido para: ${tipo}`);
            }

            if (!(fotoFile instanceof File)) {
                throw new Error(`Tipo de arquivo inválido para: ${tipo}`);
            }

            if (fotoFile.size > 5 * 1024 * 1024) {
                throw new Error('A foto é muito grande (máximo 5MB)');
            }

            if (!fotoFile.type.startsWith('image/')) {
                throw new Error('Por favor, envie apenas imagens');
            }

            // Comprime imagem se for maior que 1MB (especialmente útil para mobile)
            let arquivoFinal = fotoFile;
            if (fotoFile.size > 1 * 1024 * 1024) {
                arquivoFinal = await comprimirImagem(fotoFile);
            }

            // Atualiza estado com a nova foto
            setFotos(prev => [
                ...prev.filter(f => f.tipo !== tipo),
                {
                    arquivo: arquivoFinal,
                    tipo: tipo,
                    coords: userCoords,
                    id: `${tipo}-${Date.now()}`,
                    nome: getNomeTipoFoto(tipo)
                }
            ]);

            return true;
        } catch (error) {
            console.error(`Erro ao adicionar foto ${tipo}:`, error);
            alert(error.message);
            return false;
        }
    };

    // Handlers para cada tipo de foto
    const handleFotoPanoramica = async (fotoFile) => {
        return await adicionarFoto(TIPOS_FOTO.PANORAMICA, fotoFile);
    };

    const handleFotoLuminaria = async (fotoFile) => {
        return await adicionarFoto(TIPOS_FOTO.LUMINARIA, fotoFile);
    };

    const handleFotoTelecon = async (fotoFile) => {
        return await adicionarFoto(TIPOS_FOTO.TELECOM, fotoFile);
    };

    const handleFoto2TipoLuminaria = async (fotoFile) => {
        return await adicionarFoto(TIPOS_FOTO.LAMPADA, fotoFile);
    };

    // Verifica fotos obrigatórias
    const verificarFotos = () => {
        const tiposObrigatorios = [TIPOS_FOTO.PANORAMICA, TIPOS_FOTO.LUMINARIA];
        const nomesObrigatorios = tiposObrigatorios.map(getNomeTipoFoto);

        // Filtra apenas fotos válidas
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
            const faltantesStr = fotosFaltantes.map(getNomeTipoFoto).join(', ');
            setErroFotos(`Adicione: ${faltantesStr}`);

            // Rolagem suave para a primeira foto faltante
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

    // ==============================================
    // SEÇÃO 9: FUNÇÕES DE FORMULÁRIO
    // ==============================================

    // Handler genérico para campos do formulário
    const handleFieldChange = (field, value) => {
        dispatch({ type: 'UPDATE_FIELD', field, value });
    };

    // Faz logout do usuário
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Salva o cadastro completo
    const handleSalvarCadastro = async () => {
        // Verifica fotos obrigatórias
        if (!verificarFotos()) return;

        // Verifica coordenadas
        if (!userCoords || userCoords.length < 2) {
            alert("Não foi possível obter coordenadas válidas!");
            return;
        }

        // Campos obrigatórios
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

        // Verifica campos faltantes
        const camposFaltantes = camposObrigatorios
            .filter(({ campo }) => !state[campo])
            .map(({ nome }) => nome);

        if (camposFaltantes.length > 0) {
            alert(`Preencha todos os campos obrigatórios!\nFaltando: ${camposFaltantes.join(', ')}`);
            return;
        }

        setLoading(true);

        try {
            // Calcula distância do poste anterior
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

            // Adiciona campos ao formData
            Object.entries({
                ...state,
                endereco: state.enderecoInput
            }).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    formData.append(key, value);
                }
            });

            // Adiciona dados de localização
            formData.append('coords', JSON.stringify(userCoords));
            formData.append('usuarioId', usuarioId);
            formData.append('isLastPost', isLastPost.toString());

            // Adiciona fotos (já comprimidas se necessário)
            fotos.forEach((foto) => {
                formData.append('fotos', foto.arquivo);
                formData.append('tipos', foto.tipo);
            });

            // Envia para a API
            const response = await axios.post(
                'https://backendalesandro-production.up.railway.app/api/postes',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    },
                    timeout: 30000 // Tempo maior para mobile
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
        } finally {
            setLoading(false);
        }
    };

    // ==============================================
    // SEÇÃO 10: RENDERIZAÇÃO
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
                                disabled={isLoadingLocation || loading}
                                className={`px-4 py-2 rounded-md text-white ${isLoadingLocation ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isLoadingLocation ? 'Obtendo localização...' : 'Obter Localização'}
                            </button>

                            {userCoords && (
                                <button
                                    onClick={() => setMostrarMapa(!mostrarMapa)}
                                    disabled={loading}
                                    className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                disabled={loading}
                                className={`mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                    dispatch({ type: 'UPDATE_FIELD', field: 'endereco', value: e.target.value });
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
                    </div>

                    {/* Seção de Fotos */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4 border rounded-md p-4 shadow-lg bg-slate-400 text-center">
                            Fotos Obrigatórias
                        </h2>

                        {/* Foto Panorâmica */}
                        <div className="p-4 bg-gray-50 rounded-lg mb-4">
                            <BotaoCamera
                                id="botao-camera-PANORAMICA"
                                label="Foto Panorâmica"
                                onFotoCapturada={handleFotoPanoramica}
                                obrigatorio={true}
                                disabled={loading}
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
                        <div className="p-4 bg-gray-50 rounded-lg mb-4">
                            <BotaoCamera
                                id="botao-camera-LUMINARIA"
                                label="Foto da Luminária"
                                onFotoCapturada={handleFotoLuminaria}
                                obrigatorio={true}
                                disabled={loading}
                                erro={erroFotos?.includes('Luminária')}
                            />
                            <p className="text-center text-sm mt-2 font-medium">
                                LUMINÁRIA <span className="text-red-500">*</span>
                                {fotos.some(f => f.tipo === TIPOS_FOTO.LUMINARIA) && (
                                    <span className="text-green-500 ml-2">✓</span>
                                )}
                            </p>
                        </div>

                        {/* Fotos Opcionais */}
                        <h2 className="text-xl font-bold mb-4 border rounded-md p-4 shadow-lg bg-slate-300 text-center mt-6">
                            Fotos Opcionais
                        </h2>

                        {/* Foto Telecom */}
                        <div className="p-4 bg-gray-50 rounded-lg mb-4">
                            <BotaoCamera
                                id="botao-camera-TELECOM"
                                label="Foto Telecom (opcional)"
                                onFotoCapturada={handleFotoTelecon}
                                obrigatorio={false}
                                disabled={loading}
                            />
                            <p className="text-center text-sm mt-2 font-medium text-gray-600">
                                TELECOM
                            </p>
                        </div>

                        {/* 2° Tipo de Luminária */}
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <BotaoCamera
                                id="botao-camera-LAMPADA"
                                label="2° Tipo de Luminária (opcional)"
                                onFotoCapturada={handleFoto2TipoLuminaria}
                                obrigatorio={false}
                                disabled={loading}
                            />
                            <p className="text-center text-sm mt-2 font-medium text-gray-600">
                                2° TIPO LUMINÁRIA
                            </p>
                        </div>

                        {/* Mensagem de validação */}
                        <div className="mt-4 text-center border rounded-lg bg-black p-2 text-sm text-blue-50">
                            <p>Fotos marcadas com <span className="font-bold">*</span> são obrigatórias</p>
                        </div>
                    </div>

                    {/* Seção de Características Técnicas */}
                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-4 border rounded-md p-4 shadow-lg bg-slate-400 text-center">
                            Dados da Postiação
                        </h2>

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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
        </div>

    );
}

export default Cadastro;



