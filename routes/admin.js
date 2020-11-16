var express = require("express");
const nocache = require("node-nocache/nocache");
const { response } = require("../app");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
var userHelpers = require("../helpers/user-helpers");
const date = require('date-and-time');
const pattern = date.compile('DD- MM- YYYY');
/* GET users listing. */
const verifyAdmin = (req, res, next) => {
  if (req.session.admin) {
    next();
  } else {
    res.redirect("/admin/login");
  }
};

router.get("/", function (req, res, next) {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
  res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
  res.setHeader("Expires", "0"); // Proxies.
  if (req.session.admin) {
    res.render("admin/dash", { admin: true });
  } else {
    res.redirect("/admin/login");
  }
});

const adminName = "admin";
const adminPassword = "admin";

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

router.get("/orders", verifyAdmin, function (req, res, next) {
  userHelpers.getAllOrders().then((orders)=>{
    console.log(orders);
    // orders.date=date.format(orders.date, pattern);
    res.render("admin/orders", { admin: true, orders });
  })
});

router.get("/products", verifyAdmin, function (req, res, next) {
  productHelpers.getProduct().then((products) => {
    res.render("admin/products", { admin: true, products });
  });
});

router.get("/addProduct", verifyAdmin, function (req, res, next) {
  res.render("admin/add-product",{admin:true});
});

router.post("/addProduct", function (req, res, next) {
  let image = req.files.img;
  console.log(req.body);
  productHelpers.addProduct(req.body).then((id) => {
    image.mv("./public/product-images/" + id + ".jpg", (err) => {
      if (!err) {
        res.redirect("/admin/products");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/editProduct/:id", verifyAdmin, async function (req, res, next) {
  let prodId = req.params.id;
  let product = await productHelpers.getOneProduct(prodId);
  res.render("admin/edit-product", {admin:true, product });
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
  }else{
    res.send('failed');
  }
});

router.get("/deleteUser/:id", verifyAdmin, function (req, res, next) {
  let userId = req.params.id;
  userHelpers.deleteUser(userId).then(() => {
    res.redirect("/admin/users");
  });
});

router.get("/signout", (req, res) => {
  req.session.admin = null;
  res.redirect("/admin/login");
});
module.exports = router;
