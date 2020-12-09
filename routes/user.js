const { response, json } = require("express");
var express = require("express");
var router = express.Router();
var userHelpers = require("../helpers/user-helpers");
var productHelpers = require("../helpers/product-helpers");
const nocache = require("node-nocache/nocache");
const date = require("date-and-time");
const { route } = require("../app");
const pattern = date.compile("ddd, MMM DD YYYY");
var request = require("request");
const { lchown } = require("fs");
const adminHelpers = require("../helpers/admin-helpers");
// const orderid = require('order-id')('mysecret');
/* GET home page. */
const verifyUser = (req, res, next) => {
  if (req.session.loggedIn) {
    userHelpers.getOneUser(req.session.userId).then((user) => {
      if (user.blocked == false) {
        next();
      } else if (user.blocked == true) {
        req.session.loggedIn = null;
        req.session.user = null;
        req.session.userId = null;
        res.redirect("/login");
      }
    });
  } else {
    res.redirect("/login");
  }
};

router.get("/", nocache, async function (req, res, next) {
  let cartCount = null;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.userId);
  }
  let categories = await productHelpers.getAllCategory();
  productHelpers.getProduct().then((product) => {
    let user = req.session.user;
    res.render("user/home", {
      user,
      product,
      cartCount,
      loggedIn: req.session.loggedIn,
      categories,
    });
  });
});

router.get("/login", nocache, function (req, res, next) {
  if (req.session.loggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login");
  }
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status === "match") {
      if (response.user.blocked == true) {
        req.session.blocked = true;
        res.send("blocked");
      } else {
        req.session.loggedIn = true;
        req.session.user = response.user;
        req.session.userId = response.user._id;
        res.send("success");
      }
    } else if (response.status === "missmatch") {
      res.send("missMatch");
    } else if (response.status === "invalid") {
      res.send("noUser");
    }
  });
});

router.get("/signup", function (req, res, next) {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  if (req.body.pass1 === req.body.pass2) {
    userHelpers.doSignup(req.body).then((response) => {
      if (response.status) {
        console.log("signup success");
        res.send("success");
      } else {
        console.log("signup failed");
        res.send("user");
      }
    });
  } else {
    res.send("failed");
  }
});

router.get("/view/:id", async (req, res) => {
  let id = req.params.id;
  let user = req.session.user;
  let cartCount = null;
  let categories = await productHelpers.getAllCategory();
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.userId);
  }
  productHelpers.getOneProduct(id).then((product) => {
    res.render("user/view-product", { user, product, cartCount, categories });
  });
});

router.get("/addToCart/:id", (req, res) => {
  if (req.session.loggedIn) {
    let userId = req.session.userId;
    let prodId = req.params.id;
    userHelpers.addToCart(prodId, userId).then(() => {
      res.json({ status: true });
    });
  }else{
    res.json({status:false})
  }
});
router.get("/cart", verifyUser, async (req, res) => {
  let cartCount = null;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.userId);
  }
  let totalPrice = 0;
  userHelpers.getCart(req.session.userId).then(async (products) => {
    if (products.length != 0) {
      totalPrice = await userHelpers.getTotalPrice(req.session.userId);
      res.render("user/cart", {
        user: req.session.user,
        products,
        totalPrice,
        cartCount,
      });
    } else {
      res.render("user/empty-cart", { user: req.session.user });
    }
  });
});
router.post("/changeQty", (req, res) => {
  let userId = req.body.user;
  userHelpers.changeQty(req.body).then(async () => {
    let totalPrice = await userHelpers.getTotalPrice(userId);
    res.json(totalPrice);
  });
});

