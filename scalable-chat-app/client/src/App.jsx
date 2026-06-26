import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:8080", {
  transports: ["websocket"],
});

function App() {
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  const joinChat = () => {
    if (!username.trim()) return;

    socket.emit("user_joined", {
      username,
    });

    setJoined(true);
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    if (!selectedUser) return alert("Please select a user first");

    socket.emit("send_private_message", {
      text: message,
      senderUsername: username,
      receiverSocketId: selectedUser.socketId,
      receiverUsername: selectedUser.username,
    });

    socket.emit("stop_typing", {
      receiverSocketId: selectedUser.socketId,
    });

    setMessage("");
  };

  const deleteMessageForEveryone = (msg) => {
    socket.emit("delete_message_for_everyone", {
      messageId: msg.id,
      receiverSocketId: msg.receiverSocketId,
    });
  };

  useEffect(() => {
    socket.on("receive_private_message", (data) => {
      setMessages((prev) => [...prev, data]);
    });

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
            ? {
                ...msg,
                text: "This message was deleted",
                isDeleted: true,
              }
            : msg,
        ),
      );
    });

    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    socket.on("user_typing", (data) => {
      setTypingUser(`${data.username} is typing...`);
    });

    socket.on("user_stop_typing", () => {
      setTypingUser("");
    });

    return () => {
      socket.off("receive_private_message");
      socket.off("message_status_update");
      socket.off("message_deleted");
      socket.off("online_users");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, []);

  const filteredMessages = messages.filter((msg) => {
    if (!selectedUser) return false;

    return (
      (msg.senderId === socket.id &&
        msg.receiverSocketId === selectedUser.socketId) ||
      (msg.senderId === selectedUser.socketId &&
        msg.receiverSocketId === socket.id)
    );
  });

  if (!joined) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white border rounded-2xl shadow p-6 w-full max-w-md">
          <h1 className="text-2xl font-bold text-green-600 mb-2">Join Chat</h1>

          <p className="text-slate-500 mb-5">
            Enter your name to start chatting
          </p>

          <input
            className="w-full border rounded-xl px-4 py-3 outline-none focus:border-green-500"
            placeholder="Enter your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && joinChat()}
          />

          <button
            onClick={joinChat}
            className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex">
      <aside className="w-80 bg-white rounded-2xl shadow border p-5">
        <h1 className="text-2xl font-bold text-green-600">Scalable Chat</h1>
        <p className="text-slate-500">Private real-time chat</p>

        <h2 className="mt-8 font-bold text-green-600">
          ONLINE USERS ({onlineUsers.length})
        </h2>

        <div className="mt-4 space-y-3">
          {onlineUsers.map((user) => (
            <div
              key={user.socketId}
              onClick={() => {
                if (user.socketId !== socket.id) {
                  setSelectedUser(user);
                }
              }}
              className={`flex items-center gap-3 p-3 rounded-xl transition ${
                user.socketId === socket.id
                  ? "bg-green-100 cursor-not-allowed"
                  : selectedUser?.socketId === user.socketId
                    ? "bg-green-200 cursor-pointer"
                    : "bg-green-50 hover:bg-green-100 cursor-pointer"
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
                {user.username ? user.username[0].toUpperCase() : "?"}
              </div>

              <div>
                <p className="font-semibold">
                  {user.username}
                  {user.socketId === socket.id ? " (You)" : ""}
                </p>
                <p className="text-sm text-green-600">Online</p>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 ml-4 bg-white rounded-2xl shadow border flex flex-col overflow-hidden">
        <header className="h-20 border-b flex items-center px-6">
          <div className="h-12 w-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {selectedUser ? selectedUser.username[0].toUpperCase() : "C"}
          </div>

          <div className="ml-4">
            <h2 className="font-bold text-xl">
              {selectedUser ? selectedUser.username : "Select a user"}
            </h2>
            <p className="text-green-600 text-sm">
              {selectedUser
                ? `Private chat with ${selectedUser.username}`
                : `Logged in as ${username}`}
            </p>
          </div>
        </header>

        <section className="flex-1 p-6 overflow-y-auto bg-slate-50">
          {!selectedUser ? (
            <p className="text-slate-400 text-center mt-40">
              Select an online user to start private chat
            </p>
          ) : filteredMessages.length === 0 ? (
            <p className="text-slate-400 text-center mt-40">
              Start private chat with {selectedUser.username}
            </p>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.senderId === socket.id;

              return (
                <div
                  key={msg.id}
                  className={`mb-4 flex ${
                    isMe ? "justify-end" : "justify-start"
                  }`}
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
          <p className="px-6 py-2 text-sm text-green-600 italic">
            {typingUser}
          </p>
        )}

        <footer className="p-4 border-t flex gap-3 bg-white">
          <input
            disabled={!selectedUser}
            className="flex-1 border rounded-full px-5 py-3 outline-none focus:border-green-500 disabled:bg-slate-100"
            placeholder={
              selectedUser
                ? `Message ${selectedUser.username}...`
                : "Select user first..."
            }
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);

              if (selectedUser) {
                socket.emit("typing", {
                  username,
                  receiverSocketId: selectedUser.socketId,
                });

                setTimeout(() => {
                  socket.emit("stop_typing", {
                    receiverSocketId: selectedUser.socketId,
                  });
                }, 1000);
              }
            }}
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
