import { Message } from "./models/message.model.js";

const getOnlineUsers = async (io) => {
  const sockets = await io.fetchSockets();

  return sockets
    .filter((socket) => socket.data.username)
    .map((socket) => ({
      socketId: socket.id,
      username: socket.data.username,
    }));
};

const broadcastOnlineUsers = async (io) => {
  const users = await getOnlineUsers(io);
  io.emit("online_users", users);
};

const formatMessage = (msg) => {
  return {
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
  };
};

export const initializeSocket = (io) => {
  io.on("sync_online_users", async () => {
    await broadcastOnlineUsers(io);
  });

  io.on("connection", (socket) => {
    console.log(
      `User ${socket.id} connected to Server ${process.env.PORT || 3001}`,
    );

    socket.on("user_joined", async (data) => {
      socket.data.username = data.username;

      console.log(
        `${data.username} joined on Server ${process.env.PORT || 3001}`,
      );

      await broadcastOnlineUsers(io);
      io.serverSideEmit("sync_online_users");
    });

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
        senderUsername: data.senderUsername,
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
      await Message.findByIdAndUpdate(data.messageId, {
        status: "seen",
      });

      io.to(data.senderId).emit("message_status_update", {
        messageId: data.messageId,
        status: "seen",
      });
    });

    socket.on("typing", (data) => {
      if (!data.receiverSocketId) return;

      io.to(data.receiverSocketId).emit("user_typing", {
        username: data.username,
      });
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

      socket.emit("message_deleted", {
        messageId: data.messageId,
      });
    });

    socket.on("disconnect", async () => {
      console.log(
        `User ${socket.id} disconnected from Server ${
          process.env.PORT || 3001
        }`,
      );

      await broadcastOnlineUsers(io);
      io.serverSideEmit("sync_online_users");
    });
  });
};
