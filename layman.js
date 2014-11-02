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
			path	: layer.path,
			method	: layer.method,
			host	: layer.host,
			callback: layer.callback || function(){}
		});
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
		
		
		
		// To prevent nested laymans from ending the response chaing,
		// we check for a 3rd argument to eqaul boolean true.
		// If it exists, we know that 'this' layman is nested in an 'outer' layman,
		// and so 'this' layman should not autoEnd the response (the 'outer' most layman should end the response)
		if (arguments[2] === true) {layman.configs.autoEnd = false}
		
		
		
		// By order of FIFO, go over each request handler
		handlers.every(function(handler){
			
			var matchPath	= handler.path	 === undefined	|| handler.path	  === path,
				matchMethod	= handler.method === undefined	|| handler.method === method,
				matchHost	= handler.host	 === undefined	|| handler.host	  === host,
				result;
			
			// If the handler is supposed to handle this request
			if (matchPath && matchMethod && matchHost){
				
				// Trigger the handler and save it's return value
				// We are passing a boolean true as a 3rd argument to 'callback', which will only
				// be read if 'callback' is a nested layman (laymans can be nested, see docs for more info)
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
	
		// Overload 1: Calling use(callback)
		if (arguments.length === 1 && typeof arguments[0] === 'function'){
			
			addLayer( {callback: arguments[0]} );
		}
		
		// Overload 2: Calling use(route, callback)
		if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'function'){
			
			addLayer({
				
				path	: arguments[0].indexOf('/') !== 0 ? '/' + arguments[0] : arguments[0],
				callback: arguments[1]
			});
		}
	}
	
	/**
		Registers the passed in middleware as a layer to use for GET requests
		
		@params [route]		If specified, the registered middleware will only be triggered for this route.
		@params callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.get = function get(route, callback){
	
		// Overload 1: Calling get(callback)
		if (arguments.length === 1 && typeof arguments[0] === 'function'){
			
			addLayer( {callback: arguments[0]} );
		}
		
		// Overload 2: Calling get(route, callback)
		if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'function'){
			
			addLayer({
				
				method	: 'GET',
				path	: arguments[0].indexOf('/') !== 0 ? '/' + arguments[0] : arguments[0],
				callback: arguments[1]
			});
		}
	}
	
	/**
		Registers the passed in middleware as a layer to use for POST requests
		
		@params [route]		If specified, the registered middleware will only be triggered for this route.
		@params callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.post = function post(route, callback){
	
		// Overload 1: Calling post(callback)
		if (arguments.length === 1 && typeof arguments[0] === 'function'){
			
			addLayer( {callback: arguments[0]} );
		}
		
		// Overload 2: Calling post(route, callback)
		if (arguments.length === 2 && typeof arguments[0] === 'string' && typeof arguments[1] === 'function'){
			
			addLayer({
				
				method	: 'POST',
				path	: arguments[0].indexOf('/') !== 0 ? '/' + arguments[0] : arguments[0],
				callback: arguments[1]
			});
		}
	}
	
	/**
		Registers the passed in middleware as a layer to use for the specified host
		
		@params host		The host for which this layer will be triggerd
		@params	callback	The actual middleware (callback) that will handle the request\response.
	*/
	layman.host = function(host, callback){
		
		// Overload 1: Passing in host as a string
		if (typeof host === 'string' && typeof callback === 'function'){
			
			addLayer({
				
				host	: host,
				callback: callback
			});
		}
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