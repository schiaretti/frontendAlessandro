import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { FiSun, FiUsers, FiMapPin, FiLogOut, } from 'react-icons/fi';
import useAuth from '../../hooks/useAuth';
import { FiMenu } from "react-icons/fi";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
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
            >
              <FiSun className="mr-3" />
              Visão Geral
            </Link>
            
            <Link 
              to="/Cadastro" 
              className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
            >
              <FiMapPin className="mr-3" />
              Cadastro de Postes
            </Link>
            
            {user?.nivel === 'admin' && (
              <>
                <Link 
                  to="/CadastroUsuarios" 
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                >
                  <FiUsers className="mr-3" />
                  Cadastro de Usuários
                </Link>
                
                <Link 
                  to="/Cidades" 
                  className="flex items-center px-4 py-3 text-white hover:bg-blue-600 rounded-lg transition-colors"
                >
                  <FiMapPin className="mr-3" />
                  Cadastro de Cidades
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
            >
              <FiLogOut className="mr-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Área Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4">
            <div className="flex items-center">
              <button className="md:hidden text-gray-500 focus:outline-none">
                <FiMenu className="h-6 w-6" />
              </button>
              <h1 className="ml-4 text-xl font-semibold text-gray-800">Painel de Controle</h1>
            </div>
            
            <div className="flex items-center space-x-4">
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
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet /> {/* Isso renderizará as páginas filhas */}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;