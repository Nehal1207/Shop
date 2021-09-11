const Product = require('../models/product');
//const mongodb = require('mongodb');

const ITEMS_PER_PAGE = 10;

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
      editing: false
  });
};


exports.postAddProduct = (req, res, next) => {

  const title = req.body.title;
  const imageUrl = req.body.imageUrl;
  const price = req.body.price;
    const description = req.body.description;

    const product = new Product({
        title: title,
        price: price,
        description: description,
        imageUrl: imageUrl,
        userId: req.user._id
    });

    product.save()
    .then(result => {
        console.log('Created Product');
        return res.redirect('/admin/products');
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
    const prodId = req.params.productId;
    Product.findById(prodId)
        .then(product => {
            //const product = products[0];
            if (!product) {
            return res.redirect('/');
        }
        res.render('admin/edit-product', {
            pageTitle: 'Edit Product',
            path: '/admin/edit-product',
            editing: editMode,
            product: product
        });
        }).catch(err => {
            const error = new Error(err);
            error.httpStatusCode = 500;
            return next(error);
        });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
    const updatedDesc = req.body.description;

    const updatedImage = req.file;


    return Product.findById(prodId).then(product => {
        if (product.userId.toString() !== req.user._id.toString()) {
            return res.redirect('/');
        }

        product.title = updatedTitle;
        product.price = updatedPrice;
        product.description = updatedDesc;
        if (updatedImage) {
            fileHelper.deleteFile(product.ImageUrl);
            product.imageUrl = updatedImage.path;
        }

        product.save().then(result => {
            res.redirect('/admin/products');
        });
    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });
  
};

exports.getProducts = (req, res, next) => {

    const page = +req.query.page || 1;
    let totalProducts;
    Product.find({ userId: req.user._id }).countDocuments().then(numberProducts => {
        totalProducts = numberProducts;

        return Product.find({ userId: req.user._id }).skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
    }).then(product => {

        res.render('admin/products', {
            prods: product,
            pageTitle: 'Admin Products',
            path: '/admin/products',
            currentPage: page,
            lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE)
        });

    }).catch(err => {
        const error = new Error(err);
        error.httpStatusCode = 500;
        return next(error);
    });

};

exports.deleteProduct = (req, res, next) => {
    const prodId = req.params.productId;

    Product.findById(prodId).then(product => {
        if (!product) {
            throw new Error('No Product Found!!');
        }
        return Product.deleteOne({ _id: prodId, userId: req.user._id }).then(result => {
            console.log('Product Deleted');
            res.json({message : 'Success'});
        })
    }).catch(err => { res.json({ message: 'Failed' }); });

    
};
