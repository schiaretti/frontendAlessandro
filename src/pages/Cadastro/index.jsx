/*import React, { useState, useEffect } from "react";
import useGetLocation from "../../hooks/useGetLocation";
import Checkbox from "../../components/checkBox.jsx";
import BotaoCamera from "../../components/botaoCamera.jsx";
import ComboBox from "../../components/ComboBox.jsx";
import BotaoArvore from "../../components/botaoArvore.jsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios'

function Cadastro() {
    // Estados de controle
    const [isLastPost, setIsLastPost] = useState(false);
    const [isFirstPostRegistered, setIsFirstPostRegistered] = useState(false);
    const [mostrarMapa, setMostrarMapa] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [localizacaoError, setLocalizacaoError] = useState(null);
    const [isNumeroManual, setIsNumeroManual] = useState(false);
    const [postesCadastrados, setPostesCadastrados] = useState([]);
    const [mapInstance, setMapInstance] = useState(null);
    const [fotosSelecionadas, setFotosSelecionadas] = useState([]);
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


    const { coords, endereco, error: locationError, isLoading: isLoadingLocation } = useGetLocation(isLastPost || isFirstPostRegistered);


    // Preenche os campos automaticamente quando o endereço é obtido
   /* useEffect(() => {
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
        setMostrarMapa(false); // Reset antes de tentar novamente

        try {
            if (!navigator.geolocation) {
                throw new Error("Geolocalização não suportada pelo navegador");
            }

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude, accuracy } = position.coords;
            setUserCoords([latitude, longitude]);
            setMostrarMapa(true);

            if (typeof capturarLocalizacaoParaSalvar === 'function') {
                capturarLocalizacaoParaSalvar(); // Atualiza as coordenadas no hook
            }

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
            setMostrarMapa(false); // Garante que o mapa não será exibido com erro

        }
    };

    // Função para mostrar mapa

    useEffect(() => {
        if (!mostrarMapa || !userCoords) return;
        let newMap;
        if (!mapInstance) {
            // Criação inicial do mapa
            newMap = L.map('mapa', {
                zoomControl: true,
                preferCanvas: true // Melhor performance para muitos marcadores
            }).setView(userCoords, 18);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(newMap);

            // Forçar redesenho do mapa
            setTimeout(() => {
                newMap.invalidateSize();
            }, 100);

            setMapInstance(newMap);
        } else {
            // Atualização do mapa existente
            mapInstance.setView(userCoords);
            newMap = mapInstance;
        }

        // Limpa apenas os marcadores (preserva o tileLayer)
        newMap.eachLayer(layer => {
            if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
                newMap.removeLayer(layer);
            }
        });



        // Adiciona marcador da localização atual
        L.circle(userCoords, {
            color: '#0066ff', // Azul mais vibrante
            fillColor: '#0066ff', // Mesma cor para preenchimento
            fillOpacity: 1, // Opacidade total (sem transparência)
            weight: 2, // Espessura da borda
            radius: 5, // Raio fixo menor (em metros)
        }).addTo(newMap)
        //.bindPopup(`Precisão: ${Math.round(userAccuracy)} metros`);

        // Adiciona marcadores dos postes cadastrados
        if (postesCadastrados?.length > 0) {
            const markers = L.layerGroup(); // Grupo para todos os marcadores

            postesCadastrados.forEach((poste, index) => {
                L.circleMarker(poste.coords, {
                    color: '#808080',
                    fillColor: '#A9A9A9',
                    fillOpacity: 0.8,
                    radius: 6
                }).addTo(markers)
                    .bindPopup(`
                    <b>Poste #${index + 1}</b><br>
                    ${poste.endereco}<br>
                    <small>${new Date(poste.data).toLocaleString()}</small>
                `);
            });

            markers.addTo(newMap);
        }

        return () => {
            if (!mostrarMapa && mapInstance) {
                mapInstance.remove();
                setMapInstance(null);
            }
        };
    }, [mostrarMapa, userCoords, postesCadastrados, userAccuracy, mapInstance]);

    const fecharMapa = () => {
        if (mapInstance) {
            mapInstance.remove();
            setMapInstance(null);
        }
        setMostrarMapa(false);
        setUserCoords(null);
    };*/

