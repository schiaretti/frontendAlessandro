/*import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Cadastro from './pages/Cadastro';
import Login from './pages/Login'
import ErrorBoundary from './components/ErrorBoundary';


function App() {
  return (
    <BrowserRouter>
    <ErrorBoundary>
      <Routes>
        <Route path="/cadastro" element={<Cadastro/>} />
        <Route path='/' element={<Login/>} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;*/

import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/protectedRoute';
import CadastroUsuarios from './pages/CadastroUsuarios.jsx';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          {/* Rota pública de login */}
          <Route path="/" element={<Login />} />


          {/* Rota de cadastro (protegida) */}
          <Route path="/Cadastro" element={
            <ProtectedRoute allowedLevels={['cadastrador', 'admin']}>
              <Cadastro />
            </ProtectedRoute>
          } />

          <Route path="/Cadastro-usuarios" element={
            <ProtectedRoute allowedLevels={['admin']}>
              <CadastroUsuarios />
            </ProtectedRoute>
          } />

          {/* Rota de fallback para páginas não encontradas */}
          <Route path="*" element={<Navigate to="/Cadastro" replace />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;