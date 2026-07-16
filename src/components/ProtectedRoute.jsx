import { Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    // Ако не е најавен, го пренасочуваме на најава
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Ако е најавен, но нема улога (на пр. обичен корисник сака на админ панел), го враќаме на почетна
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;  