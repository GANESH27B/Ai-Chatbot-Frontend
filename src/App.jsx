import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import LoginPage from './LoginPage';
import ChatPage from './ChatPage';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const socket = io(API_URL);

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const fetchSessionId = async (token, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(`${API_URL}/api/chat/new`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned an unexpected response.');
        }
        const data = await response.json();
        if (response.ok) {
          setSessionId(data.sessionId);
          setSessionError(null);
          return true;
        } else {
          throw new Error(data.error || 'Failed to start new session');
        }
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error.message);
        if (i === retries - 1) {
          setSessionError(error.message);
          return false;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };

  useEffect(() => {
    const checkToken = async () => {
      setIsSessionLoading(true);
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetch(`${API_URL}/api/validate-token`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (response.ok && data.valid) {
            setIsLoggedIn(true);
            const success = await fetchSessionId(token);
            if (!success) {
              localStorage.removeItem('token');
              setIsLoggedIn(false);
            }
          } else {
            localStorage.removeItem('token');
          }
        } catch (error) {
          localStorage.removeItem('token');
        } finally {
          setIsSessionLoading(false);
        }
      } else {
        setIsSessionLoading(false);
      }
    };
    checkToken();
  }, []);

  const handleLogin = async () => {
    setIsSessionLoading(true);
    setIsLoggedIn(true);
    const token = localStorage.getItem('token');
    const success = await fetchSessionId(token);
    if (!success) {
      localStorage.removeItem('token');
      setIsLoggedIn(false);
    }
    setIsSessionLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setSessionId(null);
    setSessionError(null);
  };

  const handleNewChat = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setIsSessionLoading(true);
    const success = await fetchSessionId(token);
    if (!success) {
      setSessionError('Failed to start new chat. Please try again.');
    }
    setIsSessionLoading(false);
  };

  const handleSearch = () => {
    console.log('Search chats');
  };

  const toggleBackground = () => {
    setIsDark((prev) => !prev);
  };

  if (isSessionLoading) {
    return <div className="loading">Loading session...</div>;
  }

  if (sessionError) {
    return (
      <div className="error">
        <p>Error: {sessionError}</p>
        <button onClick={handleLogout}>Log Out</button>
      </div>
    );
  }

  return (
    <div className={`app ${isDark ? 'dark' : 'light'}`}>
      {isLoggedIn ? (
        <ChatPage
          isDark={isDark}
          onNewChat={handleNewChat}
          onSearch={handleSearch}
          toggleBackground={toggleBackground}
          onLogout={handleLogout}
          sessionId={sessionId}
          setSessionId={setSessionId}
          socket={socket}
        />
      ) : (
        <LoginPage onLogin={handleLogin} socket={socket} />
      )}
    </div>
  );
};

export default App;