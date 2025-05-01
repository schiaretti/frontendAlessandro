import React, { useState, useEffect, useRef, useCallback } from "react";
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import axios from 'axios';


const Mapa = ({ 
  token,
  onLogout,
  onLocationUpdate,
  postesCadastrados = [], // Recebe os postes como prop
  initialCoords = [-23.5505, -46.6333] // Coordenadas padrão (São Paulo)
}) => {
  // Referências do mapa
  const mapRef = useRef(null);
  const markersGroupRef = useRef(null);
  const mapInitialized = useRef(false);
  
  // Estados
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [userAccuracy, setUserAccuracy] = useState(10);
  const [editMode, setEditMode] = useState(false);
  const [showEditButtons, setShowEditButtons] = useState(false);
  const [localizacaoError, setLocalizacaoError] = useState(null);

  // Atualiza posição no backend
  const atualizarPosicaoPoste = useCallback(async (posteId, lat, lng) => {
    try {
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
      return resposta.data;
    } catch (erro) {
      console.error('Erro ao atualizar posição:', erro);
      if (erro.response?.status === 401 && onLogout) {
        onLogout();
      }
      throw erro;
    }
  }, [token, onLogout]);

  // Inicialização do mapa
  const initMap = useCallback(() => {
    const mapContainer = document.getElementById('mapa');
    if (!mapContainer || mapInitialized.current) return;

    const initialViewCoords = userCoords || initialCoords;
    
    mapRef.current = L.map('mapa', {
      zoomControl: true,
      preferCanvas: true
    }).setView(initialViewCoords, 18);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapRef.current);

    markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
    mapInitialized.current = true;

    updateUserMarker(initialViewCoords);
    addPostMarkers();
  }, [userCoords, initialCoords]);

  // Atualiza marcador do usuário
  const updateUserMarker = useCallback((coords) => {
    if (!mapRef.current || !coords || coords.length !== 2) return;

    if (mapRef.current.userMarker) {
      mapRef.current.userMarker.setLatLng(coords);
    } else {
      mapRef.current.userMarker = L.circleMarker(coords, {
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 1,
        radius: 8
      }).addTo(mapRef.current)
        .bindPopup('Sua localização atual');
    }

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

  // Adiciona marcadores dos postes
  const addPostMarkers = useCallback(() => {
    if (!mapRef.current || !markersGroupRef.current) return;

    // Limpa marcadores existentes
    markersGroupRef.current.clearLayers();

    // Cria novos marcadores
    postesCadastrados.forEach((poste) => {
      const [lat, lng] = poste.coords || [poste.latitude, poste.longitude];
      if (!lat || !lng) return;

      const marker = L.marker([lat, lng], {
        draggable: editMode,
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

      if (editMode) {
        marker.on('dragend', () => {
          const newPos = marker.getLatLng();
          marker._posteData.tempPosition = newPos;
          marker.setPopupContent(`
            <div class="p-2">
              <strong>${poste.numeroIdentificacao || poste.id}</strong>
              <div class="text-yellow-600 text-xs font-bold">
                Nova posição:<br>
                Lat: ${newPos.lat.toFixed(6)}<br>
                Lng: ${newPos.lng.toFixed(6)}
              </div>
            </div>
          `);
        });
      }

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
  }, [postesCadastrados, editMode]);

  // Funções de edição
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

      if (onLocationUpdate) {
        onLocationUpdate(selectedMarker.options.posteId, newPos);
      }

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
  }, [selectedMarker, exitEditMode, cancelEdit, onLocationUpdate]);

  // Obtém localização do usuário
  const obterLocalizacaoUsuario = useCallback(async () => {
    setLocalizacaoError(null);
    setIsLoadingLocation(true);
    setMostrarMapa(false);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocalização não suportada pelo navegador");
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      const { latitude, longitude, accuracy } = position.coords;
      const newCoords = [latitude, longitude];

      setUserCoords(newCoords);
      setUserAccuracy(accuracy);
      setMostrarMapa(true);
    } catch (error) {
      console.error("Falha na obtenção de localização:", error);
      handleLocationError(error);
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  // Trata erros de localização
  const handleLocationError = useCallback((error) => {
    let errorMessage = "Não foi possível obter localização precisa.";

    if (error.code === error.PERMISSION_DENIED) {
      errorMessage = "Permissão de localização negada. Por favor, habilite no navegador.";
    } else if (error.code === error.POSITION_UNAVAILABLE) {
      errorMessage = "Localização indisponível. Verifique sua conexão ou GPS.";
    } else if (error.code === error.TIMEOUT) {
      errorMessage = "Tempo de espera excedido. Tente novamente em área aberta.";
    } else if (error.message.includes('token')) {
      errorMessage = "Sessão expirada. Redirecionando para login...";
      if (onLogout) onLogout();
    }

    setLocalizacaoError(errorMessage);
    setUserCoords(initialCoords);
    setMostrarMapa(true);
  }, [initialCoords, onLogout]);

  // Fecha o mapa
  const fecharMapa = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markersGroupRef.current = null;
      mapInitialized.current = false;
    }
    setMostrarMapa(false);
  }, []);

  // Efeitos
  useEffect(() => {
    if (mostrarMapa && !mapInitialized.current) {
      initMap();
    }
  }, [mostrarMapa, initMap]);

  useEffect(() => {
    if (mapInitialized.current && postesCadastrados.length > 0) {
      addPostMarkers();
    }
  }, [postesCadastrados, addPostMarkers]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-center mb-6 bg-slate-600 text-white p-2 rounded-lg">
            Mapa de Postes
          </h1>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">Controles do Mapa</h2>

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

          {mostrarMapa && (
            <div className="mb-6">
              <div
                id="mapa"
                className="h-[80vh] w-full rounded-lg border border-gray-300"
                style={{ minHeight: '400px', maxHeight: '600px' }}
              ></div>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    if (editMode) {
                      cancelEdit();
                    } else {
                      fecharMapa();
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-white ${editMode
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-red-600 hover:bg-red-700'
                    }`}
                >
                  {editMode ? 'Cancelar Edição' : 'Fechar Mapa'}
                </button>

                <button
                  onClick={() => {
                    if (editMode) {
                      savePosition();
                    } else {
                      setEditMode(true);
                    }
                  }}
                  className={`px-4 py-2 rounded-md text-white ${editMode
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                >
                  {editMode ? 'Salvar Alterações' : 'Editar Localizações'}
                </button>
              </div>
            </div>
          )}

          {showEditButtons && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-50">
              <button
                onClick={savePosition}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
              >
                Salvar
              </button>
              <button
                onClick={cancelEdit}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mapa;