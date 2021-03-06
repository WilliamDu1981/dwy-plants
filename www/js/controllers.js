(function () {
  angular.module('app.controllers', [])
    .controller('AppController', function ($scope, Config, $ionicLoading, $timeout, $ionicPopup, $state, $toast, $rootScope) {
      var events = Config.events;

      $scope.$on(events.REQUEST_START, function (e, config) {

        $ionicLoading.show({hideOnStateChange: true});
      });

      $scope.$on(events.RESPONSE, function () {
        hideLoading();
      });

      $scope.$on(events.REQUEST_ERROR, function () {
        hideLoading();
      });

      $scope.$on(events.RESPONSE_ERROR, function (e, resp) {
        hideLoading();

        if (resp.status === 401) {
          $toast.show('Access token is expired,please relogin');
          return $state.go('login', {}, {location: 'replace'});
        }

        var data = resp.data;
        var msg = angular.isArray(data) ? data[0].message : data.message;

        $ionicPopup.alert({
          title: 'Warning',
          template: msg
        });

      });

      function hideLoading() {
        $timeout(function () {
          $ionicLoading.hide();
        }, 0);
      }
    })
    .controller('TabsCtrl', function ($scope, WaterTime, Notification, $ionicPlatform) {
      WaterTime.init();
      Notification.init();
      $ionicPlatform.ready(function () {
        Notification.init();
      });
    })
    .controller('LoginCtrl', function ($scope, Sign, $state, $toast, $timeout, Session, $location) {
      var account = $scope.account = {};
      var isLogin = Session.isLogin();

      $scope.onSigninFormSubmit = onSigninFormSubmit;

      if (isLogin) {
        $state.go('tab.schedule', {}, {location: 'replace'});
      }


      function onSigninFormSubmit() {
        Sign.signin(account)
          .then(function () {
            $toast.show('Login Sucess');
            $state.go('tab.schedule', {}, {location: 'replace'});
          });
      }
    })
    //用户注册
    .controller('RegisterCtrl', function ($scope, Sign, $state) {
      var account = $scope.account = {
        pass_agreement: 1
      };

      $scope.onFormSubmit = onFormSubmit;

      function onFormSubmit(e) {
        e.preventDefault();

        Sign.signup(account)
          .then(function (resp) {

            return Sign.signin({email: resp.email, password: resp.password});
          })
          .then(function () {
            $state.go('profileCreate', {toState: 'tab.schedule'});
          });
      }
    })
    .controller('SettingsCtrl', function ($scope, Session, Sign, $toast, $state) {
      var user = $scope.currentUser = Session.getSessionUser();

      $scope.signout = function () {
        Sign.signout()
          .then(function () {
            $toast.show('Sign out sccess');

            $state.go('login');
          });
      };

      $scope.fullName = function () {
        return user.first_name + ' ' + user.last_name;
      }
    })
    .controller('ProfileSettingsCtrl', function ($scope, Sign, $state, $toast, Session, $stateParams) {

      var profile = $scope.profile = angular.extend({}, Session.getSessionUser());
      var toState = $stateParams.toState || 'tab.schedule';

      $scope.onProfileFormSubmit = onProfileFormSubmit;


      function onProfileFormSubmit() {
        var params = handleParam();
        Sign.updateProfile(params)
          .then(function () {
            $toast.show('updat profile success');
            $state.go(toState);
          });
      }

      function handleParam() {
        var params = {};

        params.first_name = profile.first_name;
        params.last_name = profile.last_name;

        if (angular.isObject(profile.country)) {
          params.country = profile.country.countryName;
        }

        if (angular.isObject(profile.state)) {
          params.state = profile.state.name;
        }

        if (angular.isObject(profile.city)) {
          params.city = profile.city.name;
        }

        return params;
      }

    })

    .controller('WaterTimeSettingsCtrl', function (WaterTime, $scope, $cordovaDatePicker) {
      $scope.vm = WaterTime;

      $scope.onFormSubmit = function () {
        WaterTime.$update(function (resp) {
          console.log(resp);
        });
      };


      $scope.openDatePicker = function (type) {
        var dfDate = new Date();
        $cordovaDatePicker
          .show({
            date: dfDate,
            mode: 'time',
            minDate: dfDate,
            allowOldDates: false,
            allowFutureDates: true,
            doneButtonLabel: 'DONE',
            cancelButtonLabel: 'CANCEL'
          })
          .then(function (date) {
            WaterTime[type] = date;
          });
      };

    })

    .controller('PasswordSettingsCtrl', function ($scope, Sign, $state, $ionicPopup) {
      var vm = $scope.vm = {};

      $scope.onFormSubmit = function () {
        Sign.modifyPassword(vm)
          .then(function () {
            vm.password = '';
            vm.password2 = '';
            $ionicPopup.alert({
              title: 'Hint',
              template: 'Password update success,please relogin now'
            }).then(function () {
              $state.go('login', {}, {location: 'replace'});
            });
          });
      };
    })
    .controller('ScheduleCtrl', function ($scope, Schedule, WaterTime, $toast) {

      $scope.morningSchedules = Schedule.query({water_time: 'morning'});

      $scope.noonSchedules = Schedule.query({water_time: 'noon'});

      $scope.afternoonSchedules = Schedule.query({water_time: 'afternoon'});

      $scope.WaterTime = WaterTime;

      $scope.onIsDoneChange = function (schedule) {
        schedule.$toggleDone(function () {
          $toast.show('update schedule status sucess');
        });
      };
    })

    .controller('PlantsDemoCtrl', function ($scope, Plant, Cache, $state) {
      $scope.plantList = Plant.queryDemo();

      $scope.selectDemo = function (plant) {
        Cache.plantDemo = plant;
        $state.go('tab.plantsAdd', {demoId: plant.id});
      }
    })

    .controller('PlantsCtrl', function ($scope, Plant) {
      $scope.vm = {
        viewTitle: 'Plant'
      };
      $scope.plantList = Plant.query();
    })
    .controller('PlantDetailsCtrl', function ($scope, $stateParams, Plant, $toast, $cordovaDatePicker,
                                              WaterFrequencyModal, $state, WaterTime, $ionicPopup) {

      $scope.vm = {
        title: 'Plants Details'
      };

      $scope.waterTime = WaterTime;

      var plant = $scope.plant = new Plant({id: $stateParams.id, sunlight: true});

      plant.$get();

      $scope.savePlant = function () {
        plant.$update(function () {
          $toast.show('Update plant success');
          $state.go('tab.plants');
        });
      };

      $scope.openDatePicker = function () {
        var dfDate = moment().add(1, 'days').toDate();
        $cordovaDatePicker
          .show({
            date: dfDate,
            mode: 'date', // or 'time'
            minDate: dfDate,
            allowOldDates: false,
            allowFutureDates: true,
            doneButtonLabel: 'DONE',
            cancelButtonLabel: 'CANCEL'
          })
          .then(function (date) {
            plant.end_date = date;
          });
      };

      WaterFrequencyModal.init($scope);
    })

    .factory('WaterFrequencyModal', function ($ionicModal, WaterTime) {
      return {
        init: function ($scope) {
          $scope.WaterTime = WaterTime;

          $ionicModal.fromTemplateUrl('templates/waterFrequency.html', {
            scope: $scope
          }).then(function (modal) {
            $scope.modal = modal;
          });

          $scope.openModal = function () {
            $scope.modal.show();
          };

          $scope.closeModal = function () {
            $scope.modal.hide();
          };

          //作用域销毁时，删除modal
          $scope.$on('$destroy', function () {
            $scope.modal.remove();
          });
        }
      }
    })
    .controller('PlantsAddCtrl', function ($scope, Plant, $toast, $ionicModal, $cordovaDatePicker,
                                           Cache, $state, WaterFrequencyModal, WaterTime) {
      var plantDemo = Cache.plantDemo;

      if (!plantDemo) {
        $toast.show('Please select one plant demo first');
        return $state.go('tab.plantDemo')
      }

      var plant = $scope.plant = new Plant({
        name: plantDemo.name,
        image: plantDemo.image,
        description: plantDemo.description,
        end_date: moment().add(1, 'days').toDate(),
        water_times: 3,
        sunlight: true,
        nosunlight: false
      });

      $scope.waterTime = WaterTime;

      $scope.vm = {
        title: 'Add Plants'
      };

      $scope.savePlant = function () {
        plant.$save(function () {
          Cache.plantDemo = null;
          $toast.show('Add plant success');
          $state.go('tab.plants', {}, {location: 'replace'});
        });
      };

      $scope.openDatePicker = function () {
        var dfDate = moment().add(1, 'days').toDate();
        $cordovaDatePicker
          .show({
            date: dfDate,
            mode: 'date', // or 'time'
            minDate: dfDate,
            allowOldDates: false,
            allowFutureDates: true,
            doneButtonLabel: 'DONE',
            cancelButtonLabel: 'CANCEL'
          })
          .then(function (date) {
            plant.end_date = date;
          });
      };

      WaterFrequencyModal.init($scope);
    })

    .controller('PlantGrowthCtrl', function ($scope, Growth, Plant) {
      $scope.vm = {
        viewTitle: 'Growth'
      };
      $scope.plantList = Plant.query();
    })
    .controller('PlantGrowthDetailsCtrl', function ($scope, Growth, Plant, $stateParams) {
      var plantId = $stateParams.plantId;

      //query today's growth
      $scope.growthList = Growth.query({
        plant_id: plantId,
        date: moment().format('YYYY-MM-DD')
      });

      $scope.plant = Plant.get({id: plantId});
    })

    .controller('PlantGrowthListCtrl', function ($scope, $stateParams, Growth) {

      //query this plant's all growth
      $scope.growthList = Growth.query({
        plant_id: $stateParams.plantId
      });

      $scope.vm = $stateParams;
    })

    .controller('GrowthReadingCtrl', function ($scope, $stateParams, Growth, Plant, $toast) {
      var plantId = $stateParams.plantId;
      var growth = $scope.growth = new Growth({
        date: new Date(),
        plant_id: plantId
      });

      $scope.plant = Plant.get({id: plantId});

      $scope.addNewGrowthReading = function () {
        growth.$save(function () {
          $toast.show('add new growth reading success');
          $scope.$ionicGoBack();
        });
      };

    });


})();
