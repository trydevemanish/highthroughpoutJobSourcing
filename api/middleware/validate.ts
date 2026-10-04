import {z} from 'zod'

export const OrderPlacedSchema = z.object({
    eventId: z.string(),
    eventType: z.literal("order.placed"),
    idempotencyKey: z.string(),
    payload: z.object({
        orderId: z.string(),
        customer: z.object({
            customerId: z.string(),
            name: z.string().min(1),
            email: z.email(),
            phone: z.number().optional(),
        }),
        items: z.array(
            z.object({
                productId: z.string(),
                product_name: z.string(),
                quantity: z.number().int().positive(),
                unitPrice: z.number().int().nonnegative(),
            })
        ),
        amount: z.object({
            subtotal: z.number(),
            tax: z.number(),
            total: z.number(),
        }),
        shippingAddress: z.object({
            line1: z.string(),
            city: z.string(),
            state: z.string(),
            pincode: z.string(),
            country: z.string().default("IN"),
        }),
        paymentMethod: z.enum(["UPI", "CARD", "COD", "NETBANKING"]),
        notifyVia: z.array(z.enum(["email", "sms"])),
    })
});
