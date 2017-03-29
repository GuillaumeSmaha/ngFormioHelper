angular.module('ngFormBuilderHelper')
.constant('FormController', [
  '$scope',
  '$stateParams',
  '$state',
  'Formio',
  'FormioHelperConfig',
  'FormioAlerts',
  function (
    $scope,
    $stateParams,
    $state,
    Formio,
    FormioHelperConfig,
    FormioAlerts
  ) {
    $scope.loading = true;
    $scope.hideComponents = [];
    $scope.submission = {data: {}};
    $scope.formId = $stateParams.formId;
    $scope.formUrl = FormioHelperConfig.appUrl + '/form';
    $scope.appUrl = FormioHelperConfig.appUrl;
    var formTag = FormioHelperConfig.tag || 'common';
    $scope.formUrl += $stateParams.formId ? ('/' + $stateParams.formId) : '';
    $scope.form = {
      display: 'form',
      components:[],
      type: ($stateParams.formType ? $stateParams.formType : 'form'),
      tags: [formTag],
      settings: {}
    };
    $scope.tags = [{text: formTag}];
    $scope.settings = [];
    $scope.formio = new Formio($scope.formUrl);
    $scope.formDisplays = [
      {
        name: 'form',
        title: 'Form'
      },
      {
        name: 'wizard',
        title: 'Wizard'
      }
    ];

    // Load the form if the id is provided.
    if ($stateParams.formId) {
      $scope.formLoadPromise = $scope.formio.loadForm().then(function(form) {
        form.display = form.display || 'form';
        $scope.form = form;
        var tags = form.tags || [];
        $scope.tags = tags.map(function(tag) { return {text: tag}; });
        var settings = form.settings || {};
        Object.keys(settings).map(function(key, index) {
          $scope.settings.push({key: key, value: settings[key]});
        });
        return form;
      }, FormioAlerts.onError.bind(FormioAlerts));
    }
    else {
      // Load the roles available.
      if (!$scope.form.submissionAccess) {
        Formio.makeStaticRequest(Formio.getAppUrl() + '/role').then(function(roles) {
          if ($scope.form.submissionAccess) {
            return;
          }
          angular.forEach(roles, function(role) {
            if (!role.admin && !role.default) {
              // Add access to the form being created to allow for authenticated people to create their own.
              $scope.form.submissionAccess = [
                {
                  type: 'create_own',
                  roles: [role._id]
                },
                {
                  type: 'read_own',
                  roles: [role._id]
                },
                {
                  type: 'update_own',
                  roles: [role._id]
                },
                {
                  type: 'delete_own',
                  roles: [role._id]
                }
              ];
            }
          });
        });
      }
    }

    // Match name of form to title if not customized.
    $scope.titleChange = function(oldTitle) {
      if (!$scope.form.name || $scope.form.name === _.camelCase(oldTitle)) {
        $scope.form.name = _.camelCase($scope.form.title);
      }
    };

    // When display is updated
    $scope.$watch('form.display', function (display) {
      $scope.$broadcast('formDisplay', display);
    });

    // Update form tags
    $scope.updateFormtags = function() {
      $scope.form.tags = $scope.tags.map(function(tag) { return tag.text; });
    };

    // Update form setttings
    $scope.updateSettings = function() {
      var settings = {};
      for(var index in $scope.settings) {
        settings[$scope.settings[index].key] = $scope.settings[index].value;
      }
      $scope.form.settings = settings;
    };

    // Add a setting in the list
    $scope.addSetting = function() {
      if (typeof $scope.form.settings[''] == 'undefined') {
        $scope.settings.push({key: '', value: ''});
        $scope.updateSettings();
      }
    };

    // Remove a settings
    $scope.removeSetting = function(key) {
      for(var index in $scope.settings) {
        if ($scope.settings[index].key == key) {
          $scope.settings.splice(index, 1);
          $scope.updateSettings();
          break;
        }
      }
    };

    // When a submission is made.
    $scope.$on('formSubmission', function(event, submission) {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'New submission added!'
      });
      if (submission._id) {
        $state.go($scope.basePath + 'form.submission.view', {subId: submission._id});
      }
    });

    $scope.$on('pagination:error', function() {
      $scope.loading = false;
    });
    $scope.$on('pagination:loadPage', function() {
      $scope.loading = false;
    });

    // Called when the form is updated.
    $scope.$on('formUpdate', function(event, form) {
      $scope.form.components = form.components;
    });

    $scope.$on('formError', function(event, error) {
      FormioAlerts.onError(error);
    });

    // Called when the form is deleted.
    $scope.$on('delete', function() {
      FormioAlerts.addAlert({
        type: 'success',
        message: 'Form was deleted.'
      });
      $state.go($scope.basePath + 'formIndex');
    });

    $scope.$on('cancel', function() {
      $state.go($scope.basePath + 'form.view');
    });

    // Save a form.
    $scope.saveForm = function() {
      $scope.formio.saveForm(angular.copy($scope.form)).then(function(form) {
        var method = $stateParams.formId ? 'updated' : 'created';
        FormioAlerts.addAlert({
          type: 'success',
          message: 'Successfully ' + method + ' form!'
        });
        $scope.form = form;
        $state.go($scope.basePath + 'form.view', {formId: form._id});
      }, FormioAlerts.onError.bind(FormioAlerts));
    };
  }
]);
