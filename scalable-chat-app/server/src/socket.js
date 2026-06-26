const onlineUsers = {};

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("user_joined", (data) => {
      onlineUsers[socket.id] = {
        socketId: socket.id,
        username: data.username,
        connectedAt: new Date(),
      };

      io.emit("online_users", Object.values(onlineUsers));
    });

    socket.on("send_private_message", (data) => {
      const messageData = {
        id: `${socket.id}-${Date.now()}`,
        text: data.text,
        senderId: socket.id,
        senderUsername: data.senderUsername,
        receiverSocketId: data.receiverSocketId,
        receiverUsername: data.receiverUsername,
        status: "sent",
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      // Sender sees message immediately
      socket.emit("receive_private_message", messageData);

      // Receiver gets delivered message
      io.to(data.receiverSocketId).emit("receive_private_message", {
        ...messageData,
        status: "delivered",
      });

      // Sender's tick changes to ✓✓
      socket.emit("message_status_update", {
        messageId: messageData.id,
        status: "delivered",
      });
    });

    // NEW: Seen event
    socket.on("message_seen", (data) => {
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

    socket.on("delete_message_for_everyone", (data) => {
      io.to(data.receiverSocketId).emit("message_deleted", {
        messageId: data.messageId,
      });

      socket.emit("message_deleted", {
        messageId: data.messageId,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      delete onlineUsers[socket.id];

      io.emit("online_users", Object.values(onlineUsers));
    });
  });
};
