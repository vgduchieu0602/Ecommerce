import Redis from "ioredis";

console.log("REDIS_HOST", process.env.REDIS_DATABASE_URI!);

const redis = new Redis(process.env.REDIS_DATABASE_URI!);

export default redis;
