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

    socket.on("send_private_message", (data) => {
      console.log(`Message handled by Server ${process.env.PORT || 3001}`);

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

      socket.emit("receive_private_message", messageData);

      io.to(data.receiverSocketId).emit("receive_private_message", {
        ...messageData,
        status: "delivered",
      });

      socket.emit("message_status_update", {
        messageId: messageData.id,
        status: "delivered",
      });
    });

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
