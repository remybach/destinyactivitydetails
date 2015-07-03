var JSON_REG = /\.json$/i,
  
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
      destinyApi.getActivityData(req.params.activityId.replace(JSON_REG, ''), function(error, body) {
        if (!error) {
          res.send(body);
        } else {
          res.render('pages/index', { error: error });
        }
      });
    } else {
      destinyApi.getActivityData(req.params.activityId, function(error, body) {
        if (!error) {
          var data = JSON.parse(body),
              dataUtil;

          if (data) {
            dataUtil = new Data(data.Response.data, destinyApi);

            Q.fcall(dataUtil.tidyUp.bind(dataUtil)).then(function(tidiedData) {
              res.render('pages/activity', { error: false, data: tidiedData, activityId: req.params.activityId });
            }).fail(function(error) {
              res.render('pages/activity', { error: error });
            });

          } else {
            res.render('pages/index', { error: error });
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
