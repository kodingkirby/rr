//Libs
var express = require("express");
fs = require('fs')
var app = express();
mustache = require('mustache')
var bodyParser = require('body-parser');
const NodeCache = require("node-cache");
const prevResults = new NodeCache();
require('dotenv').config();

//Magic Vars TODO: Move to .env
var path = __dirname + '/views/';
const ttl = (60 * 2);   //2 mins
var isMatch = "no";
var randResult = {};    //init the results obj
var searchRequest = {}; //stores state of current search paramter

//Import Yelp! connector library and API key
const yelp = require('yelp-fusion');
const apiKey = process.env.apiKeyz;
const client = yelp.client(apiKey);

//Middleware to handle JSON blobs returned from Yelp!
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));

/* 
This middleware sub-stack shows request info for any 
type of HTTP request to the /user/:id path 
*/
app.use(function (req, res, next) {
  console.log('Request URL:', req.originalUrl)
  next()
}, function (req, res, next) {
  console.log('Request Type:', req.method)
  next()
});

//Homepage
app.get("/",function(req,res){
  res.sendFile(path + "index.html");
});

//Submit restaraunt parameter data  
app.post("/process_post", function(req,res){
	if (req.body.playlist == "Something Healthy"){
		req.body.playlist = "Healthy"; //Hard coded search term
	}
	//Generate Search Request
	searchRequest = {
		term:req.body.playlist, 
		location:req.body.address,
		radius:req.body.distanceSelect,
		limit: 20 //Pick randomly from top 20 locations (yelp API can return up to 50)
	}

	/* 
	Send search request then parse the returned restaurants from Yelp into a list
	A restaraunt is then selected from the list at random
	*/ 
	client.search(searchRequest).then(response => {
	  randResultIndex = Math.floor(Math.random()*response.jsonBody.businesses.length)
	  randResult = response.jsonBody.businesses[randResultIndex];
	  console.log("Businesses returned: " + response.jsonBody.businesses.length);
	  console.log(randResult);

	  if(randResult.is_closed == true){
	  	randResult.is_closed = "This place is currently open!";
	  	console.log("This place is currently open!");
	  }
	  else{
	  	randResult.is_closed = "Sorry, this place is closed";
	  	console.log("place is closed");
	  }
	  //Saves the current result to avoid displaying duplicate restaurants on re roll
	  prevResults.set(randResult.alias, randResult, ttl, function(err, success){
	  	if (!err && success){
	  		console.log(randResult.alias + " was logged");

	  	}else{
	  		console.log("No results cached");
	  	}
	  });

	  var rData = {records:randResult};
	  var page = fs.readFileSync(__dirname + '/views/result.html', "utf8");
	  var html = mustache.to_html(page, rData);
	  res.send(html);

	}).catch(e => {
	  console.log(e);
	});
});

app.get('/results', function(req,res){
	res.sendFile(path + "result.html");	
})

app.get("/resultjson", function(req,res){
	console.log(randResult);
	res.send(randResult);
});

app.get("/redirect", function(req,res){
	res.redirect('/reroll');
})

/*
This route picks another random restaurant (re rolls) and ensures the 
same result is not displayed at any point during the user's session.
TODO: Error Screen for when out of restaurants to choose from (rare)
*/
app.get("/reroll", function(req,res){
	client.search(searchRequest).then(response => {
	  randResult = response.jsonBody.businesses[Math.floor(Math.random()*response.jsonBody.businesses.length)];
	  if(randResult.is_closed == true){
	  	randResult.is_closed = "This place is currently open!";
	  	console.log("This place is currently open!");
	  }
	  else{
	  	randResult.is_closed = "Sorry, this place is closed";
	  	console.log("place is closed");
	  }

	  prevResults.keys(function(err,mykeys){
	  	if(!err){
	  		console.log("the keys " + mykeys);

	  		for (var i=0; i<mykeys.length; i++){
	  			if (mykeys[i] == randResult.alias){
	  				console.log("Same restaurant was chosen");
	  				isMatch = "yes";
	  				break;
	  			}
	  		}
	  		if(isMatch == "no"){//cache is there were no matches found
				prevResults.set(randResult.alias, randResult, ttl, function(err, success){
				  	if (!err && success){
				  		console.log(randResult.alias + " was logged");
				  	}else{
				  		console.log("nothing was cache");
		  			}
		 		 });
	  		}else if (isMatch == "yes"){//otherwise if there was a match try again
	  			isMatch = "no"; //put it back for next time
	  			res.redirect("/reroll");
	  		}
	  	}
	  });

	  console.log(randResult);
	  console.log("Businesses returned: " + response.jsonBody.businesses.length);

	  var rData = {records:randResult};
	  var page = fs.readFileSync(__dirname + '/views/result.html', "utf8"); // bring in the HTML file
	  var html = mustache.to_html(page, rData); // replace all of the data
	  res.send(html);

	}).catch(e => {
	  console.log(e);
	});
})

app.listen(3000,function(){
  console.log("Live at Port 3000");
});