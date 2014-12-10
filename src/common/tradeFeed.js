var TradeFeed = function (options) {
  var self       = this,
    apiHandler   = new ApiHandler(options.url),
    div          = d3.select('#'+options.id).attr("class","tradeFeed"),
    transactions = [],
    listener, dailyTimer, high, low, close, volume;
 
  var numberFormat = {
    precision      : 6,
    min_precision  : 0,
    max_sig_digits : 8
  };
       
  var summary = div.append("div").attr('class', 'summary');
  var price = summary.append("div").attr('class', 'price');
  price.append("span").attr('class', 'amount');
  price.append("span").attr('class', 'pair');
  
  var daily = summary.append('div').attr('class','daily');
  daily.append('span').attr('class','high').html('H: --');
  daily.append('span').attr('class','low').html('L: --');
  daily.append('span').attr('class','volume').html('VOL: --');
  daily.append('label').html('(Last 24 hours)');
  
  var tableWrap = div.append('div').attr('class','table').append("div").attr("class","tableWrap");
  var table     = tableWrap.append('table');
  table.append('thead');
  table.append('tbody');
  
  var status = tableWrap.append("h4").attr('class','status');
  var loader = tableWrap.append("img")
      .attr("class", "loader")
      .attr("src", "assets/images/stellarThrobber.png")
      .style("opacity", 0); 
 
 
//load the latest trade feed for the given pair   
  this.loadPair = function (base, counter) {
    self.base    = base;
    self.counter = counter;
    high = low = close = volume = 0;
    
    if (listener) listener.updateViewOpts({base:base,counter:counter});
    else listener = new OffersExercisedListener({base:base,counter:counter}, handleTransaction);

/*   
    //mock data
    transactions = [
      {time:moment(new Date()), amount:100, price:50, type:""},
      {time:moment(new Date()), amount:110, price:200, type:"bid"},
      {time:moment(new Date()), amount:120, price:300, type:"ask"},
      {time:moment(new Date()), amount:130, price:400, type:"ask"},
      {time:moment(new Date()), amount:140, price:500, type:"ask"},
      {time:moment(new Date()), amount:150, price:600, type:"bid"},
      {time:moment(new Date()), amount:100, price:50, type:"bid"},
      {time:moment(new Date()), amount:110, price:200, type:"bid"},
      {time:moment(new Date()), amount:120, price:300, type:"ask"},
      {time:moment(new Date()), amount:130, price:400, type:"ask"},
      {time:moment(new Date()), amount:140, price:500, type:"ask"},
      {time:moment(new Date()), amount:150, price:600, type:"bid"},
      {time:moment(new Date()), amount:100, price:50, type:"bid"},
      {time:moment(new Date()), amount:110, price:200, type:"bid"}
    ];
*/   
    transactions = [];
    updateTrades();     //reset the last trade list
    updateDailyStats(); //reset the daily stats
    loadHistoricalData();
  }
  
  
//process incoming transaction from the live feed handler  
  function handleTransaction (data) {
    var last = transactions[0];
    
    var trade = {
      time   : moment.utc(data.value[5]),
      amount : valueFilter(data.value[0], self.base.currency),
      price  : valueFilter(data.value[2], self.counter.currency),
      type   : ''
    }
    
    if (last && last.price<trade.price)      trade.type = 'ask';
    else if (last && last.price>trade.price) trade.type = 'bid';
    //else if (last)                         trade.type = last.type;
    
    transactions.unshift(trade);  //prepend trade
    transactions = transactions.slice(0,50);  //keep last 50
    
    if (trade.price>high) high = trade.price;
    if (trade.price<low)  low  = trade.price;
    close   = data.value[2];
    volume += data.value[0]; //should be adjusted for demmurage
    
    updateDailyStats(); 
    updateTrades();
    loader.style('opacity', 0);    
  }
  
  
//update the display with new data  
  function updateTrades () {
    status.html(transactions.length ? "" : "no recent trades");
    
    var rows = table.select("tbody").selectAll("tr")
      .data(transactions);
      
    var rowEnter = rows.enter().append("tr");
    var baseCurrency = stellar.Currency.from_json(self.base.currency).to_human();
    rowEnter.append("td").attr("class","type");
    rowEnter.append("td").attr("class","amount");
    rowEnter.append("td").attr("class","time");
    rowEnter.append("td").attr("class","price");
    rows.exit().remove();
    
    rows.select(".type").attr('class', function(d){return "type "+d.type}); 
    rows.select(".amount").html(function(d){return d.amount+" <small>"+baseCurrency+"</small>"});
    rows.select(".time").html(function(d){return d.time.local().format('h:mm:ss a')});
    rows.select(".price").html(function(d){return d.price}); 
  }
 
 
//make values human readable  
  function valueFilter (d, currency) {
    if (!d) return "&nbsp";
    var value = stellar.Amount.from_human(d + " " + currency).to_human(numberFormat);
    if (!value) return "> 0.000001"; //must match min_precision variable
    return value;      
  }
 
 
//load price and volume stats from the last 24hours  
  function loadDailyStats () {
    var now  = moment();
    var then = moment().subtract(1, 'days');
     
    if (self.requestDaily) self.requestDaily.abort();
    self.requestDaily = apiHandler.offersExercised({
      startTime     : then.toDate(),
      endTime       : now.toDate(),
      timeIncrement : 'all',
      base          : self.base,
      counter       : self.counter
      
    }, function(data){
      
      if (data && data.length) {
        //TODO: should be comparing the existing high and low      
        high   = data[0].high;
        low    = data[0].low;
        volume = data[0].baseVolume;
        if (!close) close = data[0].close; //dont overwrite existing
      }
      
      updateDailyStats();
      
    }, function (error){
      console.log(error);
    });     
  }


//display 24 hour stats from the known values
  function updateDailyStats () {
    var base    = stellar.Currency.from_json(self.base.currency).to_human();
    var counter = stellar.Currency.from_json(self.counter.currency).to_human();
    daily.select(".high").html("<small>H:</small> "+valueFilter(high, self.counter.currency));
    daily.select(".low").html("<small>L:</small> "+valueFilter(low, self.counter.currency));
    daily.select(".volume").html("<small>VOL:</small> "+valueFilter(volume, self.base.currency)+"<small>"+base+"</small>");
    price.select(".amount").html(valueFilter(close, self.counter.currency));
    price.select(".pair").html(base+"/"+counter);
  }


//load latest trades historical data from the API  
  function loadHistoricalData() {
    if (dailyTimer) clearInterval(dailyTimer);
    dailyTimer = setInterval(loadDailyStats, 180000);
    loadDailyStats();
   
    loader.transition().style('opacity',1);
    status.html("");
    
    var now  = moment();
    var then = moment().subtract(1, 'days');
        

    if (self.request) self.request.abort();
    self.request = apiHandler.offersExercised({
      startTime  : then.toDate(),
      endTime    : now.toDate(),
      reduce     : false,
      base       : self.base,
      counter    : self.counter,
      descending : true,
      limit      : 50
      
    }, function(data){

      loader.transition().style('opacity',0);
      
      data.forEach(function(d) {
        d.amount   = valueFilter(d.amount, self.base.currency);
        d.price    = valueFilter(d.price, self.counter.currency);
        transactions.push(d);  
      });
      
      transactions = transactions.slice(0,50);   
      updateTrades();
           
    }, function (error){

      if (!transactions.length) //trades may have come through the live feed
        status.html(error.text ? error.text : "Unable to load data");
      
      loader.transition().style('opacity',0);      
      console.log(error);
    }); 
  }
  
  
//stop the live feed and the daily stats updater  
  this.suspend = function () {
    if (listener) listener.stopListener();
    if (dailyTimer) clearInterval(dailyTimer);
  }
}