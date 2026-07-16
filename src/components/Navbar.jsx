import { NavLink } from "react-router";

export default function Navbar() {
  const linkStyle = ({ isActive }) => ({
    textDecoration: 'none',
    color: isActive ? '#3182ce' : '#4a5568',
    fontWeight: 'bold',
    fontSize: '15px',
    padding: '8px 16px',
    borderRadius: '6px',
    backgroundColor: isActive ? '#ebf8ff' : 'transparent',
    transition: 'all 0.2s ease'
  });

  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '15px 40px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>🏆</span>
        <span style={{ fontWeight: '800', fontSize: '18px', color: '#1a202c', letterSpacing: '0.5px' }}>
          ARENA BOOKINGS
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <NavLink to="/" style={linkStyle}>🏠 Почетна</NavLink>
        <NavLink to="/my-bookings" style={linkStyle}>🔍 Мои Резервации</NavLink>
        <NavLink to="/admin" style={linkStyle}>⚙️ Админ</NavLink>
        <NavLink to="/about" style={linkStyle}>ℹ️ За Нас</NavLink>
      </div>
    </nav>
  );
}