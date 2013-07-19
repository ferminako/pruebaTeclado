function gonext() {
		var current = $('a.selectedimg');
		if (current.hasClass('last')) {
			var next = $('a.first')
		} else {
			var next = current.next();
		}

		var src = next.find('img').attr("src");
		var alt = next.find('img').attr("alt");
		next.addClass('selectedimg');
		current.removeClass('selectedimg');
		$('#dialogcontent').empty().append('<a href="#gallerypage"><img src="' + src + '" style="width:100%;"/></a>' );
		$('#dialoghead').empty().append('<center><h2>' + alt + '</h2></center>' );
	}
	function goprev() {
	var current = $('a.selectedimg');
		if (current.hasClass('first')) {
			var prev = $('a.last')
		} else {
			var prev = current.prev();
		}
		var src = prev.find('img').attr("src");
		var alt = prev.find('img').attr("alt");
		prev.addClass('selectedimg');
		current.removeClass('selectedimg');
		$('#dialogcontent').empty().append('<a href="#gallerypage"><img src="' + src + '" style="width:100%;"/></a>' );
		$('#dialoghead').empty().append('<center><h2>' + alt + '</h2></center>' );
	}
	function bindear(){
		$('.gallerycontent img').bind('tap',function(event, ui){
			var src = $(this).attr("src");
			var alt = $(this).attr("alt");
			$('#dialogcontent').empty().append('<a href="#gallerypage"><img src="' + src + '" style="width:100%; "/></a>' );
			$('#dialoghead').empty().append('<center><h2>' + alt + '</h2></center>' );
			$(this).parent().addClass('selectedimg');
		});

		$('#nextbtn').bind('tap',function(event, ui){
			gonext();
		});

		$('#imgshow').bind('swipeleft',function(event, ui){
			gonext();
		});

		$('#prevbtn').bind('tap',function(event, ui){
			goprev();
		});

		$('#imgshow').bind('swiperight',function(event, ui){
			goprev();
		});
	}
