var fs = require("fs-utils"),
    request = require("request"),
    Q = require("q"),

    oneWeek = 7 * 24 * 60 * 60 * 1000,
    activityDataPath,
    
    Data = function(data, destinyApi) {
      this.data = data;
      this.destinyApi = destinyApi;
      this.definitions = destinyApi.getDefinitions();

      activityDataPath = fs.normalize(process.cwd() + "/data/" + data.activityDetails.instanceId + ".json");
    };

Data.prototype.parse = function() {
  var dfd = Q.defer();

  // First try read from a cached file.
  fs.readJSON(activityDataPath, function(err, json) {
    if ( !json || !json.data ) {
      dfd.resolve(this.tidyUp());
    } else {
      console.log("Returning the cached activity data from file: " + activityDataPath);

      dfd.resolve(json.data);
    }
  }.bind(this));

  return dfd.promise;
};

Data.prototype.tidyUp = function() {
  tidy = {
    activity: {
      period: this.data.period.replace(/[TZ]/g, ' ')
    },
    gameInfoEncountered: [],
    players: {}
  };

  for (var i=0; i < this.data.entries.length; i++) {
    var entry = this.data.entries[i];

    tidy.players[entry.characterId] = this.parsePlayer(entry);
  }

  // These calls are async, so return a promise.
  return Q.fcall(function() {
    var callPromise,
        calls = [],
        toCall,
        dfd = Q.defer();

    // Activity Name and Level
    this.destinyApi.getActivityInfo(this.data.activityDetails.referenceId, function(error, body) {
      var body = body && JSON.parse(body);

      if (!error && body.ErrorStatus == "Success") {
        var activity = body.Response.data.activity;

        tidy.activity.name = activity.activityName;
        tidy.activity.level = activity.activityLevel;
        tidy.activity.icon = "http://bungie.net" + activity.icon;

        this.dfd.resolve();
      } else {
        this.dfd.reject(new Error(error || body.ErrorStatus));
      }
    }.bind({ dfd: dfd }));

    calls.push(dfd.promise);

    // Weapon Name and Description
    for (player in tidy.players) {
      var player = tidy.players[player],
          weaponInfo = player.weaponInfo;

      for (var i=0; i < weaponInfo.length; i++) {
        var weapon = weaponInfo[i];

        dfd = Q.defer();

        this.destinyApi.getWeaponInfo(weapon.id, function(error, body) {
          if (!error && body) {
            var data = JSON.parse(body);

            if (data && data.Response && data.Response.data) {
              var weapon = data.Response.data.inventoryItem;

              this.weapon.name = weapon.itemName;
              this.weapon.description = weapon.itemDescription;
              this.weapon.icon = "http://bungie.net" + weapon.icon;
            }

            this.dfd.resolve();
          } else {
            this.dfd.reject(new Error(error));
          }
        }.bind({ weapon: weaponInfo[i], dfd: dfd }));

        calls.push(dfd.promise);
      }
    }

    return Q.all(calls);
  }.bind(this)).then(function() {
    console.log('Returning the tidied up list and writing to: ' + activityDataPath);

    fs.writeFile(activityDataPath, JSON.stringify({
      lastUpdated: new Date().getTime(),
      data: tidy
    }));

    return tidy;
  });
};

