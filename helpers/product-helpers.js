var db=require('../config/connection');
var collection=require('../config/collections');
const { response } = require('express');
var objId=require('mongodb').ObjectID;
module.exports={
    addProduct: (product)=> {
        return new Promise ((resolve,reject) =>{
            product.productPrice=parseInt(product.productPrice)
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne({
                product:product.productName,
                description:product.productDescription,
                price:product.productPrice,
                category:product.category,
                qty:product.qty
            }).then((data)=>{
                resolve(data.ops[0]._id);
            })
        })
    },
    getProduct: ()=> {
        return new Promise(async (resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
        })
    },
    getOneProduct:(prodId)=>{
        return new Promise (async (resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objId(prodId)}).then((product)=>{
                resolve(product);
            })
        })
    },
    editProduct: (prodId, data)=>{
        return new Promise((resolve,reject)=> {
            data.productPrice=parseInt(data.productPrice);
            console.log(data.productPrice);
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objId(prodId)},{
                $set:{
                    product:data.productName,
                    description:data.productDescription,
                    price:data.productPrice,
                    category:data.category,
                    qty:data.qty
                }
            }).then((data)=>{
                resolve(data);
            })
        })
    },
    deleteProduct: (prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objId(prodId)}).then((response)=>{
                resolve(response);
            })
        })
    },
    addToCategory:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).insertOne({productId:prodId}).then((response)=>{
                resolve(response);
            })
        })
    }
}