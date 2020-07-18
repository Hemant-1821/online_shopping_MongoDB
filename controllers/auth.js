const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check');
require('dotenv').config();

const User = require('../models/user');
const user = require('../models/user');

//console.log(process.env.API_KEY_SEND)

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: process.env.API_KEY_SEND
  }
}));

exports.getLogin = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }

  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: { email:"" , password:"" },
    validationErrors : []
  });
};

exports.getSignUp = (req,res,next) => {
  let message = req.flash('error-signup');
  if (message.length > 0) {
    message = message[0];
  }
  else {
    message = null;
  }
  res.render('auth/signup',{
    path: '/signup',
    pageTitle: 'SignUp',
    errorMessage: message,
    oldInput: { email:"" , password:"" , confirmPassword:"" },
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    console.log(errors.array()[0].msg);
    return res.status(422).render('auth/login',{
      path: '/login',
      pageTitle: 'login',
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email , password: password },
      validationErrors : errors.array()
    });
  }
  User.findOne({email: email})
  .then((user) => {
    if(!user){
      return res.status(422).render('auth/login',{
        path: '/login',
        pageTitle: 'login',
        errorMessage: 'Enter a valid email or password!',
        oldInput: { email: email , password: password },
        validationErrors : [{param: 'email'}, {param: 'password'}]
      });
    }
    bcrypt.compare(password, user.password)
    .then(result => {
      if(result) {
        req.session.isLoggedIn = true;
        req.session.user = user;
        return req.session.save((err)=>{
          console.log(err);
          res.redirect('/');
        });
      }
      return res.status(422).render('auth/login',{
        path: '/login',
        pageTitle: 'login',
        errorMessage: 'Enter a valid email or password!',
        oldInput: { email: email , password: password },
        validationErrors : [{param: 'email'}, {param: 'password'}]
      });
    })
    .catch(err => {
      console.log(err);
      res.redirect('/login');
    });
  }).catch(err => {
    console.log(err);
  })
};

exports.postSignUp = (req,res,next) => { 
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    console.log(errors.array()[0].msg);
    return res.status(422).render('auth/signup',{
      path: '/signup',
      pageTitle: 'SignUp',
      errorMessage: errors.array()[0].msg,
      oldInput: { email: email, password: password, confirmPassword: req.body.confirmPassword },
      validationErrors: errors.array()
    });
  }
  bcrypt
    .hash(password,12)
    .then(hashedPassword => {
      const user = new User({
        email: email,
        password: hashedPassword,
        cart: { items: [] }
      });
      return user.save();
  })
  .then(result => {
    res.redirect('/login');
    return transporter.sendMail({
      to: email,
      from: 'singh.hemant9583@gmail.com',
      subject: 'Signup Succeeded!',
      html: '<H1>You Successfully signed Up!</H1>'
    }).then((result)=> {
      console.log(result);
      console.log('sent');
    });
  }).catch(err => {
    console.log(err);
  });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req,res,next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/new-password',{
    path:'/new-password',
    pageTitle: 'New Password',
    errorMessage: message,
  });
};

exports.postReset = (req,res,next) => {
  crypto.randomBytes(32, (err, buffer)=>{
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({email:req.body.email})
      .then(user => {
        if (!user) {
          req.flash('error','No Account with that email found');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save().then(result => {
          res.redirect('/');
          transporter.sendMail({
            to: req.body.email,
            from: 'singh.hemant9583@gmail.com',
            subject: 'Password Reset',
            html: `
              <p> You Requested a password reset </p>
              <p> Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password.</p>
            `
          });
        });
      })
      .catch(err => {
      console.log(err);
    })
  });
};

exports.getNewPassword = (req,res,next) => {
  const Token = req.params.token;
  User.findOne({resetToken: Token, resetTokenExpiration: {$gt: Date.now() } })
  .then(user => {
    let message = req.flash('error');
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
     return res.render('auth/new-password',{
      path:'/new-password',
      pageTitle: 'New Password',
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: Token
    });
  })
  .catch( err => {
    console.log(err);
  })
};

exports.postNewPassword = (req,res,next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const token = req.body.passwordToken;
  const cryptPass = 
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() }, _id: userId } )
  .then( user => {
    resetUser = user;
    return bcrypt.hash(newPassword,12);
  })
  .then(hashedPassword => {
    resetUser.password = hashedPassword;
    resetUser.resetToken = undefined;
    resetUser.resetTokenExpiration = undefined;
    return resetUser.save();
  })
  .then( result => {
    res.redirect('/login');
  })
  .catch(err =>{
    console.log(err);
  })
};