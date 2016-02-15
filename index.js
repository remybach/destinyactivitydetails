var ACTIVITY_WITH_JSON = /[0-9]+(\.json)?/,
    JSON_FILE = /\.json$/i,
  
    bodyParser = require('body-parser'),
    express = require('express'),
    request = require("request"),
    Q = require('q'),
    Destiny = require('./utils/destiny.js').Destiny,
    Data = require('./utils/data.js').Data,
    
    app = express(),
    destinyApi = new Destiny(),
    definitions;

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());     // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
  extended: true
}));

// views is the directory for all template files
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
  // Make sure it is an activity id being passed (including requests for the json data)
  if (ACTIVITY_WITH_JSON.test(req.params.activityId)) {
    var id = req.params.activityId.replace(JSON_FILE, '');
    
    if (JSON_FILE.test(req.params.activityId)) {
      destinyApi.getActivityData(id, function(error, body) {
        if (!error) {
          res.send(body);
        } else {
          res.render('pages/index', { error: error });
        }
      });
    } else {
      destinyApi.getActivityData(id, function(error, body) {
        if (!error) {
          var data = JSON.parse(body),
              dataUtil;

          // Ugly, but that's how the data comes back from the API ¯\_(ツ)_/¯
          if (data && data.Response && data.Response.data) {
            dataUtil = new Data(data.Response.data, destinyApi);

            Q.fcall(dataUtil.parse.bind(dataUtil)).then(function(tidiedData) {
              res.render('pages/activity', { error: false, data: tidiedData, activityId: req.params.activityId });
            }).fail(function(error) {
              res.render('pages/activity', { error: error });
            });

          } else {
            res.render('pages/index', { error: "No data was returned for this activity id." });
          }
        } else {
          res.render('pages/index', { error: error });
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

Data.purgeOldCache();