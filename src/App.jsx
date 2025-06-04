import React from 'react'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/protectedRoute';
import CadastroUsuarios from './pages/CadastroUsuarios';
import Cidades from './pages/Cidades';
import Dashboard from './pages/Dashboard';
import DashboardHome from './pages/Dashboard/DashboardHome';



function App() {
   // Adicione isto para verificação
  if (process.env.NODE_ENV === 'development') {
    console.log('Versão do React:', React.version);
  }
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Rota pública de login */}
          <Route path="/" element={<Login />} />

          {/* Rota do Dashboard (layout principal) */}
          <Route element={
            <ProtectedRoute allowedLevels={['cadastrador', 'admin', 'visualizador']}>
              <Dashboard />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/Cadastro" element={<Cadastro />} />
            <Route path="/CadastroUsuarios" element={<CadastroUsuarios />} />
            <Route path="/Cidades" element={<Cidades />} />
          </Route>

          {/* Rota de fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;