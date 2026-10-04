import express from 'express';
import { PORT } from '../../shared/config'
import { OrderPlacedSchema } from '../middleware/validate'
import { publishEvent } from '../service/producer';
import { randomUUID } from 'crypto';
import { connectRabbit } from '../../shared/rabbit';
import { redis } from '../../shared/redis';
import { rateLimiting } from '../middleware/ratelimiting';
import { configDotenv } from 'dotenv';
import { SmsProvider } from '../../worker/consumer/smsConsumer';
import { EmailProvider } from '../../worker/consumer/emailConsumer';

configDotenv()
const app = express();
app.use(express.json())

app.post('/events', async(req, res) => {
    const parsed = OrderPlacedSchema.safeParse(req.body)
    console.log(req.body)
    if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid event', errors: parsed.error.message })
    }

    const event = parsed.data
    const idemKey = `idem:${event.idempotencyKey}`
    const jobId = randomUUID()

    try {
        const isNew = await redis.set(idemKey, jobId, 'EX', 86400, 'NX')
        if(isNew === null){
            const existingJobId = await redis.get(idemKey)
            return res.status(200).json({ jobId: existingJobId, status: 'duplicate' })
        }

        try {
            await redis.hset(`job:${jobId}`,{jobId: jobId, status:"queued"})
            await redis.expire(`job:${jobId}`, 86400)
            await publishEvent({jobId, ...event})
        } catch (error) {
            await redis.del(idemKey)
            throw error
        }

        return res.status(202).json({ jobId, status: 'queued' })
    } catch (error) {
        return res.status(500).json({ error: 'Could not queue event' })
    }
})


app.get('/events/:jobId', async(req, res) => {
    try {
        const { jobId } = req.params
        console.log(jobId)
        const job = await redis.hgetall(`job:${jobId}`)
        if (Object.keys(job).length === 0) {
            return res.status(404).json({ message: 'Job not found' })
        }

        return res.status(200).json({ jobId, ...job })
    } catch (error:any) {
        console.error(error)
        return res.status(500).json({ message: error?.message })
    }
})


//------------------------------------NAVIE CODE -----------------------


app.get("/", async(req, res)=>{
    return res.status(200).json({ 'message' : 'hey it works' })
})

app.post('/navie-api', rateLimiting({endpoint:"events", rate_limit:{limit: 10, time: 3}}), async(req,res) => {
    const parse = OrderPlacedSchema.safeParse(req.body)
    if(!parse.success){
        return res.status(400).json({'message' : 'Invalid Data', error: parse.error.flatten()})
    }

    const event = parse.data
    // const idemKey = `idem:${event.idempotencyKey}`
    const jobId = randomUUID()

    try {
        // const isNew = await redis.set(idemKey, jobId, 'EX', 86400, 'NX')
        // if(isNew === null){
        //     const existingJobId = await redis.get(idemKey)
        //     return res.status(400).json({'message':'Duplicate Request', jobId: existingJobId})
        // } 

        await redis.hset(`job:${jobId}`,{jobId: jobId, status:"queued"})
        await redis.expire(`job:${jobId}`, 86400)
        await SmsProvider.send("","")
        await EmailProvider.send("", "", "")
        redis.hset(`job:${jobId}`,{jobId: jobId, status:"done"})
        return res.status(201).json({'mesasage': 'work done', jobId: jobId})
    } catch (error: any) {
        console.log(`${error}`)
        return res.status(500).json({'message':`${error.message}`})
    }
})


async function start(){
    app.listen(PORT, () => console.log(`Server Started at : ${PORT}`))
    await connectRabbit()
}

start().catch(err => {
  console.error('Startup failed:', err)
  process.exit(1)
}) //starting point of the code

export default app
