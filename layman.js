// +-----------------------------------------------------------------+
// | Layman.js - A simple request-response layers manager for node.js|
// +-----------------------------------------------------------------+


// Exporting the 'layman' function after it's properly setup
module.exports = (function(){

	var handlers = [],									// Will hold all the request handlers
		url		 = require('url'),						// Just so it's easier to get the requested path
		layman;											// Will hold the main function returned by require('layman')
		
		
	// The main 'layman' function. Pass this function as your only request handler to your server
	layman = function (req,res){
	
		// Get the path that was requested
		var path = url.parse(req.url).pathname;
		
		// By order of FIFO, go over each request handler
		handlers.every(function(handler){
			
			// Only call the request handler if the handler is supposed to handle that path
			if (path === handler.path || handler.path === '*'){
				
				// If the handler should terminate the request-handlers chain - return false to the 'handlers.every' iterator.
				// Else, return true, and the next handler will be called
				if (handler.callback(req, res) === false) return false;
				else return true;
			}
			
			// It this request handler is only called on paths OTHER than the requested path, simply skip it by returning true
			return true;
		});
		
		
		// Once all the required request handlers were called, end the response
		res.end();
	}
	
	
	// Adds a layer to handle incoming request\response. Usage: layman.use( [path], callback)
	layman.use = function use(){
	
		// Arguments 2 Array
		var args = [].slice.call(arguments);
		
		
		// If the registered request handler doesn't is not for a specific URI path (i.e. only a callback was passed in)
		if (args.length === 1){
			
			// Make sure that the callback is indeed a function, and add it as a callback for all path's
			typeof args[0] === 'function' && handlers.push({
		
				path	: '*',
				callback: args[0]
			});
		}
		
		// If both a path AND a callback were passed in
		if (args.length === 2){
			
			// Validate the parameter's type, and add it as a request-handler for that specific path
			typeof args[0] === 'string' && typeof args[1] === 'function' && handlers.push({
		
				path	: args[0],
				callback: args[1]
			});
		}
	}
	
	
	// Expose the main layman function
	return layman;

})();