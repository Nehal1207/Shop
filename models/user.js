const mongoose = require('mongoose');

const Product = require('./product');
const Order = require('./order');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    emailId: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: {
        type : String
    },
    resetTokenExpiry: {
        type: Date
    },
    cart: {
        items: [{
            productId: {
                type: Schema.Types.ObjectId,
                ref: 'Product',
                required: true
            },
            quantity: {
                type: Number,
                required: true
            }
        }]
    }
});

userSchema.methods.addToCart = function (product) {

    const cartItemIndex = this.cart.items.findIndex((cp) => {
            return cp.productId.toString() === product._id.toString();
        });

        const updatedCartItem = [...this.cart.items];

        if (cartItemIndex>=0) {
            updatedCartItem[cartItemIndex].quantity += 1;
        }
        else {
            updatedCartItem.push({ productId: { ...product }, quantity: 1 })
        }
    const updatedCart = { items: updatedCartItem };
    this.cart = updatedCart;
    return this.save();

}

userSchema.methods.deleteCartItem = function (prodId) {
    const updatedCartItems = this.cart.items.filter(p => {
            return p.productId.toString() !== prodId.toString();
    })
    this.cart.items = updatedCartItems;
    return this.save();

}

userSchema.methods.addToOrder = function () {

        return this.populate('cart.items.productId').execPopulate().then(user => {
            const produ = user.cart.items.map(i => {
                //console.log(i.productId)
                return {
                    quantity: i.quantity,
                    
                    productId: { ...i.productId._doc }
                }
            })
            const order = new Order({
                products: {
                    items: produ
                },
                userId: this._id
            })

            return order.save().then(result => {
                this.cart = { items: [] };
                return this.save();
            }).catch(err => { console.log(err) });

        }).catch(err => { console.log(err) });

}

userSchema.methods.getOrders = function () {

    return Order.find({ userId: this.id }).then(result => {
         //console.log(result);
        return result.map(i => {
            return { orderId: i._id, prods: i.products.items } ;
        });
        }).catch(err => { console.log(err) });

}

module.exports = mongoose.model('User', userSchema);



//const mongodb = require('mongodb');
//const getDb = require('../util/database').getDb;


//class User {
//    constructor(userName, emailId,cart,id) {
//        this.userName = userName;
//        this.emaiId = emailId;
//        this.cart = cart;
//        this._id = id;
//    }

//    save() {
//        const db = getDb();
//        return db.collection('users').insertOne(this)
//            .then(result => { console.log('User Created') })
//            .catch(err => { console.log(err) });
//    }

//    getCart() {
//        const db = getDb();
//        const productsId = this.cart.item.map(i => {
//            return i.productId;
//        })
//        return db.collection('products').find({ _id: { $in: productsId } }).toArray().then(products => {

//            return products.map(i => {
//                return {
//                    ...i, quantity: this.cart.item.find(k => { return k.productId.toString() === i._id.toString() }).quantity
//                }
//            })
//        });//.catch(err => { console.log(err) });
//    }

//    addToOrder() {
//        const db = getDb();
//        return this.getCart().then(products => {

//            const order = {
//                products: products,
//                user: {
//                    _id: this._id,
//                    name: this.userName
//                }
//            }

//            return db.collection('orders').insertOne(order).then(result => {
//                this.cart = { item: [] };
//                return db.collection('users').updateOne({ _id: new mongodb.ObjectId(this._id) }, { $set: { cart: { item: [] } } });
//            }).catch(err => { console.log(err) });

//        }).catch(err => { console.log(err) });
        
//    }

//    getOrders() {
//        const db = getDb();
//        return db.collection('orders').find({ 'user._id' : new mongodb.ObjectId(this._id) }).toArray().then(result => {
//            return result;
//        }).catch(err => { console.log(err) });
//    }

//    addToCart(product) {
//        const cartItemIndex = this.cart.item.findIndex((cp) => {
//            return cp.productId.toString() === product._id.toString();
//        });

//        const updatedCartItem = [...this.cart.item];

//        if (cartItemIndex>=0) {
//            updatedCartItem[cartItemIndex].quantity += 1;
//        }
//        else {
//            updatedCartItem.push({ productId: new mongodb.ObjectId(product._id), quantity: 1 })
//        }
//        const updatedCart = { item : updatedCartItem };
//        const db = getDb();
//        return db.collection('users').updateOne({ _id: new mongodb.ObjectId(this._id) }, { $set: { cart:  updatedCart } });
//    }

//    deleteCartItem(prodId) {
//        const updatedCartItems = this.cart.item.filter(p => {
//            return p.productId.toString() !== prodId.toString();
//        })
//        const db = getDb();
//        return db.collection('users').updateOne({ _id: new mongodb.ObjectId(this._id) }, { $set: { cart: { item: updatedCartItems } } });
//    }

//    static findId(userId) {
//        const db = getDb();
//        return db.collection('users').findOne({ _id: new mongodb.ObjectId(userId) })
//            .then(result => { return result })
//            .catch(err => { console.log(err) });
//    }
//}

//module.exports = User;