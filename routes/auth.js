const express = require('express');
const { check, body } = require('express-validator/check');

const User = require('../models/user');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login', authController.postLogin);

router.post('/logout', authController.postLogout);

router.get('/signup', authController.getSignUp);

router.post(
    '/signup', 
    [
        check('email')
        .isEmail()
        .withMessage('Please enter a valid E-mail address')
        .custom((value, {req})=> {
            User.findOne({email: value})
            .then(userDoc => {
            if (userDoc){
                throw new Error ('Email already registered!!');
            }
            return true
            })
        }),
        body('password','Please enter a password with only numbers and text and at least 5 characters.')
        .isLength({min: 5})
        .isAlphanumeric(),
        body('confirmPassword').custom((value, {req})=>{
            if(value !== req.body.password){
                throw new Error ('Passwords have to match!');
            }
            return true;
        })
    ],
    authController.postSignUp);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword);

router.post('/new-password',authController.postNewPassword);

module.exports = router;