Data.prototype.parsePlayer = function(entry) {
  var player = {
        // Character info
        name: entry.player.destinyUserInfo.displayName,
        characterClass: entry.player.characterClass,
        characterLevel: entry.player.characterLevel,
        clanName: entry.player.clanName,
        clanTag: entry.player.clanTag
      },
      gameInfo = {},
      enemyInfo = { assists: {}, deaths: {}, kills: {}, precision: {} },
      weaponInfo = [],
      weaponClassInfo = { kills: {}, precision: {} },
      enemiesEncountered = [],
      enemiesEncounteredData = [],
      weaponsEncountered = [],
      weaponClassInfoEncountered = [],

      NOT = "?!",
      ENEMIES = "assistsAgainst|deathsFrom|killsOf|precisionKillOf|precisionKillsOf",
      USELESS = "allParticipants|fireTeamId|weaponKillsPrecisionKills|uniqueWeaponKillsPrecisionKills",
      WEAPONS = "weapon";

  for (key in entry.extended.values) {
    var val = entry.extended.values[key].basic.displayValue;

    if (new RegExp("^(" + NOT + USELESS + "|" + ENEMIES + "|" + WEAPONS + ").*$").test(key)) {

      // Regular old game info.
      gameInfo[key] = val;

      tidy.gameInfoEncountered.indexOf(key) == -1 && tidy.gameInfoEncountered.push(key);

    } else if (new RegExp("^(" + NOT + USELESS + ")(" + WEAPONS + ").*$").test(key)) {

      var name;

      // Weapon info

      if (key.indexOf('weaponKills') > -1) {
        name = key.replace(/^weaponKills/, '');
        weaponClassInfo['kills'][name] = val;
      } else if (key.indexOf('weaponPrecisionKills') > -1) {
        name = key.replace(/^weaponPrecisionKills/, '');
        weaponClassInfo['precision'][name] = val;
      }

      name && weaponClassInfoEncountered.indexOf(name) == -1 && weaponClassInfoEncountered.push(name);

    } else if (new RegExp("^(" + NOT + USELESS + ")(" + ENEMIES + ").*$").test(key)) {

      var name = this.definitions[key].statName,
          enemy, type = '';

      // Enemy info

      if (key.indexOf('assistsAgainst') > -1) {
        key = key.replace(/assistsAgainst/, '');
        type = 'assists';
      } else if (key.indexOf('deathsFrom') > -1) {
        key = key.replace(/deathsFrom/, '');
        type = 'deaths';
      } else if (key.indexOf('killsOf') > -1) {
        key = key.replace(/killsOf/, '');
        type = 'kills';
      } else if (key.indexOf('precisionKillOf') > -1 || key.indexOf('precisionKillsOf') > -1) {
        key = key.replace(/precisionKillOf/, '');
        type = 'precision';
      }

      enemy = { key: key, val: val, name: name };
      enemyInfo[type][key] = enemy;
      if (enemiesEncountered.indexOf(key) == -1) {
        enemiesEncountered.push(key);
        enemiesEncounteredData.push(enemy);
      }

    }

    for (key in entry.extended.weapons) {
      var val = entry.extended.weapons[key];

      if (weaponsEncountered.indexOf(val.referenceId) == -1) {
        weaponInfo.push({
          id: val.referenceId,
          kills: val.values.uniqueWeaponKills.basic.displayValue,
          precision: val.values.uniqueWeaponPrecisionKills.basic.displayValue
        });
        weaponsEncountered.push(val.referenceId);
      }
    }

    player.gameInfo = gameInfo;
    player.enemyInfo = enemyInfo;
    player.enemiesEncountered = enemiesEncountered;
    player.enemiesEncounteredData = enemiesEncounteredData;
    player.weaponInfo = weaponInfo;
    player.weaponClassInfo = weaponClassInfo;
    player.weaponsEncountered = weaponsEncountered;
    player.weaponClassInfoEncountered = weaponClassInfoEncountered;

    player.hasInfo = player.weaponInfo.length && player.weaponClassInfoEncountered.length && player.enemiesEncountered.length;
  }

  return player;
};

// This method is run as a singleton.
Data.purgeOldCache = function() {
  fs.glob('data/*.json', function (err, paths) {
    if (!err) {
      paths = paths.filter(function(path) {
        return /data\/[0-9]+\.json/.test(path);
      });

      for (var i = paths.length - 1; i >= 0; i--) {
        fs.readJSON(paths[i], function(foo, json) {
          if (json.lastUpdated < (new Date().getTime() - oneWeek)) {
            console.log(this.path + " is stale. Deleting.");
            fs.del(this.path);
          }
        }.bind({ path: paths[i] }));
      };
    }
  });

  // Check this once a week.
  setTimeout(Data.purgeOldCache, oneWeek);
};

exports.Data = Data;