router.post("/removeCart", (req, res) => {
  userHelpers.removeOneCartItem(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/checkout", verifyUser, async (req, res) => {
  let address = await userHelpers.getUserAddress(req.session.userId);
  userHelpers
    .getCart(req.session.userId)
    .then(async (products) => {
      let cartCount = await userHelpers.getCartCount(req.session.userId);
      let totalPrice = await userHelpers.getTotalPrice(req.session.userId);
      res.render("user/checkout", {
        user: req.session.user,
        products,
        totalPrice,
        cartCount,
        address,
      });
    })
    .catch((err) => {
      console.log(err);
      res.send("oops ..page not found -404");
    });
});

router.post("/placeOrder", async (req, res) => {
  console.log(req.body);
  let discount = 0;
  let parsedCoupon = parseInt(req.body.coupon_off);
  if (!Number.isNaN(parsedCoupon)) {
    discount = parsedCoupon;
  }
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = await userHelpers.getTotalPrice(req.body.userId);
  amount = totalPrice - discount;

  if (req.body.paymentMethod === "COD") {
    userHelpers.placeOrder(req.body, products, amount).then((response) => {
      userHelpers.removeCart(req.session.userId);
      res.json({ cod: response.id });
    });
  } else if (req.body.paymentMethod === "Razorpay") {
    userHelpers.placeOrder(req.body, products, amount).then((response) => {
      userHelpers
        .generateRazorpay(response.id, response.amount)
        .then((razorpay) => {
          userHelpers.removeCart(req.session.userId);
          res.json({ online: razorpay });
        })
        .catch((err) => {
          res.json({ online: false });
        });
    });
  } else if (req.body.paymentMethod === "paypal") {
    userHelpers.placeOrder(req.body, products, amount).then((response) => {
      userHelpers.removeCart(req.session.userId);
      res.json({
        paypal: {
          id: response.id,
          amount: response.amount,
        },
      });
    });
  }

  if (req.body.checked == "true") {
    //**********saving user address ***********//
    console.log(req.body.checked);
    userHelpers.saveAdress(req.body).then(() => {
      console.log("address saved");
    });
  }
  userHelpers.usedCoupon(req.session.userId, req.body.coupon);
});

router.post("/verifyPayment", (req, res) => {
  let orderId = req.body["order[receipt]"];
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("payment successfull");
        res.json({ status: orderId });
      });
    })
    .catch((err) => {
      res.json({ status: false });
    });
});

router.post("/verifyPaypal/", verifyUser, async (req, res) => {
  let orderId = req.body.orderId;
  userHelpers.changePaymentStatus(orderId).then(() => {
    res.json({ status: true });
  });
});

router.get("/orderSummary/:id", nocache, verifyUser, async (req, res) => {
  let id = req.params.id;
  let products = await userHelpers.getOrderProducts(id);
  let total = await userHelpers.getOrderTotal(id);
  let amount = await userHelpers.getOrderAmount(id);
  let productTotal = await userHelpers.getProductTotal(id);
  let offer = total - amount;

  products.forEach((element, index) => {
    element.product.price = productTotal[index].total;
  });
  userHelpers.getOrderSummary(id).then((order) => {
    order.date = date.format(order.date, pattern);
    res.render("user/order-summary", {
      user: req.session.user,
      order,
      products,
      total,
      amount,
      offer,
    });
  });
});
router.get("/myOrders", verifyUser, async (req, res) => {
  userHelpers.getUserOrders(req.session.userId).then((orders) => {
    orders.forEach((element) => {
      element.estimated_delivery = date.addDays(element.date, 7);
      element.estimated_delivery = date.format(
        element.estimated_delivery,
        pattern
      );
    });
    orders.forEach((element) => {
      element.date = date.format(element.date, pattern);
    });
    res.render("user/my-orders", { user: req.session.user, orders });
  });
});
router.get("/viewOrderProducts/:id", (req, res) => {
  let order_id = req.params.id;
  userHelpers.getOrderProducts(order_id).then((products) => {
    res.render("user/order-products", { user: req.session.user, products });
  });
});

router.get("/profile", verifyUser, async (req, res) => {
  let address = await userHelpers.getUserAddress(req.session.userId);
  userHelpers.getOneUser(req.session.userId).then((profile) => {
    profile.firstName = profile.firstName.toUpperCase();
    res.render("user/profile", { user: req.session.user, profile, address });
  });
});

