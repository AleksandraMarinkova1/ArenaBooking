import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

const Navigation = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', background: '#1a1a1a', color: 'white', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <Link to="/" style={{ color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>
          🏟️ Arena Bookings
        </Link>
        <Link to="/my-bookings" style={{ color: '#ccc', textDecoration: 'none' }}>
          Мои Резервации
        </Link>
      </div>

      <div>
        {/* 🔐 Прикажи ги овие опции САМО ако корисникот е најавен како ADMIN */}
        {user && user.role === 'Admin' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <Link to="/admin" style={{ color: '#ff4d4d', fontWeight: 'bold', textDecoration: 'none', border: '1px solid #ff4d4d', padding: '5px 10px', borderRadius: '4px' }}>
              Admin Dashboard
            </Link>
            <span style={{ fontSize: '14px', color: '#aaa' }}>{user.fullName}</span>
            <button 
              onClick={handleLogout} 
              style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}
            >
              Одјава
            </button>
          </div>
        ) : (
          // Обичните луѓе не гледаат ништо овде (нема "Login" линк во менито за да изгледа поприватно)
          <span style={{ fontSize: '12px', color: '#555' }}>v1.0</span>
        )}
      </div>
    </nav>
  );
};

export default Navigation;