angular.module('songhop.services', ['ionic.utils'])
.factory('User', function($http, $q, $localstorage, SERVER) {

  var songstar = {
    username: false,
    session_id: false,
    favorites: [],
    newFavorites: 0
  }

  songstar.auth = function(username, signingUp) {
    var authRoute;
    if (signingUp) {
      authRoute = 'signup';

    } else {
      authRoute = 'login'
    }

    return $http.post(SERVER.url + '/' + authRoute, {username:username})
      .success(function(data){
        songstar.setSession(data.username, data.session_id, data.favorites);
      });
  }

  songstar.addSongToFavorites = function(song) {
    // make sure there's a song to add
    if (!song) return false;

    // add to favorites array
    songstar.favorites.unshift(song);
    songstar.newFavorites++;

    //PERSIST THIS TO THE SERVER
    return $http.post(SERVER.url + '/favorites', {session_id: songstar.session_id, song_id:song.song_id});
  }

  songstar.populateFavorites = function() {
    return $http({
      method: 'GET',
      url: SERVER.url + '/favorites',
      params: { session_id: songstar.session_id }
    }).success(function(data){
      songstar.favorites = data;
    });
  }

  songstar.setSession = function(username, session_id, favorites) {
    if (username) songstar.username = username;
    if (session_id) songstar.session_id = session_id;
    if (favorites) songstar.favorites = favorites;

    $localstorage.setObject('user', {username:username, session_id: session_id});
  }

  songstar.checkSession = function() {
    var defer = $q.defer();
    if (songstar.session_id) {
      defer.resolve(true);
    } else {
      var user = $localstorage.getObject('user');
      if (user.username) {
        songstar.setSession(user.username, user.session_id);
        songstar.populateFavorites().then(function() {
          defer.resolve(true);
        });
      } else {
        defer.resolve(false);
      }
    }
    return defer.promise;
  }

  songstar.removeSongFromFavorites = function(song, index) {
    // make sure there's a song to add
    if (!song) return false;

    // add to favorites array
    songstar.favorites.splice(index, 1);

    //PERSIST THIS TO THE SERVER
    return $http({
      method: 'DELETE',
      url: SERVER.url + '/favorites',
      params: {session_id: songstar.session_id, song_id: song.song_id }
    });
  }

  songstar.favoriteCount = function() {
    return songstar.newFavorites;
  }

  songstar.destroySession = function() {
    $localstorage.setObject('user', {});
    songstar.username = false;
    songstar.session_id = false;
    songstar.favorites = [];
    songstar.newFavorites = 0;
  }

  return songstar;
})


.factory('Recommendations', function($http, SERVER, $q) {

  var media;

  var o = {
    queue: []
  }

  o.init = function() {
    if (o.queue.length === 0) {
      return o.getNextSongs();
    } else {
      return o.playCurrentSong();
    }
  }

  o.getNextSongs = function() {
    return $http({
      method: 'GET',
      url : SERVER.url + '/recommendations'
    }).success(function(data){
      o.queue = o.queue.concat(data);
    });
  }

  o.nextSong = function() {
    o.queue.shift();

    o.haltAudio();

    if (o.queue.length <= 3) {
      o.getNextSongs();
    }
  }

  o.playCurrentSong = function() {
    var defer = $q.defer();

    //play the current song
    media = new Audio(o.queue[0].preview_url);

    media.addEventListener('loadeddata', function(){
      defer.resolve();
    });

    media.play();

    return defer.promise;

  }

  o.haltAudio = function() {
    if (media) media.pause();
  }

  return o;
})
