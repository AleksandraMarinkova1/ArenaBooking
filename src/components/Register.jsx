import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const Register = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Едноставна валидација на лозинките на самиот фронтенд
    if (password !== confirmPassword) {
      toast.error("Лозинките не се совпаѓаат!");
      return;
    }

    if (password.length < 6) {
      toast.error("Лозинката мора да има најмалку 6 карактери.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: "User" // Стандардно, секој нов регистриран профил е обичен корисник
        })
      });

      if (res.ok) {
        toast.success("Успешна регистрација! Сега можете да се најавите.");
        navigate('/login'); // Го носиме корисникот на најава
      } else {
        const errorText = await res.text();
        toast.error(errorText || "Неуспешна регистрација.");
      }
    } catch (error) {
      toast.error("Грешка при поврзување со серверот.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Креирај профил</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Име и презиме:</label>
          <input 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)} 
            required 
            placeholder="на пр. Марко Петровски"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Е-пошта:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="name@example.com"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Лозинка:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="Минимум 6 карактери"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Потврди лозинка:</label>
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            required 
            placeholder="Внесете ја лозинката повторно"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '10px', 
            background: loading ? '#95a5a6' : '#2ecc71', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {loading ? "Се регистрира..." : "Регистрирај се"}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '14px' }}>
        Веќе имате профил? <Link to="/login" style={{ color: '#3498db', textDecoration: 'none', fontWeight: 'bold' }}>Најавете се тука</Link>
      </p>
    </div>
  );
};

export default Register;