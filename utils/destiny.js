var URLS = {
      activity: "http://www.bungie.net/platform/Destiny/Stats/PostGameCarnageReport/",
      definitions: "https://www.bungie.net/Platform/Destiny/Stats/Definition/",
      manifest: "https://www.bungie.net/Platform/Destiny/Manifest/"
    },
    DEFINITIONS,

    fs = require("fs-utils"),
    request = require("request"),

    definitionsFile,
    definitionsPath = fs.normalize(process.cwd() + "/data/definitions.json"),
    
    Destiny = function() {
      // Update definitions on init.
      this.updateDefinitions();

      // Update the definitions daily.
      setInterval(this.updateDefinitions, 24 * 60 * 60 * 1000);
    };

Destiny.prototype.getActivityData = function(activityId, callback) {
    console.log('Looking up data for activity with id: ' + activityId);
    request({
      url: URLS.activity + activityId,
      headers: {
        "X-API-Key": process.env.BUNGIE_API_KEY
      }
    }, function(error, response, body) {
      if (!error && response.statusCode == 200) {
        callback(false, body);
      } else {
        callback("No data was returned for this activity id.", body);
      }
    });
};

Destiny.prototype.getActivityInfo = function(id, callback) {
  this.getManifestInfo(1, id, callback);
};

Destiny.prototype.getWeaponInfo = function(id, callback) {
  this.getManifestInfo(6, id, callback);
};

Destiny.prototype.getManifestInfo = function(type, id, callback) {
  request({
    url: URLS.manifest + type + '/' + id,
    headers: {
      "X-API-Key": process.env.BUNGIE_API_KEY
    }
  }, function(error, response, body) {
    var name = "";

    if (!error && response.statusCode == 200) {
      callback(false, body);
    } else {
      switch(type) {
        case 1:
          name = " activity";
          break;
        case 6:
          name = " weapon";
          break;
        default:
          name = " (DestinyDefinitionType: " + type + ")"
      }

      callback("There was an error fetching details for that" + name + ".", body);
    }
  });
};

Destiny.prototype.getDefinitions = function() {
  return DEFINITIONS;
};

Destiny.prototype.updateDefinitions = function() {
  console.log("Updating definitions...");

  fs.readJSON(definitionsPath, function(err, json) {
    var yesterday = (new Date().getTime() - 24 * 60 * 60 * 1000);
    
    if ( !json || !json.data || json.lastUpdated < yesterday ) {
      console.log("Fetching definitions from API again.");

      request({
        url: URLS.definitions,
        headers: {
          "X-API-Key": process.env.BUNGIE_API_KEY
        }
      }, function(error, response, body) {
        if (!error && response.statusCode == 200) {
          DEFINITIONS = JSON.parse(body).Response;
          fs.writeFile(definitionsPath, JSON.stringify({
            lastUpdated: new Date().getTime(),
            data: DEFINITIONS
          }));
          console.log("Definitions cached data file updated.");
        } else {
          throw Error(error);
        }
      });
    } else {
      console.log("Using definitions from cached data file.");

      DEFINITIONS = json.data;
    }

  });
};

exports.Destiny = Destiny;
