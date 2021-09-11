const Product = require('../models/product');
const Order = require('../models/order');
//const Cart = require('../models/cart');

console.log(process.env.STRIPE_KEY);
const stripe = require('stripe')(process.env.STRIPE_KEY);

const ITEMS_PER_PAGE = 10;

const fs = require('fs');
const path = require('path');
const pdfDocument = require('pdfkit');


exports.getProducts = (req, res, next) => {

    const page = +req.query.page || 1;
    let totalProducts;
    Product.find().countDocuments().then(numberProducts => {
        totalProducts = numberProducts;

        return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    }).then(product => {

        res.render('shop/product-list', {
            prods: product,
            pageTitle: 'All Products',
            path: '/products',
            currentPage: page,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
        });

    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });

 };

exports.getProduct = (req, res, next) => {
  const prodid = req.params.productId;
    Product.findById(prodid).then(product => {
        res.render('shop/product-detail', {
            product: product,
            pageTitle: product.title,
            path: '/products'
        });
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getIndex = (req, res, next) => {
    const page = +req.query.page || 1;
    let totalProducts;
    Product.find().countDocuments().then(numberProducts => {
        totalProducts = numberProducts;

        return Product.find().skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    }).then(product => {

        res.render('shop/index', {
            prods: product,
            pageTitle: 'Shop',
            path: '/',
            currentPage: page,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
        });

    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getCart = (req, res, next) => {
    req.user.populate('cart.items.productId').execPopulate()
        .then(user => {
            //console.log(user.cart.items)
            res.render('shop/cart', {
                path: '/cart',
                pageTitle: 'Your Cart',
                products: user.cart.items
            });

        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postCart = (req, res, next) => {
    const prodId = req.body.productId;
    Product.findById(prodId).then(product => {
        return req.user.addToCart(product);
    }).then(result => {
        console.log('product added to cart');
        res.redirect('/cart');
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
    const prodId = req.body.productId;
    req.user.deleteCartItem(prodId)
        .then(result => {
            res.redirect('/cart');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getOrders = (req, res, next) => {
     req.user.getOrders()
        .then(orders => {
            res.render('shop/orders', {
                path: '/orders',
                pageTitle: 'Your Orders',
                orders: orders
            });
        })
         .catch(err => {
             const error = new Error(err);
             error.httpStatusCode = 500;
             return next(error);
         });
  
};

exports.postCreateOrder = (req, res, next) => {

    req.user.addToOrder()
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getCheckoutSuccess = (req, res, next) => {

    req.user.addToOrder()
        .then(() => {
            res.redirect('/orders');
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.getInvoice = (req, res, next) => {
    const orderId = req.params.orderId;
    const invoiceName = 'Invoice-' + orderId + '.pdf';
    const invoicePath = path.join('data', 'invoices', invoiceName);

    Order.findById(orderId).then(order => {
        if (!order) {
            return next(new Error('Order Not Found'));
        }
        if (order.userId.toString() !== req.user._id.toString()) {
            return next(new Error('Unauthorized user'));
        }

        console.log(invoiceName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline ; filename ="' + invoiceName + '"');

        const pdfDoc = new pdfDocument();

        pdfDoc.pipe(fs.createWriteStream(invoicePath));
        pdfDoc.pipe(res);

        pdfDoc.fontSize(26).text('Invoice', { underline: true });

        pdfDoc.text('------------------------------------------------------');
        pdfDoc.text(' ');

        let totalPrice = 0;

        order.products.items.forEach(prod => {

            totalPrice += prod.quantity * prod.productId.price;
            pdfDoc.fontSize(15).text(`${prod.productId.title}  -  ${prod.quantity} X Rs.${prod.productId.price}`);

        });

        pdfDoc.fontSize(26).text('------------------------------------------------------');
        pdfDoc.text(' ');
        pdfDoc.fontSize(15).text('Total Price = Rs.' + totalPrice);

        pdfDoc.end();

        //fs.readFile(invoicePath, (err, data) => {
        //    if (err) {
        //        return next(err);
        //    }
        //    res.setHeader('Content-Type', 'application/pdf');
        //    res.setHeader('Content-Disposition', 'inline ; filename ="' + invoiceName + '"');
        //    res.send(data);
        //})

        //const file = fs.createReadStream(invoicePath);
        //file.pipe(res);


    }).catch(err => next(err))

   

}

exports.getCheckout = (req, res, next) => {

    let products;
    let total = 0;
    req.user.populate('cart.items.productId').execPopulate()
        .then(user => {
            user.cart.items.forEach(prod => {
                total += prod.quantity * prod.productId.price;
            })
            products = user.cart.items;

            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: products.map(prod => {
                    return {
                        name: prod.productId.title,
                        description: prod.productId.description,
                        amount: prod.quantity * prod.productId.price,
                        currency: 'inr',
                        quantity: prod.quantity
                    }
                }),
                success_url: req.protocol + '://' + req.get('host') +'/checkout/success',
                cancel_url: req.protocol + '://' + req.get('host') + '/checkout/cancel'

            })

        })
        .then(session => {
            res.render('shop/checkout', {
                path: '/checkout',
                pageTitle: 'Checkout',
                products: products,
                totalSum: total,
                sessionId: session.id
            });
        })
        .catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });

  //res.render('shop/checkout', {
  //  path: '/checkout',
  //    pageTitle: 'Checkout',

  //});
};
