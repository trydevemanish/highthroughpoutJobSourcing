import cluster from "cluster";
import { QUEUE, RETRY_QUEUE, DLQ, getChannel, connectRabbit } from "../../shared/rabbit";
import { redis } from "../../shared/redis";
import { EmailProvider } from "../consumer/emailConsumer";
import { SmsProvider } from "../consumer/smsConsumer";
import os from 'os'

const MAX_ATTEMPTS = 3

export async function consumeEvent() {
    console.log(`Consuming Event: ${new Date().toDateString()}`)
    const ch = getChannel();
    await ch.prefetch(5)

    await ch.consume(QUEUE, async(msg) => {
        if(!msg) return
        console.log(`msg: ${new Date().toDateString()}`)
        const attempt = Number(msg.properties.headers?.['x-attempt'] ?? 0)
        
        try {
            const event = JSON.parse(msg.content.toString())
            await redis.hset(`job:${event.jobId}`, { status: 'processing' })

            await EmailProvider.send(event.payload.customer.email,'Order placed', '...');
            await SmsProvider.send(event.payload.customer.phone, '...')
            await redis.hset(`job:${event.jobId}`, { status: 'done' })
            ch.ack(msg)
        } catch (err) {
            const next = attempt+1;
            const target = next >= MAX_ATTEMPTS ? DLQ : RETRY_QUEUE

            ch.sendToQueue(target, msg.content, {
                persistent: true,
                headers: { 'x-attempt': next, 'x-error': String(err) },
            })
            await ch.waitForConfirms()
            ch.ack(msg)
        }
    },{noAck: false})
}


async function start() {
    await connectRabbit()
    await consumeEvent() 
    console.log('Worker started, waiting for messages...')
}

start().catch(err => {
    console.error('Worker failed to start:', err)
    process.exit(1)         // exit so Docker restarts it instead of hiding the crash
})

// let cpuCount = os.cpus.length
// for(let i=0; i<cpuCount; i++){
//     cluster.fork()
//     start().catch(err => {
//         console.error('Worker failed to start:', err)
//         process.exit(1)         // exit so Docker restarts it instead of hiding the crash
//     })
// }
