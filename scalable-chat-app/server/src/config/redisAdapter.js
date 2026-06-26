import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

export const setupRedisAdapter = async (io) => {
  const pubClient = createClient({
    url: "redis://localhost:6379",
  });

  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  console.log("Redis Adapter Connected");
};
