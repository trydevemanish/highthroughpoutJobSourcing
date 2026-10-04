import { NextFunction, Request, Response } from "express"
import { redis } from "../../shared/redis"

export interface rateLimitingRule {
    endpoint: string,
    rate_limit: {
        time:number,
        limit: number
    }
}


export function rateLimiting(rule: rateLimitingRule) {
    const {endpoint, rate_limit} = rule
    return async(req: Request, res: Response, next:NextFunction) => {
        const ipAddress = req.ip;
        const redisId  = `${endpoint}/${ipAddress}`

        const request = await redis.incr(redisId)
        if(request === 1){
            await redis.expire(redisId, rate_limit.time)
        }

        if(request > rate_limit.limit){
            return res.status(429).json({'message': 'Too Many Request'})
        }

        next();
    }
}