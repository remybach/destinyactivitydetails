var API_KEY = "19e94d3006c34e34a3087ee92a1d9f67",

    express = require('express'),
    request = require("request"),
    app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index')
});

app.get('/:activity', function (req, res) {
  request({
    url: "http://www.bungie.net/platform/Destiny/Stats/PostGameCarnageReport/" + req.params.activity,
    headers: {
      "X-API-Key": API_KEY
    }
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      res.send(body);
    }
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


