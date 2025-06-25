<<<<<<< HEAD
import { useState, useEffect, useRef } from "react";
import { FiPlus, FiArrowDown, FiPaperclip, FiMic, FiAlertCircle } from "react-icons/fi";
import "./ChatPage.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Sidebar = ({ isDark, onNewChat, onSearch, onLogout, onSessionSelect }) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("Failed to fetch chats");
        }
        const data = await response.json();
        setChats(data);
      } catch (error) {
        setChats([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  };

  return (
    <div className={`sidebar ${isDark ? "dark" : "light"}`}>
      <div className="sidebar-logo">
        <h1>AI CHATBOT</h1>
      </div>
      <div className="sidebar-nav">
        <button onClick={onNewChat} aria-label="Start a new chat">
          <FiPlus className="icon" /> New Chat
        </button>
      </div>
      <div className="sidebar-chats">
        <h2>Chats</h2>
        {isLoading ? (
          <div className="sidebar-loading">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="empty-state">No chats yet. Start a new one!</div>
        ) : (
          <ul className="chat-list">
            {chats.map((chat) => (
              <li
                key={chat.sessionId}
                role="button"
                tabIndex={0}
                onClick={() => onSessionSelect(chat.sessionId)}
                onKeyDown={(e) => e.key === "Enter" && onSessionSelect(chat.sessionId)}
                className="sidebar-chat-item"
                aria-label={`Open chat: ${chat.preview}`}
              >
                {chat.preview}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout" aria-label="Log out">
          Log Out
        </button>
      </div>
    </div>
  );
};

const ChatArea = ({ isDark, toggleBackground, sessionId, setSessionId, socket }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showErrorButton, setShowErrorButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  const isCodeMessage = (content) => content?.trim().startsWith("```") && content.trim().endsWith("```");
  const extractCode = (content) => content.replace(/^```[\w]*\n([\s\S]*?)\n```$/, "$1").trim();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token || !sessionId) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/chat/history?sessionId=${sessionId}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("Failed to fetch chat history");
        }
        const data = await response.json();
        setMessages(
          data
            .flatMap((session) => session.messages)
            .filter((msg) => msg && (msg.content || msg.file))
            .map((msg) => ({
              role: msg.source === "user" ? "user" : "bot",
              content: msg.content,
              file: msg.file ? { url: msg.file.url, name: msg.file.name } : null,
            }))
        );
      } catch (error) {
        setMessages((prev) => [...prev, { role: "bot", content: `Error: ${error.message}` }]);
      } finally {
        setIsLoading(false);
      }
    };
    if (sessionId) {
      fetchHistory();
    } else {
      setMessages([
        {
          role: "bot",
          content: "Welcome to Chat AI! I'm here to assist you. Feel free to ask questions, upload files, or use voice input to get started.",
        },
      ]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("newMessage", ({ userMessage, aiMessage, sessionId: receivedSessionId }) => {
      if (receivedSessionId === sessionId) {
        const isValidMessage = (msg) => msg && (msg.content || msg.file);
        const newMessages = [];
        if (isValidMessage(userMessage)) {
          newMessages.push({
            role: "user",
            content: userMessage.content,
            file: userMessage.file ? { url: userMessage.file.url, name: userMessage.file.name } : null,
          });
        }
        if (isValidMessage(aiMessage)) {
          newMessages.push({
            role: "bot",
            content: aiMessage.content,
            file: aiMessage.file ? { url: aiMessage.file.url, name: aiMessage.file.name } : null,
          });
        }
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
        }
      }
    });
    return () => socket.off("newMessage");
  }, [sessionId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatMessagesRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
        setShowScrollButton(scrollHeight - scrollTop > clientHeight + 50);
      }
    };
    const chatMessages = chatMessagesRef.current;
    chatMessages?.addEventListener("scroll", handleScroll);
    return () => chatMessages?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (messageContent, fileData = null) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowErrorButton(true);
      setMessages((prev) => [...prev, { role: "bot", content: "Error: Please log in to send messages." }]);
      return;
    }
    if (!messageContent && !fileData) {
      setShowErrorButton(true);
      setMessages((prev) => [...prev, { role: "bot", content: "Error: Message or file is required" }]);
      return;
    }
    const userMessage = {
      role: "user",
      content: messageContent || (fileData ? `Attached: ${fileData.name}` : ""),
      file: fileData ? { url: fileData.url, name: fileData.name } : null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setShowErrorButton(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageContent || "", sessionId, file: fileData }),
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Failed to send message");
      }
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.aiMessage?.content || "No response from AI",
          file: data.aiMessage?.file ? { url: data.aiMessage.file.url, name: data.aiMessage.file.name } : null,
        },
      ]);
    } catch (error) {
      setShowErrorButton(true);
      setMessages((prev) => [...prev, { role: "bot", content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setMessages((prev) => [...prev, { role: "bot", content: "Error: File size exceeds 10MB limit." }]);
      return;
    }
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("File upload failed");
      }
      const data = await response.json();
      setSelectedFile(null);
      await sendMessage(null, { url: data.fileUrl, name: file.name });
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", content: `Error uploading file: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      e.target.value = null;
    }
  };

  const handleMicClick = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setMessages((prev) => [...prev, { role: "bot", content: "Speech recognition not supported in this browser." }]);
      return;
    }
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript) {
        setInputText(transcript);
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setMessages((prev) => [...prev, { role: "bot", content: `Speech recognition error: ${event.error}` }]);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const handleRetry = () => {
    setShowErrorButton(false);
    const lastUserMessage = messages.filter((msg) => msg.role === "user").slice(-1)[0];
    if (lastUserMessage) {
      setMessages((prev) => prev.filter((msg) => msg !== lastUserMessage));
      if (lastUserMessage.content) {
        setInputText(lastUserMessage.content);
        sendMessage(lastUserMessage.content);
      } else if (lastUserMessage.file) {
        sendMessage(null, lastUserMessage.file);
      }
    }
  };

  return (
    <div className={`chat-area ${isDark ? "dark" : "light"}`}>
      <div className="chat-header">
        <h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-robot"
            viewBox="0 0 16 16"
          >
            <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135" />
            <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5" />
          </svg>{" "}
          WELCOME AI CHATBOT
        </h2>
        <button onClick={toggleBackground} aria-label="Toggle theme">
          {isDark ? "Light" : "Dark"}
        </button>
      </div>
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((msg, index) =>
          msg && (msg.content || msg.file) ? (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content && isCodeMessage(msg.content) ? (
                  <pre className="code-block">
                    <code>{extractCode(msg.content)}</code>
                  </pre>
                ) : (
                  msg.content && <span>{msg.content}</span>
                )}
                {msg.file && (
                  <a href={msg.file.url} download={msg.file.name} className="file-link">
                    <FiPaperclip className="file-icon" /> {msg.file.name}
                  </a>
                )}
              </div>
            </div>
          ) : null
        )}
        {isLoading && (
          <div className="message bot">
            <div className="message-content typing">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-robot"
                viewBox="0 0 16 16"
              >
                <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135" />
                <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5" />
              </svg>{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-three-dots"
                viewBox="0 0 16 16"
              >
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" />
              </svg>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom} aria-label="Scroll to bottom">
          <FiArrowDown className="icon" />
        </button>
      )}
      <div className="chat-input">
        <div className="input-actions">
          <input
            type="file"
            id="file-upload"
            className="file-input"
            onChange={handleFileChange}
            aria-label="Upload file"
            disabled={isLoading || !sessionId}
          />
          <button
            onClick={() => document.getElementById("file-upload").click()}
            className="action-button"
            aria-label="Upload file"
            disabled={isLoading || !sessionId}
          >
            <FiPaperclip className="icon" />
          </button>
          <button
            onClick={handleMicClick}
            className={`action-button ${isRecording ? "recording" : ""}`}
            aria-label="Record voice"
            disabled={isLoading || !sessionId}
          >
            <FiMic className="icon" />
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="chat-textarea"
          aria-label="Chat input"
          disabled={isLoading || !sessionId}
        />
        <div className="send-actions">
          <button
            onClick={() => sendMessage(inputText)}
            className="send-button"
            aria-label="Send message"
            disabled={isLoading || !inputText.trim() || !sessionId}
          >
            Send
          </button>
          {showErrorButton && (
            <button onClick={handleRetry} className="retry-button" aria-label="Retry">
              <FiAlertCircle className="icon" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatPage = ({ isDark, onNewChat, onSearch, toggleBackground, onLogout, sessionId, setSessionId, socket }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNewChat = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to start a new chat.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/chat/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Failed to start new chat");
      }
      const data = await response.json();
      setSessionId(data.sessionId);
      setIsSidebarOpen(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="chat-page">
      <button
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        ☰
      </button>
      <div className={`sidebar-wrapper ${isSidebarOpen ? "open" : "closed"}`}>
        <Sidebar
          isDark={isDark}
          onNewChat={handleNewChat}
          onSearch={onSearch}
          onLogout={onLogout}
          onSessionSelect={(selectedSessionId) => {
            setSessionId(selectedSessionId);
            setIsSidebarOpen(false);
          }}
        />
      </div>
      <ChatArea
        isDark={isDark}
        toggleBackground={toggleBackground}
        sessionId={sessionId}
        setSessionId={setSessionId}
        socket={socket}
      />
    </div>
  );
};

=======
import { useState, useEffect, useRef } from "react";
import { FiPlus, FiArrowDown, FiPaperclip, FiMic, FiAlertCircle } from "react-icons/fi";
import "./ChatPage.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Sidebar = ({ isDark, onNewChat, onSearch, onLogout, onSessionSelect }) => {
  const [chats, setChats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchChats = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/chat/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("Failed to fetch chats");
        }
        const data = await response.json();
        setChats(data);
      } catch (error) {
        setChats([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      onLogout();
    }
  };

  return (
    <div className={`sidebar ${isDark ? "dark" : "light"}`}>
      <div className="sidebar-logo">
        <h1>AI CHATBOT</h1>
      </div>
      <div className="sidebar-nav">
        <button onClick={onNewChat} aria-label="Start a new chat">
          <FiPlus className="icon" /> New Chat
        </button>
      </div>
      <div className="sidebar-chats">
        <h2>Chats</h2>
        {isLoading ? (
          <div className="sidebar-loading">Loading chats...</div>
        ) : chats.length === 0 ? (
          <div className="empty-state">No chats yet. Start a new one!</div>
        ) : (
          <ul className="chat-list">
            {chats.map((chat) => (
              <li
                key={chat.sessionId}
                role="button"
                tabIndex={0}
                onClick={() => onSessionSelect(chat.sessionId)}
                onKeyDown={(e) => e.key === "Enter" && onSessionSelect(chat.sessionId)}
                className="sidebar-chat-item"
                aria-label={`Open chat: ${chat.preview}`}
              >
                {chat.preview}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="sidebar-footer">
        <button onClick={handleLogout} className="sidebar-logout" aria-label="Log out">
          Log Out
        </button>
      </div>
    </div>
  );
};

const ChatArea = ({ isDark, toggleBackground, sessionId, setSessionId, socket }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [showErrorButton, setShowErrorButton] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  const isCodeMessage = (content) => content?.trim().startsWith("```") && content.trim().endsWith("```");
  const extractCode = (content) => content.replace(/^```[\w]*\n([\s\S]*?)\n```$/, "$1").trim();

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      if (!token || !sessionId) {
        setIsLoading(false);
        return;
      }
      try {
        const response = await fetch(`${API_URL}/api/chat/history?sessionId=${sessionId}`, {
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
        if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
          throw new Error("Failed to fetch chat history");
        }
        const data = await response.json();
        setMessages(
          data
            .flatMap((session) => session.messages)
            .filter((msg) => msg && (msg.content || msg.file))
            .map((msg) => ({
              role: msg.source === "user" ? "user" : "bot",
              content: msg.content,
              file: msg.file ? { url: msg.file.url, name: msg.file.name } : null,
            }))
        );
      } catch (error) {
        setMessages((prev) => [...prev, { role: "bot", content: `Error: ${error.message}` }]);
      } finally {
        setIsLoading(false);
      }
    };
    if (sessionId) {
      fetchHistory();
    } else {
      setMessages([
        {
          role: "bot",
          content: "Welcome to Chat AI! I'm here to assist you. Feel free to ask questions, upload files, or use voice input to get started.",
        },
      ]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!socket) return;
    socket.on("newMessage", ({ userMessage, aiMessage, sessionId: receivedSessionId }) => {
      if (receivedSessionId === sessionId) {
        const isValidMessage = (msg) => msg && (msg.content || msg.file);
        const newMessages = [];
        if (isValidMessage(userMessage)) {
          newMessages.push({
            role: "user",
            content: userMessage.content,
            file: userMessage.file ? { url: userMessage.file.url, name: userMessage.file.name } : null,
          });
        }
        if (isValidMessage(aiMessage)) {
          newMessages.push({
            role: "bot",
            content: aiMessage.content,
            file: aiMessage.file ? { url: aiMessage.file.url, name: aiMessage.file.name } : null,
          });
        }
        if (newMessages.length > 0) {
          setMessages((prev) => [...prev, ...newMessages]);
        }
      }
    });
    return () => socket.off("newMessage");
  }, [sessionId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatMessagesRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatMessagesRef.current;
        setShowScrollButton(scrollHeight - scrollTop > clientHeight + 50);
      }
    };
    const chatMessages = chatMessagesRef.current;
    chatMessages?.addEventListener("scroll", handleScroll);
    return () => chatMessages?.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (messageContent, fileData = null) => {
    const token = localStorage.getItem("token");
    if (!token) {
      setShowErrorButton(true);
      setMessages((prev) => [...prev, { role: "bot", content: "Error: Please log in to send messages." }]);
      return;
    }
    if (!messageContent && !fileData) {
      setShowErrorButton(true);
      setMessages((prev) => [...prev, { role: "bot", content: "Error: Message or file is required" }]);
      return;
    }
    const userMessage = {
      role: "user",
      content: messageContent || (fileData ? `Attached: ${fileData.name}` : ""),
      file: fileData ? { url: fileData.url, name: fileData.name } : null,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setShowErrorButton(false);
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/chat/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: messageContent || "", sessionId, file: fileData }),
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Failed to send message");
      }
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: data.aiMessage?.content || "No response from AI",
          file: data.aiMessage?.file ? { url: data.aiMessage.file.url, name: data.aiMessage.file.name } : null,
        },
      ]);
    } catch (error) {
      setShowErrorButton(true);
      setMessages((prev) => [...prev, { role: "bot", content: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setMessages((prev) => [...prev, { role: "bot", content: "Error: File size exceeds 10MB limit." }]);
      return;
    }
    setIsLoading(true);
    const token = localStorage.getItem("token");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("File upload failed");
      }
      const data = await response.json();
      setSelectedFile(null);
      await sendMessage(null, { url: data.fileUrl, name: file.name });
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", content: `Error uploading file: ${error.message}` }]);
    } finally {
      setIsLoading(false);
      e.target.value = null;
    }
  };

  const handleMicClick = () => {
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setMessages((prev) => [...prev, { role: "bot", content: "Speech recognition not supported in this browser." }]);
      return;
    }
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsRecording(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);
      if (transcript) {
        setInputText(transcript);
        sendMessage(transcript);
      }
    };

    recognition.onerror = (event) => {
      setIsRecording(false);
      setMessages((prev) => [...prev, { role: "bot", content: `Speech recognition error: ${event.error}` }]);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const handleRetry = () => {
    setShowErrorButton(false);
    const lastUserMessage = messages.filter((msg) => msg.role === "user").slice(-1)[0];
    if (lastUserMessage) {
      setMessages((prev) => prev.filter((msg) => msg !== lastUserMessage));
      if (lastUserMessage.content) {
        setInputText(lastUserMessage.content);
        sendMessage(lastUserMessage.content);
      } else if (lastUserMessage.file) {
        sendMessage(null, lastUserMessage.file);
      }
    }
  };

  return (
    <div className={`chat-area ${isDark ? "dark" : "light"}`}>
      <div className="chat-header">
        <h2>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            className="bi bi-robot"
            viewBox="0 0 16 16"
          >
            <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135" />
            <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5" />
          </svg>{" "}
          WELCOME AI CHATBOT
        </h2>
        <button onClick={toggleBackground} aria-label="Toggle theme">
          {isDark ? "Light" : "Dark"}
        </button>
      </div>
      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((msg, index) =>
          msg && (msg.content || msg.file) ? (
            <div key={index} className={`message ${msg.role}`}>
              <div className="message-content">
                {msg.content && isCodeMessage(msg.content) ? (
                  <pre className="code-block">
                    <code>{extractCode(msg.content)}</code>
                  </pre>
                ) : (
                  msg.content && <span>{msg.content}</span>
                )}
                {msg.file && (
                  <a href={msg.file.url} download={msg.file.name} className="file-link">
                    <FiPaperclip className="file-icon" /> {msg.file.name}
                  </a>
                )}
              </div>
            </div>
          ) : null
        )}
        {isLoading && (
          <div className="message bot">
            <div className="message-content typing">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-robot"
                viewBox="0 0 16 16"
              >
                <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135" />
                <path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5" />
              </svg>{" "}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                className="bi bi-three-dots"
                viewBox="0 0 16 16"
              >
                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" />
              </svg>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={scrollToBottom} aria-label="Scroll to bottom">
          <FiArrowDown className="icon" />
        </button>
      )}
      <div className="chat-input">
        <div className="input-actions">
          <input
            type="file"
            id="file-upload"
            className="file-input"
            onChange={handleFileChange}
            aria-label="Upload file"
            disabled={isLoading || !sessionId}
          />
          <button
            onClick={() => document.getElementById("file-upload").click()}
            className="action-button"
            aria-label="Upload file"
            disabled={isLoading || !sessionId}
          >
            <FiPaperclip className="icon" />
          </button>
          <button
            onClick={handleMicClick}
            className={`action-button ${isRecording ? "recording" : ""}`}
            aria-label="Record voice"
            disabled={isLoading || !sessionId}
          >
            <FiMic className="icon" />
          </button>
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="chat-textarea"
          aria-label="Chat input"
          disabled={isLoading || !sessionId}
        />
        <div className="send-actions">
          <button
            onClick={() => sendMessage(inputText)}
            className="send-button"
            aria-label="Send message"
            disabled={isLoading || !inputText.trim() || !sessionId}
          >
            Send
          </button>
          {showErrorButton && (
            <button onClick={handleRetry} className="retry-button" aria-label="Retry">
              <FiAlertCircle className="icon" /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatPage = ({ isDark, onNewChat, onSearch, toggleBackground, onLogout, sessionId, setSessionId, socket }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleNewChat = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Please log in to start a new chat.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/chat/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("Failed to start new chat");
      }
      const data = await response.json();
      setSessionId(data.sessionId);
      setIsSidebarOpen(false);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="chat-page">
      <button
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
      >
        ☰
      </button>
      <div className={`sidebar-wrapper ${isSidebarOpen ? "open" : "closed"}`}>
        <Sidebar
          isDark={isDark}
          onNewChat={handleNewChat}
          onSearch={onSearch}
          onLogout={onLogout}
          onSessionSelect={(selectedSessionId) => {
            setSessionId(selectedSessionId);
            setIsSidebarOpen(false);
          }}
        />
      </div>
      <ChatArea
        isDark={isDark}
        toggleBackground={toggleBackground}
        sessionId={sessionId}
        setSessionId={setSessionId}
        socket={socket}
      />
    </div>
  );
};

>>>>>>> b8501599f4a5de53059382d07f466b35fbd93106
export default ChatPage;