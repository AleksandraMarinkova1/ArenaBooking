import { useState } from 'react';

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

 const sendMessage = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/aiassistant/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });

    if (!res.ok) {
        console.error("Грешка при повик:", await res.text());
        return;
    }

    const data = await res.text();
    setMessages([...messages, { user: input, bot: data }]);
    setInput("");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <button onClick={() => setIsOpen(!isOpen)} className="bg-blue-600 text-white p-3 rounded-full shadow-lg">💬</button>
      {isOpen && (
        <div className="w-80 h-96 bg-white border border-gray-200 shadow-2xl rounded-lg p-4 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {messages.map((m, i) => <p key={i} className="text-sm my-2"><b>Bot:</b> {m.bot}</p>)}
          </div>
          <input className="border p-2 mt-2" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Прашај..." />
          <button onClick={sendMessage} className="bg-green-500 text-white mt-2 p-2">Испрати</button>
        </div>
      )}
    </div>
  );
};
export default ChatBot;