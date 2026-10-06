import { configDotenv } from "dotenv"
configDotenv()

export const PORT = process.env.PORT ?? 4000
export const EMAILPROVIDER = process.env.EMAILPROVIDER
export const SMSPROVIDER = process.env.SMSPROVIDER
export const REDIS_URL = process.env.REDIS_URL
export const RABBITMQ_URL = process.env.RABBITMQ_URL
export const EMAIL_FAIL_RATE = Number(process.env.EMAIL_FAIL_RATE ?? 0.2);
export const SMS_FAIL_RATE   = Number(process.env.SMS_FAIL_RATE ?? 0.1);

