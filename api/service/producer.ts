import { getChannel,QUEUE } from '../../shared/rabbit'

export async function publishEvent(event: object) {
    const channel = getChannel();
    channel.sendToQueue(QUEUE,
        Buffer.from(JSON.stringify(event)),
        {persistent:true,  contentType:'application/json'}
    )

    await channel.waitForConfirms()
}

 