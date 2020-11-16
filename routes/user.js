const { response } = require("express");
var express = require("express");
var router = express.Router();
var userHelpers = require("../helpers/user-helpers");
var productHelpers= require('../helpers/product-helpers');
const nocache = require("node-nocache/nocache");
const date = require('date-and-time');
const pattern = date.compile('ddd, MMM DD YYYY');
// const orderid = require('order-id')('mysecret');
/* GET home page. */
const verifyUser=(req,res,next)=>{
  if(req.session.loggedIn){
    next();
  } else{
    res.redirect('/login');
  }
}

router.get("/",nocache,async function (req, res, next) {
  let cartCount=null;
  if(req.session.loggedIn) {
  cartCount=await userHelpers.getCartCount(req.session.userId);
  }
  productHelpers.getProduct().then((product)=>{
    let user=req.session.user;
    res.render("user/home", { user, product, cartCount, 'loggedIn':req.session.loggedIn});
  })
});

router.get("/login",nocache, function (req, res, next) {
  if(req.session.loggedIn){
    res.redirect('/');
  }else{
  res.render("user/login");
  }
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status==='match'){
      req.session.loggedIn=true;
      req.session.user=response.user;
      req.session.userId=response.user._id;
      res.send('success');
    }else if(response.status==='missmatch'){
      res.send('missMatch');
    }else if(response.status==='invalid'){
      res.send('noUser');
    }
  })
});

router.get("/signup", function (req, res, next) {
  res.render("user/signup");
});

router.post("/signup", (req, res) => {
  if (req.body.pass1 === req.body.pass2) {
    userHelpers.doSignup(req.body).then((response) => {
      if (response.status) {
        console.log('signup success');
        res.send('success');
      } else {
        console.log("signup failed");
        res.send('user');
      }
    });
  }else {
    res.send("failed");
  }
});

router.get('/view/:id', (req,res)=>{
  let id=req.params.id;
  let user=req.session.user;
  productHelpers.getOneProduct(id).then((product)=>{
    res.render('user/view-product', {user, product});
  })
})

router.get('/addToCart/:id',(req,res)=>{
  let userId=req.session.userId;
  let prodId=req.params.id;
  userHelpers.addToCart(prodId,userId).then(()=>{
    res.json({status:true});
  })
});
router.get('/cart',verifyUser,(req,res)=>{
  let totalPrice=0;
  userHelpers.getCart(req.session.userId).then(async(products)=>{
    if(products.length !=0){
      totalPrice=await userHelpers.getTotalPrice(req.session.userId);
      res.render("user/cart", { "user":req.session.user ,products, totalPrice});
    }else{
      res.render('user/empty-cart',{'user':req.session.user})
  }
})
});
router.post('/changeQty',(req,res)=>{ 
  let userId=req.body.user;
  userHelpers.changeQty(req.body).then(async()=>{
    let totalPrice=await userHelpers.getTotalPrice(userId);
    res.json(totalPrice);
  })
});
router.post('/removeCart',(req,res)=>{
  userHelpers.removeOneCartItem(req.body).then((response)=>{
    res.json(response);
  })
});
router.get('/checkout',verifyUser,async(req,res)=>{
  userHelpers.getCart(req.session.userId).then(async(products)=>{
      let cartCount=await userHelpers.getCartCount(req.session.userId);
      let totalPrice=await userHelpers.getTotalPrice(req.session.userId);
      res.render('user/checkout', { "user":req.session.user ,products, totalPrice, cartCount});
  })
});
router.post('/placeOrder', async(req,res)=>{
  // console.log(req.body);
  let products=await userHelpers.getCartProductList(req.body.userId);
  let totalPrice=await userHelpers.getTotalPrice(req.body.userId);
  userHelpers.placeOrder(req.body, products, totalPrice).then((id)=>{
    res.json({status:id});
  })
});
router.get('/orderSummary/:id',verifyUser, async(req, res)=>{
  let id=req.params.id;
  let products=await userHelpers.getOrderProducts(id);
  let total=await userHelpers.getOrderTotal(id);
  let productTotal=await userHelpers.getProductTotal(id);

  products.forEach((element,index) => {
    element.product.price=productTotal[index].total;
  });
  userHelpers.getOrderSummary(id).then((order)=>{
    console.log(order);
    order.date=date.format(order.date , pattern);
    res.render('user/order-summary',{'user':req.session.user, order , products, total});
  })
});
router.get('/myOrders',verifyUser, async(req,res)=>{
    userHelpers.getUserOrderProducts(req.session.userId).then((order)=>{
      // order.date=date.format(order.date , pattern);
      res.render('user/my-orders',{'user':req.session.user, order});
    })
});

router.get('/profile',verifyUser, async(req,res)=>{
  userHelpers.getOneUser(req.session.userId).then((profile)=>{
    profile.firstName=profile.firstName.toUpperCase();
    profile.lastName=profile.lastName.toUpperCase();
    res.render('user/profile',{'user':req.session.user, profile});
  })
});
router.post('/addProfilePic',(req,res)=>{
  let id=req.session.userId;
  let image=req.files.file;
  console.log(req.files);
  image.mv("./public/user-images/" + id + ".jpg");
  res.json('response');
});

router.get('/logout',(req,res)=>{
  req.session.loggedIn=null;
  req.session.user=null;
  req.session.userId=null; 
  res.redirect('/');
});

router.get('/sample',(req,res)=>{
  res.render('user/sample');
})

module.exports = router;