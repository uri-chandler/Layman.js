// +-----------------------------------------------------------------+
// | Layman.js - A simple request-response layers manager for node.js|
// +-----------------------------------------------------------------+


// Exporting a factory function that returns a new layer manager
module.exports = function(){


	// +-----------------------------------------+
	// | Private. Setup and init				 |
	// +-----------------------------------------+

	var handlers = [],									// Will hold all the request handlers
		url		 = require('url');						// Just so it's easier to get the requested path
		
		
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
			callback: layer.callback || function(){}
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
	}
	
	/**
		The main 'layman' function. Pass this function as your only request handler to your server
	
		@params	req		The HTTP request object
		@params	res		The HTTP response object
	*/
	function layman(req,res){
	
		// Get the path and method for the request
		var path	= url.parse(req.url).pathname,
			method	= req.method,
			host	= req.headers.host.match(/(\w+.*)\:?/)[1];
		
		
		
		// To prevent nested laymans from ending the response chain,
		// we check for a (secret) 3rd argument to eqaul boolean true.
		// If it exists, we know that 'this' layman is nested in an 'outer' layman,
		// and so 'this' layman should not autoEnd the response (the 'outer' most layman should end the response)
		if (arguments[2] === true) {layman.configs.autoEnd = false}
		
		
		
		// By order of FIFO, go over each request handler
		handlers.every(function(handler){
			
			// Init some tests to know if this handler should handle the request or not
			var matchPath	= handler.route	 === undefined	|| handler.route  === path,
				matchMethod	= handler.method === undefined	|| handler.method === method,
				matchHost	= handler.host	 === undefined	|| handler.host	  === host,
				result;
			
			// If the handler is supposed to handle this request
			if (matchPath && matchMethod && matchHost){
				
				// Trigger the handler and save it's return value
				// We are passing a (secret) boolean true as a 3rd argument to 'callback', which will only
				// be read internally if 'callback' is a nested layman (laymans can be nested, see docs for more info)
				result = handler.callback(req, res, true);
				
				// If the handler resulted in 'false', end the response (no additional handlers will be triggered)
				if (result === false) return false;
				
				// Otherwise, continue the next handler
				else return true;
			}
			
			// Otherwise, skip to the next handler
			return true;
		});
		
		
		// If auto-end is set to true (default mode) - end the response (all handlers were triggered)
		layman.configs.autoEnd && res.end();
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
		
		autoEnd	: true									// End the response after all handlers ? (default:true)
	};
	

	
	
	// +-----------------------------------------+
	// | Expose the main layman function		 |
	// +-----------------------------------------+
	return layman;
};