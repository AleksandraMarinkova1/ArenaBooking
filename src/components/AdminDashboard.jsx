import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import * as signalR from "@microsoft/signalr";
import { useAuth } from "./auth/AuthContext"; 
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { user, logout } = useAuth(); 
  const navigate = useNavigate();

  // Состојба за активното мени (Табови)
  const [activeTab, setActiveTab] = useState("bookings"); // "bookings" или "slots"

  // Основни состојби за филтрирање и податоци
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedCourt, setSelectedCourt] = useState("All");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState(null);

  // 🆕 Динамички термини вчитани од базата (наместо статична низа)
  const [timeSlots, setTimeSlots] = useState([]);
  const [newSlotText, setNewSlotText] = useState("");

  // 🆕 Нови состојби за управување со генерички блокади
  const [blockReason, setBlockReason] = useState("");
  const [blockType, setBlockType] = useState("full-day"); // "full-day" или "specific"
  const [selectedSlotsToBlock, setSelectedSlotsToBlock] = useState([]);

  // Функција за влечење на дефинираните термини од базата
  const fetchTimeSlots = () => {
    fetch("http://localhost:3000/api/timeSlots")
      .then((res) => res.json())
      .then((data) => {
        setTimeSlots(data);
      })
      .catch((err) => console.error("Грешка при влечење термини:", err));
  };

  // Функција за додавање на нов термин од админот во базата
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newSlotText.trim()) {
      toast.error("Внесете временски опсег!");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/api/timeSlots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotText: newSlotText })
      });

      if (response.ok) {
        toast.success("Терминот е успешно додаден во базата!");
        setNewSlotText("");
        fetchTimeSlots();
      } else {
        const err = await response.text();
        toast.error(err || "Грешка при додавање.");
      }
    } catch (err) {
      toast.error("Проблем со поврзувањето.");
    }
  };

  // Функција за бришење на термин од базата
  const handleDeleteSlot = async (id) => {
    if (!window.confirm("Дали сте сигурни дека сакате трајно да го избришете овој термин?")) return;

    try {
      const response = await fetch(`http://localhost:3000/api/timeSlots/${id}`, {
        method: "DELETE"
      });

      if (response.ok) {
        toast.success("Терминот е избришан!");
        fetchTimeSlots();
      } else {
        toast.error("Не може да се избрише терминот.");
      }
    } catch (err) {
      toast.error("Проблем со поврзувањето.");
    }
  };

  // Функција за селектирање/деселектирање на поединечни часови за блок
  const handleToggleSlotSelection = (slot) => {
    if (selectedSlotsToBlock.includes(slot)) {
      setSelectedSlotsToBlock(selectedSlotsToBlock.filter((s) => s !== slot));
    } else {
      setSelectedSlotsToBlock([...selectedSlotsToBlock, slot]);
    }
  };

  // Функција за испраќање на блокадата до .NET бекендот
  const handleSaveBlock = async () => {
    if (selectedCourt === "All") {
      toast.error("Ве молиме изберете конкретен терен/оддел за да поставите блокада.");
      return;
    }

    const payload = {
      date: selectedDate,
      court: selectedCourt,
      reason: blockReason || "Технички причини / Реновирање",
      timeSlots: blockType === "full-day" ? [] : selectedSlotsToBlock
    };

    try {
      const res = await fetch("http://localhost:3000/api/bookings/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Успешно поставена вонредна блокада!");
        setBlockReason("");
        setSelectedSlotsToBlock([]);
        fetchAllBookings(); // Веднаш ја превземаме новата состојба
      } else {
        toast.error("Грешка при зачувување на блокадата.");
      }
    } catch (err) {
      toast.error("Серверска грешка.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast.success("Успешно се одјавивте.");
  };

  const fetchAllBookings = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:3000/api/bookings?date=${selectedDate}&court=${selectedCourt}`;
      const res = await fetch(url);

      if (res.ok) {
        const rawData = await res.json();
        const normalizedData = rawData.map((b) => ({
          id: b.id !== undefined ? b.id : b.Id,
          fullName: b.fullName !== undefined ? b.fullName : b.FullName,
          phoneNumber: b.phoneNumber !== undefined ? b.phoneNumber : b.PhoneNumber,
          court: b.court !== undefined ? b.court : b.Court,
          timeSlot: b.timeSlot !== undefined ? b.timeSlot : b.TimeSlot,
          date: b.date !== undefined ? b.date : b.Date,
          email: b.email !== undefined ? b.email : b.Email,
          isBlocked: b.isBlocked !== undefined ? b.isBlocked : b.IsBlocked, 
          blockReason: b.blockReason !== undefined ? b.blockReason : b.BlockReason 
        }));
        setBookings(normalizedData);
      } else {
        toast.error("Грешка при вчитување на резервациите.");
      }
    } catch (err) {
      toast.error("Неуспешно поврзување со серверот.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeSlots(); // Иницијално влечење на сите дефинирани термини

    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:3000/bookingHub")
      .withAutomaticReconnect()
      .build();
    setConnection(newConnection);

    return () => {
      if (newConnection) newConnection.stop();
    };
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          // Слушај дали има нови измени во базата за термини за веднаш да ги ре-рендерираш
          connection.on("ReceiveTimeSlotsUpdated", () => {
            fetchTimeSlots();
          });

          connection.on("ReceiveBookingCreated", (booking) => {
            if (
              booking.date === selectedDate &&
              (selectedCourt === "All" || booking.court === selectedCourt)
            ) {
              setBookings((prev) => [...prev, booking]);
            }
          });

          connection.on("ReceiveBookingCancelled", (data) => {
            if (data.date === selectedDate) {
              fetchAllBookings(); 
            }
          });
        })
        .catch((err) => console.log("SignalR Admin Error: ", err));
    }

    return () => {
      if (connection) {
        connection.off("ReceiveTimeSlotsUpdated");
        connection.off("ReceiveBookingCreated");
        connection.off("ReceiveBookingCancelled");
      }
    };
  }, [connection, selectedDate, selectedCourt]);

  useEffect(() => {
    fetchAllBookings();
  }, [selectedDate, selectedCourt]);

  const handleAdminCancel = async (id, fullName, isBlocked) => {
    const question = isBlocked 
      ? "Дали сте сигурни дека сакате да ја тргнете блокадата и да го ослободите терминот?"
      : `Дали сте сигурни дека сакате да ја откажете резервацијата на ${fullName}?`;

    if (!window.confirm(question)) return;

    try {
      const response = await fetch(`http://localhost:3000/api/bookings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(isBlocked ? "Терминот е повторно слободен!" : `Успешно откажано за ${fullName}!`);
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        toast.error("Грешка при бришење.");
      }
    } catch (err) {
      toast.error("Серверска грешка.");
    }
  };

  const getCourtBadge = (court) => {
    switch (court) {
      case "Football": return { name: "⚽ Фудбал", bg: "#f0fff4", color: "#22543d" };
      case "Basketball": return { name: "🏀 Кошарка", bg: "#fffaf0", color: "#7b341e" };
      case "Tennis": return { name: "🎾 Тенис", bg: "#fefcbf", color: "#744210" };
      default: return { name: court, bg: "#f7fafc", color: "#4a5568" };
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 20px", fontFamily: "system-ui" }}>
      {/* ТИТУЛА & ОДЈАВА */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ margin: "0 0 5px 0", fontSize: "30px", color: "#1a202c", fontWeight: "800" }}>
            ⚙️ Администраторски Панел
          </h1>
          <p style={{ margin: 0, color: "#718096", fontSize: "15px" }}>
            Управување со резервации, вонредни паузи и блокади во реално време.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ backgroundColor: "#feebc8", color: "#c05621", padding: "8px 16px", borderRadius: "20px", fontWeight: "bold", fontSize: "14px" }}>
            {user?.fullName || "Администратор"} 👑
          </span>
          <button onClick={handleLogout} style={{ padding: "8px 16px", backgroundColor: "#edf2f7", color: "#4a5568", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}>
            Одјави се
          </button>
        </div>
      </div>

      {/* 🧭 СИСТЕМ НА ТАБОВИ ЗА НАВИГАЦИЈА */}
      <div style={{ display: "flex", gap: "15px", marginBottom: "25px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
        <button 
          onClick={() => setActiveTab("bookings")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
            background: "none",
            borderBottom: activeTab === "bookings" ? "4px solid #3182ce" : "4px solid transparent",
            color: activeTab === "bookings" ? "#3182ce" : "#718096",
            transition: "all 0.2s"
          }}
        >
          📋 Преглед и Блокади на Резервации
        </button>
        <button 
          onClick={() => setActiveTab("slots")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
            border: "none",
            background: "none",
            borderBottom: activeTab === "slots" ? "4px solid #3182ce" : "4px solid transparent",
            color: activeTab === "slots" ? "#3182ce" : "#718096",
            transition: "all 0.2s"
          }}
        >
          ⚙️ Управување со Временски Термини
        </button>
      </div>

      {/* ТАБ 1: РЕЗЕРВАЦИИ И ВОНРЕДНИ БЛОКАДИ */}
      {activeTab === "bookings" && (
        <>
          {/* 🚧 МЕНАЏИРАЊЕ СО ВОНРЕДНИ ТЕРМИНИ / ГЕНЕРИЧКИ БЛОКАДИ */}
          <div style={{ backgroundColor: "#fffdf5", padding: "24px", borderRadius: "12px", border: "1px solid #fbd38d", marginBottom: "30px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: "0 0 10px 0", color: "#dd6b20", display: "flex", alignItems: "center", gap: "8px" }}>
              🚧 Постави вонредна пауза / Заклучи работно време
            </h3>
            <p style={{ fontSize: "14px", color: "#744210", margin: "0 0 20px 0" }}>
              Избери датум и конкретен терен/оддел преку филтрите подолу, внеси генеричка причина (реновирање, празник, пауза) и исклучи ги термините за корисниците.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <div>
                <label style={{ fontWeight: "bold", fontSize: "14px", color: "#4a5568" }}>Причина за затворање (видливо за клиентите):</label>
                <input 
                  type="text" 
                  placeholder="Пример: Затворено поради реновирање, Колективен одмор, Државен празник..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  style={{ width: "100%", padding: "11px", marginTop: "6px", borderRadius: "6px", border: "1px solid #cbd5e0", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", gap: "25px", alignItems: "center", margin: "5px 0" }}>
                <label style={{ cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                  <input type="radio" name="blockType" checked={blockType === "full-day"} onChange={() => setBlockType("full-day")} /> 
                  <span style={{ marginLeft: "6px" }}>Блокирај цел ден</span>
                </label>
                <label style={{ cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                  <input type="radio" name="blockType" checked={blockType === "specific"} onChange={() => setBlockType("specific")} /> 
                  <span style={{ marginLeft: "6px" }}>Блокирај специфични часови</span>
                </label>
              </div>

              {blockType === "specific" && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", padding: "12px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                  {timeSlots.map(s => {
                    const text = s.slotText || s.SlotText;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleToggleSlotSelection(text)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          border: "1px solid",
                          borderColor: selectedSlotsToBlock.includes(text) ? "#e53e3e" : "#cbd5e0",
                          backgroundColor: selectedSlotsToBlock.includes(text) ? "#fff5f5" : "#f7fafc",
                          color: selectedSlotsToBlock.includes(text) ? "#e53e3e" : "#4a5568",
                          cursor: "pointer",
                          fontWeight: selectedSlotsToBlock.includes(text) ? "bold" : "normal"
                        }}
                      >
                        {text} {selectedSlotsToBlock.includes(text) ? "❌" : ""}
                      </button>
                    );
                  })}
                </div>
              )}

              <button 
                onClick={handleSaveBlock}
                style={{ alignSelf: "flex-start", padding: "10px 24px", backgroundColor: "#dd6b20", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
              >
                Примени вонредна блокада 🔐
              </button>
            </div>
          </div>

          {/* ФИЛТРИ ЗА ПРЕГЛЕД */}
          <div style={{ display: "flex", gap: "20px", padding: "20px", backgroundColor: "#fff", borderRadius: "12px", marginBottom: "20px", border: "1px solid #e2e8f0", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", color: "#4a5568" }}>Датум:</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e0" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <label style={{ fontSize: "14px", fontWeight: "bold", color: "#4a5568" }}>Терен / Оддел:</label>
              <select value={selectedCourt} onChange={(e) => setSelectedCourt(e.target.value)} style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e0", backgroundColor: "#fff" }}>
                <option value="All">Сите прегледи</option>
                <option value="Football">⚽ Фудбал</option>
                <option value="Basketball">🏀 Кошарка</option>
                <option value="Tennis">🎾 Тенис</option>
              </select>
            </div>
          </div>

          {/* ТАБЕЛА СО РЕЗЕРВАЦИИ И БЛОКАДИ */}
          <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "#718096" }}>Вчитување на податоци...</div>
            ) : bookings.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f7fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "15px 20px", color: "#4a5568", fontWeight: "bold", fontSize: "14px" }}>Корисник / Причина</th>
                    <th style={{ padding: "15px 20px", color: "#4a5568", fontWeight: "bold", fontSize: "14px" }}>Телефон</th>
                    <th style={{ padding: "15px 20px", color: "#4a5568", fontWeight: "bold", fontSize: "14px" }}>Терен / Оддел</th>
                    <th style={{ padding: "15px 20px", color: "#4a5568", fontWeight: "bold", fontSize: "14px" }}>Термин</th>
                    <th style={{ padding: "15px 20px", color: "#4a5568", fontWeight: "bold", fontSize: "14px" }}>Акција</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => {
                    const badge = getCourtBadge(b.court);
                    return (
                      <tr key={b.id} style={{ borderBottom: "1px solid #edf2f7", backgroundColor: b.isBlocked ? "#fffaf0" : "transparent" }}>
                        <td style={{ padding: "15px 20px", fontWeight: "600", color: b.isBlocked ? "#c05621" : "#1a202c" }}>
                          {b.isBlocked ? `🚫 БЛОКИРАНО: ${b.blockReason}` : b.fullName}
                        </td>
                        <td style={{ padding: "15px 20px", color: "#4a5568" }}>{b.phoneNumber}</td>
                        <td style={{ padding: "15px 20px" }}>
                          <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold" }}>
                            {badge.name}
                          </span>
                        </td>
                        <td style={{ padding: "15px 20px", color: "#2d3748", fontWeight: "bold" }}>{b.timeSlot}</td>
                        <td style={{ padding: "15px 20px" }}>
                          <button
                            onClick={() => handleAdminCancel(b.id, b.fullName, b.isBlocked)}
                            style={{
                              padding: "6px 12px",
                              backgroundColor: b.isBlocked ? "#ebf8ff" : "#fff5f5",
                              color: b.isBlocked ? "#2b6cb0" : "#e53e3e",
                              border: "1px solid",
                              borderColor: b.isBlocked ? "#bee3f8" : "#fed7d7",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontWeight: "bold",
                              fontSize: "13px",
                            }}
                          >
                            {b.isBlocked ? "Ослободи" : "Откажи"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#718096" }}>
                <p style={{ fontSize: "18px", margin: "0 0 5px 0" }}>📂 Нема активни резервации или блокади</p>
                <p style={{ fontSize: "14px", margin: 0 }}>Сите термини за овој датум се моментално слободни.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ТАБ 2: НОВИОТ ДЕЛ ЗА ДОДАВАЊЕ, БРИШЕЊЕ И МЕНАЏИРАЊЕ НА ТЕРМИНИ */}
      {activeTab === "slots" && (
        <div style={{ backgroundColor: "#fff", padding: "30px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px rgba(0,0,0,0.01)" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "20px", color: "#1a202c", fontWeight: "700" }}>
            ⚙️ Додавање и Бришење на Термини
          </h3>
          <p style={{ margin: "0 0 20px 0", color: "#718096", fontSize: "14px" }}>
            Временските опсези дефинирани овде веднаш ќе се рефлектираат на главната страница за корисниците.
          </p>

          {/* Форма за додавање на нов термин */}
          <form onSubmit={handleAddSlot} style={{ display: "flex", gap: "12px", marginBottom: "30px" }}>
            <input 
              type="text" 
              placeholder="Внесете нов временски опсег (пр: 22:00 - 23:00)" 
              value={newSlotText} 
              onChange={(e) => setNewSlotText(e.target.value)}
              style={{ 
                padding: "12px", 
                borderRadius: "8px", 
                border: "1px solid #cbd5e0", 
                flex: 1,
                fontSize: "15px",
                outline: "none"
              }}
            />
            <button 
              type="submit" 
              style={{ 
                padding: "12px 24px", 
                backgroundColor: "#3182ce", 
                color: "#fff", 
                border: "none", 
                borderRadius: "8px", 
                cursor: "pointer", 
                fontWeight: "bold",
                fontSize: "15px",
              }}
            >
              Додади Термин ➕
            </button>
          </form>

          {/* Листа на постоечки термини во базата со копчиња за бришење */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {timeSlots.length === 0 ? (
              <p style={{ color: "#a0aec0", fontSize: "14px", fontStyle: "italic" }}>Нема дефинирано термини во базата.</p>
            ) : (
              timeSlots.map((s) => (
                <div 
                  key={s.id} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: "12px", 
                    padding: "10px 16px", 
                    backgroundColor: "#f7fafc", 
                    borderRadius: "10px", 
                    border: "1px solid #e2e8f0" 
                  }}
                >
                  <span style={{ fontWeight: "bold", color: "#4a5568", fontSize: "14px" }}>
                    {s.slotText || s.SlotText}
                  </span>
                  <button 
                    type="button"
                    onClick={() => handleDeleteSlot(s.id)}
                    style={{ 
                      backgroundColor: "transparent", 
                      border: "none", 
                      color: "#e53e3e", 
                      cursor: "pointer", 
                      fontSize: "14px",
                      padding: 0
                    }}
                    title="Избриши"
                  >
                    ❌
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}