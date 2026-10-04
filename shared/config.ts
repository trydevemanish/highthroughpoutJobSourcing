import { configDotenv } from "dotenv"
configDotenv()

const PORT = process.env.PORT ?? 4000
const EMAILPROVIDER = process.env.EMAILPROVIDER
const SMSPROVIDER = process.env.SMSPROVIDER
const REDIS_URL = process.env.REDIS_URL
const RABBITMQ_URL = process.env.RABBITMQ_URL

export {
    PORT,
    EMAILPROVIDER, 
    SMSPROVIDER,
    REDIS_URL,
    RABBITMQ_URL,
}