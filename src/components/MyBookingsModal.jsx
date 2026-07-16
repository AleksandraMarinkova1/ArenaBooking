import React, { useState } from "react";
import toast from "react-hot-toast";

export default function MyBookings() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [bookings, setBookings] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const BACKEND_URL = "https://arenabooking-wupc.onrender.com";

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/bookings/my-bookings?phoneNumber=${phoneNumber}`,
      );
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
        setHasSearched(true);
      } else {
        toast.error("Неуспешно вчитување на резервациите.");
      }
    } catch (err) {
      toast.error("Грешка при поврзување со серверот.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (
      !window.confirm(
        "Дали сте сигурни дека сакате да ја откажете оваа резервација?",
      )
    )
      return;

    try {
      const response = await fetch(`http://localhost:3000/api/bookings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Успешно откажана резервација!");
        setBookings((prev) => prev.filter((b) => b.id !== id));
      } else {
        toast.error("Грешка при откажување.");
      }
    } catch (err) {
      toast.error("Проблем со серверот.");
    }
  };

  const getCourtDetails = (court) => {
    switch (court) {
      case "Football":
        return {
          name: "Фудбалски Терен",
          icon: "⚽",
          color: "#48bb78",
          bg: "#f0fff4",
        };
      case "Basketball":
        return {
          name: "Кошаркарски Терен",
          icon: "🏀",
          color: "#ed8936",
          bg: "#fffaf0",
        };
      case "Tennis":
        return {
          name: "Тениски Терен",
          icon: "🎾",
          color: "#ecc94b",
          bg: "#fefcbf",
        };
      default:
        return { name: court, icon: "🏟️", color: "#4a5568", bg: "#f7fafc" };
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
      {/* Search Section */}
      <div
        style={{
          backgroundColor: "#fff",
          padding: "30px",
          borderRadius: "16px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
          border: "1px solid #e2e8f0",
          marginBottom: "30px",
        }}
      >
        <h2
          style={{ margin: "0 0 10px 0", color: "#1a202c", fontSize: "24px" }}
        >
          🔍 Пронајди ги твоите термини
        </h2>
        <p style={{ margin: "0 0 20px 0", color: "#718096", fontSize: "14px" }}>
          Внеси го телефонскиот број со кој направи резервација за да ги
          прегледаш или откажеш активните термини.
        </p>

        <form onSubmit={handleSearch} style={{ display: "flex", gap: "12px" }}>
          <input
            type="tel"
            placeholder="на пр. 070123456"
            required
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #cbd5e0",
              fontSize: "16px",
              outline: "none",
              transition: "border-color 0.2s",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.02)",
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "12px 24px",
              backgroundColor: "#3182ce",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "16px",
              transition: "background-color 0.2s",
              boxShadow: "0 4px 6px rgba(49, 130, 206, 0.15)",
            }}
          >
            {loading ? "Се вчитува..." : "Пребарај"}
          </button>
        </form>
      </div>

      {/* Results Section */}
      <div>
        {bookings.length > 0 && (
          <h3 style={{ color: "#2d3748", marginBottom: "15px" }}>
            Активни резервации ({bookings.length})
          </h3>
        )}

        <div style={{ display: "grid", gap: "15px" }}>
          {bookings.map((b) => {
            const court = getCourtDetails(b.court);
            return (
              <div
                key={b.id}
                style={{
                  backgroundColor: "#fff",
                  padding: "20px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "transform 0.15s ease",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "15px" }}
                >
                  <div
                    style={{
                      fontSize: "28px",
                      width: "60px",
                      height: "60px",
                      borderRadius: "10px",
                      backgroundColor: court.bg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {court.icon}
                  </div>
                  <div>
                    <h4
                      style={{
                        margin: "0 0 5px 0",
                        fontSize: "18px",
                        color: "#1a202c",
                      }}
                    >
                      {court.name}
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        gap: "15px",
                        color: "#718096",
                        fontSize: "14px",
                      }}
                    >
                      <span>
                        📅 <strong>{b.date}</strong>
                      </span>
                      <span>
                        🕒 <strong>{b.timeSlot}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleCancel(b.id)}
                  style={{
                    padding: "10px 18px",
                    backgroundColor: "#fff5f5",
                    color: "#e53e3e",
                    border: "1px solid #fed7d7",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "14px",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#e53e3e";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff5f5";
                    e.currentTarget.style.color = "#e53e3e";
                  }}
                >
                  Откажи Термин
                </button>
              </div>
            );
          })}
        </div>

        {hasSearched && bookings.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              backgroundColor: "#fff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              color: "#718096",
            }}
          >
            <p style={{ fontSize: "18px", margin: "0 0 5px 0" }}>
              🥺 Нема активни резервации
            </p>
            <p style={{ fontSize: "14px", margin: 0 }}>
              Не пронајдовме ниту еден термин за внесен телефонски број.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