// Função para buscar postes cadastrados
/* const fetchPostesCadastrados = async () => {
  try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('https://apialessandro-production.up.railway.app/api/postes', {
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

  try {
      if (!navigator.geolocation) {
          throw new Error("Geolocalização não suportada pelo navegador");
      }

      const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0
          });
      });

      const { latitude, longitude, accuracy } = position.coords;
      setUserCoords([latitude, longitude]);
      setUserAccuracy(accuracy);
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
  }
};

// Configuração do mapa
useEffect(() => {
  if (!mostrarMapa || !userCoords) return;
  
  let newMap;
  if (!mapInstance) {
      newMap = L.map('mapa', {
          zoomControl: true,
          preferCanvas: true
      }).setView(userCoords, 18);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
      }).addTo(newMap);

      setTimeout(() => {
          newMap.invalidateSize();
      }, 100);

      setMapInstance(newMap);
  } else {
      mapInstance.setView(userCoords);
      newMap = mapInstance;
  }

  // Limpa marcadores antigos
  newMap.eachLayer(layer => {
      if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
          newMap.removeLayer(layer);
      }
  });

  // Adiciona marcador da localização atual
  L.circle(userCoords, {
      color: '#0066ff',
      fillColor: '#0066ff',
      fillOpacity: 1,
      weight: 2,
      radius: 5,
  }).addTo(newMap);

  // Adiciona marcadores dos postes cadastrados
  if (postesCadastrados?.length > 0) {
      const markers = L.layerGroup();

      postesCadastrados.forEach((poste, index) => {
          L.circleMarker(poste.coords, {
              color: '#808080',
              fillColor: '#A9A9A9',
              fillOpacity: 0.8,
              radius: 6
          }).addTo(markers)
          .bindPopup(`
              <b>Poste #${index + 1}</b><br>
              ${poste.endereco}<br>
              <small>${new Date(poste.data).toLocaleString()}</small>
          `);
      });

      markers.addTo(newMap);
  }

  return () => {
      if (!mostrarMapa && mapInstance) {
          mapInstance.remove();
          setMapInstance(null);
      }
  };
}, [mostrarMapa, userCoords, postesCadastrados, mapInstance]);

const fecharMapa = () => {
  if (mapInstance) {
      mapInstance.remove();
      setMapInstance(null);
  }
  setMostrarMapa(false);
};


// Função para lidar com a foto panorâmica
const handleFotoLuminaria = (fotoURL) => {
  console.log("Foto da Panorâmica capturada:", fotoURL);
};

// Função para lidar com a foto da árvore
const handleFotoArvore = (foto) => {
  console.log("Foto da Árvore capturada:", foto);
};

// Funções para lidar com a seleção dos ComboBox
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
  if (!coords || coords.length < 2) {
      alert("Não foi possível obter coordenadas válidas!");
      return;
  }
 
  const token = localStorage.getItem('token');
  if (!token) {
      alert('Usuário não autenticado. Faça login novamente.');
      return;
  }
 
  // Verificação de campos obrigatórios
  if (!cidade || !enderecoInput || !numero || !cep || !transformador || !medicao || !telecom ||
      !concentrador || !poste || !alturaposte || !estruturaposte || !tipoBraco || !tamanhoBraco ||
      !quantidadePontos || !tipoLampada || !potenciaLampada || !tipoReator || !tipoComando ||
      !tipoRede || !tipoCabo || !numeroFases || !tipoVia || !hierarquiaVia || !tipoPavimento ||
      !quantidadeFaixas || !tipoPasseio || !canteiroCentral || !finalidadeInstalacao) {
      alert("Preencha todos os campos obrigatórios!");
      return;
  }
 
  try {
      const formData = new FormData();
      
      // Adiciona as coordenadas
      formData.append('coords', JSON.stringify(coords));
      
      // Adiciona todos os campos do formulário
      formData.append('cidade', cidade);
      formData.append('endereco', enderecoInput);
      formData.append('numero', numero);
      formData.append('cep', cep);
      formData.append('isLastPost', isLastPost);
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

 
      // Adiciona as fotos se existirem
      if (fotosSelecionadas) {
          fotosSelecionadas.forEach((foto, index) => {
              formData.append(`fotos_${index}`, foto);
          });
      }
 
      // Envia os dados para o backend
      const response = await axios.post('https://apialessandro-production.up.railway.app/api/cadastro', formData, {
          headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
          }
      });
 
      if (response.status === 200 || response.status === 201) {
          alert("Cadastro salvo com sucesso!");

            // Atualiza a lista de postes
            await fetchPostesCadastrados();
          
          // 1. Cria o objeto do novo poste com os dados atualizados
          const novoPoste = {
              coords: [...coords], // Cria uma cópia do array de coordenadas
              endereco: `${enderecoInput}, ${numero} - ${cidade}`,
              data: new Date().toISOString() // Formato mais consistente
          };
          
          // 2. Atualiza o estado dos postes cadastrados
          setPostesCadastrados(prevPostes => [...prevPostes, novoPoste]);
          
          // 3. Adiciona imediatamente ao mapa se estiver visível
          if (mostrarMapa && mapInstance) {
              L.circleMarker([...coords], {
                  color: '#808080',
                  fillColor: '#A9A9A9',
                  fillOpacity: 0.8,
                  radius: 6
              }).addTo(mapInstance)
              .bindPopup(`<b>Novo Poste</b><br>${novoPoste.endereco}`);
          }
 
          // 4. Limpa os campos após salvar
          setCidade("");
          setEnderecoInput("");
          setNumero("");
          setCep("");
          setFotosSelecionadas([]); // Limpa as fotos selecionadas
          // ... (limpar outros campos conforme necessário)
          
          // 5. Opcional: Atualiza a lista completa do servidor
          // await fetchPostesCadastrados(); // Descomente se quiser buscar todos postes novamente
      }
 
  } catch (error) {
      console.error("Erro completo ao salvar:", error);
      if (error.response) {
          console.error("Dados da resposta:", error.response.data);
          console.error("Status:", error.response.status);
      }
      alert(`Erro ao salvar: ${error.response?.data?.message || error.message}`);
  }
};*/


