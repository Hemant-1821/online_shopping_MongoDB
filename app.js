const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  User.findById("5eec7649214d9c1150c6c6b8")
    .then(user => {
      req.user = user;
      next(); 
    })
    .catch(err => console.log(err));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

app.use(errorController.get404);

mongoose
  .connect(
    'mongodb+srv://Hemant:ovDzbvDxBhVe8Jnt@cluster0.jcml6.mongodb.net/shop2?retryWrites=true'
  )
  .then(result =>{
    User.findOne().then(user => {
      if (!user) {
        const user = new User({
          name: 'Hemant',
          email: 'hem@123.com',
          cart: {
            items: [] 
          }
        });
        user.save();
      }
    });
    app.listen(3000);
  })
  .catch(err => {
    console.log(err); 
  })
