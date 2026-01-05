require('dotenv').config();
const twilio = require('twilio');

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM = process.env.TWILIO_PHONE_NUMBER;
const MSID = process.env.TWILIO_MESSAGING_SERVICE_SID;

if (!SID || !TOKEN) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN in .env');
  process.exit(1);
}

const client = twilio(SID, TOKEN);

const msgOpts = {
  body: 'Hello! This is a test message from Twilio.',
  to: '+917032685452' // replace with your number
};
if (MSID) msgOpts.messagingServiceSid = MSID;
else if (FROM) msgOpts.from = FROM;
else {
  console.error('Neither TWILIO_MESSAGING_SERVICE_SID nor TWILIO_PHONE_NUMBER is configured in .env');
  process.exit(1);
}

client.messages
  .create(msgOpts)
  .then(message => console.log('Message SID:', message.sid))
  .catch(err => {
    console.error('Twilio error:', err && err.message ? err.message : err);
    if (err && err.code) console.error('Twilio error code:', err.code);
  });