import React, { useState, useEffect } from "react";
import useGetLocation from "../../hooks/useGetLocation";
import Checkbox from "../../components/checkBox.jsx";
import BotaoCamera from "../../components/botaoCamera.jsx";
import ComboBox from "../../components/ComboBox.jsx";
import BotaoArvore from "../../components/botaoArvore.jsx";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

function Cadastro() {
    // Estados de controle
    const [isLastPost, setIsLastPost] = useState(false);
    const [isFirstPostRegistered, setIsFirstPostRegistered] = useState(false);
    const [mostrarMapa, setMostrarMapa] = useState(false);
    const [userCoords, setUserCoords] = useState(null);
    const [localizacaoError, setLocalizacaoError] = useState(null);
    const [isNumeroManual, setIsNumeroManual] = useState(false);
    const [postesCadastrados, setPostesCadastrados] = useState([]);
    const [mapInstance, setMapInstance] = useState(null);
    const [fotosSelecionadas, setFotosSelecionadas] = useState([]);
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

    const { coords, endereco, error: locationError, isLoading: isLoadingLocation } = useGetLocation(isLastPost || isFirstPostRegistered);

    // Função para buscar postes cadastrados
    const fetchPostesCadastrados = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await axios.get('https://apialessandro-production.up.railway.app/api/listar-postes', {
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

        try {
            if (!navigator.geolocation) {
                throw new Error("Geolocalização não suportada pelo navegador");
            }

            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude, accuracy } = position.coords;
            setUserCoords([latitude, longitude]);
            setUserAccuracy(accuracy);
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
        }
    };

    // Configuração do mapa
    useEffect(() => {
        if (!mostrarMapa || !userCoords) return;

        let newMap;
        if (!mapInstance) {
            newMap = L.map('mapa', {
                zoomControl: true,
                preferCanvas: true
            }).setView(userCoords, 18);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(newMap);

            setTimeout(() => {
                newMap.invalidateSize();
            }, 100);

            setMapInstance(newMap);
        } else {
            mapInstance.setView(userCoords);
            newMap = mapInstance;
        }

        // Limpa marcadores antigos
        newMap.eachLayer(layer => {
            if (layer instanceof L.Circle || layer instanceof L.CircleMarker) {
                newMap.removeLayer(layer);
            }
        });

        // Adiciona marcador da localização atual
        L.circle(userCoords, {
            color: '#0066ff',
            fillColor: '#0066ff',
            fillOpacity: 1,
            weight: 2,
            radius: 5,
        }).addTo(newMap);

        // Adiciona marcadores dos postes cadastrados
        if (postesCadastrados?.length > 0) {
            const markers = L.layerGroup();

            postesCadastrados.forEach((poste, index) => {
                L.circleMarker(poste.coords, {
                    color: '#808080',
                    fillColor: '#A9A9A9',
                    fillOpacity: 0.8,
                    radius: 6
                }).addTo(markers)
                    .bindPopup(`
                    <b>Poste #${index + 1}</b><br>
                    ${poste.endereco}<br>
                    <small>${new Date(poste.data).toLocaleString()}</small>
                `);
            });

            markers.addTo(newMap);
        }

        return () => {
            if (!mostrarMapa && mapInstance) {
                mapInstance.remove();
                setMapInstance(null);
            }
        };
    }, [mostrarMapa, userCoords, postesCadastrados, mapInstance]);

    const fecharMapa = () => {
        if (mapInstance) {
            mapInstance.remove();
            setMapInstance(null);
        }
        setMostrarMapa(false);
    };

    // Estado para as fotos 
    const [fotos, setFotos] = useState([]);

    // Funções para adicionar fotos (atualizadas)
    const handleFotoLuminaria = (fotoFile) => {
        setFotos(prev => [...prev, {
            arquivo: fotoFile,
            tipo: 'LUMINARIA',
            coords: userCoords // Usa coordenadas atuais
        }]);
    };

    const handleFotoArvore = (fotoFile) => {
        setFotos(prev => [...prev, {
            arquivo: fotoFile,
            tipo: 'ARVORE',
            coords: userCoords // Ou coordenadas específicas da árvore
        }]);
    };

    // Adicione também para foto panorâmica
    const handleFotoPanoramica = (fotoFile) => {
        setFotos(prev => [...prev, {
            arquivo: fotoFile,
            tipo: 'PANORAMICA',
            coords: userCoords
        }]);
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
        if (!coords || coords.length < 2) {
            alert("Não foi possível obter coordenadas válidas!");
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            alert('Usuário não autenticado. Faça login novamente.');
            return;
        }

        // Verificação de campos obrigatórios
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

        // Verificação de fotos obrigatórias
        const tiposFotos = fotos.map(f => f.tipo);
        const fotosObrigatoriasFaltando = ['PANORAMICA', 'LUMINARIA']
            .filter(tipo => !tiposFotos.includes(tipo));

        if (fotosObrigatoriasFaltando.length > 0) {
            alert(`Fotos obrigatórias faltando: ${fotosObrigatoriasFaltando.join(' e ')}`);
            return;
        }


        try {
            const formData = new FormData();


            // Adiciona todos os campos do formulário
            formData.append('coords', JSON.stringify(coords));
            formData.append('cidade', cidade);
            formData.append('endereco', enderecoInput);
            formData.append('numero', numero);
            formData.append('cep', cep);
            formData.append('isLastPost', isLastPost);
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

            // 2. Adiciona fotos corretamente
            fotos.forEach((foto) => {
                formData.append('fotos', foto.arquivo); // Nome do campo deve ser sempre 'fotos'
                formData.append('tipo_fotos', foto.tipo); // Tipos em maiúsculas

                if (foto.coords) {
                    formData.append('coords_fotos', JSON.stringify(foto.coords));
                }
            });

            // 3.Envia os dados para o backend
            const response = await axios.post('https://backendalesandro-production.up.railway.app/api/postes', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                }
            });

            if (response.data.success) {

                // Limpa o formulário
                setCidade("");
                setEnderecoInput("");
                setNumero("");
                setCep("");
                setFotos([]);

                // Atualiza a lista de postes
                await fetchPostesCadastrados();

                alert("Cadastro salvo com sucesso!");
            }



        } catch (error) {
            console.error("Erro detalhado:", {
                error: error.response?.data || error.message
            });
            alert(`Erro ao salvar: ${error.response?.data?.message || error.message}`);
        }
    };

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
                        {isLoadingLocation ? 'Obtendo localização...' : 'Carregar Mapa com Minha Localização'}
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
                            {/* Container do mapa - deve vir primeiro na ordem */}
                            <div
                                id="mapa"
                                className="w-full h-[50vh] min-h-[250px] max-h-[400px] 
                                        md:h-[55vh] lg:h-[60vh] lg:max-h-[600px]
                                        mt-3 rounded-lg shadow-sm border border-gray-200
                                      relative z-0 bg-red"
                            ></div>

                                    /*{/* Overlay de carregamento - só aparece se não houver mapInstance */}
                            {!mapInstance && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100/80 z-10">
                                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mb-2"></div>
                                    <p className="text-gray-700 text-sm">Carregando mapa...</p>
                                </div>
                            )}*/

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
                            onFotoCapturada={handleFotoLuminaria}
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