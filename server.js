var express = require("express");
fs = require('fs')
var app = express();
mustache = require('mustache')
var bodyParser = require('body-parser');
require('dotenv').config();

var path = __dirname + '/views/';


//=================
const yelp = require('yelp-fusion');
const apiKey = process.env.apiKeyz;
const client = yelp.client(apiKey);

//==================


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('views'));




// a middleware sub-stack shows request info for any type of HTTP request to the /user/:id path
app.use(function (req, res, next) {
  console.log('Request URL:', req.originalUrl)
  next()
}, function (req, res, next) {
  console.log('Request Type:', req.method)
  next()
});

app.get("/",function(req,res){
  res.sendFile(path + "index.html");
});

var randResult = {};//init the results obj
var searchRequest = {}; //want to be able to reuse query
app.post("/process_post", function(req,res){

	searchRequest = {
		term:req.body.playlist,
		location:req.body.address,
		radius:req.body.exampleRadios,
		limit: 15 //pick randomly from top 15 locations (works up to 50)
	}

	client.search(searchRequest).then(response => {
	  randResult = response.jsonBody.businesses[Math.floor(Math.random()*response.jsonBody.businesses.length)];
	  console.log(randResult);
	  console.log("Businesses returned: " + response.jsonBody.businesses.length);
	  //res.send(randResult);
	  //const template = handlebars.compile(resultSource, { strict: true });
	  //const result = template(randResult);
	  //console.log(result);

	  var rData = {records:randResult};
	  var page = fs.readFileSync(__dirname + '/views/result.html', "utf8"); // bring in the HTML file
	  var html = mustache.to_html(page, rData); // replace all of the data
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

app.get("/reroll", function(req,res){
	client.search(searchRequest).then(response => {
	  randResult = response.jsonBody.businesses[Math.floor(Math.random()*response.jsonBody.businesses.length)];
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