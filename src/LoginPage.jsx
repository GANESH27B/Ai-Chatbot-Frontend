import { useState, useEffect } from "react";
import { FiPlus, FiSearch, FiBook, FiPlayCircle, FiSettings, FiAlertCircle } from "react-icons/fi";
import io from "socket.io-client";
import queryString from "query-string";
import "./LoginPage.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LoginPage = ({ onLogin, socket }) => {
  const [mode, setMode] = useState("login");
  const [formData, setFormData] = useState({ username: "", password: "", email: "", code: "", newPassword: "" });
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const { token, userId } = queryString.parse(window.location.search);
    if (token && userId && typeof token === "string" && token.trim()) {
      console.log("Received token from URL:", token);
      localStorage.setItem("token", token);
      onLogin();
      window.history.replaceState({}, document.title, "/");
    } else if (token || userId) {
      console.error("Invalid token or userId in URL query");
      setErrors(["Invalid token received. Please try logging in again."]);
    }

    socket.on("userSignedIn", ({ userId, username }) => {
      console.log("Socket event: userSignedIn", { userId, username });
      if (formData.username === username && mode === "login") {
        const storedToken = localStorage.getItem("token");
        if (storedToken && typeof storedToken === "string" && storedToken.trim()) {
          setIsLoading(false);
          onLogin();
        } else {
          console.error("No valid token found for socket login");
          setErrors(["Invalid or missing token. Please try again."]);
          setIsLoading(false);
        }
      }
    });

    return () => {
      socket.off("userSignedIn");
    };
  }, [formData.username, onLogin, socket, mode]);

  const validateForm = () => {
    const newErrors = [];
    if (mode === "login" || mode === "register") {
      if (!formData.username) newErrors.push("Username is required");
      if (!formData.password) newErrors.push("Password is required");
    }
    if (mode === "register" || mode === "forgot" || mode === "verify" || mode === "reset") {
      if (!formData.email) newErrors.push("Email is required");
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.push("Invalid email format");
      }
    }
    if (mode === "verify" || mode === "reset") {
      if (!formData.code) newErrors.push("Verification code is required");
    }
    if (mode === "reset") {
      if (!formData.newPassword) newErrors.push("New password is required");
    }
    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trim() }));
  };

  const resetForm = () => {
    setFormData({ username: "", password: "", email: "", code: "", newPassword: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    let endpoint;
    let body;

    if (mode === "login") {
      endpoint = `${API_URL}/api/login`;
      body = { username: formData.username, password: formData.password };
    } else if (mode === "register") {
      endpoint = `${API_URL}/api/register`;
      body = { username: formData.username, password: formData.password, email: formData.email };
    } else if (mode === "forgot") {
      endpoint = `${API_URL}/api/forgot-password`;
      body = { email: formData.email };
    } else if (mode === "verify") {
      endpoint = `${API_URL}/api/verify-code`;
      body = { email: formData.email, code: formData.code };
    } else if (mode === "reset") {
      endpoint = `${API_URL}/api/reset-password`;
      body = { email: formData.email, code: formData.code, newPassword: formData.newPassword };
    }

    try {
      console.log(`Sending request to ${endpoint} with body:`, body);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Ensure the backend server is running at " + API_URL);
      }

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      if (mode === "login") {
        if (!data.token || typeof data.token !== "string" || !data.token.trim()) {
          throw new Error("Invalid or missing token in login response");
        }
        localStorage.setItem("token", data.token);
        console.log("Stored token:", data.token);
        resetForm();
        setIsLoading(false);
        onLogin();
      } else if (mode === "register") {
        setMode("login");
        setErrors(["Registration successful! Please log in."]);
        resetForm();
        setIsLoading(false);
      } else if (mode === "forgot") {
        setMode("verify");
        setErrors(["Verification code sent to your email."]);
        setIsLoading(false);
      } else if (mode === "verify") {
        setMode("reset");
        setErrors(["Code verified! Enter your new password."]);
        setIsLoading(false);
      } else if (mode === "reset") {
        setMode("login");
        setErrors(["Password reset successful! Please log in."]);
        resetForm();
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error during submission:", error.message);
      setErrors([error.message || "An unexpected error occurred. Please try again."]);
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    console.log("Initiating Google Sign-In");
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h2 className="login-title">ChatApp</h2>
        <div className="login-tabs">
          <button
            className={`tab ${mode === "login" ? "active" : ""}`}
            onClick={() => setMode("login")}
            aria-label="Switch to login"
          >
            Login
          </button>
          <button
            className={`tab ${mode === "register" ? "active" : ""}`}
            onClick={() => setMode("register")}
            aria-label="Switch to register"
          >
            Register
          </button>
          <button
            className={`tab ${mode === "forgot" || mode === "verify" || mode === "reset" ? "active" : ""}`}
            onClick={() => setMode("forgot")}
            aria-label="Switch to forgot password"
          >
            Forgot Password
          </button>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {(mode === "login" || mode === "register") && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                aria-label="Username"
                disabled={isLoading}
              />
            </div>
          )}
          {(mode === "login" || mode === "register") && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                aria-label="Password"
                disabled={isLoading}
              />
            </div>
          )}
          {(mode === "register" || mode === "forgot" || mode === "verify" || mode === "reset") && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                aria-label="Email"
                disabled={isLoading}
              />
            </div>
          )}
          {(mode === "verify" || mode === "reset") && (
            <div className="form-group">
              <label htmlFor="code">Verification Code</label>
              <input
                id="code"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter 6-digit code"
                aria-label="Verification Code"
                disabled={isLoading}
              />
            </div>
          )}
          {mode === "reset" && (
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Enter new password"
                aria-label="New Password"
                disabled={isLoading}
              />
            </div>
          )}
          {errors.length > 0 && (
            <ul className="error-list">
              {errors.map((error, index) => (
                <li key={index} className={error.includes("successful") ? "success" : "error"}>
                  {error}
                </li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            className="submit-btn"
            aria-label={
              mode === "login"
                ? "Log in"
                : mode === "register"
                ? "Register"
                : mode === "forgot"
                ? "Send Code"
                : mode === "verify"
                ? "Verify Code"
                : "Reset Password"
            }
            disabled={isLoading}
          >
            {isLoading
              ? "Processing..."
              : mode === "login"
              ? "Log In"
              : mode === "register"
              ? "Register"
              : mode === "forgot"
              ? "Send Code"
              : mode === "verify"
              ? "Verify Code"
              : "Reset Password"}
          </button>
          {mode === "login" && (
            <button
              type="button"
              className="google-btn"
              onClick={handleGoogleSignIn}
              aria-label="Sign in with Google"
              disabled={isLoading}
            >
              Sign in with Google
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;