const User = require('../models/user');

const crypto = require('crypto');

const bcrypt = require('bcryptjs');

const nodemailer = require('nodemailer');

const sendgrid = require('nodemailer-sendgrid-transport');

const { validationResult } = require('express-validator/check');

const transporter = nodemailer.createTransport(sendgrid({
    auth: {
        api_key: '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'
    }
    
}));

exports.getLogin = (req, res, next) => {

    res.render('auth/login', {
        pageTitle: 'Login',
        path: '/login',
        error: '',
        oldInput: {
            email: '',
            password: ''
        }
    });

}

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);

    User.findOne({ emailId: email })
        .then(user => {
            if (!errors.isEmpty()) {
                return res.status(422).render('auth/login', {
                    pageTitle: 'Login',
                    path: '/login',
                    error: errors.array()[0].msg,
                    oldInput: {
                        email: email,
                        password: password
                    }
                })
            }
            //bcrypt.compare(password, user.password).then(matches => {
            //    if (matches) {
            req.session.isLogedIn = true;
            req.session.user = user;
            return res.redirect('/');
            //    }
            //    req.flash('errorMessage','Invalid Password')
            //    res.redirect('/login');

            //})
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
    
}

exports.postLogout = (req, res, next) => {
    req.session.destroy(() => {
        res.redirect('/');
    })
}

exports.getSignUp = (req, res, next) => {
    res.render('auth/signup', {
        pageTitle: 'Sign Up',
        path: '/signup',
        error: '',
        oldInput: {
            email: '',
            password: '',
            confirmPassword : ''
        }
    });
}

exports.postSignUp = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    const errors = validationResult(req);
    //console.log(errors);
    if (!errors.isEmpty()) {
         return res.status(422).render('auth/signup', {
            pageTitle: 'sign up',
            path: '/signup',
             error: errors.array()[0].msg,
             oldInput: {
                 email: email,
                 password: password,
                 confirmPassword : confirmPassword
             }
        });
    }
    //User.findOne({ emailId: email })
    //    .then(user => {
    //        if (user) {
    //            req.flash('errorMessage', 'User Already Exists');
    //            return res.redirect('/signup');
    //        }

    //        if (password !== confirmPassword) {
    //            req.flash('errorMessage', 'Passwords Don\'t match');
    //            return res.redirect('/signup');
    //        }
            

    bcrypt.hash(password, 12).then(hashedPassword => {
                const userr = new User({
                    emailId: email,
                    password: hashedPassword,
                    cart: { items: [] }
                })
                return userr.save();
            })
                .then(() => {
                    res.redirect('/login');
                    return transporter.sendMail({
                        to: email,
                        from: 'meshramnehalclaret1415@gmail.com',
                        subject: 'Successfull Singup',
                        html: '<h1>Signed Up Successfully</h1>'
                    }).catch(err => { console.log(err) });

                }).catch(err => {
                    const error = new Error(err);
                    error.httpStatusCode = 500;
                    return next(error);
                })
            
//        })
        
//.catch(err => { console.log(err) })
}

exports.getReset = (req, res, next) => {
    const error = req.flash('errorMessage');
    let err;
    if (error.length > 0) {
        err = error[0];
    }
    else err = null;

    res.render('auth/reset', {
        pageTitle: 'Reset Password',
        path: '/reset',
        error: err
    });

}

exports.postReset = (req, res, next) => {
    const email = req.body.email;
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            return res.redirect('/login');
        }
        const token = buffer.toString('hex');
        User.findOne({ emailId: email }).then(user => {
            if (!user) {
                req.flash('errorMessage', 'Invalid Email');
                return res.redirect('/reset');
            }

            user.resetToken = token;
            user.resetTokenExpiry = Date.now() + 3600000;
            return user.save().then(result => {
                res.redirect('/login')
                return transporter.sendMail({
                    to: email,
                    from: 'meshramnehalclaret1415@gmail.com',
                    subject: 'Password Reset',
                    html: `
                            <div>
                                <a href="http://localhost:3000/reset/${token}">
                                    Click Here To reset Password
                                </a>
                            </div>
                          `
                })
            }).catch(err => { console.log(err) });
        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

    })
    
}

exports.getResetPassword = (req, res, next) => {

    const error = req.flash('errorMessage');
    let err;
    if (error.length > 0) {
        err = error[0];
    }
    else err = null;

    const token = req.params.token;

    User.findOne({ resetToken: token, resetTokenExpiry: { $gt: Date.now() } }).then(user => {
        if (!user) {
            return res.redirect('/login');
        }
        res.render('auth/resetPassword', {
            pageTitle: 'Reset Password',
            path: '/reset/:token',
            error: err,
            token: token,
            user: user._id.toString()
        });

    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
    
}

exports.postResetPassword = (req, res, next) => {
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const resetToken = req.body.resetToken;
    if (confirmPassword !== password) {
        req.flash('errorMessage', 'Passwords Dont Match');
        return res.redirect('/reset/:resetToken');
    }
    User.findOne({ resetToken: resetToken, resetTokenExpiry: { $gt: Date.now() }, _id: req.body.userId }).then(user => {
        bcrypt.hash(password, 12).then(hashedPassword => {
            user.password = hashedPassword;
            user.resetToken = undefined;
            user.resetTokenExpiry = undefined;
            return user.save();
        });


    }).then(() => {
        res.redirect('/login');
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
}
