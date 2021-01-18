const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const csrfProtection = csrf();

const errorController = require('./controllers/error');

const mongoose = require('mongoose');

const session = require('express-session');

const mongoDbStore = require('connect-mongodb-session')(session);

const MONGO_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.uaex1.mongodb.net/shop?retryWrites=true&w=majority` ;

const store = new mongoDbStore({
    uri: MONGO_URI,
    collection: 'sessions'
})



const app = express();

const User = require('./models/user');

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

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


app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

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
    //throw new Error('dummy');
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

mongoose.connect(MONGO_URI).then(result => {
        app.listen(process.env.PORT || 3000);

})
