import jwt from "jsonwebtoken";
import { Message } from "./models/message.model.js";

// ─── Socket.IO JWT middleware ────────────────────────────────────────────────
// The client must pass the token either via:
//   auth: { token: "Bearer <jwt>" }  (socket.io-client handshake)
export const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Authentication token missing"));
  }

  const rawToken = token.startsWith("Bearer ") ? token.slice(7) : token;

  try {
    const decoded = jwt.verify(rawToken, process.env.JWT_SECRET);
    // Store decoded payload on the socket for later use
    socket.data.userId = decoded.id;
    socket.data.username = decoded.username;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getOnlineUsers = async (io) => {
  const sockets = await io.fetchSockets();

  return sockets
    .filter((s) => s.data.username)
    .map((s) => ({
      socketId: s.id,
      username: s.data.username,
    }));
};

const broadcastOnlineUsers = async (io) => {
  const users = await getOnlineUsers(io);
  io.emit("online_users", users);
};

const formatMessage = (msg) => ({
  id: msg._id.toString(),
  text: msg.text,
  senderId: msg.senderId,
  senderUsername: msg.senderUsername,
  receiverSocketId: msg.receiverSocketId,
  receiverUsername: msg.receiverUsername,
  status: msg.status,
  isDeleted: msg.isDeleted,
  time: new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  }),
});

// ─── Event registration ───────────────────────────────────────────────────────
export const initializeSocket = (io) => {
  // Apply JWT middleware to every socket connection
  io.use(socketAuthMiddleware);

  io.on("sync_online_users", async () => {
    await broadcastOnlineUsers(io);
  });

  io.on("connection", (socket) => {
    const { username } = socket.data;

    console.log(
      `User "${username}" (${socket.id}) connected to Server ${process.env.PORT || 3001}`,
    );

    // Announce the newly connected user
    broadcastOnlineUsers(io);
    io.serverSideEmit("sync_online_users");

    socket.on("get_chat_history", async (data) => {
      const messages = await Message.find({
        $or: [
          {
            senderUsername: data.currentUsername,
            receiverUsername: data.selectedUsername,
          },
          {
            senderUsername: data.selectedUsername,
            receiverUsername: data.currentUsername,
          },
        ],
      }).sort({ createdAt: 1 });

      socket.emit("chat_history", messages.map(formatMessage));
    });

    socket.on("send_private_message", async (data) => {
      console.log(`Message handled by Server ${process.env.PORT || 3001}`);

      const savedMessage = await Message.create({
        text: data.text,
        senderId: socket.id,
        senderUsername: username,
        receiverSocketId: data.receiverSocketId,
        receiverUsername: data.receiverUsername,
        status: "sent",
      });

      const messageData = formatMessage(savedMessage);

      socket.emit("receive_private_message", messageData);

      io.to(data.receiverSocketId).emit("receive_private_message", {
        ...messageData,
        status: "delivered",
      });

      savedMessage.status = "delivered";
      await savedMessage.save();

      socket.emit("message_status_update", {
        messageId: messageData.id,
        status: "delivered",
      });
    });

    socket.on("message_seen", async (data) => {
      await Message.findByIdAndUpdate(data.messageId, { status: "seen" });

      io.to(data.senderId).emit("message_status_update", {
        messageId: data.messageId,
        status: "seen",
      });
    });

    socket.on("typing", (data) => {
      if (!data.receiverSocketId) return;
      io.to(data.receiverSocketId).emit("user_typing", { username });
    });

    socket.on("stop_typing", (data) => {
      if (!data.receiverSocketId) return;
      io.to(data.receiverSocketId).emit("user_stop_typing");
    });

    socket.on("delete_message_for_everyone", async (data) => {
      await Message.findByIdAndUpdate(data.messageId, {
        text: "This message was deleted",
        isDeleted: true,
      });

      io.to(data.receiverSocketId).emit("message_deleted", {
        messageId: data.messageId,
      });

      socket.emit("message_deleted", { messageId: data.messageId });
    });

    socket.on("disconnect", async () => {
      console.log(
        `User "${username}" (${socket.id}) disconnected from Server ${process.env.PORT || 3001}`,
      );

      await broadcastOnlineUsers(io);
      io.serverSideEmit("sync_online_users");
    });
  });
};
