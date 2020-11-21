// user signup validation
$("#signup").click(function () {
  if ($("#name1").val() === "") {
    $(".empty").css("display", "block");
  } else if ($("#name2").val() === "") {
    $(".empty").css("display", "block");
  } else if ($("#email").val() === "") {
    $(".empty").css("display", "block");
  } else if ($("#pass1").val() === "") {
    $(".empty").css("display", "block");
  } else if ($("#pass2").val() === "") {
    $(".empty").css("display", "block");
  } else {
    $.post(
      "http://localhost:3000/signup",
      {
        fname: $("#name1").val(),
        lname: $("#name2").val(),
        email: $("#email").val(),
        pass1: $("#pass1").val(),
        pass2: $("#pass2").val(),
      },

      function (data, status) {
        console.log("Data: " + data + "\nStatus: " + status);

        if (data === "success") {
          document.location.href = "http://localhost:3000/login";
        } else if (data === "failed") {
          $(".empty").css("display", "none");
          $(".user").css("display", "none");
          $(".failed").css("display", "block");
        } else if (data === "user") {
          $(".empty").css("display", "none");
          $(".failed").css("display", "none");
          $(".user").css("display", "block");
        }
      }
    );
  }
});

// user login authentication
$("#signin").click(function () {
  if ($("#your_name").val() === "") {
    $(".empty").css("display", "block");
  } else if ($("#your_pass").val() === "") {
    $(".empty").css("display", "block");
  } else {
    $.post(
      "http://localhost:3000/login",
      {
        email: $("#your_name").val(),
        password: $("#your_pass").val(),
      },

      function (data, status) {
        console.log("Data: " + data + "\nStatus: " + status);

        if (data === "success") {
          document.location.href = "http://localhost:3000";
        } else if (data === "missMatch") {
          $(".empty").css("display", "none");
          $(".noUser").css("display", "none");
          $(".wrongPass").css("display", "block");
        } else if (data === "noUser") {
          $(".empty").css("display", "none");
          $(".wrongPass").css("display", "none");
          $(".noUser").css("display", "block");
        }
      }
    );
  }
});

// add to cart (ajax)
function addToCart(prodId) {
  $.ajax({
    url: "/addToCart/" + prodId,
    method: "get",
    success: (response) => {
      if (response.status) {
        let count = $("#cart-count").html();
        count = parseInt(count) + 1;
        $("#cart-count").html(count);
      }
    },
  });
}

// change quantity
function changeQty(cartId, prodId, userId, count) {
  let qty = parseInt($("#qty-" + prodId).val());
  count = parseInt(count);
  if (qty <= 1 && count == -1) {
    disableMinus(prodId);
  } else {
    $.ajax({
      url: "/changeQty",
      method: "post",
      data: {
        user: userId,
        cart: cartId,
        product: prodId,
        quantity: qty,
        count: count,
      },
      success: (totalPrice) => {
        console.log(totalPrice);
        // $('.totalPrice').html(totalPrice);
        document.getElementById("qty-" + prodId).value = qty + count;
        let total_1 = document.querySelectorAll(".totalPrice");
        total_1[0].innerHTML = totalPrice;
        total_1[1].innerHTML = totalPrice;
        disableMinus(prodId);
      },
    });
  }
}

function disableMinus(prodId) {
  let qty = parseInt($("#qty-" + prodId).val());
  console.log(qty);
  if (qty <= 1) {
    $("#minus-btn-" + prodId).prop("disabled", true);
  } else {
    $("#minus-btn-" + prodId).prop("disabled", false);
  }
}

// $(document).ready(function () {});

// remove one cart prodect
function removeCart(cartId, prodId) {
  if (confirm("Are you sure?")) {
    $.ajax({
      url: "/removeCart",
      method: "post",
      data: {
        cart: cartId,
        product: prodId,
      },
      success: (response) => {
        if (response) {
          location.reload();
        }
      },
    });
  }
}
//**************** */ order checkout
$("#checkout-form").submit((e) => {
  e.preventDefault();
  var myform = document.getElementById("checkout-form");
  var fd = new FormData(myform);
  let checked = false;
  if ($("#defaultCheck1").is(":checked")) {
    checked = true;
  } else {
    checked = false;
  }
  fd.append("checked", checked);
  $.ajax({
    url: "/placeOrder",
    method: "post",
    data: fd,
    cache: false,
    processData: false,
    contentType: false,
    success: (response) => {
      if (response.cod) {
        console.log(response.cod);
        let id = response.cod;
        location.href = `/orderSummary/${id}`;
      } else if (response.online) {
        console.log(response.online);
        if(response.online){
        razorpayPayment(response.online);
        }else{
          alert('payment failed')
        }
      } else if (response.paypal) {
        // document.getElementById('checkout-id').style.display= none;
        document.querySelector("#place-order-id").style.display = "none";
        let id = response.paypal.id;
        let amount = response.paypal.amount;
        paypalPayment(id, amount);
      }
    },
  });
});
// ******************* razorpay payment ***********//
function razorpayPayment(order) {
  var options = {
    key: "rzp_test_6jhrsB3r51nyzO", // Enter the Key ID generated from the Dashboard
    amount: order.amount *100, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
    currency: "INR",
    name: "HourSpy",
    description: "Test Transaction",
    image: "https://example.com/your_logo",
    order_id: order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
    handler: function (response) {
      verifyPayment(response, order);
    },
    prefill: {
      name: "Fayis kv",
      email: "faizy@example.com",
      contact: "9999999999",
    },
    notes: {
      address: "Razorpay Corporate Office",
    },
    theme: {
      color: "#3399cc",
    },
  };
  var rzp1 = new Razorpay(options);
  rzp1.open();
}

