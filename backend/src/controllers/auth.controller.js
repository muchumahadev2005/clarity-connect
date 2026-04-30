const User = require('../models/user.model');
const OTP = require('../models/otp.model');
const { sendOtpEmail } = require('../services/mail.service');
const jwt = require('jsonwebtoken');

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. Request OTP for Signup
exports.requestSignupOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const otpCode = generateOtp();
    
    // Save OTP to DB
    await OTP.findOneAndUpdate(
      { email },
      { otp: otpCode },
      { upsert: true, new: true }
    );

    // Send Email
    await sendOtpEmail(email, otpCode);

    res.status(200).json({ success: true, message: 'OTP sent to email' });
  } catch (err) {
    next(err);
  }
};

// 2. Verify OTP
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // OTP is valid, remove it from DB
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (err) {
    next(err);
  }
};

// 3. Complete Signup (Set Password)
exports.signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const newUser = new User({ email, passwordHash: password });
    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ success: true, token, user: { email: newUser.email } });
  } catch (err) {
    next(err);
  }
};

// 4. Standard Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ success: true, token, user: { email: user.email } });
  } catch (err) {
    next(err);
  }
};

// 5. Request Password Reset OTP
exports.requestPasswordResetOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email does not exist' });
    }

    const otpCode = generateOtp();
    
    await OTP.findOneAndUpdate(
      { email },
      { otp: otpCode },
      { upsert: true, new: true }
    );

    await sendOtpEmail(email, otpCode);

    res.status(200).json({ success: true, message: 'Password reset code sent to email' });
  } catch (err) {
    next(err);
  }
};

// 6. Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.passwordHash = newPassword;
    await user.save();

    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
};
