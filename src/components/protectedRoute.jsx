import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children, allowedLevels }) {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user'));

  // Se não estiver logado, redireciona para login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica se o usuário tem o nível necessário
  if (allowedLevels && !allowedLevels.includes(user.nivel)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}