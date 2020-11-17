$(document).ready(function(){
    $('[data-toggle="offcanvas"]').click(function(){
        $("#navigation").toggleClass("hidden-xs");
    });
 });

 // Material Design | product table
 $(document).ready(function() {
    $('#myTable').DataTable();
} );

// validation when admin add user 
$("#addUser").click(function () {
    if($('#name1').val()===''){
        $('.empty').css("display","block");
    }else if($('#name2').val()===''){
        $('.empty').css("display","block");
    }else if($('#email').val()===''){
        $('.empty').css("display","block");
    }else if($('#pass1').val()===''){
        $('.empty').css("display","block");
    }else if($('#pass2').val()===''){
        $('.empty').css("display","block");
    }else{
    $.post("http://localhost:3000/admin/addUser",
        {
            fname: $('#name1').val(),
            lname: $('#name2').val(),
            email: $('#email').val(),
            pass1: $('#pass1').val(),
            pass2: $('#pass2').val()
        },

        function (data, status) {
            console.log("Data: " + data + "\nStatus: " + status);

            if (data === 'success') {
                document.location.href = "http://localhost:3000/admin/users";
            }else if (data === 'failed') {
                $('.empty').css("display","none");
                $('.user').css('display', "none");
                $('.failed').css("display", "block");
            }else if(data ==='user'){
                $('.empty').css("display","none");
                $('.failed').css("display", "none");
                $('.user').css('display', "block");
            }
        });
    }
});

// crop product image 
var canvas = $("#canvas"),
  context = canvas.get(0).getContext("2d")
  $result = $("#result");
$("#prodImg").on("change", function () {
  if (this.files && this.files[0]) {
    if (this.files[0].type.match(/^image\//)) {
      $("#productCropModal").modal("show"); //---open model----//
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
          $("#cropProductImg").click(function () {
            // Get a string base 64 data url
            var croppedImageDataURL = canvas
              .cropper("getCroppedCanvas")
              .toDataURL("image/jpg");

              $('#croppedImg').val(croppedImageDataURL)
              var file = dataURLtoFile(croppedImageDataURL,'abc.jpg');
              $("#imgView").attr("src", croppedImageDataURL);
              var fd = new FormData();
              fd.append("file", file);

            $("#productCropModal").modal("hide");
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