function verifyPayment(payment, order) {
  $.ajax({
    url: "/verifyPayment",
    method: "post",
    data: {
      payment,
      order,
    },
    success: (response) => {
      if (response.status) {
        let id = response.status;
        location.href = `/orderSummary/${id}`;
      } else {
        alert("payment failed");
      }
    },
  });
}
//************* pay pal payment ***********
function paypalPayment(orderId, amount) {
  paypal
    .Buttons({
      // Set up the transaction
      createOrder: function (data, actions) {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: amount,
              },
            },
          ],
        });
      },

      // Finalize the transaction
      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          // Show a success message to the buyer
          verifyPaypal(orderId);
        });
      },

      style: {
        color: "blue",
        shape: "pill",
        label: "pay",
        height: 40,
      },
    })
    .render("#paypal-button-container");
}

function verifyPaypal(orderId) {
  console.log(orderId);
  console.log("breeewwwww");
  $.ajax({
    url: "/verifyPaypal",
    method: "post",
    data: { orderId: orderId },
    success: (response) => {
      if (response) {
        location.href = `/orderSummary/${orderId}`;
      }
    },
  });
}
//*************/ end of order checkout

// -------- add profile picture
$("#profileImage").click(function (e) {
  $("#fileInput").click();
});

var canvas = $("#canvas"),
  context = canvas.get(0).getContext("2d");

$("#fileInput").on("change", function () {
  if (this.files && this.files[0]) {
    if (this.files[0].type.match(/^image\//)) {
      $("#exampleModalCenter").modal("show"); //---open model----//
      var reader = new FileReader();
      reader.onload = function (evt) {
        var img = new Image();
        img.onload = function () {
          context.canvas.width = img.width;
          context.canvas.height = img.height;
          context.drawImage(img, 0, 0);
          console.log(img.height);
          console.log(img.width);
          var cropper = canvas.cropper({
            aspectRatio: 16 / 9,
          });
          $("#btnCrop").click(function () {
            // Get a string base 64 data url
            var croppedImageDataURL = canvas
              .cropper("getCroppedCanvas")
              .toDataURL("image/jpg");
            var file = dataURLtoFile(croppedImageDataURL, "abc.jpg");

            var fd = new FormData();
            fd.append("file", file);

            $.ajax({
              method: "POST",
              url: "/addProfilePic",
              data: fd,
              cache: false,
              contentType: false,
              processData: false,
              success: (response) => {
                // $("#profile-pic").attr("src",response);
                // $("#profile-pic").show();
                location.reload();
              },
            });

            $("#exampleModalCenter").modal("hide");
          });
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(this.files[0]);
    } else {
      alert("Invalid file type! Please select an image file.");
    }
  } else {
    alert("No file(s) selected.");
  }
});
// *****************convert base 64 to file*******************
function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new File([u8arr], filename, { type: mime });
}
//  ---- end of add profile pic

// -----use saved address

function useAddress(addressId) {
  $.ajax({
    url: "/useAddress",
    method: "post",
    data: {
      id: addressId,
    },
    success: (response) => {
      $("#firstName").val(response.address.name);
      $("#email").val(response.address.email);
      $("#address").val(response.address.address);
      $("#mobile").val(response.address.phone);
      $("#zip").val(response.address.pin);
      $("#form-hide-btn").show();
      $("#form-hide-div").hide();
    },
  });
}
function showForm() {
  $("#form-hide-btn").hide();
  $("#form-hide-div").show();
  $("#firstName").val("");
  $("#email").val("");
  $("#address").val("");
  $("#mobile").val("");
  $("#zip").val("");
}
