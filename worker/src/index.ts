import cluster from "cluster";
import { QUEUE, RETRY_QUEUE, DLQ, getChannel, connectRabbit } from "../../shared/rabbit";
import { redis } from "../../shared/redis";
import { EmailProvider } from "../consumer/emailConsumer";
import { SmsProvider } from "../consumer/smsConsumer";
import os from 'os'
import { recordStatus } from "../../shared/metric";

const MAX_ATTEMPTS = 3

export async function consumeEvent() {
    const ch = getChannel();
    await ch.prefetch(5)

    await ch.consume(QUEUE, async(msg) => {
        if(!msg) return
        console.log(`msg: ${new Date().toDateString()}`)
        const attempt = Number(msg.properties.headers?.['x-attempt'] ?? 0)

        let event;
        try {
            event = JSON.parse(msg.content.toString());
        } catch {
            ch.sendToQueue(DLQ, msg.content, { persistent: true });
            await ch.waitForConfirms();
            return ch.ack(msg);
        }
        
        const key = `job:${event.jobId}`;

        try {
            await redis.hset(key, { status: 'processing', attempt });

            const emailKey = `sent:email:${event.eventId}`;
            if (!(await redis.exists(emailKey))) {
                await EmailProvider.send(event.payload.customer.email, 'Order placed', '...');
                await redis.set(emailKey, 1, 'EX', 86400);
            }

            // const smsKey = `sent:email:${event.eventId}`;

            if (event.payload.customer.phone && await redis.set(`sent:sms:${event.eventId}`, 1, 'EX', 86400, 'NX')) {
                await SmsProvider.send(event.payload.customer.phone, '...');
            }

            await redis.hset(key, {
                status: 'done',
                processedAt: Date.now(),
                latencyMs: Date.now() - new Date(event.occurredAt).getTime(),
            });

            await recordStatus(event.runId, 'done');
            ch.ack(msg)
        } catch (err) {
            const next = attempt + 1;
            const isFinal = next >= MAX_ATTEMPTS;
            const target = isFinal ? DLQ : RETRY_QUEUE;

            await redis.hset(key, { status: isFinal ? 'failed' : 'retrying', attempt: next, error: String(err) });
            await recordStatus(event.runId, isFinal ? 'failed' : 'retrying');

            ch.sendToQueue(target, msg.content, {
                persistent: true,
                headers: { 'x-attempt': next, 'x-error': String(err) },
            });

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


