# React + Vite

# ArenaBooking
A real-time, full-stack application for booking sports courts, ensuring seamless synchronization and conflict prevention.

# Key Features
Real-time Updates: Instant UI synchronization using SignalR websockets.

Concurrency Control: Prevents double-booking through an active slot-locking system.

Dynamic Search: Filter availability by date, court type, and time.

Tech Stack: React (Frontend), ASP.NET Core (Backend), SignalR, Tailwind CSS, Vercel/Render Deployment.

## 🛠 Tech Stack
* **Frontend:** React, Tailwind CSS, SignalR Client, React Hot Toast
* **Backend:** ASP.NET Core, SignalR, Entity Framework
* **Deployment:** Vercel (Frontend), Render (Backend)

## ⚙️ Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) installed
* [.NET 8.0 SDK](https://dotnet.microsoft.com/) or later

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/arena-booking.git](https://github.com/your-username/arena-booking.git)
   cd arena-booking

  #### Setup Backend
  cd backend
dotnet restore
dotnet run

### Setup Frontend:
cd ../frontend
npm install
npm run dev
