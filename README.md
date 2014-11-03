Layman.js
=========
A simple, lightweight manager for HTTP Request <--> Response layers for node.js

Layman.js is a simplified version of Senchalabs's Connect.  
It allows you to easily manage multiple layers of Request <--> Response handlers (aka middleware) for your node.js web server.

### Contents
- [Hello Layman](https://www.npmjs.org/package/layman#hello)
- [Using Routes](https://www.npmjs.org/package/layman#routes)
- [Multiple Layers](https://www.npmjs.org/package/layman#layers)
- [Flow Control](https://www.npmjs.org/package/layman#flowcontrol)
- [POST & GET](https://www.npmjs.org/package/layman#postget)
- [Nested Layers](https://www.npmjs.org/package/layman#nested)
- [Multiple Hosts](https://www.npmjs.org/package/layman#hosts)
- [Organizing Files](https://www.npmjs.org/package/layman#files)
- [Built-In Web Server](https://www.npmjs.org/package/layman#server)
- [Roadmap](https://www.npmjs.org/package/layman#roadmap)
- [Change Log](https://www.npmjs.org/package/layman#changelog)
- [Feedback](https://www.npmjs.org/package/layman#feedback)



***


<a name='hello'></a>
Hello Layman
------------
The following is the 'layman' version for 'hello world'. Layman uses the popular syntax of `use(middleware)`, where `middleware` is a callback function that will get the `request` and `response` as it's only arguments:  

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// Add a middleware layer to handle request <--> response
site.use(function(req,res){
	
	// Write some data to the response
	res.write('layman is awesome!');
});

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```
**Note:** `site` is just a callback function which is used as the main request handler for your server. Learn more about how layman works on the [Wiki pages on GitHub](https://github.com/ujc/Layman.js/wiki) (work in progress).



***



<a name='routes'></a>
Using Routes
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

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```
**Note:** The leading forward-slash `/` for the specified route is optional. Using `/foo` is the same as using `foo`.



***



<a name='layers'></a>
Multiple Layers
---------------
Multiple request handler layers are added by calling the `use(...)` function more than once, each time passing in a new layer that will handle the Request <--> Response pair.  
Layers are triggered in order of FIFO - the first layer that was registered is the first layer that will handle the incoming request:  

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// Add the first layer
site.use(function(req,res){
	
	// First layer that gets the request
	res.write('hello ');
});

// Add the second layer
site.use(function(req,res){
	
	// Second layer that gets the request
	res.write('world!');
});

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```



***



<a name='flowcontrol'></a>
Flow Control
------------
A very common scenario is that one layer needs to end the response without passing control to any of the next layers that were registered.  This is done by having that layer `return false`.  
When a layer (aka callback, aka middleware) returns `false`, the response is ended and sent out, and excecution of any following layers stops (internally, layman calls `res.end()`):  

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman();
	
// This layer returns false, so the next layer will never get called
site.use(function(req,res){
	
	// A lone wolf
	res.write('El Solo Lobo');
	
	// Return false to send out the response, skipping any following layers
	return false;
});

// Why doesn't anyone call me ?
site.use(function(req,res){
	
	// Second layer that gets called
	res.write('This text will never be seen. By anyone. Forever. Forever-ever!');
});

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```


***



<a name='postget'></a>
POST & GET
----------
Layman also supports registering layers that will only handle GET or POST requests (PUT and DELETE are coming soon).  
You can also define routes for each of these:

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
	res.write('This is a direct result of a POST request');
});

// Using routes
site.get('/bla', function(req,res){
    
    // You're really GETting the hang of it!
    res.write('All you GET is bla bla bla...');
});

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```



***




<a name='nested'></a>
Nested Layers
-------------
In some cases, you're team might need to separate the layers that handle your 'sales' department from those that handle your 'blog'. Using layman, this is a really easy to accomplish:

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman(),
	sales = layman(),
	blog = layman();

// Setup our blog
blog.use(function(req,res){
    res.write('welcome to my awesome blog!!');
});


// Setup the sales department
sales.use(function(req, res){
    res.write('buy now!');
});

sales.post(function(req,res){
    res.write('thanks you for your purchase!');
});


// Setup the site to use the correct layman based on the route
site.use('/sales', sales);
site.use('/blog', blog);

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```


***



<a name='hosts'></a>
Multiple Hosts
--------------
The example below is similar to the code above - only this time instead of registering `sales` and `blog` with routes, we register each to it's respective sub-domain:

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	site = layman(),
	blog = layman(),
	sales = layman();


// Setup our blog
blog.use(function(req,res){
    res.write('welcome to my awesome blog!!');
});


// Setup the sales department
sales.use(function(req, res){
    res.write('buy now!');
});

sales.post(function(req,res){
    res.write('thanks you for your purchase!');
});


// Setup our site to use the correct layman based on the path
site.host('sales.site.com', sales);
site.host('blog.site.com', blog);

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```
* use `host` when you need to mount a specifc domain \ subdomain



***



<a name='files'></a>
Organizing Files
----------------
In real world applications, you'll want to organize files in a way that is meaningful to your team.  
Have a look below at the code below - it's the same 'Multiple Hosts' example from above - just split into 3 different files:

`main.js`

```javascript
// FILE: main.js
// Init
var http = require('http'),
    layman = require('layman'),
    blog = require('./blog'),
    sales = require('./sales'),
    site = layman();
    
// Setup our site's sub-domains to use the dedicated layman
site.host('sales.site.com', sales);
site.host('blog.site.com', blog);

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```  
  
`blog.js`

```javascript
// FILE: blog.js
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
// FILE: sales.js
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
* Notice that since we setup different hosts for `sales` and `blog` in `main.js` - the routes that are used in each file will be relative to the specified sub-domain



***



<a name='server'></a>
Built-In Web Server
-------------------
Layman also provides a convenience method to start a new web server, making it even easier to implement in your next project:

```javascript
// Init
var layman = require('layman'),
    site = layman();

// Setup our request handler(s)
site.use(function(req,res){
	res.write('it\'s a brave new world!');
});

// Site is up and running!
site.listen(80);

```
**Note:** When using `listen()`, the port number is optional, and if omitted, the port number defaults to 80. The above is identical to `site.listen()`.




***



<a name='roadmap'></a>
Roadmap
-------
- Create layman middleware and middleware bundles
- Play nice with Connect\Express middleware
- Built-in support for HTTP PUT and HTTP DELETE

**Note:** You should be able to use any Connect middleware with Layman at the moment, however, this feature hasn't been fully tested yet (work in progress) 



***



<a name='changelog'></a>
Change Log
----------
#####v0.1.5
- Added: `layman.listen([port])` as a convenience method to start a new web server

#####v0.1.4  
- Refactored code to improve performance (even more ?? OMG!)

#####v0.1.3
- Updated README.md

#####v0.1.2
- Updated README.md

#####v0.1.1
- Reached first minor version! Yay!
- Change: Calling `require('layman')` now returns a factory function
- New: You can now use `layman.host(...)` to mount layers to domain \ subdomain
- New: Support for nested laymans like `oneLayman.use(twoLayman)`  



***




<a name='feedback'></a>
Feedback ?
----------
Layman is still in development, and any criticism \ feedback is welcome.
Please get in touch @ [layman@isnice.me](mailto:layman@isnice.me)
  
  
  



