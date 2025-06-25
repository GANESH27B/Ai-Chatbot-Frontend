<<<<<<< HEAD
import React, { useState, useEffect } from "react";
import axios from "axios";

function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (error) {
        console.error("Error fetching user data", error);
      }
    };

    fetchUser();
  }, []);

  return user ? <div>Welcome, {user.username}</div> : <div>Loading...</div>;
}

=======
import React, { useState, useEffect } from "react";
import axios from "axios";

function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:5000/api/auth/user", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(res.data);
      } catch (error) {
        console.error("Error fetching user data", error);
      }
    };

    fetchUser();
  }, []);

  return user ? <div>Welcome, {user.username}</div> : <div>Loading...</div>;
}

>>>>>>> b8501599f4a5de53059382d07f466b35fbd93106
export default UserProfile;