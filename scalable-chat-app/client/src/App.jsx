import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const API_URL = "https://real-timechatapp-production.up.railway.app/api/auth";
const SOCKET_URL = "https://real-timechatapp-production.up.railway.app";

// ─── Auth helpers ─────────────────────────────────────────────────────────────
const saveSession = (token, username) => {
  localStorage.setItem("chat_token", token);
  localStorage.setItem("chat_username", username);
};

const clearSession = () => {
  localStorage.removeItem("chat_token");
  localStorage.removeItem("chat_username");
};

const getSession = () => ({
  token: localStorage.getItem("chat_token"),
  username: localStorage.getItem("chat_username"),
});

// ─── Socket factory ───────────────────────────────────────────────────────────
const createSocket = (token) =>
  io(SOCKET_URL, {
    transports: ["websocket"],
    auth: { token: `Bearer ${token}` },
  });

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  // Auth state
  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Session state (populated after successful auth)
  const session = getSession();
  const [loggedIn, setLoggedIn] = useState(
    !!(session.token && session.username),
  );
  const [currentUsername, setCurrentUsername] = useState(
    session.username || "",
  );

  // Chat state
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Socket ref — created once after login, destroyed on logout
  const socketRef = useRef(null);

  // ── Connect socket when logged in ────────────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return;

    const { token } = getSession();
    const socket = createSocket(token);
    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      console.error("Socket auth error:", err.message);
      // Token is invalid / expired — force logout
      handleLogout();
    });

    socket.on("online_users", (users) => setOnlineUsers(users));

    socket.on("receive_private_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on("chat_history", (history) => setMessages(history));

    socket.on("message_status_update", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId ? { ...msg, status: data.status } : msg,
        ),
      );
    });

    socket.on("message_deleted", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.messageId
            ? { ...msg, text: "This message was deleted", isDeleted: true }
            : msg,
        ),
      );
    });

    socket.on("user_typing", (data) => {
      setTypingUser(`${data.username} is typing...`);
    });

    socket.on("user_stop_typing", () => setTypingUser(""));

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  // ── Auth actions ──────────────────────────────────────────────────────────
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    try {
      const endpoint =
        authMode === "login" ? `${API_URL}/login` : `${API_URL}/register`;

      const { data } = await axios.post(endpoint, {
        username: authUsername.trim(),
        password: authPassword,
      });

      saveSession(data.token, data.username);
      setCurrentUsername(data.username);
      setLoggedIn(true);
    } catch (err) {
      setAuthError(
        err.response?.data?.message || "Something went wrong. Try again.",
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    clearSession();
    setLoggedIn(false);
    setCurrentUsername("");
    setMessages([]);
    setOnlineUsers([]);
    setSelectedUser(null);
  };

  // ── Chat actions ──────────────────────────────────────────────────────────
  const sendMessage = () => {
    const socket = socketRef.current;
    if (!message.trim() || !selectedUser || !socket) return;

    socket.emit("send_private_message", {
      text: message,
      receiverSocketId: selectedUser.socketId,
      receiverUsername: selectedUser.username,
    });

    socket.emit("stop_typing", {
      receiverSocketId: selectedUser.socketId,
    });

    setMessage("");
  };

  const deleteMessageForEveryone = (msg) => {
    socketRef.current?.emit("delete_message_for_everyone", {
      messageId: msg.id,
      receiverSocketId: msg.receiverSocketId,
    });
  };

  const handleTyping = (value) => {
    const socket = socketRef.current;
    setMessage(value);

    if (!selectedUser || !socket) return;

    socket.emit("typing", {
      receiverSocketId: selectedUser.socketId,
    });

    setTimeout(() => {
      socket.emit("stop_typing", {
        receiverSocketId: selectedUser.socketId,
      });
    }, 1000);
  };

  // ── Filtered messages for current conversation ────────────────────────────
  const filteredMessages = messages.filter((msg) => {
    if (!selectedUser) return false;
    return (
      (msg.senderUsername === currentUsername &&
        msg.receiverUsername === selectedUser.username) ||
      (msg.senderUsername === selectedUser.username &&
        msg.receiverUsername === currentUsername)
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // AUTH SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white border rounded-2xl shadow p-8 w-full max-w-md">
          <h1 className="text-2xl font-bold text-green-600 mb-1">
            {authMode === "login" ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-slate-500 mb-6 text-sm">
            {authMode === "login"
              ? "Sign in to start chatting"
              : "Pick a username and password to get started"}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              className="w-full border rounded-xl px-4 py-3 outline-none focus:border-green-500"
              placeholder="Username"
              value={authUsername}
              onChange={(e) => setAuthUsername(e.target.value)}
              autoFocus
              required
              minLength={3}
            />

            <input
              type="password"
              className="w-full border rounded-xl px-4 py-3 outline-none focus:border-green-500"
              placeholder="Password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              minLength={6}
            />

            {authError && (
              <p className="text-red-500 text-sm">{authError}</p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              {authLoading
                ? "Please wait..."
                : authMode === "login"
                  ? "Sign in"
                  : "Register"}
            </button>
          </form>

          <p className="mt-5 text-sm text-center text-slate-500">
            {authMode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              className="text-green-600 font-semibold hover:underline"
            >
              {authMode === "login" ? "Register" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHAT SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  const socket = socketRef.current;

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex">
      {/* ── Sidebar ── */}
      <aside className="w-80 bg-white rounded-2xl shadow border p-5 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-600">Scalable Chat</h1>
            <p className="text-slate-500 text-sm">Private real-time chat</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-red-500 hover:underline font-medium"
          >
            Logout
          </button>
        </div>

        <div className="mt-3 px-3 py-2 bg-green-50 rounded-xl text-sm text-green-700 font-medium">
          Logged in as <span className="font-bold">{currentUsername}</span>
        </div>

        <h2 className="mt-6 font-bold text-green-600 text-sm">
          ONLINE USERS ({onlineUsers.length})
        </h2>

        <div className="mt-3 space-y-2 flex-1 overflow-y-auto">
          {onlineUsers.map((user) => (
            <div
              key={user.socketId}
              onClick={() => {
                if (user.socketId !== socket?.id) {
                  setSelectedUser(user);
                  socket?.emit("get_chat_history", {
                    currentUsername,
                    selectedUsername: user.username,
                  });
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-xl transition ${
                user.socketId === socket?.id
                  ? "bg-green-100 cursor-not-allowed"
                  : selectedUser?.socketId === user.socketId
                    ? "bg-green-200 cursor-pointer"
                    : "bg-green-50 hover:bg-green-100 cursor-pointer"
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold shrink-0">
                {user.username ? user.username[0].toUpperCase() : "?"}
              </div>

              <div>
                <p className="font-semibold">
                  {user.username}
                  {user.socketId === socket?.id ? " (You)" : ""}
                </p>
                <p className="text-sm text-green-600">Online</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Chat panel ── */}
      <main className="flex-1 ml-4 bg-white rounded-2xl shadow border flex flex-col overflow-hidden">
        <header className="h-20 border-b flex items-center px-6">
          <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
            {selectedUser ? selectedUser.username[0].toUpperCase() : "C"}
          </div>

          <div className="ml-4">
            <h2 className="font-bold text-xl">
              {selectedUser ? selectedUser.username : "Select a user"}
            </h2>
            <p className="text-green-600 text-sm">
              {selectedUser
                ? `Private chat with ${selectedUser.username}`
                : `Logged in as ${currentUsername}`}
            </p>
          </div>
        </header>

        <section className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {!selectedUser ? (
            <p className="text-slate-400 text-center mt-40">
              Select an online user to start a private chat
            </p>
          ) : filteredMessages.length === 0 ? (
            <p className="text-slate-400 text-center mt-40">
              Start a private chat with {selectedUser.username}
            </p>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderUsername === currentUsername;

              return (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md px-4 py-3 rounded-2xl shadow ${
                      isMe
                        ? "bg-green-100 text-slate-900 rounded-br-sm"
                        : "bg-white text-slate-900 rounded-bl-sm"
                    }`}
                  >
                    {!isMe && (
                      <p className="text-xs font-semibold text-green-600 mb-1">
                        {msg.senderUsername}
                      </p>
                    )}

                    <p className={msg.isDeleted ? "italic text-slate-500" : ""}>
                      {msg.text}
                    </p>

                    {isMe && !msg.isDeleted && (
                      <button
                        onClick={() => deleteMessageForEveryone(msg)}
                        className="block ml-auto mt-1 text-[11px] text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    )}

                    <p className="text-xs text-slate-500 text-right mt-1">
                      {msg.time}{" "}
                      {isMe && (
                        <span>
                          {msg.status === "sent" && "✓"}
                          {msg.status === "delivered" && "✓✓"}
                          {msg.status === "seen" && (
                            <span className="text-blue-500">✓✓</span>
                          )}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </section>

        {typingUser && selectedUser && (
          <p className="px-6 py-2 text-sm text-green-600 italic">{typingUser}</p>
        )}

        <footer className="p-4 border-t flex gap-3 bg-white">
          <input
            disabled={!selectedUser}
            className="flex-1 border rounded-full px-5 py-3 outline-none focus:border-green-500 disabled:bg-slate-100"
            placeholder={
              selectedUser
                ? `Message ${selectedUser.username}...`
                : "Select a user first..."
            }
            value={message}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />

          <button
            onClick={sendMessage}
            className="bg-green-600 hover:bg-green-700 text-white px-6 rounded-full font-semibold"
          >
            Send
          </button>
        </footer>
      </main>
    </div>
  );
}

export default App;
