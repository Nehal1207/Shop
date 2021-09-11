const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const csrfProtection = csrf();
const mongoose = require('mongoose');
const session = require('express-session');

require('dotenv').config()

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const errorController = require('./controllers/error');
const User = require('./models/user');


const mongoDbStore = require('connect-mongodb-session')(session);

const MONGO_URI=process.env.MONGO_URI;

const store = new mongoDbStore({
    uri: MONGO_URI,
    collection: 'sessions'
})

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
}

app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));

app.use(
    session({
        secret: 'my secret',
        resave: false,
        saveUninitialized: false,
        store : store
    })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
    res.locals.isAuthenicated = req.session.isLogedIn;
    res.locals.csrfToken = req.csrfToken();
    next();
})

app.use((req, res, next) => {
    if (!req.session.user) {
        return next();
    }
    User.findById(req.session.user._id)
        .then(user => {
            req.user = user;
            next();
        })
        .catch(err => { next(new Error(err)) });
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.use(errorController.get404);
app.use(errorController.get500);

mongoose.connect(process.env.MONGO_URI,{ useNewUrlParser: true,useUnifiedTopology: true}).then(result => {
        app.listen(process.env.PORT || 3000);
        console.log("Server Started At Port:"+ (process.env.PORT || 3000));

})
