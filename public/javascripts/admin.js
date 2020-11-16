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