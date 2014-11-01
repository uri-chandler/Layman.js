Layman.js
=========
A simple manager for HTTP request <--> response layers in node.js

Layman.js is a simplified version of Sencha's Connect. It allows you to easily manage multiple layers of request <--> response handlers (aka middle-ware) for your node.js server.
  

Basics
------
The following is the 'layman' version of a typical 'hello world' example.  
Layman uses the popular syntax of `use(middleware)`, where `middleware` is a callback function that will get the `request` and `response` as it's only arguments:
```
// Init
var layman = require('layman'),
	http = require('http');
	
// Add a middleware layer to handle request <--> response
layman.use(function(req,res){
	
	res.write('layman is awesome!');
});

// Start a new server, passing in layman as the middle-ware manager
http.createServer(layman).listen(80);
```



Using routes
------------
If you want to use a certain middleware only for a specific route, you can do so by specifying the route as the first parameter to the `use(...)` function:  
```
// Init
var layman = require('layman'),
	http = require('http');
	
// This layer handles requests to /some/route/
layman.use('/some/route/', function(req,res){
	
	// This layer will only be used for /some/route/
	res.write('you are now on /some/route/');
});

// Start a new server, passing in layman as the middle-ware manager
http.createServer(layman).listen(80);
```



Multiple Layers
---------------
Multiple layers are added by calling the `use(...)` function more than once, each time passing in a new layer that will handle the request <--> response process.  
Layers are triggered in order of FIFO - the first layer that was registered is the first layer that gets called.  
```
// Init
var layman = require('layman'),
	http = require('http');
	
// Add the first layer
layman.use(function(req,res){
	
	// First layer that gets called
	res.write('hello ');
});

// Add the second layer
layman.use(function(req,res){
	
	// Second layer that gets called
	res.write('world!');
});

// Start a new server, passing in layman as the middle-ware manager
http.createServer(layman).listen(80);
```



Flow Control
------------
A very common scenario is that one layer needs to end the response without passing control to any of the next layers that were registered.  
This is done by having a layer function `return false`. When a layer returns `false`, the response is ended, and excecution of the following layers stops (internally, layman calls `res.end()`):  
```
// Init
var layman = require('layman'),
	http = require('http');
	
// This layer returns false, so the next layer will never get called
layman.use(function(req,res){
	
	// I don't like other layers handling my response
	res.write('El Solo Layer');
	
	// Return false to send out the request, skipping layers that follow
	return false;
});

// Nobody likes me );
layman.use(function(req,res){
	
	// Second layer that gets called
	res.write('this text will never be seen. By anyone. Forever. Forever-ever!');
});

// Start a new server, passing in layman as the middle-ware manager
http.createServer(layman).listen(80);
```



POST & GET
----------
Layman also supports registering layers for that will only handle GET or POST requests (PUT and DELETE are coming soon).  
Of course, you can also define routes for each of these:
```
// Init
var layman = require('layman'),
	http = require('http');
	
// Only triggered for a GET request
layman.get(function(req,res){
	
	// GET it ?
	res.write('You are GETting this page');
});

// Only triggered for a POST request
layman.post(function(req,res){
	
	// POST only
	res.write('POST request');
});

// Using routes
layman.get('/bla', function(req,res){
    
    // You're really GETting the hand of it!
    res.write('All you GET is bla bla bla...');
});

// Start a new server, passing in layman as the middle-ware manager
http.createServer(layman).listen(80);
```




Feedback ?
----------
For any comments \ feedback etc, contact [layman@isnice.me](mailto:layman@isnice.me)