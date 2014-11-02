Layman.js
=========
A simple manager for HTTP request <--> response layers in node.js

Layman.js is a simplified version of Sencha's Connect. It allows you to easily manage multiple layers of request <--> response handlers (aka middle-ware) for your node.js server.

#### Table of Contents
- Overview
- Using Routes
- Multiple Layers
- Flow Control
- POST & GET
- Nested Layers
- Multiple Hosts
- Organizing Files
- Change Log
- Feedback


Overview
--------
The following is the 'layman' version of a typical 'hello world' example.  
Layman uses the popular syntax of `use(middleware)`, where `middleware` is a callback function that will get the `request` and `response` as it's only arguments:
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// Add a middleware layer to handle request <--> response
site.use(function(req,res){
	
	res.write('layman is awesome!');
});

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```
`site` is just a function which is used as the main request handler for your server. Learn more about how layman works on the wiki pages.




Using routes
------------
If you want to use a certain middleware only for a specific route, you can do so by specifying the route as the first parameter to the `use(...)` function:  
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// This layer handles requests to /some/route/
site.use('/some/route/', function(req,res){
	
	// This layer will only be used for /some/route/
	res.write('you are now on /some/route/');
});

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```




Multiple Layers
---------------
Multiple layers are added by calling the `use(...)` function more than once, each time passing in a new layer that will handle the request <--> response process.  
Layers are triggered in order of FIFO - the first layer that was registered is the first layer that gets called.  
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// Add the first layer
site.use(function(req,res){
	
	// First layer that gets called
	res.write('hello ');
});

// Add the second layer
site.use(function(req,res){
	
	// Second layer that gets called
	res.write('world!');
});

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```



Flow Control
------------
A very common scenario is that one layer needs to end the response without passing control to any of the next layers that were registered.  
This is done by having a layer function `return false`. When a layer returns `false`, the response is ended, and excecution of the following layers stops (internally, layman calls `res.end()`):  
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// This layer returns false, so the next layer will never get called
site.use(function(req,res){
	
	// I don't like other layers handling my response
	res.write('El Solo Layer');
	
	// Return false to send out the request, skipping layers that follow
	return false;
});

// Nobody likes me );
site.use(function(req,res){
	
	// Second layer that gets called
	res.write('this text will never be seen. By anyone. Forever. Forever-ever!');
});

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```



POST & GET
----------
Layman also supports registering layers for that will only handle GET or POST requests (PUT and DELETE are coming soon).  
Of course, you can also define routes for each of these:
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// Only triggered for a GET request
site.get(function(req,res){
	
	// GET it ?
	res.write('You are GETting this page');
});

// Only triggered for a POST request
site.post(function(req,res){
	
	// POST only
	res.write('POST request');
});

// Using routes
site.get('/bla', function(req,res){
    
    // You're really GETting the hand of it!
    res.write('All you GET is bla bla bla...');
});

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```



Nested Layers
-------------
In some cases, you might want to separate the layers that handle your 'sales' department from your 'blog'. Using layman, this is simple task:
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	sales = layman(),
	blog = layman(),
	site = layman();
	
// Our blog
blog.use(function(req,res){
    res.write('welcome to my awesome blog!!');
});


// Sales
sales.use(function(req, res){
    res.write('buy now!');
});

sales.post(function(req,res){
    res.write('thanks you for your purchase!');
});



// Setup our site to use the correct layman based on the path
site.use('/sales', sales);
site.use('/blog', blog);

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```



Multiple Hosts
--------------
The example below is similar to the code above - only this time instead of registering `sales` and `blog` with routes, we register each to it's respective sub-domain:
```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	blog = layman(),
	sales = layman(),
	site = layman();
	
// Our blog
blog.use(function(req,res){
    res.write('welcome to my awesome blog!!');
});


// Sales
sales.use(function(req, res){
    res.write('buy now!');
});

sales.post(function(req,res){
    res.write('thanks you for your purchase!');
});



// Setup our site to use the correct layman based on the path
site.host('sales.site.com', sales);
site.host('blog.site.com', blog);

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```
* use `host` when you need to filter for a specifc domain \ subdomain





Organizing Files
----------------
In real applications, you'll want to organize your files in different ways. 
Things are no different with layman, have a look below at the code below - it's the same 'Multiple Hosts' example from above - split into 3 files:

`main.js`
```javascript
// Init
var http = require('http'),
    layman = require('layman'),
    blog = require('./blog'),
    sales = require('./sales'),
    site = layman();
    
// Setup our site's sub-domains
site.host('sales.site.com', sales);
site.host('blog.site.com', blog);

// Start a new server, passing in site as the middle-ware manager
http.createServer(site).listen(80);
```  
  
`blog.js`
```javascript
// Init
var layman = require('layman'),
    blog = layman();

// Welcome message
blog.use(function(req,res){
    res.write('welcome to my blog!!\n');
});

// Some article
blog.use('/article', function(req,res){
    res.write('bla bla bla bla bla...');
});

module.exports = blog;
```

`sales.js`
```javascript
// Init
var layman = require('layman'),
    sales = layman();

// Product page
sales.use('/product', function(req,res){
    res.write('Buy now!');
});

// After purchase
sales.use('/thankyou', function(req,res){
    res.write('ACME thanks you for your purchase!');
});

module.exports = sales;
```
* Notice that since we setup different hosts for `sales` and `blog` in `main.js` - the routes that are used in each files will be respective of that specific domain





Change Log
----------
#####v0.1.0
- Reached first minor version! Yay!
- Changed main 'layman' to return function
- Added 'host' to mount layers to domain \ subdomain
- Added support for nested laymans. One layman can now `use` another layman






Feedback ?
----------
For any comments \ feedback etc, contact [layman@isnice.me](mailto:layman@isnice.me)
  
  
  



