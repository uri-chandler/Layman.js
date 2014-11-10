// +-----------------------------------------------------------------+
// | Layman.js - A simple request-response layers manager for node.js|
// +-----------------------------------------------------------------+


// Exporting a factory function that returns a new layer manager
module.exports = function(){


	// +-----------------------------------------+
	// | Private. Setup and init				 |
	// +-----------------------------------------+

	var handlers = [],									// Will hold all the request handlers
		url		 = require('url'),						// Just so it's easier to get the requested path
		request,										// Will hold the request object between async middleware
		respopnse,										// Will hold the response object between async middleware
		nextLayer;										// Will hold a pointer to the next middleware that needs to run (for async layers)
		
		
	/**
		Adds the passed in layer as middleware that layman will use to handle incoming Request <--> Response pairs
		
		@params layer	An object containing a path, method, and callback.
						path is the route for which the callback will be triggered.
						method is the HTTP method for which the callback will be triggered.
						callback is the middleware function that will receive 2 arguments: request, response
	*/
	function addLayer(layer){
		
		handlers.push({
			route	: layer.route,
			method	: layer.method,
			host	: layer.host,
			callback: layer.callback || function(){},
			connect : layer.connect
		});
	}	

	/**
		A mediator function between the main layaer-registration (lay-reg) functions and 'addLayer'.
		Used to parse the arguments passed to the lay-reg to easily support overloading for these functions.
		
		@params args		The original arguments onject that was passed into any of the lay-reg functions
		@params options		Additional options so that any lay-reg function is able to overwrite default settings when registering a layer
	*/
	function register(args, options){
		
		// Overload 1: API used only with 'callback'
		if (args.length === 1 && typeof args[0] === 'function'){
		
			addLayer({
				
				route	: options.route,
				method	: options.method,
				host	: options.host,
				callback: args[0]
			});
		}
		
		// Overload 2: API used with 'route' (or 'host') AND 'callback'
		if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'function'){
			
			addLayer({
				
				route	: args[0] === options.host ? undefined : args[0],
				method	: options.method,
				host	: options.host,
				callback: args[1]
			});
		}
		
		// Overload 3: API used with 'connect' AND 'callback'
		if (args.length === 2 && args[0] === true && typeof args[1] === 'function'){
			
			addLayer({
				
				route	: options.route,
				method	: options.method,
				host	: options.host,
				callback: args[1],
				connect : true
			});
		}
	
		// Overload 4: API used with 'connect' AND 'route' (or 'host') AND 'callback'
		if (args.length === 3 && args[0] === true && typeof args[1] === 'string' && typeof args[2] === 'function'){
			
			addLayer({
				
				route	: args[1] === options.host ? undefined : args[1],
				method	: options.method,
				host	: options.host,
				callback: args[2],
				connect : true
			});
		}
	
	}
	
	/**
		Continues execution of middleware layers, starting at position [nextLayer]
	*/
	function next(){
		
		processLayers(request, response, nextLayer);
	}
	
	/**
		Runs over the registered layers, starting at [startIndex], and calls them one by one based on the passed in request.
		Also, the following return value of each layer determines the flow control:
		
			1. If the layer returns nothing (undefined etc..) - continue to the next layer
			2. If the layer returns boolean false - stop processing layers.
			3. If the layer returns boolean true - then the layer started something async. Stop processing layers, and save required data to continue processing once async operation is done.
	*/
	function processLayers(req, res, startIndex){
		
		// Init
		var path		= url.parse(req.url).pathname,
			method		= req.method,
			host		= (req.headers.host) ? req.headers.host.match(layman.configs.hostRegex)[1] : undefined,
			pointer		= startIndex,
			length		= handlers.length,
			matchPath,
			matchMethod,
			matchHost,
			handler,
			result;
		
		// Remove leading '/' from path (if any)
		if (path[0] === '/') path = path.slice(1);
		
		// Go over all layers, starting at position [pointer]
		for (; pointer < length; pointer++){
			
			// Get the current handler, and match it with the request params
			handler		= handlers[pointer];
			matchPath	= handler.route	 === undefined	|| handler.route  === path;
			matchMethod	= handler.method === undefined	|| handler.method === method;
			matchHost	= handler.host	 === undefined	|| handler.host	  === host;
			
			// If the request matches the conditions for this layer
			if (matchPath && matchMethod && matchHost){
				
				// If layman is setup to use async mode ,OR, if the layer is a 'Connect' middleware - we use async mode
				if (layman.configs.autoAsync === true || handler.connect === true) {
					
					// Call the middleware, passing in the required params for a 'Connect' middleware
					handler.callback(req, res, next);
					
					// And also stop processing any additional layers, since this is layer is 'async' by default
					nextLayer	= pointer + 1;					// Pointer to the next layer that needs to run once the previous async layer is done
					request		= req;							// The request object that will be used with the next iteration of layers processing
					response	= res;							// The response object that will be used with the next iteration of layers processing
					return;										// Stop processing layers (skipping the 'res.end()' since an async process is still running)
				}

				
				// Call the handler, passing in the reqeust, response, 'next()', and true (which is only used internally by nested laymans) 
				result = handler.callback(req, res, next, true);
				
				// If the middleware returned boolean false - don't process any more layers
				if (result === false) break;

				// If the middleware returned boolean true - the layer did something ASYNC, so save the info we need to use when resuming layer processing
				if (result === true){
					
					nextLayer	= pointer + 1;					// Pointer to the next layer that needs to run once the previous async layer is done
					request		= req;							// The request object that will be used with the next iteration of layers processing
					response	= res;							// The response object that will be used with the next iteration of layers processing
					return;										// Stop processing layers (skipping the 'res.end()' since an async process is still running)
				}
			}
		}
		
		// If auto-end is set to true (default mode) - end the response (all handlers were triggered)
		layman.configs.autoEnd && res.end();
	}
	
	/**
		The main 'layman' function. Pass this function as your only request handler to your server
	
		@params	req		The HTTP request object
		@params	res		The HTTP response object
	*/
	function layman(req,res){
	
		// To prevent nested laymans from ending the response chain,
		// we check for a (secret) 4th argument to eqaul boolean true.
		// If it exists, we know that 'this' layman is nested in an 'outer' layman,
		// and so 'this' layman should not autoEnd the response (the 'outer' most layman should end the response)
		if (arguments[3] === true) {layman.configs.autoEnd = false}
		
		// Start processing layers for the Request <--> Response pair, starting at layer 0
		processLayers(req, res, 0);
	}
	
	
	
	
	
	// +-----------------------------------------+
	// | Add methods to allow registering layers |
	// +-----------------------------------------+
	
	/**
		Registers the passed in middleware as a layer to use for all types of requests (GET\POST\...)
		
		@params [route]		If specified, the registered middleware will only be triggered for this route.
		@params callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.use = function use(route, callback){
	
		register(arguments, {});
	}
	
	/**
		Registers the passed in middleware as a layer to use for GET requests
		
		@params [route]		If specified, the registered middleware will only be triggered for this route.
		@params callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.get = function get(route, callback){
	
		register(arguments, {method:'GET'});
	}
	
	/**
		Registers the passed in middleware as a layer to use for POST requests
		
		@params [route]		If specified, the registered middleware will only be triggered for this route.
		@params callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.post = function post(route, callback){
	
		register(arguments, {method:'POST'});
	}
	
	/**
		Registers the passed in middleware as a layer to use for the specified host
		
		@params host		The host for which this layer will be triggerd
		@params	callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.host = function(host, callback){
		
		register(arguments, {host:host});
	};
	
	/**
		A helper function that allows users to easily start a web server using the 'this' layman.
		This is just the same as if the user would have created the server on their own and passed in layman as the callback - it's just a convenience method
		
		@params	port	The port that the server will listen on. Defaults to 80.
		
		@returns 		The server that was started.
	*/
	layman.listen = function(port){
	
		// Create a new server, passing in 'this' layman as the main request handler
		var server = require('http').createServer(layman);
		
		// Start the server on the specified port (defaults to 80)
		server.listen(port || 80);
		
		// Return the server (in case the user wants to do other stuff with it)
		return server;
	};
	

	
	
	
	
	
	
	
	// +-----------------------------------------+
	// | Layman instance settings				 |
	// +-----------------------------------------+
	
	layman.configs = {
		
		autoEnd		: true,					// End the response after all handlers ? (default:true)
		autoAsync	: false,				// By default, Layman processes layers synchronously
		hostRegex	: /(\w+[^:,]*)\:?/		// The regex to use when when performing 'match(regex)' on the hostname. The final comparison is against the first matching group
	};
	

	
	
	
	// +-----------------------------------------+
	// | Expose the main layman function		 |
	// +-----------------------------------------+
	return layman;
};