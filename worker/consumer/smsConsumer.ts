import {SMSPROVIDER} from '../../shared/config'
export interface Provider {
    send(to: string, message:string): Promise<{ providerId: string }>;
}

export class MockSmsProvider implements Provider {
    async send(to: string, message: string): Promise<{ providerId: string; }> {
        await new Promise(r => setTimeout(r, 150 + Math.random() * 150))
        if(Math.random() <= 0.1) throw new Error("Provide timeout")
        return {providerId: `${Date.now()}`}
    }
}


export class TwilioProvider implements Provider {
    send(to: string, message: string): Promise<{ providerId: string; }> {
        throw new Error("Method not implemented.");
    }
}


export const SmsProvider = 
    SMSPROVIDER == 'twilio' ? new TwilioProvider() :
    new MockSmsProvider()


