import { Redis } from 'ioredis';
import { REDIS_URL } from './config';

const redis = new Redis(`${REDIS_URL}`);

redis.on('close', () => {
    console.log('Redis Disconnected!')
})

redis.on('connect', () => {
    console.log('Redis Connected.')
})

redis.on('error', () => {
    console.log('Failed! Redis Disconnected.')
    redis.quit()
})

export {
    redis
}