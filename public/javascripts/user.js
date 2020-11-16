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

$(document).ready(function () {});

// remove one cart prodect
function removeCart(cartId, prodId) {
  console.log(cartId, prodId);
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
// order checkout
$("#checkout-form").submit((e) => {
  e.preventDefault();
  $.ajax({
    url: "/placeOrder",
    method: "post",
    data: $("#checkout-form").serialize(),
    success: (response) => {
      let id=response.status;
      if (response.status) {
        location.href = `/orderSummary/${id}`;
      }
    },
  });
});
// add profile picture
$("#profileImage").click(function (e) {
  $("#fileInput").click();
});

var canvas = $("#canvas"),
  context = canvas.get(0).getContext("2d")

$("#fileInput").on("change", function () {
  if (this.files && this.files[0]) {
    if (this.files[0].type.match(/^image\//)) {
      $("#exampleModalCenter").modal("show");
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
              var file = dataURLtoFile(croppedImageDataURL,'abc.jpg');

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
// convert base 64 to file 
function dataURLtoFile(dataurl, filename) {
 
  var arr = dataurl.split(','),
      mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), 
      n = bstr.length, 
      u8arr = new Uint8Array(n);
      
  while(n--){
      u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, {type:mime});
}