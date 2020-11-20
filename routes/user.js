const { response, json } = require("express");
var express = require("express");
var router = express.Router();
var userHelpers = require("../helpers/user-helpers");
var productHelpers = require("../helpers/product-helpers");
const nocache = require("node-nocache/nocache");
const date = require("date-and-time");
const pattern = date.compile("ddd, MMM DD YYYY");
// const orderid = require('order-id')('mysecret');
/* GET home page. */
const verifyUser = (req, res, next) => {
  if (req.session.loggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

router.get("/", nocache, async function (req, res, next) {
  let cartCount = null;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.userId);
  }
  let categories=await productHelpers.getAllCategory();
  productHelpers.getProduct().then((product) => {
    let user = req.session.user;
    res.render("user/home", {
      user,
      product,
      cartCount,
      loggedIn: req.session.loggedIn,
      categories
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
      req.session.loggedIn = true;
      req.session.user = response.user;
      req.session.userId = response.user._id;
      res.send("success");
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
  let categories=await productHelpers.getAllCategory();
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
  let address=await userHelpers.getUserAddress(req.session.userId);
  userHelpers.getCart(req.session.userId).then(async (products) => {
    let cartCount = await userHelpers.getCartCount(req.session.userId);
    let totalPrice = await userHelpers.getTotalPrice(req.session.userId);
    res.render("user/checkout", {
      user: req.session.user,
      products,
      totalPrice,
      cartCount,
      address
    });
  });
});
router.post("/placeOrder", async (req, res) => {
  console.log(req.body);
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = await userHelpers.getTotalPrice(req.body.userId);
  userHelpers.placeOrder(req.body, products, totalPrice).then((response) => {
    if (req.body.paymentMethod === "COD") {
      res.json({ cod: response.id });
    } else if (req.body.paymentMethod === "Razorpay") {
      userHelpers
        .generateRazorpay(response.id, response.amount)
        .then((razorpay) => {
          res.json({ online: razorpay });
        });
    } else if (req.body.paymentMethod === "paypal") {
      res.json({
        paypal: {
          id: response.id,
          amount: response.amount,
        }
      });
    }
  });

  if(req.body.checked=="true"){   //**********saving user address ***********//
    console.log(req.body.checked);
    userHelpers.saveAdress(req.body).then(()=>{
      console.log('address saved');
    })
  }
});
router.post("/verifyPayment", (req, res) => {
  let orderId = req.body["order[receipt]"];
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("payment successfull");
        // userHelpers.removeCart(req.session.userId);
        res.json({ status: orderId });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false });
    });
});

router.post('/verifyPaypal/',verifyUser, async(req,res)=>{
  let orderId=req.body.orderId;
  userHelpers.changePaymentStatus(orderId).then(()=>{
    res.json({status:true});
  })
});

router.get("/orderSummary/:id", verifyUser, async (req, res) => {
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
  userHelpers.getUserOrderProducts(req.session.userId).then((order) => {
      order.forEach(element => {
      element.date=date.format(element.date, pattern);
    });
    res.render("user/my-orders", { user: req.session.user, order });
  });
});

router.get("/profile", verifyUser, async (req, res) => {
  let address=await userHelpers.getUserAddress(req.session.userId);
  console.log(address);
  userHelpers.getOneUser(req.session.userId).then((profile) => {
    profile.firstName = profile.firstName.toUpperCase();
    profile.lastName = profile.lastName.toUpperCase();
    res.render("user/profile", { user: req.session.user, profile ,address});
  });
});
router.post("/addProfilePic", (req, res) => {
  let id = req.session.userId;
  let image = req.files.file;
  // console.log(req.files);  
  image.mv("./public/user-images/" + id + ".jpg");
  res.json("response");
});

router.post('/useAddress', async(req,res)=>{
  let addressId=req.body.id;
  let address=await userHelpers.getOneAddress(addressId);
  res.json({address:address});
});

router.get('/getCategory/:category', async(req,res)=>{
  let category=req.params.category;
  let user = req.session.user;
  let categories=await productHelpers.getAllCategory();
  let cartCount = null;
  if (req.session.loggedIn) {
    cartCount = await userHelpers.getCartCount(req.session.userId);
  }
  productHelpers.getOneCategory(category).then((products)=>{
    res.render('user/category',{user, products ,categories ,cartCount});
  })
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
