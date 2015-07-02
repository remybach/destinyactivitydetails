var Data = function(data, definitions, API_KEY, URLS) {
  this.data = data;
  this.definitions = definitions;
  this.API_KEY = API_KEY;
  this.URLS = URLS;
},

    request = require("request"),
    Q = require("q");

Data.prototype.tidyUp = function() {
  tidy = {
    activity: {
      period: this.data.period.replace(/[TZ]/g, ' ')
    },
    gameInfoEncountered: []
  };

  tidy.players = {};

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
    toCall = function(error, response, body) {
      if (!error && body) {
        var activity = JSON.parse(body).Response.data.activity;

        tidy.activity.name = activity.activityName;
        tidy.activity.level = activity.activityLevel;
        tidy.activity.icon = "http://bungie.net" + activity.icon;

        this.dfd.resolve();
      } else {
        this.dfd.reject(new Error(error));
      }
    }.bind({ dfd: dfd })
    this.getActivityInfo(this.data.activityDetails.referenceId, toCall);
    calls.push(dfd.promise);

    // Weapon Name and Description
    for (player in tidy.players) {
      var player = tidy.players[player],
          weaponInfo = player.weaponInfo;

      for (var i=0; i < weaponInfo.length; i++) {
        var weapon = weaponInfo[i];

        dfd = Q.defer();

        toCall = function(error, response, body) {
          if (!error && body) {
            var weapon = JSON.parse(body).Response.data.inventoryItem;

            this.weapon.name = weapon.itemName;
            this.weapon.description = weapon.itemDescription;
            this.weapon.icon = "http://bungie.net" + weapon.icon;

            this.dfd.resolve();
          } else {
            this.dfd.reject(new Error(error));
          }
        }.bind({ weapon: weaponInfo[i], dfd: dfd });

        this.getWeaponInfo(weapon.id, toCall);
        calls.push(dfd.promise);
      }
    }

    return Q.all(calls);
  }.bind(this)).then(function() {
    console.log('returning the tidied up list.');
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

Data.prototype.getActivityInfo = function(id, callback) {
  request({
    url: this.URLS.manifest + '1/' + id, // 1 = activity
  }, callback);
};

Data.prototype.getWeaponInfo = function(id, callback) {
  request({
    url: this.URLS.manifest + '6/' + id, // 6 = weapons
    headers: {
      "X-API-Key": this.API_KEY
    }
  }, callback);
};

exports.Data = Data;