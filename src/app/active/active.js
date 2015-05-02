angular.module( 'paysharescharts.activeAccounts', [
  'ui.state',
  'ui.bootstrap'
])

.config(function config( $stateProvider ) {
  $stateProvider.state( 'activeAccounts', {
    url: '/active_accounts',
    views: {
      "main": {
        controller: 'ActiveAccountsCtrl',
        templateUrl: 'active/active.tpl.html'
      }
    },
    data:{ pageTitle: 'Active Accounts' }
  });
})

.controller( 'ActiveAccountsCtrl', function ActiveAccountsCtrl( $scope ) {

  var base    = store.session.get('traderBase')    || store.get('traderBase')    || {"currency": "USD", "issuer" : "gs9HHU3pmkKBuvykhNm6xiK1JKrput9i3K"};
  var counter = store.session.get('traderCounter') || store.get('traderCounter') || {"currency": "XPR"};
  var period  = store.session.get('traderPeriod')  || store.get('traderPeriod')  || "24h";
  var metric  = store.session.get('traderMetric')  || store.get('traderMetric')  || "volume";
   
  var map = new ActiveAccounts({
    url    : API,
    id     : 'activeAccounts',
    period : period,
    metric : metric,
    resize : true
  });

//set up the currency pair dropdowns
  var loaded  = false, 
    dropdownB = payshares.currencyDropdown().selected(counter)
      .on("change", function(d) {
        if (loaded) {
          counter = d;
          loadPair();
        }}),
    dropdownA = payshares.currencyDropdown().selected(base)
      .on("change", function(d) {
        if (loaded) {
          base = d;
          loadPair();
        }});

  d3.select("#base").call(dropdownA);
  d3.select("#counter").call(dropdownB);
  d3.select("#flip").on("click", function(){ //probably better way to do this
    dropdownA.selected(counter);
    dropdownB.selected(base);
    d3.select("#base").selectAll("select").remove();
    d3.select("#counter").selectAll("select").remove();
    loaded = false;
    d3.select("#base").call(dropdownA);
    d3.select("#counter").call(dropdownB);
    loaded = true;
    
    swap    = counter;
    counter = base;
    base    = swap;
    loadPair();
  });

  loaded = true;
  loadPair();
  function loadPair() {
    store.set('traderBase',    base);
    store.set('traderCounter', counter); 
    store.session.set('traderBase',    base);
    store.session.set('traderCounter', counter);
    
    map.load(base, counter);
  }
  
  $scope.$on("$destroy", function(){
    
  });
});
