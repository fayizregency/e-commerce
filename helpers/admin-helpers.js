var db = require("../config/connection");
var collection = require("../config/collections");
const { response } = require("express");
var objId = require("mongodb").ObjectID;
// const pattern = date.compile("YYYY-MM-DD");

module.exports = {
  getOrderReport: (date) => {
    return new Promise((resolve, reject) => {
      let startDate = date.startDate;
      let endDate = date.endDate;
      console.log(startDate + "\n" + endDate);

        // db.get().collection(collection.ORDER_COLLECTION).find({
        //   date:{
        //     $gte:ISODate(startDate),
        //     $lte:ISODate(endDate)
        //   }
        // }).toArray().then((response)=>{
        //   console.log(response);
        //   resolve(response)
        // })

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $project: {
              date: {
                $dateToString: { date: "$date", format: "%Y-%m-%d" },
              },
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
          // {
          //   $project:{
          //     amount:"amount"
          //   }
          // },
          {
            $group:{
              _id:null,
              total_orders:{
                $sum:1
              },
              total_amount:{
                $sum:"$amount"
              }
          }
        }
        ])
        .toArray()
        .then((response) => {
          console.log(response);
          resolve();
        });
    });
  },

  lastWeekOrder:(week)=>{
    return new Promise((resolve,reject)=>{
      db.get().collection(collection.ORDER_COLLECTION).find({date:{$gte:week}}).toArray().then((response)=>{
        resolve(response);
      })
    })
  }
};
