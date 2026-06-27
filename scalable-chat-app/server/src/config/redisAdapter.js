import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

export const setupRedisAdapter = async (io) => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  await pubClient.connect();
  await subClient.connect();

  io.adapter(createAdapter(pubClient, subClient));

  console.log("Redis Adapter Connected");
};
