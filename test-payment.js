// test-payment.js

const YOUR_PROJECT_ID = "gzyqbdsdtqbwxetzbdyi";
const YOUR_PLAN_UUID = "3da98c29-48de-49c5-bc54-35125c548f58";

const webhookUrl = `https://${YOUR_PROJECT_ID}.supabase.co/functions/v1/mock-webhook`;

const payload = {
  event: "charge.success",
  data: {
    id: 123456789,
    reference: "test_tx_" + Math.floor(Math.random() * 1000000),
    amount: 10000000, // ₦100,000 (in Kobo) - This equals 50% of a ₦200k fee
    metadata: {
      custom_fields: [
        {
          variable_name: "plan_id",
          value: YOUR_PLAN_UUID
        }
      ]
    }
  }
};

console.log(`Firing test payment to ${webhookUrl}...`);

fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload)
})
  .then(res => res.json())
  .then(data => console.log("Webhook Response:", data))
  .catch(err => console.error("Error:", err));