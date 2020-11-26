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
        // req.session.blocked=false;
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
  let userId = req.session.userId;
  let prodId = req.params.id;
  userHelpers.addToCart(prodId, userId).then(() => {
    res.json({ status: true });
  });
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
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = await userHelpers.getTotalPrice(req.body.userId);

  if (req.body.paymentMethod === "COD") {
    userHelpers.placeOrder(req.body, products, totalPrice).then((response) => {
      userHelpers.removeCart(req.session.userId);
      res.json({ cod: response.id });
    });
  } else if (req.body.paymentMethod === "Razorpay") {
    userHelpers.placeOrder(req.body, products, totalPrice).then((response) => {
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
    userHelpers.placeOrder(req.body, products, totalPrice).then((response) => {
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
  let productTotal = await userHelpers.getProductTotal(id);

  products.forEach((element, index) => {
    element.product.price = productTotal[index].total;
  });
  userHelpers.getOrderSummary(id).then((order) => {
    // userHelpers.removeCart(req.session.userId);
    order.date = date.format(order.date, pattern);
    res.render("user/order-summary", {
      user: req.session.user,
      order,
      products,
      total,
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
    console.log(orders);
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
    profile.lastName = profile.lastName.toUpperCase();
    res.render("user/profile", { user: req.session.user, profile, address });
  });
});

router.post("/addProfilePic", (req, res) => {
  let id = req.session.userId;
  let image = req.files.file;
  // console.log(req.files);
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

router.post('/ajax/isMobile',(req,res)=>{
  userHelpers.checkMobile(req.body.mobile).then((response)=>{
    res.json(response);
  })
})

router.post("/callOtp", (req, res) => {
  console.log(req.body.mobile);
  var options = {
    method: "POST",
    url: "https://d7networks.com/api/verifier/send",
    headers: {
      Authorization: "Token 1eb6c6a9838dd3131947522bd7a12d10715af67f",
    },
    formData: {
      mobile: "91"+req.body.mobile,
      sender_id: "SMSINFO",
      message: "Your otp code is {code}",
      expiry: "900",
    },
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body); 
    // if(response.body.status==='open'){
      let body=JSON.parse(response.body);
      console.log('before'+ body.otp_id);
      req.session.otp_id=body.otp_id;
      console.log('after' + req.session.otp_id);
      res.json({response:true});
    // }
  });
});

router.post('/verifyOtp',(req,res)=>{
  console.log("otp code"+req.body);
  var options = {
    'method': 'POST',
    'url': 'https://d7networks.com/api/verifier/verify',
    'headers': {
      'Authorization': 'Token 1eb6c6a9838dd3131947522bd7a12d10715af67f'
    },
    formData: {
      'otp_id': toString(req.session.otp_id),
      'otp_code': req.body.otpDigit
    }
  };
  request(options, function (error, response) {
    if (error) throw new Error(error);
    console.log(response.body);
  });
});

router.get('/otpVerification',(req,res)=>{
  console.log(req.session.otp_id);
  res.render('user/otp-login');
})

router.get("/logout", (req, res) => {
  req.session.loggedIn = null;
  req.session.user = null;
  req.session.userId = null;
  res.redirect("/");
});

router.get("/sample", (req, res) => {
  res.render("user/sample");
});

module.exports = router;
