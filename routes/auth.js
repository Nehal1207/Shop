const express = require('express');

const authController = require('../controllers/auth');

const isAuth = require('../middleware/isauth');

const { check } = require('express-validator/check');

const User = require('../models/user');

const bcrypt = require('bcryptjs');

const router = express.Router();

router.get('/login', authController.getLogin);

router.post('/login', [check('email').isEmail().withMessage('Invalid Email')
    .custom((value, { req }) => {
        return User.findOne({ emailId: value }).then(user => {
            if (!user) {
                return Promise.reject('User Not Found');
            }
            bcrypt.compare(req.body.password, user.password).then(matches => {
                if (!matches) {
                    return Promise.reject('Invalid Password');
                }
            })
        })
    })], authController.postLogin);

router.post('/logout',isAuth, authController.postLogout);

router.get('/signup', authController.getSignUp);

router.post('/signup',
    [check('email').isEmail()
        .withMessage('Invalid Email Id')
        .custom((value, { req }) => {
            return User.findOne({emailId : value}).then(user => {
                if (user) {
                    return Promise.reject('User Already Exists');
                }
            })
         }),
     check('password', 'Invalid Password')
            .isLength({ min: 6 })
     ]
    , authController.postSignUp);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getResetPassword);

router.post('/resetPassword', authController.postResetPassword);

module.exports = router;