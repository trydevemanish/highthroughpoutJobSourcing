import {EMAIL_FAIL_RATE, EMAILPROVIDER} from '../../shared/config'

interface Provider {
    send(from: string, to: string, message: string): Promise<{message: string}>
}


export class MockEmailProvider implements Provider {
    async send(from: string, to: string, message: string): Promise<{ message: string }> {
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100))
        if (Math.random() < EMAIL_FAIL_RATE) throw new Error('SMTP timeout');
        return {message : `Message Send: ${to}`}
    }
}

export class ResendEmailProvider implements Provider {
    async send(from: string, to: string, message: string): Promise<{ message: string }> {
        throw new Error('Service not in use')
    }
}

export const EmailProvider = EMAILPROVIDER == 'resend' ?
    new ResendEmailProvider() :
    new MockEmailProvider()