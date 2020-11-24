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
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $project: {
              date: {
                $dateToString: { date: "$date", format: "%Y-%m-%d" },
              },
            },
            "$group":{
                date:"$date"
            }
            // $match: {
            //   $date: {
            //     $gte: startDate,
            //     // $lte:endDate
            //   },
            // },
          }
        ])
        .toArray()
        .then((response) => {
          console.log(response);
          resolve();
        });
    });
  },
};
