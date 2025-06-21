// src/services/authService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const login = async (email, password) => {
  const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
  return res.data;
};
