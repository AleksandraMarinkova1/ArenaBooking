import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function AdminSlotsManager() {
  const [slots, setSlots] = useState([]);
  const [newSlotText, setNewSlotText] = useState(""); // за внес на нов термин (пр. "22:00 - 23:00")

  // Влечење на сите активни термини од базата
  console.log('aaaa',import.meta.env.VITE_API_URL);
  const fetchSlots = () => {
    fetch(`${import.meta.env.VITE_API_URL}/api/timeSlots`)
      .then((res) => res.json())
      .then((data) => setSlots(data))
      .catch((err) => console.error("Грешка при преземање на термините:", err));
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // Справување со додавање на нов термин во база
  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newSlotText.trim()) {
      toast.error("Внесете валиден временски опсег.");
      return;
    }

    try {
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/timeSlots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotText: newSlotText }),
      });

      if (response.ok) {
        toast.success("Новиот термин е успешно додаден!");
        setNewSlotText("");
        fetchSlots(); // Ја освежува листата кај админот
      } else {
        const err = await response.text();
        toast.error(err || "Грешка при додавање на терминот.");
      }
    } catch (err) {
      toast.error("Проблем со серверот при додавање.");
    }
  };

  // Деактивирање / Бришење на термин
  const handleDeleteSlot = async (id) => {
    if (
      !window.confirm(
        "Дали сте сигурни дека сакате да го отстраните овој термин од системот?",
      )
    )
      return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/timeSlots/${id}`, {
          method: "DELETE",
        },
      );

      if (response.ok) {
        toast.success("Терминот е успешно отстранет!");
        fetchSlots();
      } else {
        toast.error("Грешка при отстранување на терминот.");
      }
    } catch (err) {
      toast.error("Проблем со серверот при бришење.");
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#fff",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
        marginTop: "30px",
      }}
    >
      <h3
        style={{
          margin: "0 0 8px 0",
          fontSize: "20px",
          color: "#1a202c",
          fontWeight: "700",
        }}
      >
        ⚙️ Менаџирање со Временски Термини
      </h3>
      <p style={{ margin: "0 0 20px 0", color: "#718096", fontSize: "14px" }}>
        Додавајте или отстранувајте временски опсези кои ќе им бидат достапни на
        корисниците за резервација.
      </p>

      {/* Форма за нов термин */}
      <form
        onSubmit={handleAddSlot}
        style={{ display: "flex", gap: "12px", marginBottom: "24px" }}
      >
        <input
          type="text"
          placeholder="Внесете термин (пр: 22:00 - 23:00)"
          value={newSlotText}
          onChange={(e) => setNewSlotText(e.target.value)}
          style={{
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid #cbd5e0",
            flex: 1,
            fontSize: "15px",
            outline: "none",
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
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#2b6cb0")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#3182ce")
          }
        >
          Додади Термин ➕
        </button>
      </form>

      {/* Листа на активни термини во базата */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {slots.length === 0 ? (
          <p
            style={{ color: "#a0aec0", fontSize: "14px", fontStyle: "italic" }}
          >
            Нема дефинирано термини во базата.
          </p>
        ) : (
          slots.map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 16px",
                backgroundColor: "#f7fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <span
                style={{
                  fontWeight: "bold",
                  color: "#4a5568",
                  fontSize: "14px",
                }}
              >
                {s.slotText}
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
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
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
  );
}
