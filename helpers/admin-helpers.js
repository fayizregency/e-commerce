var db = require("../config/connection");
var collection = require("../config/collections");
const { response } = require("express");
const { Code } = require("mongodb");
var objId = require("mongodb").ObjectID;
// const pattern = date.compile("YYYY-MM-DD");

module.exports = {
  getOrderReport: (date) => {
    return new Promise((resolve, reject) => {
      let startDate = date.startDate;
      let endDate = date.endDate;
      // console.log(startDate + "\n" + endDate);
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $project: {
              date: {
                $dateToString: { date: "$date", format: "%Y-%m-%d" },
              },
              products: 1,
              amount: 1,
            },
          },
          {
            $match: {
              date: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: date,
              total_orders: {
                $sum: 1,
              },
              total_amount: {
                $sum: "$amount",
              },
              total_products: {
                $sum: { $size: "$products" },
              },
            },
          },
        ])
        .toArray()
        .then((response) => {
          resolve(response[0]);
        });
    });
  },
  lastWeekOrder: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)

        .aggregate([
          {
            $match: {
              date: { $gte: new Date(new Date() - 30 * 60 * 60 * 24 * 1000) },
            },
          },

          {
            $project: {
              _id: 1,
              date: 1,
              amount: 1,
            },
          },
          {
            $group: {
              _id: {
                month: { $month: "$date" },
                day: { $dayOfMonth: "$date" },
                year: { $year: "$date" },
              },
              amount: { $sum: { $multiply: ["$amount", 1] } },
              count: { $sum: 1 },
            },
          },
          {
            $sort:{_id:1}
          },
          
        ])

        .toArray()
        .then((response) => {
          // console.log(response)
          resolve(response);
        });
    });
  },
  getLastWeek: (key) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)

        .aggregate([
          {
            $match: {
              date: { $gte: new Date(new Date() - key * 60 * 60 * 24 * 1000) },
            },
          },
        ])

        .toArray()
        .then((response) => {
          resolve(response);
        });
    });
  },
  getCancelOrders: () => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .find({ shipment_status: "Order cancelled" })
        .toArray()
        .then((orders) => {
          resolve(orders);
        });
    });
  },
  blockUser: (id, key) => {
    return new Promise((resolve, reject) => {
      if (key === "block") {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: objId(id) },
            {
              $set: {
                blocked: true,
              },
            }
          )
          .then(() => {
            resolve({blocked:true});
          })
          .catch((err) => {
            console.log(err);
            reject();
          });
      } else {
        db.get()
          .collection(collection.USER_COLLECTION)
          .updateOne(
            { _id: objId(id) },
            {
              $set: {
                blocked: false,
              },
            }
          )
          .then(() => {
            resolve({blocked:false});
          })
          .catch((err) => {
            console.log(err);
            reject();
          });
      }
    });
  },
  addCoupens:(data)=>{
    console.log(data);
    return new Promise((resolve, reject)=>{
      db.get().collection(collection.COUPEN_COLLECTION).insertOne(
        {
          coupenCode:data.coupen_code,
          offer:data.offer,
          expDate:data.exp_time
        }
      ).then(()=>{
        resolve();
      }).catch((err)=>{
        console.log(err);
      })
    })
  },
  getAllCoupens:()=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.COUPEN_COLLECTION).find().toArray().then((coupens)=>{
        resolve(coupens);
      }).catch((err)=>{
        console.log(err);
        reject();
      })
    })
  },
  getOneCoupen:(id)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.COUPEN_COLLECTION).findOne({_id:objId(id)}).then((coupen)=>{
        resolve(coupen);
      })
    })
  },
  editCoupen:(data)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.COUPEN_COLLECTION).updateOne({_id:objId(data.coupen_id)},
      {
        $set:{
          coupenCode:data.coupen_code,
          offer:data.offer,
          expDate:data.exp_time
        }
      }).then(()=>{
        resolve();
      })
    })
  }
};
