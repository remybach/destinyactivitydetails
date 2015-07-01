var API_KEY = "19e94d3006c34e34a3087ee92a1d9f67",
    URLS = {
      activity: "http://www.bungie.net/platform/Destiny/Stats/PostGameCarnageReport/",
      definitions: "https://www.bungie.net/Platform/Destiny/Stats/Definition/",
      manifest: "https://www.bungie.net/Platform/Destiny/Manifest/"
    },
    JSON_REG = /\.json$/i,
  
    bodyParser = require('body-parser'),
    express = require('express'),
    request = require("request"),
    Q = require('q'),
    Data = require('./utils/data.js').Data,
    app = express(),
    definitions;

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.post('/', function(req, res) {
  if (req.body.activityId) {
    res.redirect('/' + req.body.activityId);
  } else {
    res.render('pages/index', { error: false });
  }
});
app.get('/', function(req, res) {
  res.render('pages/index', { error: false });
});
app.get('/:activityId', function(req, res) {
  if (/[0-9]+(\.json)?/.test(req.params.activityId)) {
    if (JSON_REG.test(req.params.activityId)) {
      getActivityData(req.params.activityId.replace(JSON_REG, ''), function(error, response, body) {
        if (!error && response.statusCode == 200) {
          res.send(body);
        }
      });
    } else {
      getActivityData(req.params.activityId, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          var data = JSON.parse(body),
              dataUtil;

          if (data) {
            dataUtil = new Data(data.Response.data, definitions, API_KEY, URLS);

            Q.fcall(dataUtil.tidyUp.bind(dataUtil)).then(function(tidiedData) {
              res.render('pages/activity', { error: false, data: tidiedData, activityId: req.params.activityId });
            }).fail(function(error) {
              res.render('pages/activity', { error: error });
            });

          } else {
            res.render('pages/index', { error: "No data was returned for this activity id." });
          }
        }
      });  
    }
  } else {
    res.render('pages/index', { error: false });
  }
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

function getActivityData(activityId, callback) {
  console.log('Looking up data for activity with id: ' + activityId);
  request({
    url: URLS.activity + activityId,
    headers: {
      "X-API-Key": API_KEY
    }
  }, callback);
}

request({
  url: URLS.definitions,
  headers: {
    "X-API-Key": API_KEY
  }
}, function(error, response, body) {
  if (!error && response.statusCode == 200) {
    definitions = JSON.parse(body).Response;
  } else {
    throw Error(error);
  }
});