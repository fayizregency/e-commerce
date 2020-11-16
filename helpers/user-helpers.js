var db = require("../config/connection");
var collection = require("../config/collections");
var objId = require("mongodb").ObjectID;
const bcrypt = require("bcrypt");
const { response } = require("express");

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find({ email: userData.email })
        .toArray()
        .then(async (data) => {
          if (data.length != 0) {
            resolve({ status: false });
          } else {
            userData.pass1 = await bcrypt.hash(userData.pass1, 10);
            db.get()
              .collection(collection.USER_COLLECTION)
              .insertOne({
                firstName: userData.fname,
                lastName: userData.lname,
                email: userData.email,
                password: userData.pass1,
              })
              .then(() => {
                resolve({ status: true });
              });
          }
        });
    });
  },
  doLogin: (userData) => {
    return new Promise((resolve, reject) => {
      let response = {};
      db.get()
        .collection(collection.USER_COLLECTION)
        .findOne({ email: userData.email })
        .then(async (user) => {
          if (user) {
            await bcrypt
              .compare(userData.password, user.password)
              .then((status) => {
                console.log(status);
                if (status) {
                  response.user = user;
                  response.status = "match";
                  console.log("password matched");
                  resolve(response);
                } else {
                  console.log("psw didnt match");
                  resolve({ status: "missmatch" });
                }
              });
          } else {
            console.log("user didnt exist");
            resolve({ status: "invalid" });
          }
        });
    });
  },
  getUsers: () => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray()
        .then((data) => {
          resolve(data);
        });
    });
  },
  getOneUser: (userId) => {
    return new Promise(async (resolve, reject) => {
      await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objId(userId) })
        .then((user) => {
          resolve(user);
        });
    });
  },
  editUser: (userId, userData) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objId(userId) },
          {
            $set: {
              firstName: userData.fname,
              lastName: userData.lname,
              email: userData.email,
            },
          }
        )
        .then((data) => {
          resolve(data);
        });
    });
  },
  deleteUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .remove({ _id: objId(userId) })
        .then((result) => {
          resolve(result);
        });
    });
  },
  addToCart: (prodId, userId) => {
    let prodObj={
      item:objId(prodId),
      quantity:1
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objId(userId) });
      if (userCart) {
        let prodExist=userCart.products.findIndex(product=> product.item==prodId);
        // console.log(prodExist);
        if(prodExist !=-1){
          db.get().collection(collection.CART_COLLECTION).updateOne({user:objId(userId),'products.item':objId(prodId)},
          {
            $inc:{'products.$.quantity':1}
          }).then(()=> {
            resolve();
          })
        }else{
        db.get().collection(collection.CART_COLLECTION).updateOne({ user: objId(userId) },
              {
                $push: {products: prodObj}
              }).then((response)=>{
              resolve();
            })
        }
      } else {
        let cartObj = {
          user: objId(userId),
          products: [prodObj]
        };
        db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
            resolve();
          });
      }
    });
  },
  getCart:(userId)=>{
    return new Promise(async(resolve, reject)=>{
      let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match:{user:objId(userId)}
        },
        {
          $unwind:"$products"
        },
        {
          $project:{
            item:'$products.item',
            quantity:'$products.quantity'
          }
        },
        { 
          $lookup:{
            from:collection.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:"product"
          }
        },
        {
          $project:{
            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
          }
        }
      ]).toArray();
      resolve(cartItems); 
    })
  },
  getCartCount: (userId)=>{
    return new Promise(async(resolve,reject)=>{
      let count=0;
      let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objId(userId)})
      if(cart){
        count=cart.products.length;
      }
      resolve(count);
    })
  },
  changeQty:(data)=>{
    let quantity=parseInt(data.quantity);
    let count=parseInt(data.count);
    return new Promise ((resolve, reject)=>{
      db.get().collection(collection.CART_COLLECTION).updateOne({_id:objId(data.cart),'products.item':objId(data.product)},
      {
        $inc:{'products.$.quantity':count}
      }).then(()=>{
        resolve(response);
      })
    })
  },
  removeOneCartItem:(data)=>{
    return new Promise ((resolve,reject)=>{
      db.get().collection(collection.CART_COLLECTION).updateOne({_id:objId(data.cart)},
      {
        $pull:{products:{item:objId(data.product)}}
      }).then((status)=>{
        resolve(status)
      })
    })
  },
  getTotalPrice:(userId)=>{
    return new Promise (async(resolve, reject)=>{
      let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
        {
          $match:{user:objId(userId)}
        },
        {
          $unwind:"$products"
        },
        {
          $project:{
            item:'$products.item',
            quantity:'$products.quantity'
          }
        },
        { 
          $lookup:{
            from:collection.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:"product"
          }
        },
        {
          $project:{
            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
          }
        },
        {
          $group:{
            _id:null,
            total:{$sum:{$multiply:['$quantity','$product.price']}}
          }
        }
      ]).toArray();
      resolve(total[0].total);
    })
  },
  getCartProductList:(userId)=>{
    return new Promise(async(resolve,reject)=>{
      let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objId(userId)});
      resolve(cart.products);
    })
  },
  placeOrder:(data, products, totalPrice)=>{
    return new Promise((resolve,reject)=>{
      let status=data.paymentMethod==='COD'?'placed':'pending'; 
      let orderObj={
        deliveryDetails:{
          name:data.name,
          address:data.address,
          phone:data.mobile,
          pin:data.pin
        },
        userId:objId(data.userId),
        paymentMethod:data.paymentMethod,
        amount:totalPrice,
        products:products,
        status:status,
        date:new Date()
      };
      db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
        db.get().collection(collection.CART_COLLECTION).removeOne({user:objId(data.userId)});
        resolve(response.ops[0]._id);
      })
    })
  },
  getOrderTotal:(orderId)=>{
    return new Promise (async(resolve, reject)=>{
      let total=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match:{_id:objId(orderId)}
        },
        {
          $unwind:"$products"
        },
        {
          $project:{
            item:'$products.item',
            quantity:'$products.quantity'
          }
        },
        { 
          $lookup:{
            from:collection.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:"product"
          }
        },
        {
          $project:{
            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
          }
        },
        {
          $group:{
            _id:null,
            total:{$sum:{$multiply:['$quantity','$product.price']}}
          }
        }
      ]).toArray();
      resolve(total[0].total);
    })
  },
  getProductTotal:(orderId)=>{
    return new Promise (async(resolve, reject)=>{
      let productTotal=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match:{_id:objId(orderId)}
        },
        {
          $unwind:"$products"
        },
        {
          $project:{
            item:'$products.item',
            quantity:'$products.quantity'
          }
        },
        { 
          $lookup:{
            from:collection.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:"product"
          }
        },
        {
          $project:{
            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
          }
        },
        {
          $project:{
            _id:null,
            total:{$sum:{$multiply:['$quantity','$product.price']}}
          }
        }
      ]).toArray();
      resolve(productTotal);
    })
  },
  getOrderSummary:(orderId)=>{
    return new Promise(async(resolve, reject)=>{
      let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objId(orderId)});
      resolve(order);
    })
  },
  getOrderProducts:(orderId)=>{
    return new Promise(async(resolve, reject)=>{
      let orderProducts=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match:{_id:objId(orderId)}
        }, 
        {
          $unwind:"$products"
        },
        {
          $project:{
            item:'$products.item',
            quantity:'$products.quantity'
          }
        },
        { 
          $lookup:{
            from:collection.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:"product"
          }
        },
        {
          $project:{
            item:1, quantity:1, product:{$arrayElemAt:['$product',0]}
          }
        }
      ]).toArray(); 
      resolve(orderProducts);
    })
  },
  getUserOrderProducts:(userId)=>{
    return new Promise(async(resolve, reject)=>{
      let orderProducts=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        {
          $match:{userId:objId(userId)}
        }, 
        {
          $unwind:"$products"
        },
        {
          $project:{
            deliveryDetails:'$deliveryDetails',
            date:'$date',
            item:'$products.item',
            quantity:'$products.quantity'
          }
        },
        { 
          $lookup:{
            from:collection.PRODUCT_COLLECTION,
            localField:'item',
            foreignField:'_id',
            as:"product"
          }
        },
        {
          $project:{
            deliveryDetails:1,date:1, quantity:1, product:{$arrayElemAt:['$product',0]}
          }
        }
      ]).toArray();
      resolve(orderProducts);
    })
  },
  getAllOrders:()=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ORDER_COLLECTION).find().toArray().then((orders)=>{
        resolve(orders);
      })
    })
  }
};
