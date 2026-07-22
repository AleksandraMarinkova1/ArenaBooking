// Додади го email и setEmail во пропсевите на компонентата
export default function BookingModal({ 
  isOpen, onClose, slot, court, date, 
  fullName, setFullName, 
  phoneNumber, setPhoneNumber,
  email, setEmail,
  onSubmit ,
  isSubmitting,
}) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '12px', width: '400px' }}>
        <h3 style={{ margin: '0 0 15px 0' }}>📅 Нова Резервација</h3>
        
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>ИМЕ И ПРЕЗИМЕ</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>ТЕЛЕФОНСКИ БРОЈ</label>
            <input type="tel" required value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }} />
          </div>

          {/* НОВО ПОЛЕ ЗА Е-ПОШТА */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Е-ПОШТА ЗА ПОТВРДА</label>
            <input type="email" required placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e0', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 15px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Откажи</button>
            <button 
              type="submit" 
              disabled={isSubmitting} // 👈 3. Заклучување на потврдата
              style={{ padding: '10px 20px', backgroundColor: isSubmitting ? '#90cdf4' : '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >
              {isSubmitting ? "Се резервира..." : "Потврди"} {/* 👈 4. Динамичен текст */}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}