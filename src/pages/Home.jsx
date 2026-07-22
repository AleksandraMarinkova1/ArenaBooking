import React, { useState, useEffect } from "react";
import * as signalR from "@microsoft/signalr";
import toast from "react-hot-toast";
import BookingModal from "../components/BookingModal";

export default function Home() {
  const DEFAULT_FALLBACK_SLOTS = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "12:00 - 13:00",
    "13:00 - 14:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
    "16:00 - 17:00",
    "17:00 - 18:00",
    "18:00 - 19:00",
    "19:00 - 20:00",
    "20:00 - 21:00",
    "21:00 - 22:00",
    "22:00 - 23:00",
  ];
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedCourt, setSelectedCourt] = useState("Football");
  const [bookings, setBookings] = useState([]);
  const [activeLocks, setActiveLocks] = useState([]); // Овде ги чуваме портокаловите привремени заклучувања во реално време
  const [connection, setConnection] = useState(null);

  const [timeSlots, setTimeSlots] = useState([]);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // состојби за формата
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState(""); // 🚀 1. НОВА СОСТОЈБА ЗА Е-ПОШТА
  const API_URL = "https://arenabooking-wupc.onrender.com";
  const fetchTimeSlots = () => {
    fetch(`${API_URL}/api/timeSlots`)
      .then((res) => res.json())
      .then((data) => {
        // Само ги земаме термините кои постојат во базата (кои сега ги содржат и дефолтните)
        const slotsArray = data.map((s) => s.slotText || s.SlotText);
        setTimeSlots(slotsArray);
      })
      .catch((err) => {
        console.error("Грешка при вчитување на термините:", err);
      });
  };

  const fetchBookings = () => {
    fetch(`${API_URL}/api/bookings?date=${selectedDate}&court=${selectedCourt}`)
      .then((res) => res.json())
      .then((data) => {
        // Нормализација на податоците за да бидеме сигурни за малите и големите букви од C#
        const normalized = data.map((b) => ({
          id: b.id !== undefined ? b.id : b.Id,
          fullName: b.fullName !== undefined ? b.fullName : b.FullName,
          phoneNumber:
            b.phoneNumber !== undefined ? b.phoneNumber : b.PhoneNumber,
          court: b.court !== undefined ? b.court : b.Court,
          timeSlot: b.timeSlot !== undefined ? b.timeSlot : b.TimeSlot,
          date: b.date !== undefined ? b.date : b.Date,
          email: b.email !== undefined ? b.email : b.Email,
          isBlocked: b.isBlocked !== undefined ? b.isBlocked : b.IsBlocked,
          blockReason:
            b.blockReason !== undefined ? b.blockReason : b.BlockReason,
        }));
        setBookings(normalized);
      })
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_URL}/bookingHub`)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);
  }, []);

  useEffect(() => {
    if (connection) {
      connection
        .start()
        .then(() => {
          // 🆕 Сигнал за промена на шемата на термини - ги превчитува кога админот додава/брише
          connection.on("ReceiveTimeSlotsUpdated", () => {
            fetchTimeSlots();
          });

          // 1. Примена на нова резервација
          connection.on("ReceiveBookingCreated", (booking) => {
            if (
              booking.date === selectedDate &&
              booking.court === selectedCourt
            ) {
              const normBooking = {
                id: booking.id !== undefined ? booking.id : booking.Id,
                fullName:
                  booking.fullName !== undefined
                    ? booking.fullName
                    : booking.FullName,
                phoneNumber:
                  booking.phoneNumber !== undefined
                    ? booking.phoneNumber
                    : booking.PhoneNumber,
                court:
                  booking.court !== undefined ? booking.court : booking.Court,
                timeSlot:
                  booking.timeSlot !== undefined
                    ? booking.timeSlot
                    : booking.TimeSlot,
                date: booking.date !== undefined ? booking.date : booking.Date,
                email:
                  booking.email !== undefined ? booking.email : booking.Email,
                isBlocked:
                  booking.isBlocked !== undefined
                    ? booking.isBlocked
                    : booking.IsBlocked,
                blockReason:
                  booking.blockReason !== undefined
                    ? booking.blockReason
                    : booking.BlockReason,
              };

              setBookings((prev) => [...prev, normBooking]);
              // Тргни го од привремено заклучените бидејќи сега е дефинитивно зафатен
              setActiveLocks((prev) =>
                prev.filter((slot) => slot !== normBooking.timeSlot),
              );
            }

            if (!booking.isBlocked && !booking.IsBlocked) {
              toast(
                `🎉 ${booking.fullName || booking.FullName} резервира ${booking.court === "Football" || booking.Court === "Football" ? "Фудбал" : booking.court === "Tennis" || booking.Court === "Tennis" ? "Тенис" : "Кошарка"} во ${booking.timeSlot || booking.TimeSlot}!`,
                {
                  icon: "🔔",
                  duration: 4000,
                },
              );
            }
          });

          // 2. Примена на откажување
          connection.on("ReceiveBookingCancelled", (data) => {
            if (data.date === selectedDate) {
              fetchBookings();
            }
          });

          // 3. Примена на привремено заклучување
          connection.on("ReceiveLockAcquired", (data) => {
            if (data.date === selectedDate && data.court === selectedCourt) {
              setActiveLocks((prev) => [...prev, data.timeSlot]);
            }
          });

          // 4. Примена на привремено отклучување
          connection.on("ReceiveLockReleased", (data) => {
            if (data.date === selectedDate && data.court === selectedCourt) {
              setActiveLocks((prev) =>
                prev.filter((slot) => slot !== data.timeSlot),
              );
            }
          });
        })
        .catch((err) => console.log("SignalR Error: ", err));
    }

    return () => {
      if (connection) {
        connection.off("ReceiveTimeSlotsUpdated");
        connection.off("ReceiveBookingCreated");
        connection.off("ReceiveBookingCancelled");
        connection.off("ReceiveLockAcquired");
        connection.off("ReceiveLockReleased");
      }
    };
  }, [connection, selectedDate, selectedCourt]);

  // Свежо вчитување на дефинираните термини при прво отворање
  useEffect(() => {
    fetchTimeSlots();
  }, []);

  useEffect(() => {
    fetchBookings();
    setActiveLocks([]);
  }, [selectedDate, selectedCourt]);

  const isTimeSlotPassed = (slot) => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate !== todayStr) return false;

    const currentHour = new Date().getHours();
    const startHour = parseInt(slot.split(":")[0], 10);
    return startHour <= currentHour;
  };

  const handleSlotClick = async (slot) => {
    setSelectedSlot(slot);
    setIsBookingOpen(true);

    if (
      connection &&
      connection.state === signalR.HubConnectionState.Connected
    ) {
      try {
        await connection.invoke("LockSlot", selectedDate, selectedCourt, slot);
      } catch (err) {
        console.error("Грешка при привремено заклучување:", err);
      }
    } else {
      console.warn("SignalR конекцијата сè уште не е воспоставена.");
    }
  };

  const handleModalClose = async () => {
    setIsBookingOpen(false);
    if (connection && selectedSlot) {
      try {
        await connection.invoke(
          "UnlockSlot",
          selectedDate,
          selectedCourt,
          selectedSlot,
        );
      } catch (err) {
        console.error("Грешка при привремено отклучување:", err);
      }
    }
    setSelectedSlot(null);
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSlot || isSubmitting) return;

    setIsSubmitting(true);

    const newBooking = {
      fullName,
      phoneNumber,
      email,
      timeSlot: selectedSlot,
      date: selectedDate,
      court: selectedCourt,
    };

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBooking),
      });

      if (response.ok) {
        toast.success("Успешно резервиравте термин!");
        setFullName("");
        setPhoneNumber("");
        setEmail("");
        setIsBookingOpen(false);
        setSelectedSlot(null);
        fetchBookings();
      } else {
        const errorText = await response.text();
        toast.error(errorText || "Грешка при резервација.");
      }
    } catch (err) {
      toast.error("Проблем со серверот.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "40px 20px", maxWidth: "1000px", margin: "0 auto" }}>
      <div style={{ marginBottom: "30px" }}>
        <h1
          style={{
            margin: "0 0 10px 0",
            fontSize: "32px",
            color: "#1a202c",
            fontWeight: "800",
          }}
        >
          🏆 Резервирај Спортски Терен
        </h1>
        <p style={{ margin: 0, color: "#718096", fontSize: "15px" }}>
          Изберете датум и терен во реално време, па кликнете на слободен термин
          за да го резервирате.
        </p>
      </div>

      {/* FILTERS */}
      <div
        style={{
          display: "flex",
          gap: "20px",
          padding: "24px",
          backgroundColor: "#fff",
          borderRadius: "16px",
          marginBottom: "30px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1", minWidth: "200px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#718096",
              marginBottom: "8px",
              letterSpacing: "0.5px",
            }}
          >
            ИЗБЕРИ ДАТУМ
          </label>
          <input
            type="date"
            value={selectedDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "15px",
              borderRadius: "8px",
              border: "1px solid #cbd5e0",
              outline: "none",
            }}
          />
        </div>

        <div style={{ flex: "1", minWidth: "200px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#718096",
              marginBottom: "8px",
              letterSpacing: "0.5px",
            }}
          >
            ИЗБЕРИ ИГРАЛИШТЕ
          </label>
          <select
            value={selectedCourt}
            onChange={(e) => setSelectedCourt(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: "15px",
              borderRadius: "8px",
              border: "1px solid #cbd5e0",
              outline: "none",
              backgroundColor: "#fff",
            }}
          >
            <option value="Football">⚽ Фудбал</option>
            <option value="Basketball">🏀 Кошарка</option>
            <option value="Tennis">🎾 Тенис</option>
          </select>
        </div>
      </div>

      {/* TIME SLOTS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "15px",
        }}
      >
        {timeSlots.map((slot) => {
          const matchedBooking = bookings.find((b) => b.timeSlot === slot);
          const isBooked = !!matchedBooking;
          const isBlocked = matchedBooking?.isBlocked;
          const isPassed = isTimeSlotPassed(slot);
          const isTempLocked = activeLocks.includes(slot);

          let btnStyle = {
            padding: "20px 10px",
            borderRadius: "12px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "6px",
            transition: "all 0.2s ease",
            minHeight: "110px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
          };

          if (isBlocked) {
            btnStyle = {
              ...btnStyle,
              backgroundColor: "#fff5f5",
              color: "#c53030",
              border: "1.5px dashed #f56565",
              cursor: "not-allowed",
            };
          } else if (isBooked) {
            btnStyle = {
              ...btnStyle,
              backgroundColor: "#fed7d7",
              color: "#9b2c2c",
              cursor: "not-allowed",
            };
          } else if (isPassed) {
            btnStyle = {
              ...btnStyle,
              backgroundColor: "#edf2f7",
              color: "#a0aec0",
              cursor: "not-allowed",
            };
          } else if (isTempLocked) {
            btnStyle = {
              ...btnStyle,
              backgroundColor: "#fef3c7",
              color: "#d97706",
              cursor: "not-allowed",
            };
          } else {
            btnStyle = {
              ...btnStyle,
              backgroundColor: "#c6f6d5",
              color: "#22543d",
            };
          }

          return (
            <button
              key={slot}
              disabled={isBooked || isPassed || isTempLocked || isBlocked}
              onClick={() => handleSlotClick(slot)}
              style={btnStyle}
              onMouseEnter={(e) => {
                if (!isBooked && !isPassed && !isTempLocked && !isBlocked) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isBooked && !isPassed && !isTempLocked && !isBlocked) {
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <span style={{ fontSize: "15px" }}>{slot}</span>

              {/* Приказ на соодветниот статус */}
              {isBlocked ? (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "bold",
                    backgroundColor: "#fed7d7",
                    color: "#9b2c2c",
                    padding: "3px 6px",
                    borderRadius: "4px",
                    marginTop: "4px",
                    lineHeight: "1.2",
                    maxWidth: "90%",
                    wordBreak: "break-word",
                  }}
                >
                  🚫 {matchedBooking.blockReason || "Вонредна пауза"}
                </span>
              ) : isBooked ? (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "normal",
                    color: "#e53e3e",
                  }}
                >
                  Зафатено
                </span>
              ) : isPassed ? (
                <span style={{ fontSize: "11px", fontWeight: "normal" }}>
                  Поминато
                </span>
              ) : isTempLocked ? (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "normal",
                    color: "#d97706",
                  }}
                >
                  ⏳ Се резервира
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "normal",
                    color: "#38a169",
                  }}
                >
                  Слободно
                </span>
              )}
            </button>
          );
        })}
      </div>

      <BookingModal
        isOpen={isBookingOpen}
        onClose={handleModalClose}
        slot={selectedSlot}
        court={selectedCourt}
        date={selectedDate}
        fullName={fullName}
        setFullName={setFullName}
        phoneNumber={phoneNumber}
        setPhoneNumber={setPhoneNumber}
        email={email}
        setEmail={setEmail}
        onSubmit={handleBookingSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
