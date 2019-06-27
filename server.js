'use strict';

var express = require('express');
var mongo = require('mongodb');
try{
  var mongoose = require('mongoose');
} catch (e) {
  console.log(e);
}
var bodyParser = require('body-parser');
var url = require("url");
var dns = require("dns")

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
var uriConect = "mongodb://Admin:Passw0rd@cluster0-shard-00-00-mptlm.azure.mongodb.net:27017,cluster0-shard-00-01-mptlm.azure.mongodb.net:27017,cluster0-shard-00-02-mptlm.azure.mongodb.net:27017/test?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority";
mongoose.connect(uriConect, {useNewUrlParser: true}, function(error) {
  console.log("error connection:", error);
});
/*var uri = "mongodb://cluster0-mptlm.azure.mongodb.net/test";
mongoose.connect(uri,{user:'Admin',pass:'Passw0rd',useMongoClient:true}, function(error) {
  console.log("error", error);
  
});*/
var Schema = mongoose.Schema;

var urlSchema = new Schema({
  oldUrl: String,
  newUrl: Number
});
var UrlShortened = mongoose.model('urlShortened', urlSchema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended: false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/is-mongoose-ok', function(req, res) {
  if (mongoose) {
    res.json({isMongooseOk: !!mongoose.connection.readyState})
  } else {
    res.json({isMongooseOk: false})
  }
});


function findLastNewUrl() {
  return UrlShortened.findOne().sort({newUrl: "desc"});
};
function isUrlExistAlready(url) {
  return UrlShortened.where({oldUrl: url}).findOne();
}
function isShortUrlExist(url) {
  return UrlShortened.where({newUrl: url}).findOne();
}

app.post("/api/shorturl/new", function(req, res) {
  let oldUrl = req.body.url;
  try {
    let parsedUrl = new URL(oldUrl);
    dns.lookup(parsedUrl.host, function(err, address) {
      if (err) {
        res.json({"error lookup": err});
      } else if(address) {
        isUrlExistAlready(oldUrl).then(function(data) {
          if (data) {
            res.json({
              "oldUrl": data.oldUrl,
              "newUrl": data.newUrl
            });
          } else {
            findLastNewUrl().then(function(data) {
              let lastNewUrl = 1;
              if (data) {
                lastNewUrl = data.newUrl + 1
              }
              let urlToSave = new UrlShortened({
                "oldUrl": oldUrl,
                "newUrl": lastNewUrl
              });
              urlToSave.save(function(err, data) {
                if(err) {
                  res.json({"error during the save": err});
                }
                if(data) {
                  res.json({
                    "oldUrl": data.oldUrl,
                    "newUrl": data.newUrl
                  });
                }
              });
            }, function(error) {
              res.json({"error": error});
            });
          }
        }, function(error) {
          res.json({"error": error});
        });
      }
    });
  } catch (error) {
    res.json({"invalid URL": error});
  }
});

app.get("/api/shorturl/:urlToOpen", function(req, res) {
  let urlToOpen = req.params.urlToOpen;
  isShortUrlExist(urlToOpen).then(function(data){
    if (data) {
      res.redirect(data.oldUrl);
    } else {
      res.json({"invalid URL": "This url does not exist"});
    }
  }, function(error) {
    res.json({"error to get the url": error});
  });
});
  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});