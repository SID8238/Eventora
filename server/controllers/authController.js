const User = require('../models/user');
const OTP = require('../models/OTP');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const {sendOTPEmail} = require('../utils/email');
dotenv.config();

const generateToken = (id,role) => {
    // console.log("JWT_SECRET:", process.env.JWT_SECRET);
    return jwt.sign({id,role}, process.env.JWT_SECRET, {expiresIn: '7d'});
}


//Register user
exports.registerUser = async (req,res) => {
    const {name, email, password} = req.body;
    
    let userExists = await User.findOne({email});
    if(userExists)
        {
            return res.status(400).json({error: 'User already exists'});
        } 

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password,salt);

    try{
        const user = await User.create({name, email, password: hashedPassword, role: 'user', isVerified: false});

        const otp = Math.floor(100000 + Math.random()*900000).toString();
        console.log(`OTP for ${email}: ${otp}`);
        await OTP.create({email, otp, action: 'account_verification'});
        await sendOTPEmail(email, otp, 'account_verification');

        res.status(201).json({
            message: 'User registered successfully. Please check your email for OTP to verify your account.',
            email: user.email
        });
    }
    catch (error)
    {
        res.status(400).json({error: error.message});
    }
}  

// Login User
exports.loginUser = async(req,res) => {
    const {email,password} = req.body;

    let user = await User.findOne({email});
    if(!user)
    {
        return res.status(400).json({error: 'Invalid credentials, Please Sign Up first'});
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        return res.status(400).json({error: 'Invalid Credentials, Please enter correct password'});
    }

    if(!user.isVerified && user.role === 'user'){
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        await OTP.deleteMany({email, action: 'account_verification'});
        await OTP.create({email, otp, action: 'account_verification'});
        await sendOTPEmail(email, otp, 'account_verification');
        return res.status(400).json({
            error: 'Account not verified. A new OTP has been sent to your email.'
        });
    }

    res.json({
        message: 'Login successful',
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id,user.role)
    })
};

//Verify OTP
exports.verifyOtp = async(req,res) => {
    const {email, otp} = req.body;
    const otpRecord = await OTP.findOne({email, otp, action: 'account_verification'});

    if(!otpRecord){
        return res.status(400).json({error: 'Invalid or expired OTP'});
    }

    const user = await User.findOneAndUpdate({email}, {isverified: true});
    await OTP.deleteMany({email, action: 'account_verification'});
    res.json(
        {
            message: 'Account verified successfully. You can now log in.',
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        }
    );
}; 