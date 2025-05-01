import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiMapPin, FiUsers, FiRefreshCw } from 'react-icons/fi';
import api from '../../services/api';

const DashboardHome = () => {
  const [dashboardData, setDashboardData] = useState({
    postes: 0,
    usuarios: 0,
    cidades: 0,
    loading: true,
    error: null
  });

  const fetchPostesCount = async () => {
    try {
      const response = await api.get('/count-postes', {
        params: {
          page: 1,
          limit: 1 // Pegamos apenas 1 registro, pois só precisamos do count
        }
      });
      return response.data.count;
    } catch (error) {
      console.error('Erro ao buscar postes:', error);
      throw error;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));
      
      // Aqui você pode adicionar as outras chamadas para usuários e cidades
      const postesCount = await fetchPostesCount();

      setDashboardData({
        postes: postesCount,
        usuarios: 0, // Substitua por chamada real
        cidades: 0,  // Substitua por chamada real
        loading: false,
        error: null
      });
    } catch (error) {
      setDashboardData({
        postes: 0,
        usuarios: 0,
        cidades: 0,
        loading: false,
        error: 'Erro ao carregar dados'
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const renderValue = (value) => {
    if (dashboardData.loading) {
      return <span className="text-gray-400">Carregando...</span>;
    }
    if (dashboardData.error) {
      return <span className="text-red-500">Erro</span>;
    }
    return value.toLocaleString('pt-BR');
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center text-gray-800">Bem-vindo ao Sistema All Iluminação</h2>
        <p className="text-gray-600 mt-4 text-center">Gerencie sua infraestrutura de iluminação pública</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card Postes Cadastrados - Agora com dados reais */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
                <FiMapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-gray-500">Postes Cadastrados</p>
                <h3 className="text-2xl font-bold">
                  {renderValue(dashboardData.postes)}
                </h3>
              </div>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="text-blue-500 hover:text-blue-700"
              title="Recarregar"
            >
              <FiRefreshCw className={`h-5 w-5 ${dashboardData.loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
             
        {/* Card Usuários Ativos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
              <FiUsers className="h-6 w-6" />
            </div>
            <div>
              <p className="text-gray-500">Usuários Ativos</p>
              <h3 className="text-2xl font-bold">
                {renderValue(dashboardData.usuarios)}
              </h3>
            </div>
          </div>
        </div>
        
        {/* Card Cidades Atendidas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600 mr-4">
              <FiMapPin className="h-6 w-6" />
            </div>
            <div>
              <p className="text-gray-500">Cidades Atendidas</p>
              <h3 className="text-2xl font-bold">
                {renderValue(dashboardData.cidades)}
              </h3>
            </div>
          </div>
        </div>
      </div>         
    </div>
  );
};

export default DashboardHome;