// src/pages/ChatPage.js
import React, { useState } from 'react';
import { sendMessage } from '../services/chatService';
import { useNavigate } from 'react-router-dom';

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const navigate = useNavigate();

  const token = localStorage.getItem('token');
  if (!token) {
    navigate('/');
  }

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');

    try {
      const reply = await sendMessage(input, token);
      setMessages([...newMessages, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: '❌ Error getting response' }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto bg-white shadow rounded p-4 h-[80vh] flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`p-2 rounded ${msg.role === 'user' ? 'bg-blue-100 text-right' : 'bg-gray-200 text-left'}`}>
              {msg.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            className="flex-1 border p-2 rounded"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button className="bg-blue-500 text-white px-4 rounded">Send</button>
        </form>
      </div>
    </div>
  );
}

export default ChatPage;
