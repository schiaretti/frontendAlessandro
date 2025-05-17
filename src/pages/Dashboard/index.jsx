import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FiSun, FiUsers, FiMapPin, FiLogOut, FiMenu, FiX, FiMap, FiFileText  } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import Mapa from '../../components/Mapa';
import axios from 'axios';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleMap = () => {
    setShowMap(!showMap);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  const [postesCadastrados, setPostesCadastrados] = useState([]);
  const [loadingPostes, setLoadingPostes] = useState(false);
  const [errorPostes, setErrorPostes] = useState(null);

  // Adicione este useEffect logo após os estados
  useEffect(() => {
    if (showMap) {
      fetchPostesCadastrados();
    }
  }, [showMap]); // Isso fará com que a função seja chamada sempre que showMap mudar

 const fetchPostesCadastrados = async () => {
  setLoadingPostes(true);
  setErrorPostes(null);

  try {
    const response = await axios.get(
      'https://backendalesandro-production.up.railway.app/api/listar-postes',
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      }
    );

    // Primeiro filtramos os postes válidos
    const postesFiltrados = response.data.data.filter(poste => {
      const coords = poste.coords || 
        (poste.latitude && poste.longitude ? 
          [poste.latitude, poste.longitude] : 
          null);
      return coords && !isNaN(coords[0]) && !isNaN(coords[1]);
    });

    // Depois mapeamos para o formato desejado
    const postesValidos = postesFiltrados.map(poste => ({
      ...poste,
      coords: poste.coords || [poste.latitude, poste.longitude],
      numeroIdentificacao: poste.numeroIdentificacao || `Poste-${poste.id?.slice(0, 8) || '000'}`
    }));

    setPostesCadastrados(postesValidos);
  } catch (error) {
    console.error("Erro ao buscar postes:", error);
    setErrorPostes("Erro ao carregar postes. Tente novamente.");
    if (error.response?.status === 401) {
      logout();
    }
  } finally {
    setLoadingPostes(false);
  }
};

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-col w-64 bg-gradient-to-b from-blue-800 to-blue-600 text-white">
        <div className="flex items-center justify-center h-16 px-4 border-b border-blue-700">
          <FiSun className="h-8 w-8 mr-2" />
          <span className="text-xl font-bold">All Iluminação</span>
        </div>

        <div className="flex flex-col flex-grow px-4 py-4">
          <nav className="flex-1 space-y-2">
            <Link
              to="/dashboard"
              className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FiSun className="mr-3" />
              Visão Geral
            </Link>

            <button
              onClick={toggleMap}
              className="w-full flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors text-left"
            >
              <FiMap className="mr-3" />
              {showMap ? 'Ocultar Mapa' : 'Ver Mapa'}
            </button>

            <Link
              to="/Cadastro"
              className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              <FiMapPin className="mr-3" />
              Cadastro de Postes
            </Link>

            {user?.nivel === 'admin' && (
              <>
                <Link
                  to="/CadastroUsuarios"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiUsers className="mr-3" />
                  Cadastro de Usuários
                </Link>

                <Link
                  to="/Cidades"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiMapPin className="mr-3" />
                  Cadastro de Cidades
                </Link>

                 <Link
                  to="/relatorios/postes"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FiFileText  className="mr-3" />
                  Relatórios
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
              <span className="ml-2 text-sm">{user?.nome}</span>
            </div>
            <button
              onClick={logout}
              className="text-white hover:text-blue-200 flex items-center"
              title="Sair"
            >
              <FiLogOut className="mr-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={toggleMobileMenu}></div>
          <div className="relative flex flex-col w-64 h-full bg-gradient-to-b from-blue-800 to-blue-600 text-white">
            <div className="flex items-center justify-between h-16 px-4 border-b border-blue-700">
              <div className="flex items-center">
                <FiSun className="h-8 w-8 mr-2" />
                <span className="text-xl font-bold">All Iluminação</span>
              </div>
              <button onClick={toggleMobileMenu} className="text-white">
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="flex flex-col flex-grow px-4 py-4">
              <nav className="flex-1 space-y-2">
                <Link
                  to="/dashboard"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                  onClick={toggleMobileMenu}
                >
                  <FiSun className="mr-3" />
                  Visão Geral
                </Link>

                <button
                  onClick={() => {
                    toggleMap();
                    toggleMobileMenu();
                  }}
                  className="w-full flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors text-left"
                >
                  <FiMap className="mr-3" />
                  {showMap ? 'Ocultar Mapa' : 'Ver Mapa'}
                </button>

                <Link
                  to="/Cadastro"
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                  onClick={toggleMobileMenu}
                >
                  <FiMapPin className="mr-3" />
                  Cadastro de Postes
                </Link>

                {user?.nivel === 'admin' && (
                  <>
                    <Link
                      to="/CadastroUsuarios"
                      className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                      onClick={toggleMobileMenu}
                    >
                      <FiUsers className="mr-3" />
                      Cadastro de Usuários
                    </Link>

                    <Link
                      to="/Cidades"
                      className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                      onClick={toggleMobileMenu}
                    >
                      <FiMapPin className="mr-3" />
                      Cadastro de Cidades
                    </Link>

                        <Link
                      to="/relatorios/postes"
                      className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                      onClick={toggleMobileMenu}
                    >
                      <FiFileText  className="mr-3" />
                      Relatórios
                    </Link>
                  </>
                )}
              </nav>
            </div>

            <div className="p-4 border-t border-blue-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                    {user?.nome?.charAt(0).toUpperCase()}
                  </div>
                  <span className="ml-2 text-sm">{user?.nome}</span>
                </div>
                <button
                  onClick={logout}
                  className="text-white hover:text-blue-200 flex items-center"
                  title="Sair"
                >
                  <FiLogOut className="mr-1" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button
                className="md:hidden text-gray-500 focus:outline-none"
                onClick={toggleMobileMenu}
              >
                {mobileMenuOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-800">
                {showMap ? 'Mapa de Postes' : 'Painel de Controle'}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={toggleMap}
                className="flex items-center text-sm bg-blue-100 text-blue-600 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
              >
                <FiMap className="mr-1" />
                {showMap ? 'Voltar ao Painel' : 'Ver Mapa'}
              </button>

              <span className="text-sm text-gray-600 hidden md:block">
                {user?.nivel === 'admin' ? 'Administrador' :
                  user?.nivel === 'cadastrador' ? 'Cadastrador' : 'Visualizador'}
              </span>
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                {user?.nome?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {showMap ? (
            <div className="h-full">
              {loadingPostes ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Carregando postes...</p>
                  </div>
                </div>
              ) : errorPostes ? (
                <div className="flex flex-col justify-center items-center h-full p-4">
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {errorPostes}
                  </div>
                  <button
                    onClick={fetchPostesCadastrados}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <Mapa
                  token={localStorage.getItem('token')}
                  onLogout={logout}
                  postesCadastrados={postesCadastrados}
                  onLocationUpdate={(posteId, newCoords) => {
                    console.log(`Poste ${posteId} atualizado para:`, newCoords);
                    // Atualiza o estado local com a nova posição
                    setPostesCadastrados(prev =>
                      prev.map(poste =>
                        poste.id === posteId
                          ? { ...poste, coords: [newCoords.lat, newCoords.lng] }
                          : poste
                      )
                    );
                  }}
                />
              )}
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <div className="max-w-7xl mx-auto">
                {/* Seção de Acesso Rápido com o Mapa */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Acesso Rápido</h3>
                    {postesCadastrados.length > 0 && (
                      <span className="text-sm text-gray-500">
                        {postesCadastrados.length} postes cadastrados
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <Link
                      to="/Cadastro"
                      className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      <FiMapPin className="h-8 w-8 text-blue-600 mb-2" />
                      <span>Cadastro de Postes</span>
                    </Link>

                    <button
                      onClick={toggleMap}
                      className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors"
                    >
                      <FiMap className="h-8 w-8 text-green-600 mb-2" />
                      <span>Mapa Interativo</span>
                      {postesCadastrados.length > 0 && (
                        <span className="text-xs text-gray-500 mt-1">
                          {postesCadastrados.length} postes
                        </span>
                      )}
                    </button>

                    {user?.nivel === 'admin' && (
                      <>
                        <Link
                          to="/CadastroUsuarios"
                          className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors"
                        >
                          <FiUsers className="h-8 w-8 text-purple-600 mb-2" />
                          <span>Cadastro de Usuários</span>
                        </Link>

                        <Link
                          to="/Cidades"
                          className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors"
                        >
                          <FiMapPin className="h-8 w-8 text-orange-600 mb-2" />
                          <span>Cadastro de Cidades</span>
                        </Link>

                          <Link
                          to="/relatorios/postes"
                          className="flex flex-col items-center justify-center p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition-colors"
                        >
                          <FiFileText  className="h-8 w-8 text-orange-600 mb-2" />
                          <span>Relatórios</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Conteúdo principal das rotas filhas */}
                <Outlet />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};




export default Dashboard;