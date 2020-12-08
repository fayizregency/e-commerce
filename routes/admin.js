var express = require("express");
const nocache = require("node-nocache/nocache");
const { response } = require("../app");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
var adminHelpers = require("../helpers/admin-helpers");
const date = require("date-and-time");
const pattern = date.compile("ddd, MMM DD YYYY");
var base64ToImage = require("base64-to-image");
const numWords = require("num-words");
const { route } = require("./user");
// var fs=require('fs');
/* GET users listing. */

const verifyAdmin = (req, res, next) => {
  if (req.session.admin) {
  next();
  } else {
    res.redirect("/admin/login");
  }
};

router.get("/", async function (req, res, next) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
  res.setHeader("Expires", "0"); // Proxies.

  if (req.session.admin) {
  res.render("admin/dash", { admin: true });
  } else {
  res.redirect("/admin/login");
  }
});

router.get("/ajax/graph", (req, res) => {
  let count = [];
  var date = [];
  adminHelpers.lastMonthOrder().then((weekly_reports) => {
    weekly_reports.forEach((element) => {
      date.push(element._id.day);
      count.push(element.count);
    });
    res.json({ count: count, date: date });
  });
});

router.get("/ajax/lineChart", (req, res) => {
  let sales = [];
  var date = [];
  adminHelpers.lastMonthOrder().then((weekly_reports) => {
    weekly_reports.forEach((element) => {
      date.push(element._id.day);
      sales.push(element.amount);
    });
    res.json({ sales: sales, date: date });
  });
});

router.get('/ajax/pieChart',async(req,res)=>{
  let cancel=0;
  let pending=0;
  let placed=0;
  let report=[];
  let orders=await userHelpers.getAllOrders();
  orders.forEach((element)=>{
    if(element.shipment_status==='Not shipped'){
      pending++
    }
    else if(element.shipment_status==='Order cancelled'){
      cancel++
    }
    else if(element.shipment_status==='Order shipped'){
      placed++
    }
  })
  report.push(cancel,pending,placed)
  res.json(report)
})

const adminName = "admin";
const adminPassword = "admin@123";

router.get("/login", function (req, res, next) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
  res.setHeader("Expires", "0"); // Proxies.
  res.render("admin/admin-login");
});
router.post("/login", (req, res) => {
  if (req.body.username === adminName && req.body.password === adminPassword) {
    req.session.admin = true;
    res.redirect("/admin");
  } else {
    res.redirect("/admin/login");
  }
});

router.get("/orders",verifyAdmin, function (req, res, next) {
  userHelpers.getAllOrders().then((orders) => {
    orders.forEach((element) => {
      element.date = date.format(element.date, pattern);
    });
    res.render("admin/orders", { admin: true, orders });
  });
});

router.get("/ajax/orders", (req, res) => {
  userHelpers.getAllOrders().then((orders) => {
    res.json({ orders: orders });
  });
});

router.get("/cancelOrder/:id", (req, res) => {
  let order_id = req.params.id;
  userHelpers.cancelOrder(order_id).then(() => {
    res.redirect("/admin/orders");
  });
});

router.get("/shipOrder/:id", (req, res) => {
  let order_id = req.params.id;
  userHelpers.shipOrder(order_id).then(() => {
    res.redirect("/admin/orders");
  });
});

router.get("/shipCancelOrder/:id", (req, res) => {
  let order_id = req.params.id;
  userHelpers.shipOrder(order_id).then(() => {
    res.redirect("/admin/cancelledOrders");
  });
});

router.get("/products", verifyAdmin, function (req, res, next) {
  productHelpers.getProduct().then((products) => {
    res.render("admin/products", { admin: true, products });
  });
});

router.get("/addProduct", verifyAdmin, async function (req, res, next) {
  let category = await productHelpers.getAllCategory();
  res.render("admin/add-product", { admin: true, category });
});

router.post("/addProduct", function (req, res, next) {
  productHelpers.addProduct(req.body).then((id) => {
    var base64Str = req.body.croppedImg;
    var path = "./public/product-images/";
    var optionalObj = { fileName: id, type: "jpg" };
    base64ToImage(base64Str, path, optionalObj);
    res.redirect("/admin/products");
  });
});

router.get("/editProduct/:id", verifyAdmin, async function (req, res, next) {
  let category = await productHelpers.getAllCategory();
  let prodId = req.params.id;
  let product = await productHelpers.getOneProduct(prodId);
  res.render("admin/edit-product", { admin: true, product, category });
});

router.post("/editProduct/:id", function (req, res, next) {
  let id = req.params.id;
  productHelpers.editProduct(id, req.body).then(() => {
    res.redirect("/admin/products");
    if (req.files.img) {
      let image = req.files.img;
      image.mv("./public/product-images/" + id + ".jpg");
    }
  });
});

router.get("/deleteProduct/:id", verifyAdmin, (req, res) => {
  let prodId = req.params.id;
  productHelpers.deleteProduct(prodId).then((response) => {
    if (response) {
      res.redirect("/admin/products");
    } else {
      console.log("product delete failed");
    }
  });
});
router.get("/category", verifyAdmin, (req, res) => {
  productHelpers.getAllCategory().then((category) => {
    res.render("admin/categories", { admin: true, category });
  });
});
router.get("/addCategory", verifyAdmin, (req, res) => {
  res.render("admin/add-category", { admin: true });
});
router.post("/addCategory", (req, res) => {
  productHelpers.addToCategory(req.body).then(() => {
    res.redirect("/admin/category");
  });
});

