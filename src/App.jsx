import Home from './pages/Home';
import MyBookings from './components/MyBookingsModal';
import { Toaster } from 'react-hot-toast';
import AdminDashboard from './components/AdminDashboard';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Login from './components/Login'; // Го чуваме само Login
import ChatBot from './components/ChatBot'

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      
      <Navigation />
      
      <Routes>
        {/* Јавни рути - Секој може да ги отвори */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Обичните луѓе можат да си ги гледаат резервациите без најава (MyBookings вообичаено користи внесување на мејл) */}
        <Route path="/my-bookings" element={<MyBookings />} />

        {/* Заштитена рута САМО ЗА АДМИНИСТРАТОРИ */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <ChatBot />
    </AuthProvider>
  );
}

export default App;