router.post("/addProfilePic", (req, res) => {
  let id = req.session.userId;
  let image = req.files.file;
  image.mv("./public/user-images/" + id + ".jpg");
  res.json("response");
});

router.post("/editProfile", (req, res) => {
  userHelpers.editUser(req.session.userId, req.body).then(() => {
    res.redirect("/profile");
  });
});

router.post("/useAddress", async (req, res) => {
  let addressId = req.body.id;
  let address = await userHelpers.getOneAddress(addressId);
  res.json({ address: address });
});

router.get("/removeAddress/:id", (req, res) => {
  let address_id = req.params.id;
  userHelpers.removeOneAddress(address_id).then(() => {
    res.redirect("/profile");
  });
});

router.post("/addNewAddress", (req, res) => {
  userHelpers.saveAdress(req.body).then(() => {
    console.log("address saved");
    res.redirect("/profile");
  });
});

router.post("/editAddress", (req, res) => {
  userHelpers.getOneAddress(req.body.id).then((address) => {
    res.json({ address: address });
  });
});

router.post("/updateAddress", (req, res) => {
  userHelpers.editAddress(req.body).then(() => {
    res.redirect("/profile");
  });
});

router.get("/getCategory/:category", async (req, res) => {
  let category = req.params.category;
  let user = req.session.user;
  let categories = await productHelpers.getAllCategory();
  let cartCount = null;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.userId);
  }
  productHelpers.getOneCategory(category).then((products) => {
    res.render("user/category", { user, products, categories, cartCount });
  });
});

router.post("/ajax/isMobile", (req, res) => {
  userHelpers.checkMobile(req.body.mobile).then((response) => {
    res.json(response);
  });
});

router.post("/callOtp", (req, res) => {
  console.log(req.body.mobile);
  let user_phone = req.body.mobile;
  var options = {
    method: "POST",
    url: "https://d7networks.com/api/verifier/send",
    headers: {
      Authorization: "Token 1eb6c6a9838dd3131947522bd7a12d10715af67f",
    },
    formData: {
      mobile: "91" + req.body.mobile,
      sender_id: "SMSINFO",
      message: "Your otp code is {code}",
      expiry: "9000",
    },
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    let body = JSON.parse(response.body);
    let otp_id = body.otp_id;
    res.json({ otp_id: otp_id, user_phone: user_phone });
  });
});

router.get("/otpVerification", (req, res) => {
  res.render("user/otp-login");
});

router.post("/verifyOtp", (req, res) => {
  console.log(req.body);
  var options = {
    method: "POST",
    url: "https://d7networks.com/api/verifier/verify",
    headers: {
      Authorization: "Token 1eb6c6a9838dd3131947522bd7a12d10715af67f",
    },
    formData: {
      otp_id: req.body.otp_id,
      otp_code: req.body.otp_code,
    },
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
    let body = JSON.parse(response.body);

    if (body.status === "success") {
      userHelpers
        .getOneUserWithNumber(req.body.user_phone)
        .then((user) => {
          req.session.loggedIn = true;
          req.session.user = user;
          req.session.userId = user._id;
          res.json({ status: "success" });
        })
        .catch((err) => {
          console.log(err);
        });
    } else {
      res.json({ status: "failed", err: body.error });
    }
  });
});

router.post("/applyCoupon", (req, res) => {
  userHelpers
    .applyCoupon(req.body, req.session.userId)
    .then(async (response) => {
      if (response) {
        let total = await userHelpers.getTotalPrice(req.session.userId);
        discount = total - response.result;
        response.total = total;
        response.discount = discount;
        res.json(response);
      }
    });
});

router.get("/logout", (req, res) => {
  req.session.loggedIn = null;
  req.session.user = null;
  req.session.userId = null;
  res.json({ response: true });
});

module.exports = router;
