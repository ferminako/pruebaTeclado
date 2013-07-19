/*
	Name: autoComplete
	Authors:
		Andy Matthews: @commadelimited
		Raymond Camden: @cfjedimaster

	Website: http://andyMatthews.net
	Version: 1.5.2
*/
(function($) {

	"use strict";

	var defaults = {
		method: 'GET',
		icon: 'arrow-r',
		cancelRequests: false,
		target: $(),
		source: null,
		callback: null,
		link: null,
		minLength: 0,
		transition: 'fade',
		matchFromStart: true,
		labelHTML: function(value) { return value; },
		onNoResults: function() { return; },
		onLoading: function() { return; },
		onLoadingFinished: function() { return; },
		termParam : 'term',
		loadingHtml : '<li data-icon="none"><a href="#">Searching...</a></li>',
		interval : 0,
		builder: null,
		dataHandler : null,
		klass: null,
		forceFirstChoiceOnEnterKey : true,
		maxResults:null
	},
	openXHR = {},
	buildItems = function($this, data, settings) {
		var str,
			vclass = '';
		if (settings.klass) {
			vclass = 'class="' + settings.klass + '"';
		}
		if (settings.builder) {
			str = settings.builder.apply($this.eq(0), [data, settings]);
		} else {
			str = [];
			if (data) {
				if (settings.dataHandler) {
					data = settings.dataHandler(data);v
				}
				var i=0;
				$.each(data, function(index, value) {
					if(i<settings.maxResults){
						// are we working with objects or strings?
						if ($.isPlainObject(value)) {
							str.push('<li ' + vclass + ' data-icon=' + settings.icon + '><a href="' + settings.link + encodeURIComponent(value.value) + '" data-transition="' + settings.transition + '" data-autocomplete=\'' + JSON.stringify(value).replace(/'/g, "&#39;") + '\'>' + settings.labelHTML(value.label) + '</a></li>');
						} else {
							str.push('<li ' + vclass + ' data-icon=' + settings.icon + '><a href="' + settings.link + encodeURIComponent(value) + '" data-transition="' + settings.transition + '">' + settings.labelHTML(value) + '</a></li>');
						}
					}
					i++;
				});
			}
		}
		if ($.isArray(str)) {
			str = str.join('');
		}
		$(settings.target).html(str).listview("refresh");

		// is there a callback?
		if (settings.callback !== null && $.isFunction(settings.callback)) {
			attachCallback(settings);
		}

		if (str.length > 0) {
			$this.trigger("targetUpdated.autocomplete");
		} else {
			$this.trigger("targetCleared.autocomplete");

			if (settings.onNoResults) {
				settings.onNoResults();
			}
		}
	},
	attachCallback = function(settings) {
		$('li a', $(settings.target)).bind('click.autocomplete',function(e){
			e.stopPropagation();
			e.preventDefault();
			settings.callback(e);
		});
	},
	clearTarget = function($this, $target) {
		$target.html('').listview('refresh').closest("fieldset").removeClass("ui-search-active");
		$this.trigger("targetCleared.autocomplete");
	},
	handleInput = function(e) {
		var $this = $(this),
			id = $this.attr("id"),
			text,
			data,
			settings = $this.jqmData("autocomplete"),
			element_text,
			re;

		// Fix For IE8 and earlier versions.
		if (!Date.now) {
			Date.now = function() {
				return new Date().valueOf();
			};
		}

		if (e) {
			if (e.keyCode === 38) { // up
				$('.ui-btn-active', $(settings.target))
					.removeClass('ui-btn-active').prevAll('li.ui-btn:eq(0)')
					.addClass('ui-btn-active').length ||
						$('.ui-btn:last', $(settings.target)).addClass('ui-btn-active');
			} else if (e.keyCode === 40) {
				$('.ui-btn-active', $(settings.target))
					.removeClass('ui-btn-active').nextAll('li.ui-btn:eq(0)')
					.addClass('ui-btn-active').length ||
						$('.ui-btn:first', $(settings.target)).addClass('ui-btn-active');
			} else if (e.keyCode === 13 && settings.forceFirstChoiceOnEnterKey) {
				$('.ui-btn-active a', $(settings.target)).click().length  ||
					$('.ui-btn:first a', $(settings.target)).click();
			}
		}
		if (settings) {
			// get the current text of the input field
			text = $this.val();
			// check if it's the same as the last one
			if (settings._lastText === text) {
				return;
			}
			// store last text
			settings._lastText = text;
			// reset the timeout...
			if (settings._retryTimeout) {
				window.clearTimeout(settings._retryTimeout);
				settings._retryTimeout = null;
			}
			// dont change the result the user is browsing...
			if (e && (e.keyCode === 13 || e.keyCode === 38 || e.keyCode === 40)) {
				return;
			}
			// if we don't have enough text zero out the target
			if (text.length < settings.minLength) {
				clearTarget($this, $(settings.target));
			} else {
				if (settings.interval && Date.now() - settings._lastRequest < settings.interval) {
					settings._retryTimeout = window.setTimeout($.proxy(handleInput, this), settings.interval - Date.now() + settings._lastRequest );
					return;
				}
				settings._lastRequest = Date.now();

				// are we looking at a source array or remote data?
				if ($.isArray(settings.source)) {
					// this function allows meta characters like +, to be searched for.
					// Example would be C++
					var escape = function( value ) { return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&"); };
					data = settings.source.sort().filter(function(element) {
						// matching from start, or anywhere in the string?
						if (settings.matchFromStart) {
							// from start
							//console.log(element);
							element=removeAccent(element);

							element, re= new RegExp('^' + escape(text), 'i');
						} else {
							// anywhere
							element_text, re = new RegExp(escape(text), 'i');
						}

						if ($.isPlainObject(element)) {
							element_text = element.label;
						} else {
							element_text = element;
						}
						return re.test(element_text);
					});
					buildItems($this, data, settings);
				}
				// Accept a function as source.
				// Function needs to call the callback, which is the first parameter.
				// source:function(text,callback) { mydata = [1,2]; callback(mydata); }
				else if (typeof settings.source === 'function') {
					settings.source(text,function(data){
						buildItems($this, data, settings);
					});
				} else {
					var ajax = {
						type: settings.method,
						data: {},
						dataType: 'json',
						beforeSend: function(jqXHR) {
							if (settings.cancelRequests) {
								if (openXHR[id]) {
									// If we have an open XML HTTP Request for this autoComplete ID, abort it
									openXHR[id].abort();
								} else {
								}
								// Set this request to the open XML HTTP Request list for this ID
								openXHR[id] = jqXHR;
							}

							if (settings.onLoading && settings.onLoadingFinished) {
								settings.onLoading();
							}

							if (settings.loadingHtml) {
								// Set a loading indicator as a temporary stop-gap to the response time issue
								$(settings.target).html(settings.loadingHtml).listview('refresh');
								$(settings.target).closest("fieldset").addClass("ui-search-active");
							}
						},
						success: function(data) {
							buildItems($this, data, settings);
						},
						complete: function () {
							// Clear this ID's open XML HTTP Request from the list
							if (settings.cancelRequests) {
								openXHR[id] = null;
							}
							if (settings.onLoadingFinished) {
								settings.onLoadingFinished();
							}
						}
					};

					if ($.isPlainObject(settings.source)) {
						if (settings.source.callback) {
							settings.source.callback(text, ajax);
						}
						for (var k in settings.source) {
							if (k !== 'callback') {
								ajax[k] = settings.source[k];
							}
						}
					} else {
						ajax.url = settings.source;
					}
					if (settings.termParam) {
						ajax.data[settings.termParam] = text;
					}
					$.ajax(ajax);
				}
			}
		}
	},
	methods = {
		init: function(options) {
			var el = this;
			el.jqmData("autocomplete", $.extend({}, defaults, options));
			var settings = el.jqmData("autocomplete");
			return el.unbind("keyup.autocomplete")
						.bind("keyup.autocomplete", handleInput)
						.next('.ui-input-clear')
						.bind('click', function(){
							clearTarget(el, $(settings.target));
						});
		},
		// Allow dynamic update of source and link
		update: function(options) {
			var settings = this.jqmData("autocomplete");
			if (settings) {
				this.jqmData("autocomplete", $.extend(settings, options));
			}
			return this;
		},
		// Method to forcibly clear our target
		clear: function() {
			var settings = this.jqmData("autocomplete");
			if (settings) {
				clearTarget(this, $(settings.target));
			}
			return this;
		},
		// Method to destroy (cleanup) plugin
		destroy: function() {
			var settings = this.jqmData("autocomplete");
			if (settings) {
				clearTarget(this, $(settings.target));
				this.jqmRemoveData("autocomplete");
				this.unbind(".autocomplete");
			}
			return this;
		}
	};

	$.fn.autocomplete = function(method) {
		if (methods[method]) {
			return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		}
	};

})(jQuery);


    function remove_accent(str) {

    	/*if(str!=undefined){
    		//console.log(str);
	    	var map={'À':'A','Á':'A','Â':'A','Ã':'A','Ä':'A','Å':'A','Æ':'AE','Ç':'C','È':'E','É':'E','Ê':'E','Ë':'E','Ì':'I','Í':'I','Î':'I','Ï':'I','Ð':'D','Ñ':'N','Ò':'O','Ó':'O','Ô':'O','Õ':'O','Ö':'O','Ø':'O','Ù':'U','Ú':'U','Û':'U','Ü':'U','Ý':'Y','ß':'s','à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','æ':'ae','ç':'c','è':'e','é':'e','ê':'e','ë':'e','ì':'i','í':'i','î':'i','ï':'i','ñ':'n','ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ø':'o','ù':'u','ú':'u','û':'u','ü':'u','ý':'y','ÿ':'y','Ā':'A','ā':'a','Ă':'A','ă':'a','Ą':'A','ą':'a','Ć':'C','ć':'c','Ĉ':'C','ĉ':'c','Ċ':'C','ċ':'c','Č':'C','č':'c','Ď':'D','ď':'d','Đ':'D','đ':'d','Ē':'E','ē':'e','Ĕ':'E','ĕ':'e','Ė':'E','ė':'e','Ę':'E','ę':'e','Ě':'E','ě':'e','Ĝ':'G','ĝ':'g','Ğ':'G','ğ':'g','Ġ':'G','ġ':'g','Ģ':'G','ģ':'g','Ĥ':'H','ĥ':'h','Ħ':'H','ħ':'h','Ĩ':'I','ĩ':'i','Ī':'I','ī':'i','Ĭ':'I','ĭ':'i','Į':'I','į':'i','İ':'I','ı':'i','Ĳ':'IJ','ĳ':'ij','Ĵ':'J','ĵ':'j','Ķ':'K','ķ':'k','Ĺ':'L','ĺ':'l','Ļ':'L','ļ':'l','Ľ':'L','ľ':'l','Ŀ':'L','ŀ':'l','Ł':'L','ł':'l','Ń':'N','ń':'n','Ņ':'N','ņ':'n','Ň':'N','ň':'n','ŉ':'n','Ō':'O','ō':'o','Ŏ':'O','ŏ':'o','Ő':'O','ő':'o','Œ':'OE','œ':'oe','Ŕ':'R','ŕ':'r','Ŗ':'R','ŗ':'r','Ř':'R','ř':'r','Ś':'S','ś':'s','Ŝ':'S','ŝ':'s','Ş':'S','ş':'s','Š':'S','š':'s','Ţ':'T','ţ':'t','Ť':'T','ť':'t','Ŧ':'T','ŧ':'t','Ũ':'U','ũ':'u','Ū':'U','ū':'u','Ŭ':'U','ŭ':'u','Ů':'U','ů':'u','Ű':'U','ű':'u','Ų':'U','ų':'u','Ŵ':'W','ŵ':'w','Ŷ':'Y','ŷ':'y','Ÿ':'Y','Ź':'Z','ź':'z','Ż':'Z','ż':'z','Ž':'Z','ž':'z','ſ':'s','ƒ':'f','Ơ':'O','ơ':'o','Ư':'U','ư':'u','Ǎ':'A','ǎ':'a','Ǐ':'I','ǐ':'i','Ǒ':'O','ǒ':'o','Ǔ':'U','ǔ':'u','Ǖ':'U','ǖ':'u','Ǘ':'U','ǘ':'u','Ǚ':'U','ǚ':'u','Ǜ':'U','ǜ':'u','Ǻ':'A','ǻ':'a','Ǽ':'AE','ǽ':'ae','Ǿ':'O','ǿ':'o'};
		    var res='';
		    for (var i=0;i<str.length;i++){
		    	c=str.charAt(i);
		    	res+=map[c]||c;
		    }
		    return res;
    	}*/
	}

	 function removeAccent(text) {
    	if(text!=undefined){
		      //var text = text.toLowerCase(); // a minusculas
		      text = text.replace(/[áàäâå]/, 'a');
		      text = text.replace(/[éèëê]/, 'e');
		      text = text.replace(/[íìïî]/, 'i');
		      text = text.replace(/[óòöô]/, 'o');
		      text = text.replace(/[úùüû]/, 'u');
		      text = text.replace(/[ýÿ]/, 'y');
		      text = text.replace(/[ñ]/, 'n');
		      text = text.replace(/[ç]/, 'c');

		      text = text.replace(/[ÁÀÄÀ]/, 'A');
		      text = text.replace(/[ÉÈËÈ]/, 'E');
		      text = text.replace(/[ÍÌÏÌ]/, 'I');
		      text = text.replace(/[ÓÒÖÒ]/, 'O');
		      text = text.replace(/[ÚÙÜÙ]/, 'U');
		      text = text.replace(/[ÝŸ]/, 'Y');
		      text = text.replace(/[Ñ]/, 'N');
		      text = text.replace(/[Ç]/, 'C');


		      /*text = text.replace(/['"]/, '');
		      text = text.replace(/[^a-zA-Z0-9-]/, '');
		      text = text.replace(/\s+/, '-');
		      text = text.replace(/' '/, '-');
		      text = text.replace(/(_)$/, '');
		      text = text.replace(/^(_)/, '');*/
		      return text;
    	}
	}
