const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator/check')

const User = require('../models/user');
const user = require('../models/user');

const transporter = nodemailer.createTransport(sendgridTransport({
  auth: {
    api_key: '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'
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
    errorMessage: message
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
    errorMessage: message
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({email: email})
  .then(user => {
    if(!user){
      req.flash('error-signup','Invalid email or password.');
      return res.redirect('/login');
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
      res.redirect('/login');
    })
    .catch(err => {
      console.log(err);
      res.redirect('/login');
    });
  })
  .catch(err => console.log(err));
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
      errorMessage: errors.array()[0].msg
    });
  }
  User.findOne({email: email})
    .then(userDoc => {
      if (userDoc){
        req.flash('error-signup','User Already Registered');
        return res.redirect('/signup');
      }
      return bcrypt
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
        });
      }).catch(err => {
        console.log(err);
      })
    })
    .catch(err => {
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