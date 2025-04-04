import React, { useState, useEffect } from "react";
import useGetLocation from "../../hooks/useGetLocation";
import Checkbox from "../../components/checkBox.jsx";
import BotaoCamera from "../../components/botaoCamera.jsx";
import ComboBox from "../../components/ComboBox.jsx";
import BotaoArvore from "../../components/botaoArvore.jsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Adicione no arquivo onde configura o Axios
axios.interceptors.request.use(config => {
    console.log('Enviando requisição para:', config.url);
    return config;
});

axios.interceptors.response.use(response => {
    console.log('Resposta recebida:', response.status, response.data);
    return response;
}, error => {
    console.error('Erro na requisição:', {
        url: error.config.url,
        status: error.response?.status,
        data: error.response?.data
    });
    return Promise.reject(error);
});

function Cadastro() {

    // Obtenha o token e decode para pegar o usuarioId
    const token = localStorage.getItem('token');
    const decoded = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const usuarioId = decoded?.id;

    // Verificação imediata se não tem usuário
    if (!usuarioId) {
        alert('Usuário não autenticado. Redirecionando para login...');
        // Redirecione para a página de login
        window.location.href = '/login';
        return null; // Retorna null para não renderizar o componente
    }

    // Estados de controle
    const [isLastPost, setIsLastPost] = useState(false);
    const [isFirstPostRegistered, setIsFirstPostRegistered] = useState(false);
    const [mostrarMapa, setMostrarMapa] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [localizacaoError, setLocalizacaoError] = useState(null);
    const [isNumeroManual, setIsNumeroManual] = useState(false);
    const [postesCadastrados, setPostesCadastrados] = useState([]);
    const [mapInstance, setMapInstance] = useState(null);
    const [userAccuracy, setUserAccuracy] = useState(10);



    // Estados do formulário
    const [cidade, setCidade] = useState("");
    const [enderecoInput, setEnderecoInput] = useState("");
    const [numero, setNumero] = useState("");
    const [cep, setCep] = useState("");

    // Estados para os ComboBox
    const [localizacao, setLocalizacao] = useState("");
    const [transformador, setTransformador] = useState("");
    const [medicao, setMedicao] = useState("");
    const [telecom, setTelecom] = useState("");
    const [concentrador, setConcentrador] = useState("");
    const [poste, setPoste] = useState("");
    const [alturaposte, setalturaPoste] = useState("");
    const [estruturaposte, setestruturaPoste] = useState("");
    const [tipoBraco, settipoBraco] = useState("");
    const [tamanhoBraco, settamanhoBraco] = useState("");
    const [quantidadePontos, setquantidadePontos] = useState("");
    const [tipoLampada, settipoLampada] = useState("");
    const [potenciaLampada, setpotenciaLampada] = useState("");
    const [tipoReator, settipoReator] = useState("");
    const [tipoComando, settipoComando] = useState("");
    const [tipoRede, settipoRede] = useState("");
    const [tipoCabo, settipoCabo] = useState("");
    const [numeroFases, setnumeroFases] = useState("");
    const [tipoVia, settipoVia] = useState("");
    const [hierarquiaVia, sethierarquiaVia] = useState("");
    const [tipoPavimento, settipoPavimento] = useState("");
    const [quantidadeFaixas, setquantidadeFaixas] = useState("");
    const [tipoPasseio, settipoPasseio] = useState("");
    const [canteiroCentral, setcanteiroCentral] = useState("");
    const [finalidadeInstalacao, setfinalidadeInstalacao] = useState("");
    const [especieArvore, setespecieArvore] = useState("");
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const { coords, endereco, error: locationError } = useGetLocation(isLastPost || isFirstPostRegistered);

    // Função para buscar postes cadastrados
    const fetchPostesCadastrados = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get('https://backendalesandro-production.up.railway.app/api/listar-postes', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data) {
                setPostesCadastrados(response.data);
            }
        } catch (error) {
            console.error("Erro ao buscar postes:", error);
        }
    };

    // Carrega os postes cadastrados quando o componente monta
    useEffect(() => {
        fetchPostesCadastrados();
    }, []);

    // Preenche os campos automaticamente quando o endereço é obtido
    useEffect(() => {
        if (endereco) {
            const updates = {
                cidade: endereco.cidade || cidade,
                enderecoInput: endereco.rua || enderecoInput,
                cep: endereco.cep || cep
            };

            if (!isNumeroManual) {
                updates.numero = endereco.numero || numero;
            }

            // Atualiza apenas os campos que mudaram
            if (updates.cidade !== cidade) setCidade(updates.cidade);
            if (updates.enderecoInput !== enderecoInput) setEnderecoInput(updates.enderecoInput);
            if (updates.cep !== cep) setCep(updates.cep);
            if (updates.numero !== undefined && updates.numero !== numero) setNumero(updates.numero);

            // Preenche o bairro se existir no endereço
            if (endereco.bairro && !localizacao) {
                setLocalizacao(endereco.bairro);
            }
        }
    }, [endereco, isNumeroManual]);

    const obterLocalizacaoUsuario = async () => {
        setLocalizacaoError(null);
        setMostrarMapa(false);
        setIsLoadingLocation(true); // Adicione este estado se não existir

        try {
            if (!navigator.geolocation) {
                throw new Error("Geolocalização não suportada pelo navegador");
            }

            // 1. Obter localização do usuário
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude, accuracy } = position.coords;
            const newCoords = [latitude, longitude];

            // 2. Atualizar estados
            setUserCoords(newCoords);
            setUserAccuracy(accuracy);

            // 3. Carregar postes próximos (se necessário)
            if (!postesCadastrados || postesCadastrados.length === 0) {
                await carregarPostesProximos(newCoords); // Implemente esta função
            }

            // 4. Só mostrar o mapa após tudo estar carregado
            setMostrarMapa(true);

        } catch (error) {
            console.error("Erro ao obter localização:", error);
            let errorMessage = "Não foi possível obter localização precisa.";

            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = "Permissão de localização negada. Por favor, habilite no navegador.";
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = "Localização indisponível.";
                    break;
                case error.TIMEOUT:
                    errorMessage = "Tempo de espera excedido ao obter localização.";
                    break;
            }
            setLocalizacaoError(errorMessage);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // Função de exemplo para carregar postes próximos
    const carregarPostesProximos = async (coords) => {
        try {
            const response = await fetch(`/api/postes/proximos?lat=${coords[0]}&lng=${coords[1]}`);
            const data = await response.json();
            setPostesCadastrados(data);
        } catch (error) {
            console.error("Erro ao carregar postes:", error);
            setPostesCadastrados([]);
        }
    };

    //carregar mapa
    useEffect(() => {
        if (!mostrarMapa || !userCoords || isLoadingLocation) return;

        // 1. Inicialização do mapa
        const initMap = () => {
            if (!mapInstance) {
                const newMap = L.map('mapa', {
                    zoomControl: true,
                    preferCanvas: true
                }).setView(userCoords, 18);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(newMap);

                setTimeout(() => newMap.invalidateSize(), 100);
                setMapInstance(newMap);
                return newMap;
            }
            mapInstance.setView(userCoords);
            return mapInstance;
        };

        const currentMap = initMap();

        // 2. Limpeza seletiva - mantemos o mapa base e tileLayer
        currentMap.eachLayer(layer => {
            if (layer instanceof L.CircleMarker ||
                (layer instanceof L.LayerGroup && layer !== markersGroupRef.current)) {
                currentMap.removeLayer(layer);
            }
        });

        // 3. Referências para os marcadores
        const markersGroupRef = { current: null };
        const userMarkerRef = { current: null };

        // 4. Marcador azul (sua localização)
        userMarkerRef.current = L.circleMarker(userCoords, {
            color: '#0066ff',
            fillColor: '#0066ff',
            fillOpacity: 1,
            radius: 5
        }).addTo(currentMap).bindPopup('Sua localização atual');

        // 5. Processamento dos postes cadastrados
        if (postesCadastrados?.length > 0) {
            console.log('Dados dos postes para renderizar:', postesCadastrados);

            markersGroupRef.current = L.layerGroup();
            const validBounds = L.latLngBounds([userCoords]);

            postesCadastrados.forEach((poste, index) => {
                if (!poste.coords || !Array.isArray(poste.coords)) {
                    console.error(`Poste ${index} ignorado - coordenadas inválidas:`, poste.coords);
                    return;
                }

                const coords = [
                    Number(poste.coords[0]),
                    Number(poste.coords[1])
                ];

                if (coords.some(isNaN)) {  // <-- ERRO AQUI (parêntese extra)
                    console.error(`Poste ${index} ignorado - coordenadas não numéricas:`, poste.coords);
                    return;
                }

                // Cria o marcador vermelho
                L.circleMarker(coords, {
                    color: '#ff0000',
                    fillColor: '#ff0000',
                    fillOpacity: 0.8,
                    radius: 10
                }).addTo(markersGroupRef.current)
                    .bindPopup(`
                    <b>Poste #${index + 1}</b><br>
                    ${poste.endereco || 'Endereço não disponível'}<br>
                    <small>Cidade: ${poste.cidade || 'Não informada'}</small>
                `);

                validBounds.extend(coords);
            });

            markersGroupRef.current.addTo(currentMap);

            requestAnimationFrame(() => {
                if (validBounds.isValid() && !validBounds.getCenter().equals([0, 0])) {
                    currentMap.fitBounds(validBounds.pad(0.2));
                }
                currentMap.invalidateSize();
            });
        }

        return () => {
            if (!mostrarMapa && mapInstance) {
                mapInstance.remove();
                setMapInstance(null);
            }
        };
    }, [mostrarMapa, userCoords, postesCadastrados, isLoadingLocation]);

    // Função para fechar o mapa (definida fora do useEffect)
    const fecharMapa = () => {
        if (mapInstance) {
            mapInstance.remove();
            setMapInstance(null);
        }
        setMostrarMapa(false);
    };

    // Estado para as fotos (mantém a mesma declaração)
    const [fotos, setFotos] = useState([]);

    // Função genérica para adicionar qualquer tipo de foto
    const adicionarFoto = (tipo, fotoFile) => {
        if (!fotoFile) {
            console.error('Nenhum arquivo recebido para:', tipo);
            return;
        }

        // Verificação robusta do tipo de arquivo
        if (!(fotoFile instanceof File)) {
            console.error('Tipo de arquivo inválido para:', tipo, fotoFile);
            alert(`O arquivo para ${tipo} não é válido`);
            return;
        }

        // Verifica tamanho máximo (5MB como exemplo)
        if (fotoFile.size > 5 * 1024 * 1024) {
            alert('A foto é muito grande (máximo 5MB)');
            return;
        }

        console.log(`Foto ${tipo} recebida:`, fotoFile.name, (fotoFile.size / 1024).toFixed(2), 'KB');

        setFotos(prev => [
            ...prev.filter(f => f.tipo !== tipo), // Remove duplicatas
            {
                arquivo: fotoFile,
                tipo: tipo.toUpperCase(),
                coords: userCoords,
                id: `${tipo}-${Date.now()}` // ID único
            }
        ]);
    };

    // Handlers específicos para cada tipo de foto
    const handleFotoPanoramica = (fotoFile) => adicionarFoto('PANORAMICA', fotoFile);
    const handleFotoLuminaria = (fotoFile) => adicionarFoto('LUMINARIA', fotoFile);
    const handleFotoArvore = (fotoFile) => adicionarFoto('ARVORE', fotoFile);

    // Verificação melhorada das fotos obrigatórias
    const verificarFotos = () => {
        const obrigatorias = ['PANORAMICA', 'LUMINARIA'];
        const fotosValidas = fotos.filter(f => f.arquivo instanceof File);

        const faltantes = obrigatorias.filter(tipo =>
            !fotosValidas.some(f => f.tipo === tipo)
        );

        if (faltantes.length > 0) {
            alert(`Fotos obrigatórias faltando: ${faltantes.join(', ')}\nPor favor, tire novas fotos.`);
            return false;
        }

        return true;
    };


    const handleLocalizacaoChange = (value) => {
        setLocalizacao(value);
    };

    const handleTransformadorChange = (value) => {
        setTransformador(value);
    };

    const handleMedicaoChange = (value) => {
        setMedicao(value);
    };

    const handleTelecomChange = (value) => {
        setTelecom(value);
    };

    const handleConcentradorChange = (value) => {
        setConcentrador(value);
    };

    const handlePosteChange = (value) => {
        setPoste(value);
    };

    const handleAlturaPosteChange = (value) => {
        setalturaPoste(value);
    };

    const handleEstruturaPosteChange = (value) => {
        setestruturaPoste(value);
    };

    const handleTipoBracoChange = (value) => {
        settipoBraco(value);
    };

    const handleTamanhoBracoChange = (value) => {
        settamanhoBraco(value);
    };

    const handleQuantidadePontosChange = (value) => {
        setquantidadePontos(value);
    };

    const handleTipoLampadaChange = (value) => {
        settipoLampada(value);
    };

    const handlePotenciaLampadaChange = (value) => {
        setpotenciaLampada(value);
    };

    const handletipoReator = (value) => {
        settipoReator(value);
    };

    const handletipoComando = (value) => {
        settipoComando(value);
    };

    const handletipoRede = (value) => {
        settipoRede(value);
    };

    const handletipoCabo = (value) => {
        settipoCabo(value);
    };

    const handlenumeroFases = (value) => {
        setnumeroFases(value);
    };

    const handletipoVia = (value) => {
        settipoVia(value);
    };

    const handlehierarquiaVia = (value) => {
        sethierarquiaVia(value);
    };

    const handletipoPavimento = (value) => {
        settipoPavimento(value);
    };

    const handlequantidadeFaixas = (value) => {
        setquantidadeFaixas(value);
    };

    const handletipoPasseio = (value) => {
        settipoPasseio(value);
    };

    const handlecanteiroCentral = (value) => {
        setcanteiroCentral(value);
    };

    const handlefinalidadeInstalacao = (value) => {
        setfinalidadeInstalacao(value);
    };

    const handleespecieArvore = (value) => {
        setespecieArvore(value);
    };


    const handleSalvarCadastro = async () => {

        // Verificação reforçada
        if (!usuarioId) {
            alert('ID do usuário não disponível. Faça login novamente.');
            localStorage.removeItem('token'); // Limpa o token inválido
            window.location.href = '/login';
            return;
        }

        if (!token) {
            alert('Sessão expirada. Faça login novamente.');
            return;
        }


        if (!coords || coords.length < 2) {
            alert("Não foi possível obter coordenadas válidas!");
            return;
        }

        // Verificação de campos obrigatórios primeiro
        const camposObrigatorios = {
            cidade, enderecoInput, numero, cep, transformador, medicao, telecom,
            concentrador, poste, alturaposte, estruturaposte, tipoBraco, tamanhoBraco,
            quantidadePontos, tipoLampada, potenciaLampada, tipoReator, tipoComando,
            tipoRede, tipoCabo, numeroFases, tipoVia, hierarquiaVia, tipoPavimento,
            quantidadeFaixas, tipoPasseio, canteiroCentral, finalidadeInstalacao
        };

        const camposFaltantes = Object.entries(camposObrigatorios)
            .filter(([_, value]) => !value)
            .map(([key]) => key);

        if (camposFaltantes.length > 0) {
            alert(`Preencha todos os campos obrigatórios! Faltando: ${camposFaltantes.join(', ')}`);
            return;
        }

        // Verificação das fotos obrigatórias
        if (!verificarFotos()) {
            return;
        }


        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Usuário não autenticado. Faça login novamente.');
                return;
            }

            const formData = new FormData();

            // 1.Adiciona campos do formulário
            formData.append('coords', JSON.stringify(coords));
            formData.append('cidade', cidade);
            formData.append('endereco', enderecoInput);
            formData.append('numero', numero);
            formData.append('cep', cep);
            formData.append('usuarioId', String(usuarioId));

            // 2. Adiciona tipos das fotos ANTES dos arquivos
            //formData.append('tipo_fotos[]', 'PANORAMICA');
            //formData.append('tipo_fotos[]', 'LUMINARIA');

            // 3. Adiciona fotos com correspondência 1:1 com os tipos
            fotos.forEach((foto, index) => {
                formData.append('fotos', foto.arquivo);
                formData.append(`tipo_fotos[${index}]`, foto.tipo);
            });

            // 4. Adiciona demais campos opcionais
            formData.append('isLastPost', isLastPost.toString());
            formData.append('localizacao', localizacao);
            formData.append('transformador', transformador);
            formData.append('medicao', medicao);
            formData.append('telecom', telecom);
            formData.append('concentrador', concentrador);
            formData.append('poste', poste);
            formData.append('alturaposte', alturaposte);
            formData.append('estruturaposte', estruturaposte);
            formData.append('tipoBraco', tipoBraco);
            formData.append('tamanhoBraco', tamanhoBraco);
            formData.append('quantidadePontos', quantidadePontos);
            formData.append('tipoLampada', tipoLampada);
            formData.append('potenciaLampada', potenciaLampada);
            formData.append('tipoReator', tipoReator);
            formData.append('tipoComando', tipoComando);
            formData.append('tipoRede', tipoRede);
            formData.append('tipoCabo', tipoCabo);
            formData.append('numeroFases', numeroFases);
            formData.append('tipoVia', tipoVia);
            formData.append('hierarquiaVia', hierarquiaVia);
            formData.append('tipoPavimento', tipoPavimento);
            formData.append('quantidadeFaixas', quantidadeFaixas);
            formData.append('tipoPasseio', tipoPasseio);
            formData.append('canteiroCentral', canteiroCentral);
            formData.append('finalidadeInstalacao', finalidadeInstalacao);
            formData.append('especieArvore', especieArvore);

            // Debug do FormData
            console.log('Conteúdo do FormData:');
            for (let [key, value] of formData.entries()) {
                console.log(key, value instanceof File ?
                    `FILE: ${value.name}` :
                    `VALUE: ${value}`
                );
            }

            // 5. Envio com axios
            const response = await axios.post('https://backendalesandro-production.up.railway.app/api/postes', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                },
                timeout: 10000 // 10 segundos de timeout
            });

            /* if (response.data.success) {
                 alert('Poste cadastrado com sucesso!');
                 // Limpeza do formulário...
             }*/

            if (response.data.success) {
                // Limpa o formulário
                setCidade("");
                setEnderecoInput("");
                setNumero("");
                setCep("");
                setFotos([]);

                await fetchPostesCadastrados();
                alert("Cadastro salvo com sucesso!");
            }
        } catch (error) {
            console.error("Erro completo:", {
                config: error.config,
                response: error.response?.data,
                message: error.message
            });

            if (error.response?.status === 401) {
                alert('Sessão expirada. Faça login novamente.');
                localStorage.removeItem('token');
                window.location.href = '/login';
            } else {
                console.error("Erro completo:", error);
                alert(error.response?.data?.message || 'Erro ao cadastrar.');
            }
            alert(error.response?.data?.message ||
                'Erro ao cadastrar. Verifique os dados e tente novamente.');
        };
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
                <h1 className="text-2xl font-bold text-center mb-6 border bg-slate-600 text-white rounded-lg">
                    Começar cadastro
                </h1>

                <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                {/* Campos de entrada */}
                <div className="space-y-4 mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Latitude
                        </label>
                        <input
                            type="text"
                            value={coords && coords.length >= 2 ? coords[0] : ""}
                            readOnly
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Longitude
                        </label>
                        <input
                            type="text"
                            value={coords && coords.length >= 2 ? coords[1] : ""}
                            readOnly
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Cidade
                        </label>
                        <input
                            type="text"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Endereço
                        </label>
                        <input
                            type="text"
                            value={enderecoInput}
                            onChange={(e) => setEnderecoInput(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Número
                        </label>
                        <input
                            type="text"
                            value={numero}
                            onChange={(e) => {
                                setNumero(e.target.value);
                                setIsNumeroManual(true); // Marca que o número foi digitado manualmente
                            }}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    <div>
                        <label className="block text-sm font-medium text-gray-700">CEP</label>
                        <input
                            type="text"
                            value={cep}
                            onChange={(e) => setCep(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* ComboBox para "Selecione" */}
                    <ComboBox
                        label="Selecione um Item !"
                        options={[
                            { value: "Em Frente", label: "Em Frente" },
                            { value: "Sem Número", label: "Sem Número" },
                            { value: "Praça", label: "Praça" },
                            { value: "Viela", label: "Viela" },
                        ]}
                        onChange={handleLocalizacaoChange}
                        className="mb-4"
                    />

                    <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    {/* Botão para carregar o mapa com a localização atual */}
                    <button
                        onClick={obterLocalizacaoUsuario}
                        className="w-full mt-4 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                        disabled={isLoadingLocation} // Desabilita durante o carregamento
                    >
                        {isLoadingLocation ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    {/* Ícone de loading */}
                                </svg>
                                Carregando...
                            </span>
                        ) : (
                            'Carregar Mapa com Minha Localização'
                        )}
                    </button>

                    {localizacaoError && (
                        <div className="mt-2 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                            {localizacaoError}
                        </div>
                    )}

                    {locationError && (
                        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                            Aviso: {locationError}
                        </div>
                    )}


                    {mostrarMapa && (
                        <div className="relative z-50 h-full">
                            {/* Container do mapa */}
                            <div
                                id="mapa"
                                className="w-full h-[50vh] min-h-[250px] max-h-[400px] 
                    md:h-[55vh] lg:h-[60vh] lg:max-h-[600px]
                    mt-3 rounded-lg shadow-sm border border-gray-200
                    relative z-0"
                            ></div>

                            {/* Overlay de carregamento */}
                            {!mapInstance && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 z-10">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                                    <p className="text-gray-700 text-sm">Carregando mapa...</p>
                                </div>
                            )}

                            {/* Botão de fechar */}
                            <div className="sticky bottom-4 mt-3 px-4 z-20">
                                <button
                                    onClick={fecharMapa}
                                    className="w-full bg-red-500 hover:bg-red-600 text-white font-medium 
                py-3 px-4 rounded-lg shadow-lg transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                    Fechar Mapa
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Seção de captura de fotos */}
                    <div className="mt-6">
                        <h2 className="text-xl font-bold mb-4 text-center">Captura de Fotos</h2>

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="Foto Panorâmica *"
                            onFotoCapturada={handleFotoPanoramica}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto da árvore */}
                        <BotaoArvore
                            label="Foto da Árvore *"
                            onFotoCapturada={handleFotoArvore}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* ComboBox para "Poste com Concentrador" */}
                        <ComboBox
                            label="Espécie de Árvore ?"
                            options={[
                                { value: "Sibipuruna", label: "Sibipuruna" },
                                { value: "Oiti", label: "Oiti" },
                                { value: "Sete Copas", label: "Sete Copas" },
                                { value: "Coqueiro", label: "Coqueiro" },
                                { value: "Nativa", label: "Nativa" },
                            ]}
                            onChange={handleespecieArvore}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <BotaoCamera
                            label="Foto da Luminária *"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />
                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="Foto Telecon (opcional)"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="2° Tipo de lâmpada (opcional)"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="Trena - Largura da Via *"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="Trena - Largura Calçada Poste *"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="Trena - Altura da luminária *"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Componente para foto panorâmica */}
                        <BotaoCamera
                            label="Trena - Largura Calçada Oposta *"
                            onFotoCapturada={handleFotoLuminaria}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                    </div>

                    <div>
                        {/* ComboBox para "Poste com Transformador" */}
                        <ComboBox
                            label="Poste Com Transformador?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={handleTransformadorChange}
                            className="mb-4"
                        />
                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* ComboBox para "Poste com Medição" */}
                        <ComboBox
                            label="Poste com medição ?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={handleMedicaoChange}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* ComboBox para "Poste com Telecom" */}
                        <ComboBox
                            label="Poste com telecom ?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={handleTelecomChange}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* ComboBox para "Poste com Concentrador" */}
                        <ComboBox
                            label="Poste com concentrador ?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={handleConcentradorChange}
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
                            onChange={handlePosteChange}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />


                        <ComboBox
                            label="Altura do poste ?"
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
                            onChange={handleAlturaPosteChange}
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
                            onChange={handleEstruturaPosteChange}
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
                            onChange={handleTipoBracoChange}
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
                            onChange={handleTamanhoBracoChange}
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
                            onChange={handleQuantidadePontosChange}
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
                            onChange={handleTipoLampadaChange}
                        />

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
                            onChange={handlePotenciaLampadaChange}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo do Reator ?"
                            options={[
                                { value: "Reator Externo", label: "Reator Externo" },
                                { value: "Reator Integrado", label: "Reator Integrado" },
                                { value: "Módulo", label: "Módulo" },
                            ]}
                            onChange={handletipoReator}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Comando ?"
                            options={[
                                { value: "Individual", label: "Individual" },
                                { value: "Coletivo", label: "Coletivo" },
                            ]}
                            onChange={handletipoComando}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Tipo de Rede ?"
                            options={[
                                { value: "Aérea BT", label: "Aérea BT" },
                                { value: "Convencional", label: "Convencional" },
                                { value: "Subterrânea", label: "Subterrânea" },
                            ]}
                            onChange={handletipoRede}
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
                            onChange={handletipoCabo}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Número de fases ?"
                            options={[
                                { value: "Monofásico", label: "Monofásico" },
                                { value: "Bifásico", label: "Bifásico" },
                                { value: "Trifásico", label: "Trifásico" },
                            ]}
                            onChange={handlenumeroFases}
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
                            onChange={handletipoVia}
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
                            onChange={handlehierarquiaVia}
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
                            onChange={handletipoPavimento}
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
                            onChange={handlequantidadeFaixas}
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
                            onChange={handletipoPasseio}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        <ComboBox
                            label="Canteiro central existente ?"
                            options={[
                                { value: "Sim", label: "Sim" },
                                { value: "Não", label: "Não" },
                            ]}
                            onChange={handlecanteiroCentral}
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
                            <label className="mb-4 text-gray-700 font-extrabold ">Distância entre postes ?</label>
                            <input
                                placeholder="Em Metros"
                                type="text"
                                className="w-full px-3 py-2 border mt-2 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
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
                            onChange={handlefinalidadeInstalacao}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Checkbox para "Último Poste da Rua" */}
                        <Checkbox
                            label="Este é o último poste da rua"
                            checked={isLastPost}
                            onChange={(e) => setIsLastPost(e.target.checked)}
                        />

                        <hr style={{ margin: '16px 0', border: '0', borderTop: '3px solid #ccc' }} />

                        {/* Mensagem explicativa */}
                        {!isFirstPostRegistered && !isLastPost && (
                            <p className="mt-2 font-bold text-gray-500 text-center">
                                Só marque a opção acima se for o último poste da rua!!!
                            </p>
                        )}

                    </div>

                    {/* Botão de salvar */}
                    <button
                        onClick={handleSalvarCadastro}
                        className="w-full mt-6 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Salvar Cadastro
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Cadastro;