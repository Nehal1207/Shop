const path = require('path');

const express = require('express');

const isAuth = require('../middleware/isauth');

const adminController = require('../controllers/admin');

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.post('/add-product', isAuth, adminController.postAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post('/edit-product', isAuth, adminController.postEditProduct);

router.delete('/products/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
