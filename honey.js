/*
|--------------------------------------------------------------------------
| An open source Javascript Honey Pot implementation
|--------------------------------------------------------------------------
|
| @version 1.1.4
| @author hungluu ( Hung Luu )
| @url https://github.com/hungluu/honeyjs
| @license The MIT License (MIT)
|
| Copyright (c) 2015 Hung Luu
|
| Permission is hereby granted, free of charge, to any person obtaining a copy
| of this software and associated documentation files (the "Software"), to deal
| in the Software without restriction, including without limitation the rights
| to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
| copies of the Software, and to permit persons to whom the Software is
| furnished to do so, subject to the following conditions:
|
| The above copyright notice and this permission notice shall be included in all
| copies or substantial portions of the Software.
|
| THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
| IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
| FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
| AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
| LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
| OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
*/

var honey = (function(){ // jshint ignore:line
	'use strict';
	// Global options, dependencies, exports
	var O, D, exports;

	/**
	 * Global options
	 *
	 * @namespace Options
	 */
	O = {
		/**
		 * Google reCaptcha theme
		 * @see https://developers.google.com/recaptcha/docs/display#render_param
		 * @default light
		 * @type {String}
		 * @inner
		 * @memberOf Options
		 */
		theme:'light',
		/**
		 * Google reCaptcha type
		 * @see https://developers.google.com/recaptcha/docs/display#render_param
		 * @default image
		 * @type {String}
		 * @memberOf Options
		 * @inner
		 */
		type:'image',
		/**
		 * Google reCaptcha size
		 * @see https://developers.google.com/recaptcha/docs/display#render_param
		 * @default normal
		 * @type {String}
		 * @memberOf Options
		 * @inner
		 */
		size:'normal',
		/**
		 * Honeyjs minimum time for form submission
		 * @default 6
		 * @type {number}
		 * @memberOf Options
		 * @inner
		 */
		time:6,
		/**
		 * Global holder class name to find when install components
		 * @default honeyjs
		 * @type {String}
		 * @memberOf Options
		 * @inner
		 */
		holderClass:'honeyjs',
		/**
		 * Global sitekey for reCaptcha to be rendered
		 * @see  https://developers.google.com/recaptcha/docs/display#render_param
		 * @default null
		 * @type {String}
		 * @memberOf Options
		 * @inner
		 */
		key:null,
		/**
		 * For forcing reCaptcha on every new honeypot created
		 * @default false
		 * @type {boolean}
		 * @memberOf Options
		 * @inner
		 */
		forceCaptcha:false
	};

	/**
	 * Dependencies
	 */
	D = {
		/* GENERIC */
		// get all forms inside document, return {HTMLCollection}
		getForms : function(){
			return document.getElementsByTagName('form');
		},
		// get current timestamp
		// @return {number}
		now : function(){
			return Date.now ? Date.now() : (new Date()).getTime();
		},

		/* RECAPTCHA */
		// install reCaptcha callbacks
		// binded callbacks to reCaptcha render options
		// @param {ReCaptcha} reCaptcha object
		// @param {Object} options
		// return edited options
		installReCaptchaCallbacks : function(re, options){
			// @see : https://developers.google.com/recaptcha/docs/display#render_param
			function callback(response){
				re.save(response);
			}
			// @see : https://developers.google.com/recaptcha/docs/display#render_param
			function excallback(){
				re.reset();
			}
			options.callback = callback;
			options['expired-callback'] = excallback;
			return options;
		},
		// active reCaptcha immediately on a pot, actually after 300 miliseconds
		// @param {Pot} a honeypot object
		// @return {Function} real callback was binded
		activateReCaptchaAutomatically : function(pot){
			function fn(){
				pot.activateCaptcha();
			}
			setTimeout(fn, 300);
			return fn;
		},

		/* JQUERY PLUGIN */
		// install jQuery plugin for honeyjs
		// @param {Class} $ jQuery
		// @param {String} name name of plugin
		// @param {Function} fn function of plugin
		// @return {boolean} return true on successful installation and vice versa
		installjQueryPlugin : function($, name, fn){
			// check if jQuery acquired
			if($){
				$.fn[name] = fn;

				return true;
			}
			else{
				return false;
			}
		},

		/* WORKING WITH ARRAY AND COLLECTION */
		// find index of an element inside array
		// @param {mixed} needle
		// @param {Array} arr
		// @return {number} index if found, -1 on opposite
		find : function(needle, arr){
			if(arr.indexOf){
				return arr.indexOf(needle);
			}
			else{
				for(var i = 0, l = arr.length;i < l;i++){
					if(arr[i] === needle){
						return i;
					}
				}
				return -1;
			}
		},
		// check if an array contains an element
		// @param {mixed} needle
		// @param {Array} arr
		// @return {boolean} true when found and vice versa
		contains : function(needle, arr){
			return D.find(needle, arr) !== -1;
		},

		/* POT INSTALLATION */
		// get form(pot)'s holder element to render honeyjs components
		// @param {HTMLFormElement} form
		// @param {String} className the class name of holder to find
		getHolder : function(form, className){
			var holders;
			if(form.getElementsByClassName){
				holders = form.getElementsByClassName(className);
				return holders.length ? holders[0] : form;
			}
			// IE 7-
			else{
				var classList;
				holders = form.getElementsByTagName('*');
				for(var i = 0, l = holders.length;i < l;i++){
					classList = holders[i].className.split(' ');
					if(D.contains(className, classList)){
						return holders[i];
					}
				}
				return form;
			}
		},
		// Generate a hidden input with provide name in forms
		// @param {HTMLElement} element
		// @param {String} name new hidden input's name
		hiddenInput : function(element, name){
			var newInput = document.createElement('input');
			newInput.name = name;
			newInput.style.display = 'none';
			newInput.style.visibility = 'hidden';
			element.appendChild(newInput);
			return newInput;
		},
		// Bind an event into form
		// @param {HTMLElement} element
		// @param {String} eventName
		// @param {Function} handler
		// @param {Object} caller
		bind : function(element, eventName, handler, caller){
			// Keep memory with local function
			function attachedHandler(event){
				var result = handler.call(caller, event);
				if(result === false){
					D.cancel(event);
				}

				return result;
			}

			if(element.addEventListener){
				element.addEventListener(eventName, attachedHandler, false);
			}
			else{
				// IE 9-
				element.attachEvent('on' + eventName, attachedHandler);
			}

			return attachedHandler;
		},
		// Cancel an event
		// @param {EventArguments} event
		cancel : function(event){
			event = event || window.event;
			if(event){
				// IE 7-
				event.cancelBubble = true;
				event.returnValue = false;
				if(event.stopPropagation){
					event.stopPropagation();
				}
				if(event.preventDefault){
					event.preventDefault();
				}
			}
			return false;
		},

		/* POT ULTILITIES */
		// from a form, get an input by name
		// @param {HTMLFormElement} Form
		// @param {String} name of the input element to find
		// @return {HTMLInputElement}
		getInputByName : function(Form, name){
			var inputs = Form.getElementsByTagName('input');
			for(var i = 0, l = inputs.length;i < l;i++){
				if(inputs[i].name === name){
					return inputs[i];
				}
			}
		},
		// check if current is dev environment
		isDev : function(){
			return !navigator.plugins.length;
		},
		// outject all dependencies for testing on dev environment
		// @param {boolean} isDev
		__installDev : function(isDev){
			if(isDev){
				exports.dev = D;
			}

			return !!isDev;
		},

		/* TYPES */

		/**
		 * Extends array, provides more methods to work with collections such as {@link Pots} and {@link Hook}
		 *
		 * @class Collector
		 * @alias Collector
		 *
		 * @extends {Array}
		 */
		Collector : function(){},

		/**
		 * Google reCaptcha component
		 *
		 * @class ReCaptcha
		 * @alias ReCaptcha
		 *
		 * @requires {@link https://developers.google.com/recaptcha/docs/display|Google reCaptcha}
		 */
		ReCaptcha : function(){
			// a holder to render components
			this.holder = null;
			/**
			 * Google reCaptcha sitekey
			 * @type {string}
			 * @default null
			 */
			this.key = null;
			// ID got when being rendered
			this.id = null;
			// Response got when user click on reCaptcha
			this.response = null;
		},

		/**
		 * A collection of functions, provide serial processing and interaction between them
		 *
		 * Works like a collection of **callbacks**. It can be a collection **validators** too
		 *
		 * A function inside a hook which _return false_ will **prevent** its next ones to be executed
		 *
		 * @class Hook
		 * @alias Hook
		 *
		 * @extends {Collector}
		 */
		Hook : function(){},

		/**
		 * A Pot - honeypot object - provides security features to forms
		 *
		 * @class Pot
		 * @alias Pot
		 *
		 * @param {HTMLFormElement} Form form to be secured
		 */
		Pot : function(Form){
			/**
			 * Pot's options, inherited from {@link Options}
			 *
			 * @type {Object}
			 */
			this.options = O;
			/**
			 * Current secured form
			 *
			 * @type {HTMLFormElement}
			 */
			this.form = Form;
			/**
			 * Timestamp of when pot was created
			 * @type {number}
			 * @private
			 */
			this.createdAt = D.now();
			/**
			 * Pot's holder to render components
			 * @type {HTMLElement}
			 */
			this.holder = D.getHolder(Form, O.holderClass);
			/**
			 * Main input is required by a honeypot
			 *
			 * Should be empty and hidden
			 *
			 * **To do : ** Recheck its existence and value on server-side, in case attacker has disabled javascript
			 *
			 * @type {HTMLInputElement}
			 */
			this.empty = D.hiddenInput(this.holder, 'name');
			/**
			 * A timestamp input describe the time form was submitted
			 *
			 * Provide more information for validation
			 *
			 * **To do : ** Recheck its existence and value on server-side, in case attacker has disabled javascript
			 *
			 * @type {HTMLInputElement}
			 */
			this.time = D.hiddenInput(this.holder, '_time');
			/**
			 * Central place for hooks(events, validators...)
			 *
			 * @type {Object}
			 */
			this.hooks = {};
			/**
			 * Validation hook for honeypot - provide validating feature
			 *
			 * Executed when form is submitted and validating process takes place first
			 *
			 * @event Validating
			 * @see {@link Hook}
			 * @type {Hook}
			 * @public
			 * @memberOf Pot
			 */
			this.hooks.validate = new D.Hook();
			/**
			 * Callback hook on fail for honeypot
			 *
			 * Executed when form is submitted but never passes the validation
			 *
			 * @event Fail
			 * @see {@link Hook}
			 * @type {Hook}
			 * @public
			 * @memberOf Pot
			 */
			this.hooks.fail = new D.Hook();

			// reCaptcha component
			// @type {ReCaptcha}
			this.re = new D.ReCaptcha();

			// Bind form submit event and inject pot instance
			D.bind(Form, 'submit', function(){
				return this.valid();
			}, this)();

			// Install reCaptcha sitekey
			this.re.key = this.options.key;
			// Activate reCaptcha immediately when being forced to
			if(O.forceCaptcha && this.options.key){
				D.activateReCaptchaAutomatically(this);
			}
		},

		/**
		 * A collection of Pot
		 *
		 * @extends {Collector}
		 * @class Pots
		 * @alias Pots
		 *
		 */
		Pots : function(){}
	};

	/* Collector extends Array */
	D.Collector.prototype = Array.prototype;
	/**
	 * Find index of element inside collection
	 * @method find
	 * @memberOf Collector
	 * @instance
	 * @param  {mixed} e element to find
	 * @return {number}  index when found, -1 on the opposite side
	 */
	D.Collector.prototype.find = function(e){
		return D.find(e, this);
	};
	/**
	 * Check if a collection contains an element
	 * @param  {mixed}  e element to find
	 * @return {boolean} true on found and vice versa
	 * @method has
	 * @memberOf Collector
	 * @instance
	 */
	D.Collector.prototype.has = function(e){
		return D.contains(e, this);
	};
	/**
	 * Remove an element
	 * @param  {mixed} e element to remove
	 * @method remove
	 * @memberOf Collector
	 * @instance
	 */
	D.Collector.prototype.remove = function(e){
		var ind = this.find(e), found = ind !== -1;
		if(found){
			this.splice(ind, 1);
		}

		return found;
	};
	/**
	 * Erase a collection
	 * @method flush
	 * @memberOf Collector
	 * @instance
	 */
	D.Collector.prototype.flush = function(){
		this.length = 0;
	};

	D.Hook.prototype = D.Collector.prototype;
	/**
	 * Execute a Hook
	 * @method exec
	 * @memberOf Hook
	 * @instance
	 * @param  {Object} caller
	 * @return {Mixed} Result returned from the last function
	 */
	D.Hook.prototype.exec = function(caller){
		var result = true;
		for(var i = 0, l = this.length;i < l;i++){
			result = this[i].call(caller);
			if(result === false){
				break;
			}
		}
		return result;
	};

	D.ReCaptcha.prototype = {
		/**
		 * Check if reCaptcha is ready for use
		 * @method ready
		 * @return {boolean}
		 * @memberOf ReCaptcha
		 * @instance
		 */
		ready : function(){
			return this.holder !== null;
		},
		/**
		 * Check if reCaptcha is required for a {@link Pot}
		 * @return {boolean}
		 * @memberOf ReCaptcha
		 * @instance
		 */
		required : function(){
			return this.key !== null;
		},
		/**
		 * Load reCaptcha components once
		 * @param  {Object} options
		 * @return {HTMLElement} current holder element
		 * @private
		 */
		load : function(options){
			if(typeof grecaptcha !== 'undefined' && this.required() && !this.ready()){
				this.holder = document.createElement('div');
				options.sitekey = this.key;
				D.installReCaptchaCallbacks(this, options);
				this.id = grecaptcha.render(this.holder, options);
			}
			return this.holder;
		},
		/**
		 * Save user response
		 * @event Save
		 * @param  {string} response
		 * @private
		 */
		save : function(response){
			this.response = response;
		},
		/**
		 * Reset reCaptcha component
		 * @event Reset
		 * @private
		 */
		reset : function(){
			if(this.key && this.id && typeof grecaptcha !== 'undefined'){
				grecaptcha.reset(this.id);
			}
		},
		/**
		 * Check if reCaptcha component is in valid state
		 * @method valid
		 * @return {boolean}
		 * @memberOf ReCaptcha
		 * @instance
		 */
		valid : function(){
			if(this.required()){
				if(typeof grecaptcha === 'undefined'){
					return false;
				}
				else{
					return this.ready() && this.response !== null;
				}
			}
			else{
				return true;
			}
		}
	};

	D.Pot.prototype = {
		/**
		 * Check if a honeypot is in valid state
		 *
		 * @method valid
		 * @memberOf Pot
		 * @instance
		 * @return {boolean}
		 * @fires {@link #.event:Validating|Validating}
		 * @fires {@link #.event:Fail|Fail}
		 */
		valid : function(){
			var currentTime = D.now();
			if(this.hooks.validate.exec(this) && this.empty.value === '' && !this.fast(currentTime) && this.re.valid()){
				this.time.value = currentTime;
				return true;
			}
			this.activateCaptcha();
			this.hooks.fail.exec(this);
			return false;
		},
		/**
		 * Get main input's name
		 *
		 * @method name
		 * @memberOf Pot
		 * @instance
		 * @return {string}
		 * @see #empty
		 */
		/**
		 * Change main input's name
		 *
		 * @method name
		 * @memberOf Pot
		 * @instance
		 * @param {string} name
		 * @return {string}
		 * @see  #empty
		 */
		name : function(name){
			if(name){
				this.empty.name = name;
			}
			return this.empty.name;
		},
		/**
		 * By a validating function or callback to form submission
		 *
		 * @method  validate
		 * @memberOf Pot
		 * @instance
		 * @param  {Function} fn
		 * @return {Pot} current honeypot
		 * @chainable
		 * @example
		 * pot.validate(function(){ return false; });
		 */
		validate : function(fn){
			this.hooks.validate.push(fn);
			return this;
		},
		/**
		 * By a fail callback to form submission ( form not passing the validation )
		 *
		 * @method  fail
		 * @memberOf Pot
		 * @instance
		 * @param  {Function} fn
		 * @return {Pot} current honeypot
		 * @chainable
		 * @example
		 * pot.fail(function(){ alert('Can not submit!'); });
		 */
		fail : function(fn){
			this.hooks.fail.push(fn);
			return this;
		},
		/**
		 * Get an option by key
		 *
		 * @method config
		 * @memberOf Pot
		 * @instance
		 * @param {string} key
		 * @return {mixed}
		 * @see #options
		 * @example
		 * pot.config('key');
		 */
		/**
		 * Set multiple options
		 *
		 * @method config
		 * @memberOf Pot
		 * @instance
		 * @param {Object} options an object contains custom options
		 * @return {string}
		 * @see  #options
		 * @example
		 * pot.config({theme : 'dark'});
		 */
		config : function(options){
			if(typeof options === 'string'){
				return this.options[options];
			}
			else{
				for(var x in options){
					this.options[x] = options[x];
				}

				return this;
			}
		},
		/**
		 * Set reCaptcha key or activate reCaptcha to render on this form on {@link #event:Fail|Fail} event
		 *
		 * **NOTE :** By default, reCaptcha component is only rendered when form submit failed from validation at the first time
		 * This component requires Google reCaptcha is loaded and a sitekey is provided. If a forceReCaptcha global {@link Options}
		 * is already set, the reCaptcha component is forced to be rendered on pot creation.
		 *
		 * @method captcha
		 * @memberOf Pot
		 * @instance
		 * @param {string} [key] if not provided, the pot will use {@link #key|global key} instead
		 * @return {Pot}
		 * @chainable
		 *
		 */
		captcha : function(key){
			this.re.key = key || O.key;
			return this;
		},
		/**
		 * Check if the form submission is too fast
		 *
		 * @method fast
		 * @memberOf Pot
		 * @instance
		 * @param {Number} [current] current timestamp
		 * @return {boolean}
		 */
		fast : function(current){
			current = current || D.now();
			return current - this.createdAt <= this.options.time;
		},
		/* Form ultilities */
		/**
		 * Get an input by name. Useful inside hooked functions
		 *
		 * @method input
		 * @memberOf Pot
		 * @instance
		 * @param  {string} name input's name
		 * @return {HTMLInputElement}
		 * @example
		 * // for validating
		 * pot.validate(function(){
		 *    // pot instance is injected inside hooked function
		 *    return this.input('email').value === 'alien.say.hello@earth.to'
		 * });
		 *
		 * // or for callback
		 * pot.fail(function(){
		 *    this.input('password').value = '';
		 * });
		 */
		input : function(name){
			return D.getInputByName(this.form, name);
		},
		/**
		 * Providing an input's name, get its value
		 *
		 * @method value
		 * @memberOf Pot
		 * @instance
		 * @param {string} name
		 * @return {string}
		 * @example
		 * pot.value('register_code').length > 8;
		 */
		value : function(name){
			var element = this.input(name);
			if(element){
				return element.value;
			}
		},
		/**
		 * Add and element to holder
		 *
		 * @param  {HTMLElement} element
		 * @private
		 * @method push
		 * @memberOf Pot
		 * @instance
		 */
		push : function(element){
			if(element){
				this.holder.appendChild(element);
			}
		},
		/**
		 * Install reCaptcha component on honeypot
		 *
		 * @private
		 * @method activateCaptcha
		 * @memberOf Pot
		 * @instance
		 */
		activateCaptcha : function(){
			this.push(this.re.load({
				theme:this.options.theme,
				type:this.options.type,
				size:this.options.size
			}));
		}
	};

	D.Pots.prototype = D.Collector.prototype;
	/**
	 * Loop throughout collection and execute the same function on each honeypot
	 *
	 * @param  {Function} fn
	 * @return {Pots} current Pots
	 * @chainable
	 *
	 * @method each
	 * @memberOf Pots
	 * @instance
	 *
	 * @example
	 * pots.each(function(pot){
	 *    // check if any pot is not ready
	 *    if(!pot.valid()){
	 *       alert('You are not human, are you?');
	 *    }
	 * });
	 */
	D.Pots.prototype.each = function(fn){
		for(var i = 0, l = this.length;i < l;i++){
			fn(this[i]);
		}
		return this;
	};
	/**
	 * Install captcha key on each honeypot inside this collection
	 *
	 * @param  {string} [key] if no key provided, this method use <a href="./Options.html#key">global key</a> instead
	 * @return {Pots} current Pots
	 * @chainable
	 *
	 * @method captcha
	 * @memberOf Pots
	 * @instance
	 *
	 * @example
	 * // this way
	 * pots.captcha('someSiteKey');
	 *
	 * // has the same effects to
	 * pots.config({ key : 'someSiteKey' });
	 *
	 *
	 */
	D.Pots.prototype.captcha = function(key){
		return this.each(function(p){
			p.captcha(key);
		});
	};
	/**
	 * Config over all honeypot inside this collection
	 *
	 * @param  {Object} options
	 * @return {Pots}
	 *
	 * @method config
	 * @memberOf Pots
	 * @instance
	 *
	 * @example
	 * pots.config({ theme : 'light' });
	 */
	D.Pots.prototype.config = function(options){
		if(typeof options === 'string' && this.length){
			return this[0].config(options);
		}
		else{
			return this.each(function(p){
				p.config(options);
			});
		}
	};
	/**
	 * Add the same function to validate hooks of all honeypot instances inside this collections
	 *
	 * @param  {Function} fn
	 * @return {Pots} current Pots
	 *
	 * @method validate
	 * @memberOf Pots
	 * @instance
	 */
	D.Pots.prototype.validate = function(fn){
		return this.each(function(p){
			p.validate(fn);
		});
	};
	/**
	 * Add the same function to fail hooks of all honeypot instances inside this collections
	 *
	 * @param  {Function} fn
	 * @return {Pots} current Pots
	 *
	 * @method fail
	 * @memberOf Pots
	 * @instance
	 */
	D.Pots.prototype.fail = function(fn){
		return this.each(function(p){
			p.fail(fn);
		});
	};

	/**
	 * Provide security to forms
	 *
	 * - Return {@link Pot} instance for a form or a **collection** that contains **only one** form
	 * - Return {@link Pots} for multiple forms
	 * - Without jQuery, this method will use old-fashioned javascript ways to initialize honeypot instances
	 * - jQuery is optional but **required** to be **loaded before** honeyjs if jQuery selector **string** is provided as a parameter to this function
	 *
	 * @see https://api.jquery.com/category/selectors
	 *
	 * @module
	 *
	 * @param  {HTMLFormElement|HTMLCollection|HTMLFormElement[]|jQuerySelctor} Param A Form or a collection of forms to be secured
	 * @return {Pot|Pots} {@link Pot} for a form and {@link Pots} for a collection of forms
	 *
	 * @example
	 * honey(document.getElementById('secured'));
	 *
	 * honey([form1, form2]);
	 *
	 * honey(document.getElementByTagName('*'));
	 *
	 * honey($('ul#1').find('li'));
	 *
	 * // the jQuery ways
	 * honey('.class');
	 *
	 * honey('#id');
	 *
	 * honey('form[method=GET]');
	 */
	exports = function(Param){
		if(typeof Param === 'string' && typeof jQuery !== 'undefined'){
			return exports(jQuery(Param));
		}

		if(Param instanceof HTMLFormElement){
			return new D.Pot(Param);
		}
		else{
			if(Param.length === 1){
				return exports(Param[0]);
			}
			else{
				var collection = new D.Pots();
				for(var i = 0, l = Param.length;i < l;i++){
					collection.push(exports(Param[i]));
				}
				return collection;
			}
		}
	};

	/**
	 * Provide a global sitekey for reCaptcha
	 *
	 * @param  {string} [key] global sitekey to be set
	 * @return {string}       global sitekey after being changed
	 * @see  {@link Options#key}
	 *
	 * @example
	 * // this
	 * honey.requireCaptcha('someSiteKey');
	 *
	 * // has the same effects as
	 * honey.config({ key : 'someSiteKey' });
	 */
	exports.requireCaptcha = function(key){
		O.key = key;
		return O.key;
	};

	/**
	 * Force all new created {@link Pot} to **install and activate** reCaptcha component on pot creation
	 *
	 * @requires {@link https://developers.google.com/recaptcha/docs/display|Google reCaptcha}
	 *
	 * @see  {@link Pot#captcha}
	 * @param  {string} [key] global sitekey to be set and used
	 * @return {boolean} true is reCaptcha is forced from now on.
	 *
	 * @example
	 * // force reCaptcha
	 * honey.forCaptcha('someSiteKey');
	 *
	 * var pot = honey("#1"); // the reCaptcha component of form#1 is now rendered immediately (actually 300ms delay)
	 */
	exports.forceCaptcha = function(key){
		O.forceCaptcha = !!exports.requireCaptcha(key);
		return O.forceCaptcha;
	};

	/**
	 * Get or set global options
	 *
	 * @param  {string|Objects} param
	 * @return {mixed}
	 * @see  {@link Options}
	 *
	 * @example
	 * // Get an option by key
	 * honey.config('theme');
	 *
	 * // Set options
	 * honey.config({ theme : 'dark' });
	 */
	exports.config = function(params){
		if(typeof params === 'string'){
			return O[params];
		}
		else{
			for(var x in params){
				O[x] = params[x];
			}
		}
	};

	/**
	 * Automatically secure all forms inside document
	 *
	 * @return {Pots} A collection of honeypot instance
	 *
	 * @example
	 * // this
	 * honey.all();
	 *
	 * // is an alias of
	 * honey(document.getElementsByTagName('form'));
	 */
	exports.all = function(){
		return exports(D.getForms());
	};

	/**
	 * jQuery plugin
	 *
	 * @global
	 * @external "jQuery.fn"
	 * @see {@link http://learn.jquery.com/plugins/|jQuery Plugins}
	 */

	/**
	 * Automatically secure all forms inside jQuery object
	 * @param  {string|Objects} [params] set a reCaptcha sitekey if input a string, or change options if input an object
	 * @return {Pot|Pots}
	 *
	 * @function external:"jQuery.fn".honey
	 * @instance
	 *
	 * @example
	 * $('#1').honey();
	 *
	 * $('#2').honey('someSiteKey'); // is short version of $('#2').honey().captcha('someSiteKey');
	 *
	 * $('#3').honey({ theme : 'dark' }); // is short version of $('#3').honey().config({ theme : 'dark' });
	 */
	D.installjQueryPlugin(jQuery, 'honey', function(params){
		var ret = exports(this);

		if(ret && params){
			if(typeof params === 'string'){
				return ret.captcha(params);
			}
			else{
				return ret.config(params);
			}
		}

		return ret;
	});

	/* MOCKING DEPENDENCIES FOR TESTING */
	/* PhantomJS */
	D.__installDev(D.isDev());

	return exports;
})();