(function(){
  'use strict';

    angular
        .module('ngRest', [])
        .factory('$rest', [
            '$http',
            '$q',
            function($http, $q) {

                /**
                * @constructor
                * @param - {String}
                */
                function HttpService(url) {

                    var self = this;
                    self.url = url;
                }

                /**
                * @method
                * @param - {object}
                * @param (optional) - {object}
                */
                HttpService.prototype.save = function(data, config) {

                    var result = mergeConfigs({}, config);
                    result.method = 'POST';
                    result.url = this.url;
                    result.data = data;

                    return processRequest(result);
                };

                /**
                * @method
                * @param (optional) - {object}
                */
                HttpService.prototype.get = function(config) {

                    var result = mergeConfigs({}, config);
                    result.method = 'GET';
                    result.url = this.url;

                    return processRequest(result);
                };

                /**
                * @method
                * @param - {object}
                * @param (optional) - {object}
                */
                HttpService.prototype.query = function(data, config) {

                    var result = mergeConfigs({}, config);
                    result.method = 'GET';
                    result.url = this.url + '/' + data.id;

                    return processRequest(result);
                };

                /**
                * @method
                * @param - {object}
                * @param (optional) - {object}
                */
                HttpService.prototype.remove = function(data, config) {

                    var result = mergeConfigs({}, config);
                    result.method = 'DELETE';
                    result.url = this.url + '/' + data.id;

                    return processRequest(result);
                };

                /**
                * @method
                * @param - {object}
                * @param - {object}
                * @param (optional) - {object}
                */
                HttpService.prototype.update = function(data, content, config) {

                    var result = mergeConfigs({}, config);
                    result.method = 'PUT';
                    result.url = this.url + '/' + data.id;
                    result.data = content;

                    return processRequest(result);
                };

                /**
                * @method
                * @param - String
                */
                function restApi(url) {

                  return new HttpService(url);
                }

                /**
                * @method
                * @param - {object}
                */
                function processRequest(config) {

                    var defer = $q.defer();

                    $http(config)
                      .then(successCallback, errorCallback);

                    function successCallback(response) {

                        if(response.status === 200 && typeof response.data !== undefined) {

                           defer.resolve(response.data);
                        } else {

                            defer.reject(response.data);
                        }
                    }

                    function errorCallback(error) {

                        defer.reject(error);
                    }

                    return defer.promise;
                }

                /**
                * @method
                * @param - {object}
                * @param - {object}
                */
                function mergeConfigs(dest, src) {

                    if(typeof src === 'object') {

                        angular.merge(dest, config);
                    }

                    return dest;
                }

                /**
                * @return - {Function}
                */
                return restApi;
            }
        ]);
})();