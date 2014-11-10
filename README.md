Layman.js
=========
A simple, lightweight manager for HTTP Request <--> Response layers for node.js

Layman.js is a simplified version of Senchalabs's Connect.  
It allows you to easily manage multiple layers of Request <--> Response handlers (aka middleware) for your node.js web server.

### Contents
- <a href='#hello'>Hello Layman</a>
- <a href='#routes'>Using Routes</a>
- <a href='#layers'>Multiple Layers</a>
- <a href='#async'>Asynchronous Layers</a>
- <a href='#flowcontrol'>Flow Control</a>
- <a href='#postget'>POST & GET</a>
- <a href='#nested'>Nested Layers</a>
- <a href='#hosts'>Multiple Hosts</a>
- <a href='#files'>Organizing Files</a>
- <a href='#server'>Built-In Web Server</a>
- <a href='#configs'>Layman Configs</a>
- <a href='#connect'>Connect Middleware</a>
- <a href='#roadmap'>Roadmap</a>
- <a href='#changelog'>Change Log</a>
- <a href='#feedback'>Feedback</a>  




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



<a name='async'></a>
Asynchronous Layers
-------------------
There are many ways in which a layer can be used asynchronously.  
To start with, let's build a most simplistic static-files layer for Layman.  
We'll use node's asynchronous `fs.readFile(...)` method to serve `index.html`: 

#####Example 1: Show casing `return true` to indicate an async layer


```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	files = require('fs'),
	site = layman();
	
// This layer is async because it returns 'true'
site.use(function(req,res){
	
	// Use node's `readFile(...)` method to server `index.html`
	files.readFile('index.html', function(err, data){
		
		// If anything went wrong, we simply trigger the next layer
		if (err) {
		
			// End the response, and indicate that we have issues
			res.end('Booo...the server broke );');
			return;
		}
		
		// All good! End the response, sending the contents of 'index.html' as the response data
		res.end(data);
	});
	
	// A layer can indicate that it is async by returning true
	return true;
});

// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```
**Note:** Because this layer is asynchronous, we `res.end(...)` the response within the callback function that is passed into `fs.readFile(...)`  


#####Example 2: Show casing `next()` to use with multiple layers
The example above showed a single layer handling both success and failure of reading a file. 
It's common to separate this logic by using multiple layers, where the `next` layer would only be used if an async operation failed:

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	files = require('fs'),
	site = layman();
	
// This layer is async because it returns 'true'
site.use(function(req, res, next){
	
	// Use node's `readFile(...)` method to server `index.html`
	files.readFile('index.html', function(err, data){
		
		// We'll let the 'next' layer handle any errors
		if (err) { next(); return }
		
		// All good! End the response in this layer (the next layer will not be triggered, and the response will end)
		res.end(data);
	});
	
	// A layer can indicate that it is async by returning true
	return true;
});


// This layer will be used only if the previous layer was unable to read 'index.html'
site.use(function(req,res){

	res.write('Booo...the server broke );');
});


// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```
**Note:** We used `next` as the 3rd argument for our async layer. If for any reason we weren't able to read `index.html`, the `next` layer will be triggered.  
**Note:** Unlike [Connect](https://github.com/senchalabs/connect), the `next` layer will not receive any data regarding the error that occured. Asynchronous error handling is still work in progress, this behavior might be supported in the future.



#####Example 3: Show casing `autoAsync=true` for run-time based asynchronous control
In certain cases, you may need to determine if the `next` layer should be asynchronous or not based on some data that is only available at runtime (when a request is sent to the server \ when a database operation is complete \ when a 3rd party proxy is ready for communication):

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	files = require('fs'),
	site = layman();
	

// Tell Layman to always be in async mode
site.configs.autoAsync = true;
	
	
// This layer is asynchronous because 'autoAsync' is turned on
site.use(function(req, res){
	
	// Read a 'index.html'
	fs.readFile('index.html', function(err, data){
		
		// Boo...something went asynchronously wrong );
		if (err) {
			res.end('oh no!');
			return;
		}
		
		// We're good to go!
		res.end(data);
	});
});


// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);
```
**Note:** No need for the layer to `return true`, since `autoAsync` is turned on.  
**Note:** Also, we're not using a`next` layer here, since the layer handles both success and failure.



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
**Note:** Make sure to read about <a name='async'>asynchronous layers</a> for more info on how to control layers



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



<a name='configs'></a>
Layman Configs
--------------
The following options are currently available for configuration, all of which can also be changed at run-time (using middleware layers) for fine tuning Layman:

```javascript
// Init
var layman = require('layman'),
	site = layman();
	
	
// +---------------------------------------------------------------+
// | All configs are available directly on layman, under 'configs' |
// +---------------------------------------------------------------+

// Should Layman automatically `res.end()` the request after all layers were triggered (default: true)
site.configs.autoEnd = true;


// Should Layman consider all layers to be asynchronous by default ? (default: false)
site.configs.autoAsync = false;


// When matching the 'hostname' of a request, Layman will use this regex, and compare against the first matching group (default: /(\w+[^:,]*)\:?/)
site.configs.hostRegex	= /(\w+[^:,]*)\:?/;  
```
**Note:** `autoEnd` has no effect on asynchronous layers  
**Note:** All configs can be changes at run-time (i.e. via a middleware layer)



***



<a name='connect'></a>
Connect Middleware
------------------
Layman now includes built-in support for Connect middleware.  
To use such middleware, pass in a boolean `true` as the first argument when registering a layer to use with your site:

```javascript
// Init
var layman = require('layman'),
	http = require('http'),
	middleware = require('some-connect-middleware'),
	site = layman();
	
	
// This layer is just a standard Layman layer
site.use(function(req, res){
	
	// Just console that we got a new request
	console.log('Incoming!');
});


// Using a Connect middleware on '/blog'
site.use(true, middleware());


// And finish up with another Layman layer
site.use(function(req,res){
	
	res.write('The previous layer was a Connect middleware');
});



// Start a new server, passing in 'site' as the main request <--> response manager
http.createServer(site).listen(80);



```
**Note:** At the moment, Layman does not support Connect error middleware (might be added in the future)  
**Note:** You can use any of Layman's API such as `get(...)` \ `post(...)` \ `host(...)` and routing (using `use(true, '/some/route', middleware)`  
**Note:** There are more Connect middleware than we can test against. If you find any bugs, please get in touch @ [layman@isnice.me](mailto:layman@isnice.me) OR open an issue on github

***



<a name='roadmap'></a>
Roadmap
-------
- Create layman middleware and middleware bundles
- <s>Play nice with [Connect](https://github.com/senchalabs/connect) middleware</s> <a href='#connect'>Complete, Woohoo!</a>
- Built-in support for HTTP PUT and HTTP DELETE

**Note:** You should be able to use any Connect middleware with Layman at the moment, however, this feature hasn't been fully tested yet (work in progress) 



***



<a name='changelog'></a>
Change Log
----------
#####v0.1.6
- New: Built-in support for Layman ASYNC layers (<a hfre='#async'>more info</a>)  
- New: Layman is now compatible with [Connect](https://github.com/senchalabs/connect) middleware (<a hfre='#connect'>more info</a>)  
- Update: Documentation now includes info Layman's `configs` object (<a hfre='#configs'>more info</a>) 





***




<a name='feedback'></a>
Feedback ?
----------
Layman is still in development, and all feedback is welcome.  
Please do get in touch @ [layman@isnice.me](mailto:layman@isnice.me)
  
  
  



