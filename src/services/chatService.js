<<<<<<< HEAD
// src/services/chatService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const sendMessage = async (text, token) => {
  const res = await axios.post(`${API_URL}/api/chat/message`, { text }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data.reply;
};
=======
// src/services/chatService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const sendMessage = async (text, token) => {
  const res = await axios.post(`${API_URL}/api/chat/message`, { text }, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  return res.data.reply;
};
>>>>>>> b8501599f4a5de53059382d07f466b35fbd93106
