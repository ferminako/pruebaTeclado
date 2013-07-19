

$( document ).ready(function() {


	$('#busuqedaPredictiva').live('pageshow',function(e,data){
		$('#searchField').val();
		plugins.SoftKeyBoard.show(function () {
		    // success
		},function () {
		   // fail
		});
	});

	$('#searchFieldFake').focus(function() {
	 	$('#searchField').val('');
	});

	$('#searchFieldFake').click(function(e) {
		if($('#searchFieldFake').val()==""){
			$.mobile.changePage("#busuqedaPredictiva");
			$('#searchField').focus();
			$('#searchField').val();
		}else{
			$('#searchFieldFake').val('');
		}
	});

	$('#searchFieldFake').keypress(function(e) {
		 e.preventDefault();
		$('#searchField').val(String.fromCharCode(e.which));//lleva l tecla pulsada al buscador del rpedictivo
		$.mobile.changePage("#busuqedaPredictiva");
		$('#searchField').focus();
	});

	$('#searchField').focus(function() {
	 	$('#searchField').val('');
	});

});//redy

