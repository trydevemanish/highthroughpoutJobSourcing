// benchmarks/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  stages: [
    { duration: '30s', target: 10 },    // ramp up to 50 users
    // { duration: '1m',  target: 200 },   // push to 200 users
    // { duration: '30s', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],   // under 1% errors
    http_req_duration: ['p(95)<200'],   // 95% of requests under 200ms
  },
};


export default function () {
  const payload = JSON.stringify(
    {
        "eventId": "evt_001",
        "eventType": "order.placed",
        "idempotencyKey": uuidv4(),
        "payload": {
            "orderId": "ORD-10021",
            "customer": {
            "customerId": "cus_42",
            "name": "Raja",
            "email": "raja@example.com",
            "phone": 9876543210
            },
            "items": [
            {
                "productId": "prod_iphone_18",
                "product_name": "Apple iPhone 18",
                "quantity": 1,
                "unitPrice": 40000000
            },
            {
                "productId": "prod_case_01",
                "product_name": "Silicone Case",
                "quantity": 2,
                "unitPrice": 99900
            }
            ],
            "amount": {
            "subtotal": 40199800,
            "tax": 7235964,
            "total": 47435764
            },
            "shippingAddress": {
            "line1": "House No 412, Vinay Nagar",
            "city": "Ghaziabad",
            "state": "Uttar Pradesh",
            "pincode": "201001",
            "country": "IN"
            },
            "paymentMethod": "UPI",
            "notifyVia": ["email", "sms"]
        }
    }
  );

  const res = http.post('http://host.docker.internal:3000/navie-api/', payload, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(res, {
    'status is 202': (r) => r.status === 202,
    'has jobId': (r) => r.json('jobId') !== undefined,
  });

  sleep(0.1);
}

