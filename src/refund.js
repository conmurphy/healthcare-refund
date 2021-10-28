// App requires
var express = require("express");
var redis = require("redis");
var os = require("os");
const path = require("path");
const bodyParser = require("body-parser");


require("console-stamp")(console, "ddd mmm dd yyyy HH:MM:ss");

// variable used
var REDIS_IP = process.env.REDIS_SERVICE
var REDIS_PORT = process.env.REDIS_PORT


const APP_PORT = 5050;
var addDelay = false;
var currentDelay = 0;
var minDelay = 0;
var maxDelay = 0;
// creating server
var app = express();

// tell the server what port to listen on
app.listen(APP_PORT, function () {
  console.log(`Refund app listening on port ${APP_PORT}!`);
});

// app definition
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

var client = redis.createClient({
  port: REDIS_PORT,
  host: REDIS_IP,
  socket_keepalive: true
});

// connecting to the db
client.on("connect", function () {
  console.log("Redis client connected!");
  DBReachable = true;
});

/**
 * Get a list of existing passenger
 * Method: GET
 */
app.get("/list", function (req, res) {
  console.log("Getting a list of existing booking... ");
  var pass = [];
  if (DBReachable) {
    try {
      client.lrange("transactions", 0, -1, function (error, result) {
        result.forEach(p => pass.push(JSON.parse(p)));
        if (addDelay) currentDelay = setDelay();
        setTimeout(function () {
          res.json(pass);
        }, currentDelay);
      });
    } catch (error) {
      console.log("DB is not responding: Error is " + error);
      returnJSON(res);
    }
  } else {
    returnJSON(res);
  }
});

/**
 * 
 * @returns The current delay in serving request
 */
function setDelay() {
  var currentDelay = Math.floor(
    maxDelay + (minDelay - maxDelay) * Math.random()
  );
  console.log(
    `Added delay is: ${currentDelay}, range:${minDelay}/${maxDelay} `
  );
  return currentDelay;
}


/**
 * Refunding a patient
 */
app.post("/refund", function (req, res) {
  patient = JSON.parse(req.body.pToRefund);
  console.debug("Patient to be refunded is: \n" + req.body.pToRefund);
  console.debug("Amount to be refunded: " + patient.price);
  var refundAmount = patient.price;

  try {
    
    client.lrem("transactions", 1, req.body.pToRefund, function (error, result) {
      console.log("Found " + result + " result.");
      addAnalytics(JSON.parse(req.body.pToRefund))
      // Pushing to refunded transaction
      client.rpush("refunded", req.body.pToRefund);
      console.log("REDIS: Logged refunded transaction");
      setTimeout((function () {
        res.json(
          {
            refunded: result,
            amount: refundAmount,
            validation_success: result,
            hostname: os.hostname(),
            refundVer: 1
          }
        )
      }), currentDelay);

      console.log("Refunded amount: " + refundAmount);
    });
  } catch (error) {
    console.error("ERROR:" + error);
    returnJSON(res);
  }
});

/**
 * Get a list of refunded passenger
 * Method: GET
 */
app.get("/refunded", function (req, res) {
  console.log("Serving list of all refunded passengers ");
  var pass = [];
  if (DBReachable) {
    try {
      client.lrange("refunded", 0, -1, function (error, result) {
        result.forEach(p => pass.push(JSON.parse(p)));
        //result.forEach(p => console.log("Data from DB: " + p));
        if (addDelay) currentDelay = setDelay();
        setTimeout(function () {
          res.json(pass);
        }, currentDelay);
      });
    } catch (error) {
      console.log("DB is not responding: Error is " + error);
      returnJSON(res);
    }
  } else {
    returnJSON(res);
  }
});

app.get("/healthz", function (req, res) {
  res.write("I'm fine");
  res.end();
});

app.get("/delayOn", function (req, res) {
  console.log(
    `Adding delay as requested sir: min ${req.query.min}, max ${req.query.max}`
  );
  addDelay = true;
  minDelay = parseInt(req.query.min);
  maxDelay = parseInt(req.query.max);
  res.json({ delay: true });
});
app.get("/delayOff", function (req, res) {
  console.log("Removing delay as requested sir.");
  addDelay = false;
  minDelay = 0;
  maxDelay = 0;
  res.json({ delay: false });
});

function returnJSON(res) {
  return res.json({ service_unavailable: true });
}
