require('dotenv').config();
const twilio = require('twilio');
const Otp = require('../models/otpModel');

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MSID = process.env.TWILIO_MESSAGING_SERVICE_SID;

let client = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  try {
    client = twilio(TWILIO_SID, TWILIO_TOKEN);
  } catch (err) {
    console.warn('Twilio client init failed:', err && err.message);
    client = null;
  }
}

// Send OTP
exports.sendOtp = async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });

  const otp = Math.floor(100000 + Math.random() * 900000);

  try {
    // Save OTP to MongoDB
    await Otp.findOneAndUpdate(
      { phone },
      { otp, createdAt: new Date() },
      { upsert: true, new: true }
    );

    // If Twilio is configured, try to send SMS. Prefer Messaging Service SID if provided.
    if (client && (TWILIO_MSID || TWILIO_PHONE)) {
      const msgOpts = {
        body: `Your OTP is: ${otp}`,
        to: phone
      };
      if (TWILIO_MSID) msgOpts.messagingServiceSid = TWILIO_MSID;
      else msgOpts.from = TWILIO_PHONE;

      await client.messages.create(msgOpts);
      return res.status(200).json({ success: true, message: 'OTP sent successfully' });
    }

    // Twilio not configured or missing phone -> dev fallback: return the otp in response
    console.warn('Twilio not configured or missing TWILIO_PHONE_NUMBER — returning OTP in response for development');
    return res.status(200).json({ success: true, message: 'OTP (dev) generated', otp: String(otp), phone });
  } catch (error) {
    console.error('Twilio send error:', error && error.message ? error.message : error);
    // On Twilio failure fall back to returning the OTP to allow development testing
    return res.status(200).json({ success: true, message: 'OTP (dev) generated after Twilio error', otp: String(otp), phone, twilioError: error && error.code ? error.code : null });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ success: false, message: 'Phone & OTP required' });

  try {
    const record = await Otp.findOne({ phone });
    if (!record) return res.status(400).json({ success: false, message: 'OTP expired or not found' });

    if (parseInt(otp) === record.otp) {
      await Otp.deleteOne({ phone }); // Remove OTP after verification
      res.status(200).json({ success: true, message: 'OTP verified successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
