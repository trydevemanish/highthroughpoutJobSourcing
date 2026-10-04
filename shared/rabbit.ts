import amqp from 'amqplib'
import { RABBITMQ_URL } from './config'
export const QUEUE ='task_queue'
export const RETRY_QUEUE = 'task_queue.retry'
export const DLQ = 'task_queue.dlq'

let channel: amqp.ConfirmChannel | undefined

async function connectWithRetry(url: string, retries = 20, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await amqp.connect(url)
    } catch (err) {
      console.log(`RabbitMQ not ready (attempt ${i}/${retries}), retrying in ${delayMs / 1000}s...`)
      await new Promise(r => setTimeout(r, delayMs))
    }
  }
  throw new Error('Could not connect to RabbitMQ')
}

export async function connectRabbit(){
  const connection = await connectWithRetry(RABBITMQ_URL ?? 'amqp://localhost')
  channel = await connection.createConfirmChannel();

  await channel.assertQueue(
      QUEUE,
      {
          durable: true,
          arguments: { 'x-queue-type': 'quorum'}
      }
  )

  await channel.assertQueue(RETRY_QUEUE, {durable: true, arguments: {
      'x-queue-type': 'quorum',
      'x-message-ttl': 5000,                  // wait 5s
      'x-dead-letter-exchange': '',           // default exchange...
      'x-dead-letter-routing-key': QUEUE,     // ...routes back to the main queue
  },
  })

  await channel.assertQueue(DLQ, { durable: true, arguments: { 'x-queue-type': 'quorum' } })
  console.log('RabbitMq Connected')
}

export function getChannel(){
    if(!channel) throw new Error('RabbitMQ not connected yet')
    return channel
}