router.get("/deleteCategory/:category", (req, res) => {
  let category = req.params.category;
  productHelpers.deleteCategory(category).then(() => {
    res.redirect("/admin/category");
  });
});

router.get("/editCategory/:id", (req, res) => {
  let id = req.params.id;
  productHelpers.getOneCategoryDocument(id).then((category) => {
    res.render("admin/edit-category", { admin: true, category });
  });
});

router.post("/editCategory/:category", (req, res) => {
  let category = req.params.category;
  productHelpers.editOneCategory(category, req.body).then(() => {
    res.redirect("/admin/category");
  });
});

router.get("/users", verifyAdmin, function (req, res, next) {
  userHelpers.getUsers().then((users) => {
    res.render("admin/users", { admin: true, users });
  });
});
router.get("/editUser/:id", verifyAdmin, function (req, res, next) {
  let userId = req.params.id;
  userHelpers.getOneUser(userId).then((userOne) => {
    res.render("admin/edit-user", { userOne });
  });
});
router.post("/editUser/:id", function (req, res, next) {
  let userId = req.params.id;
  userHelpers.editUser(userId, req.body).then((response) => {
    if (response) {
      res.redirect("/admin/users");
    } else {
      console.log("edit failed");
    }
  });
});
router.get("/addUser", verifyAdmin, function (req, res, next) {
  res.render("admin/add-user");
});
router.post("/addUser", function (req, res, next) {
  if (req.body.pass1 === req.body.pass2) {
    userHelpers.doSignup(req.body).then((response) => {
      if (response.status) {
        res.send("success");
      } else {
        res.send("user");
      }
    });
  } else {
    res.send("failed");
  }
});

router.get("/deleteUser/:id", verifyAdmin, function (req, res, next) {
  let userId = req.params.id;
  userHelpers.deleteUser(userId).then(() => {
    res.redirect("/admin/users");
  });
});

router.get("/reports",verifyAdmin, async (req, res) => {
  let product_count = await productHelpers.getTotalNumberOfProducts();
  let user_count = await userHelpers.getTotalNoOfUsers();
  let category_count = await productHelpers.getTotalNoOfCategory();
  let userInWords = numWords(user_count);
  let productInWords = numWords(product_count);
  let categoryInWords = numWords(category_count);

  res.render("admin/reports", {
    admin: true,
    product_count,
    user_count,
    category_count,
    userInWords,
    productInWords,
    categoryInWords,
    
  });
});

router.post("/ordersByPeriod",verifyAdmin, (req, res) => {
  let key = req.body;
  adminHelpers.getLastWeek(key).then((response) => {
    res.json({ orders: response });
  });
});

router.get('/salesReport',verifyAdmin, (req,res)=>{
  res.render('admin/sales-report',{admin:true})
});

router.get('/orderReport', verifyAdmin,(req,res)=>{
  res.render('admin/order-reports',{admin:true});
});

router.get('/cancelledOrders',verifyAdmin, async(req,res)=>{
  let cancel_orders = await adminHelpers.getCancelOrders();
  res.render('admin/cancelled-orders',{admin:true, cancel_orders})
})

router.post("/ajax/reports", async (req, res) => {
  let fullOrders= await adminHelpers.getFullOrderReports(req.body);
  adminHelpers.getOrderReport(req.body).then((reports) => {
    res.json({ reports: reports, fullOrders: fullOrders });
  });
});

router.post("/blockUser", (req, res) => {
  adminHelpers
    .blockUser(req.body.id, req.body.key)
    .then((response) => {
      res.json({ blocked: response.blocked  });
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get('/ajax/blockUser', async(req,res)=>{
  let all_users = await userHelpers.getUsers();
  res.json({ "users": all_users})
});

router.get('/coupenCodes',verifyAdmin, async(req,res)=>{
  let coupens=await adminHelpers.getAllCoupens();
  res.render('admin/coupen-code', {admin:true, coupens});
});

router.post('/addCoupen',verifyAdmin,(req,res)=>{
  adminHelpers.addCoupens(req.body).then(()=>{
    res.redirect('/admin/coupenCodes');
  })
});

router.get('/editCoupen/:id',(req,res)=>{
  let id=req.params.id;
  adminHelpers.getOneCoupen(id).then((coupen)=>{
    res.json(coupen);
  })
});

router.post('/editCoupen',(req,res)=>{
  adminHelpers.editCoupen(req.body).then(()=>{
    res.redirect('/admin/coupenCodes');
  })
});

router.get('/deleteCoupon/:id',(req,res)=>{
  adminHelpers.deleteCoupon(req.params.id).then(()=>{
    res.redirect('/admin/coupenCodes');
  })
})

router.get('/offers',verifyAdmin, async(req,res)=>{
  let products=await productHelpers.getProduct();
  let category=await productHelpers.getAllCategory();
  res.render('admin/product-offer',{admin:true, products,category});
});

router.get("/signout", (req, res) => {
  req.session.admin = null;
  res.redirect("/admin/login");
});
module.exports = router;
