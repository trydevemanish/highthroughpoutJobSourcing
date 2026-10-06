import { redis } from "./redis";

export async function recordStatus(runId:string, status:string) {
    await redis.hincrby(`stats:${runId}`, status, 1);
}