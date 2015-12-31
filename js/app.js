var app = angular.module('socketApp', ['ui.router', 'ngRest']);

app.config(function($stateProvider, $urlRouterProvider){

	$stateProvider
		.state('login', {
			url: '/login',
			templateUrl: '/partials/login.html',
			controller: 'LoginController'
		})
		.state('register', {
			url: '/register',
			templateUrl: '/partials/register.html',
			controller: 'RegisterController'
		})
		.state('baseLayout', {
			templateUrl: '/partials/baseLayout.html',
			controller: 'MainController'
		})
		.state('mainLayout', {
			parent: 'baseLayout',
			views: {
				'header@baseLayout': {
					templateUrl: '/partials/header.html'
				},
				'content@baseLayout': {
					template: '<div ui-view="mainView"></div>'
				},
				'footer@baseLayout': {
					templateUrl: '/partials/footer.html'
				}
			}
		})
		.state('home', {
			url: '/home',
			parent: 'mainLayout',
			views: {
				'mainView@mainLayout': {
					templateUrl: '/partials/home.html',
					controller: 'DashboardController'
				}
			},
			authorization: true
		})

	$urlRouterProvider.otherwise('/login');
});

app.service('AuthService', function(){

	var self 				= this;
	self.user 				= null;
	self.isAuthenticated 	= false;
});

app.run(function($rootScope, AuthService, $rest, $location, $state){

	$rootScope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams){

		if(toState.authorization === true && AuthService.isAuthenticated === false) {

		    event.preventDefault();
		    $state.go('login');
		}
	});

	var httpService = $rest('/api/auth');

	httpService.get()
		.then(function(data){

			AuthService.isAuthenticated = true;
			AuthService.user 			= data;
			$rootScope.loginuser 		= data.user;
			restrictUser();

		}, function(err){

			console.log(err);
		});

	function restrictUser() {

		if($location.path().indexOf('login') > -1) {

		    $state.go('home');
		} else {

		    $state.go($location.path().substring(1));
		}
	}
});

app.controller('MainController', function($scope, $state, $rest){

	var http = $rest('/api/logout');
	$scope.logout = function() {

		http.get()
			.then(function(data){

				$state.go('login');
			}, function(err){

				console.log(err);
			});
	};
});

app.controller('DashboardController', function($scope, $state){

	var socket = io.connect(window.location.host, { 'force new connection': true });
	socket.on('auth', function(status, session){

		console.log(status);
		console.log(session);
	});
});

app.controller('LoginController', function($scope, $state, $rest, AuthService, $rootScope){

	var http = $rest('/api/login');

	$scope.login = function() {

		http.save($scope.user)
			.then(function(data){

				document.forms['loginForm'].reset();
				AuthService.isAuthenticated = true;
				AuthService.user 			= data;
				$rootScope.loginuser 		= data;
				$state.go('home');
			}, function(error){

				console.log(error);
			});
		$scope.user = undefined;
	};
});

app.controller('RegisterController', function($scope, $rest){

	var http = $rest('/api/users');

	$scope.register = function() {

		http.save($scope.user)
			.then(function(data){

				console.log(data);
				document.forms['registerForm'].reset();
			}, function(error){

				console.log(error);
			});
		$scope.user = undefined;
	};
});

app.directive('dropdownDirective', function(){

	return {
		link: function($scope, $el, $attr) {


			$el.on('click', function(){

				$el.toggleClass('open');
			});
		}
	};
});

app.directive('toggleDirective', function(){

	return {
		link: function($scope, $el, $attr) {

			$el.on('click', function(){

				angular.element(document.querySelector('.spa-wrapper')).toggleClass('sidebar-condensed');
			});
		}
	};
});

angular.element(document).ready(function(){

	angular.bootstrap(document, ['socketApp']);
});