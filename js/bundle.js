window.$ = window.jQuery = require('jquery');
var adm0_lookup = {
	"155": "Mali",
	"50": "Chad",
	"181": "Niger",
	"182": "Nigeria",
	"42": "Burkina Faso",
	"263": "Venezuela",
	"57": "Colombia",
	"70001": "South Sudan",
	"40764": "Sudan",
	"254": "Ukraine",
	"1": "Afghanistan",
	"171": "Myanmar",
	"269": "Yemen",
	"238": "Syrian Arab Republic",
	"118": "Iraq",
	"145": "Libya",
	"226": "Somalia",
	"79": "Ethiopia",
	"68": "Democratic Republic of the Congo",
	"271": "Zimbabwe",
	"45": "Cameroon",
	"49": "Central African Republic",
	"43": "Burundi",
	"108": "Haiti",
	"999": "State of Palestine"
}

function getCountryNameByID(adm0_id) {
	return adm0_lookup[adm0_id];
}

function getCountryIDByName(adm0_name) {
	const entries = Object.entries(adm0_lookup)
	for (const [id, name] of entries) {
  	if (name==adm0_name) return id;
	}
}
function createBarChart(data, type) {
  data.forEach(function(item, index) {
    if (item.min=='' || item.max=='')
      data.splice(index, 1);
  });

  var barColor = (type=='Cases') ? '#007CE1' : '#000';
  var maxVal = d3.max(data, function(d) { return +d.max; })
  var barHeight = 25;
  var barPadding = 20;
  var margin = {top: 0, right: 40, bottom: 30, left: 50},
      width = 336,
      height = (barHeight + barPadding) * data.length;
  
  x = d3.scaleLinear()
    .domain([0, maxVal])
    .range([0, width - margin.left - margin.right]);

  // set the ranges
  y = d3.scaleBand().range([0, height]);
  y.domain(data.map(function(d) { return d.model; }));
            
  var div = '.projections-'+ type.toLowerCase();
  var svg = d3.select(div).append('svg')
      .attr('width', width)
      .attr('height', height + margin.top + margin.bottom)
    .append('g')
      .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  // add the y axis
  svg.append('g')
    .attr('transform', 'translate(0, 0)')
    .call(d3.axisLeft(y)
      .tickSizeOuter(0))

  // add the x axis
  svg.append('g')
    .attr('transform', 'translate(0, '+height+')')
    .call(d3.axisBottom(x)
      .tickSizeOuter(0)
      .ticks(5, 's'));

  // append bars
  bars = svg.selectAll('.bar')
      .data(data)
    .enter().append('g')
      .attr('class', 'bar-container')
      .attr('transform', function(d, i) { return 'translate(' + x(d.min) + ', ' + (y(d.model)+10) + ')'; });

  bars.append('rect')
    .attr('class', 'bar')
    .attr('fill', barColor)
    .attr('height', barHeight)
    .attr('width', function(d) {
      var w = x(d.max) - x(d.min);
      if (w<0) w = 0;
      return w;
    });

  // add min/max labels
  bars.append('text')
    .attr('class', 'label-num')
    .attr('x', function(d) {
      return x(d.max) - x(d.min) + 4;
    })
    .attr('y', function(d) { return barHeight/2 + 4; })
    .text(function (d) {
      return d3.format('.3s')(d.max);
    });

  bars.append('text')
    .attr('class', 'label-num')
    .attr('text-anchor', 'end')
    .attr('x', -4)
    .attr('y', function(d) { return barHeight/2 + 4; })
    .text(function (d) {
      return d3.format('.3s')(d.min);
    });

  //source
  if (type=='Deaths') {
    var projectionsDiv = $('.projections .panel-inner');
    var date = new Date();
    projectionsDiv.append('<p class="small source"></p>');
    data.forEach(function(d) {
      var source = getSource('#affected+deaths+'+ d.model.toLowerCase() +'+min');
      var sourceDate = new Date(source['#date']);
      if (sourceDate.getTime()!=date.getTime()) {
        date = sourceDate;
        projectionsDiv.find('.source').append(' <span class="date">'+ dateFormat(date) +'</span>');
      }
      projectionsDiv.find('.source').append(' | '+ d.model +': <a href="'+ source['#meta+url'] +'" class="dataURL" target="_blank">DATA</a>');
    });
  }

}

function initTimeseries(data, div) {
  var timeseriesArray = formatTimeseriesData(data);
  createTimeSeries(timeseriesArray, div);
}

function formatTimeseriesData(data) {
  //group the data by country
  var groupByCountry = d3.nest()
    .key(function(d){ return d['Country']; })
    .key(function(d) { return d['Date']; })
    .entries(data);
  groupByCountry.sort(compare);

  //group the data by date
  var groupByDate = d3.nest()
    .key(function(d){ return d['Date']; })
    .entries(data);

  var dateArray = ['x'];
  groupByDate.forEach(function(d) {
    var date = new Date(d.key);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    dateArray.push(utcDate);
  });

  var timeseriesArray = [];
  timeseriesArray.push(dateArray);

  groupByCountry.forEach(function(country, index) {
    var arr = [country.key];
    var val = 0;
    groupByDate.forEach(function(d) {
      country.values.forEach(function(e) {
        if (d.key == e.key) {
          val = e.values[0]['confirmed cases'];
        }
      });
      arr.push(val);
    });
    timeseriesArray.push(arr);
  });

  return timeseriesArray;
}

var countryTimeseriesChart;
function createTimeSeries(array, div) {
	var chart = c3.generate({
    size: {
      width: 336,
      height: 240
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 30,
      right: 30
    },
    bindto: div,
    title: {
  		text: 'Number of Confirmed Cases Over Time',
  		position: 'upper-left',
		},
		data: {
			x: 'x',
			columns: array,
      type: 'spline',
      color: function() {
        return '#999';
      }
		},
    spline: {
      interpolation: {
        type: 'basis'
      }
    },
    point: { show: false },
		axis: {
			x: {
				type: 'timeseries',
				tick: {
          count: 5,
          format: '%b %d, %Y',
          outer: false
				}
			},
			y: {
				min: 0,
				padding: { top:0, bottom:0 },
        tick: { 
          outer: false,
          format: shortenNumFormat
        }
			}
		},
    legend: {
      show: false,
      position: 'inset',
      inset: {
          anchor: 'top-left',
          x: 10,
          y: 0,
          step: 8
      }
    },
		tooltip: { grouped: false },
    transition: { duration: 300 }
	});

  var lastUpdated = new Date(Math.max.apply(null, timeseriesData.map(function(e) {
    return new Date(e.Date);
  })));

  if (div=='.country-timeseries-chart') {
    countryTimeseriesChart = chart;
    $('.cases-timeseries').append('<p class="small"><span class="date">'+ dateFormat(lastUpdated) +'</span> | <span class="source-name">WHO</span> | <a href="https://data.humdata.org/dataset/coronavirus-covid-19-cases-and-deaths" class="dataURL" target="_blank">DATA</a></p>');
  }
  createTimeseriesLegend(chart, div);
}


function createTimeseriesLegend(chart, div, country) {
  var names = [];
  chart.data.shown().forEach(function(d) {
    if (d.id==country)
      names.push(d.id)
  });

  //custom legend
  d3.select(div).insert('div').attr('class', 'timeseries-legend').selectAll('div')
    .data(names)
    .enter().append('div')
    .attr('data-id', function(id) {
      return id;
    })
    .html(function(id) {
      return '<span></span>'+id;
    })
    .each(function(id) {
      d3.select(this).select('span').style('background-color', '#007CE1');
    })
    .on('mouseover', function(id) {
      chart.focus(id);
    })
    .on('mouseout', function(id) {
      //chart.revert();
    });
}

function updateTimeseries(data, selected) {
  countryTimeseriesChart.focus(selected);
  $('.c3-chart-lines .c3-line').css('stroke', '#999');
  $('.c3-chart-lines .c3-line-'+selected).css('stroke', '#007CE1');

  $('.country-timeseries-chart .timeseries-legend').remove();
  createTimeseriesLegend(countryTimeseriesChart, '.country-timeseries-chart', selected);
}


function createSparkline(data, div) {
  var width = 75;
  var height = 24;
  var x = d3.scaleLinear().range([0, width]);
  var y = d3.scaleLinear().range([height, 0]);
  var parseDate = d3.timeParse("%Y-%m-%d");
  var line = d3.line()
    .x(function(d) { return x(d.date); })
    .y(function(d) { return y(d.value); })
    .curve(d3.curveBasis);

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.value = +d.value;
  });

  x.domain(d3.extent(data, function(d) { return d.date; }));
  y.domain(d3.extent(data, function(d) { return d.value; }));

  var svg = d3.select(div)
    .append('svg')
    .attr('class', 'sparkline')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', 'translate(0, 2)');
    
  svg.append('path')
   .datum(data)
   .attr('class', 'sparkline')
   .attr('d', line);
}


var datastoreID = '12d7c8e3-eff9-4db0-93b7-726825c4fe9a';
var dataDomain = 'https://data.humdata.org';
var countryLookup = {};

//getCountryIDs();

$('.modal-bg-overlay, .modal-close-btn').on('click', closeModal);

function resetModal() {
	$('#header, #charts, .modal-subnav').empty();
  $('.modal-loader').show();
}

function closeModal() {
	$('.modal-bg-overlay').fadeOut();
	$('.modal').fadeOut();
}

function openModal(country_name) {
	resetModal();
	$('.modal-bg-overlay').fadeIn();
	$('.modal').fadeIn();

	//getCountryIDs();
	//var adm0_id = countryLookup[country_name];
	var adm0_id = getCountryIDByName(country_name);
	initCountry(adm0_id, country_name);
}

function initCountry(adm0_code, adm0_name){
  getProductsByCountryID(adm0_code, adm0_name);
}

function getCountryIDs() {
  var sql = 'SELECT distinct adm0_id FROM "' + datastoreID + '"';

  $.ajax({
    type: 'GET',
    url: dataDomain + '/api/3/action/datastore_search_sql?sql=' + encodeURIComponent(sql),
    success: function(data) {
      var results = [];
      data.result.records.forEach(function(e){
        getCountryNames(e.adm0_id);
      });
    }
  });     
}

function getCountryNames(adm0) {
  var sql = 'SELECT distinct adm0_name FROM "'  +datastoreID + '" where adm0_id=' + adm0;

  $.ajax({
    type: 'GET',
    url: dataDomain + '/api/3/action/datastore_search_sql?sql=' + encodeURIComponent(sql),
    success: function(data) {
    	countryLookup[data.result.records[0].adm0_name] = adm0;
      //initCountry(adm0, data.result.records[0].adm0_name);
    }
  });
}

function getProductsByCountryID(adm0_code,adm0_name){    
  var sql = 'SELECT cm_id, cm_name, um_id, um_name, avg(cast(mp_month as double precision)) as month_num, mp_year, avg(mp_price) FROM "' + datastoreID + '" where adm0_id=' + adm0_code + ' and mp_year>2009 group by cm_id, cm_name, um_name, um_id, mp_month, mp_year order by cm_id, um_id, mp_year, month_num';    
  var data = encodeURIComponent(JSON.stringify({sql: sql}));

  $.ajax({
    type: 'GET',
    url: dataDomain + '/api/3/action/datastore_search_sql?sql=' + encodeURIComponent(sql),
    success: function(data) {
    	$('.modal-loader').hide();
    	$('.modal-subnav').empty();
      generateSparklines(data.result.records,adm0_code,adm0_name);
    }
  });     
}

function getProductDataByCountryID(adm0_code,cm_id,um_id,adm0_name,cm_name,um_name,adm1_name,mkt_name){
  var sql = 'SELECT adm1_id,adm1_name,mkt_id,mkt_name, cast(mp_month as double precision) as month_num, mp_year, mp_price FROM "'+datastoreID+'" where adm0_id='+adm0_code+' and cm_id='+cm_id+' and um_id='+um_id;

  var data = encodeURIComponent(JSON.stringify({sql: sql}));

  $.ajax({
    type: 'GET',
    url: dataDomain + '/api/3/action/datastore_search_sql?sql=' + encodeURIComponent(sql),
    success: function(data) {
			var cf = crossfilterData(data.result.records); 
			if(adm1_name===''){
			  generateChartView(cf,adm0_name,cm_name,um_name,adm0_code); 
			} else if (mkt_name===''){
			  generateADMChartView(cf,adm1_name,cm_name,um_name,adm0_name,adm0_code);  
			} else {
			  cf.byAdm1.filter(adm1_name);
			  generateMktChartView(cf,mkt_name,cm_name,um_name,adm0_name,adm0_code,adm1_name); 
			}
    }
  });    
}

function generateSparklines(results,adm0_code,adm0_name){
    var targetHeader = '#header';
    var targetDiv = '#charts';
    var numProd = 0;
    var curProd = '';
    var curUnit = '';
    var topMonth = 0;

    var headerHtml = '<h5>'+adm0_name+' Food Market Prices – since '+ results[0].mp_year +' <span class="source small"><a href="">DATA</a></span></h5>';
    $(targetHeader).html(headerHtml);

    var html='<div class="chart-container">';

    results.forEach(function(e){
        if(e.mp_year*12+e.month_num*1>topMonth) {
            topMonth = e.mp_year*12+e.month_num*1;
        }
        if(e.cm_id!==curProd || e.um_id!==curUnit){
            numProd++;
            curProd = e.cm_id;
            curUnit = e.um_id;
            if(numProd>1 && numProd%4===1){
                html+= '</div><div class="chart-container">';
            }
            html+='<div id="product_' + e.cm_id + '_' + e.um_id + '" class="productsparkline col-xs-3"><p>' + e.cm_name + ' per ' + e.um_name + '</p></div>';
        }
    });

    html+='</div>';
    
    $(targetDiv).html(html);
    var curProd = '';
    var curUnit = '';
    var data=[];
    results.forEach(function(e){
        if(e.cm_id!==curProd || e.um_id !==curUnit){
            if(data!==[]){
                generateSparkline(curProd,curUnit,data,topMonth);
                $('#product_' + e.cm_id + '_' + e.um_id).on('click',function(){
                    getProductDataByCountryID(adm0_code,e.cm_id,e.um_id,adm0_name,e.cm_name,e.um_name,'','');
                });
            }
            data = [];
            curProd = e.cm_id;
            curUnit = e.um_id;
        }
        var datum = {y:e.avg,x:e.mp_year*12+e.month_num};
        data.push(datum);
    });
    generateSparkline(curProd,curUnit,data,topMonth);
}

function generateSparkline(prodID,unitID,data,topMonth){
    var svg = d3.select('#product_'+prodID+'_'+unitID).append('svg').attr('width',$('#product_'+prodID+'_'+unitID).width()).attr('height', '50px');
    var x = d3.scaleLinear().domain([2010*12,topMonth]).range([0, $('#product_'+prodID+'_'+unitID).width()]);
    //var y = d3.scale.linear().domain([d3.max(data,function(d){return d.y;}),d3.min(data,function(d){return d.y;})]).range([0, 50]);
    var y = d3.scaleLinear().domain([d3.max(data,function(d){return d.y;})*1.1,0]).range([0, 50]);

    var line = d3.line()
        .x(function(d) {
            return x(d.x);
        })
        .y(function(d) {
            return y(d.y);
        });
        
    var yearLine = d3.line()
        .x(function(d) {
            return x(d.x);
        })
        .y(function(d) {
            return d.y;
        });        
    
    for(i=0;i<25;i++){
        if((2010+i)*12<topMonth){
            var dataLine=[{
                x:(2010+i)*12,
                y:0
            },{
                x:(2010+i)*12,
                y:50
            }];
            svg.append('path').attr('d', yearLine(dataLine)).attr('class', 'sparkyearline');
        }
    }
    
    svg.append('path').attr('d', line(data)).attr('class', 'sparkline');
}

function crossfilterData(data){
    data.forEach(function(e){
        e.date = new Date(e.mp_year, e.month_num-1, 1);
    });       
    
    var cf = crossfilter(data);
    
    cf.byDate = cf.dimension(function(d){return d.date;});
    cf.byAdm1 = cf.dimension(function(d){return d.adm1_name;});
    cf.byMkt = cf.dimension(function(d){return d.mkt_name;});
    
    cf.groupByDateSum = cf.byDate.group().reduceSum(function(d) {return d.mp_price;});
    cf.groupByDateCount = cf.byDate.group();
    cf.groupByAdm1Sum = cf.byAdm1.group().reduceSum(function(d) {return d.mp_price;});
    cf.groupByAdm1Count = cf.byAdm1.group();
    cf.groupByMktSum = cf.byMkt.group().reduceSum(function(d) {return d.mp_price;});
    cf.groupByMktCount = cf.byMkt.group(); 
    return cf;
}

function generateChartView(cf,adm0,prod,unit,adm0_code){
    var targetDiv = '#charts';
    var targetHeader = '#header';

    curLevel = 'adm0';
    
    cf.byDate.filterAll();
    cf.byAdm1.filterAll(); 
    cf.byMkt.filterAll();    
    
    var title = 'Price of ' + prod + ' per ' + unit + ' in '+adm0;
    var html = '<h4>'+title+'</h4><p>';
    
    html +='<a id="adm0link" href="">'+adm0+'</a> > ' + prod + '</p>';
   	$('.modal-subnav').html(html);
    $(targetDiv).html('<div class="chart-inner"><div id="nav_chart"></div></div><div class="chart-inner"><div id="main_chart"></div></div><div class="chart-inner"><div id="drilldown_chart"></div></div>');
    $('#adm0link').click(function(event){
        event.preventDefault();
        initCountry(adm0_code,adm0);
    });

    generateBarChart(getAVG(cf.groupByAdm1Sum.all(),cf.groupByAdm1Count.all()),cf,prod,unit,adm0,adm0_code);
    generateTimeCharts(getAVG(cf.groupByDateSum.all(),cf.groupByDateCount.all()),cf,title);
}

function generateADMChartView(cf,adm1,prod,unit,adm0,adm0_code){
    var targetDiv = '#charts';
    curLevel = 'adm1';
    var title = 'Price of ' + prod + ' per ' + unit + ' in '+adm1;    
    var html = '<h4>'+title+'</h4><p>';
    
    html +='<a id="adm0link" href="">'+adm0+'</a> > <a id="prodlink" href="">' + prod + '</a> > ' + adm1 + '</p>';
    $('.modal-subnav').html(html);
    $(targetDiv).html('<div class="chart-inner"><div id="nav_chart"></div></div><div class="chart-inner"><div id="main_chart"></div></div><div class="chart-inner"><div id="drilldown_chart"></div></div>');
    
    $('#adm0link').click(function(event){
        event.preventDefault();
        initCountry(adm0_code,adm0);
    });
    
    $('#prodlink').click(function(event){
        event.preventDefault();
        generateChartView(cf,adm0,prod,unit,adm0_code);
    });

    cf.byDate.filterAll();
    cf.byMkt.filterAll();
    cf.byAdm1.filter(adm1);    
    generateBarChart(getAVG(cf.groupByMktSum.all(),cf.groupByMktCount.all()),cf,prod,unit,adm0,adm0_code,adm1);
    generateTimeCharts(getAVG(cf.groupByDateSum.all(),cf.groupByDateCount.all()),cf,title);
}

function generateMktChartView(cf,mkt,prod,unit,adm0,adm0_code,adm1){
    var targetDiv = '#charts';
    var targetHeader = '#header';
    
    curLevel = 'mkt';
    
    var title = 'Price of ' + prod + ' per ' + unit + ' in '+mkt;
    var html = '<h4>'+title+'</h4><p>';
    html +='<a id="adm0link" href="">'+adm0+'</a> > <a id="prodlink" href="">' + prod + '</a> > <a id="adm1link" href="">' + adm1 + '</a> > ' + mkt + '</p>';
    $('.modal-subnav').html(html);
    $(targetDiv).html('<div class="chart-inner"><div id="nav_chart"></div></div><div class="chart-inner"><div id="main_chart"></div></div><div class="chart-inner"><div id="drilldown_chart"></div></div>');
    
    $('#adm0link').click(function(event){
        event.preventDefault();
        initCountry(adm0_code,adm0);
    });
    
    $('#prodlink').click(function(event){
        event.preventDefault();
        generateChartView(cf,adm0,prod,unit,adm0_code);
    });
    
    $('#adm1link').click(function(event){
        event.preventDefault();
        generateADMChartView(cf,adm1,prod,unit,adm0,adm0_code);
    });     

    cf.byDate.filterAll();
    cf.byMkt.filter(mkt);    
    
    generateTimeCharts(getAVG(cf.groupByDateSum.all(),cf.groupByDateCount.all()),cf,title);
}

function getAVG(sum,count){
    var data =[];
    sum.forEach(function(e,i){
        var value=0;
        if(count[i].value!==0){
            value = e.value/count[i].value;
            data.push({key:e.key,value:value});
        }
    });

    return data;    
}

function generateTimeCharts(data,cf,title){
    //$('#nav_chart').html('<p>Select a portion of the chart below to zoom in the data.</p><p><span id="brush6" class="setbrush">Last 6 months</span><span id="brush12" class="setbrush">1 year</span><span id="brush60" class="setbrush">5 years</span></p>');

    // $('#brush6').click(function(){
    //     setBrushExtent(data,6);
    // });
    // $('#brush12').click(function(){
    //     setBrushExtent(data,12);
    // });
    // $('#brush60').click(function(){
    //     setBrushExtent(data,60);
    // });

    var margin = {top: 10, right: 20, bottom: 20, left: 60},
        width = $('#nav_chart').width() - margin.left - margin.right,
        height = 175 - margin.top - 10 - margin.bottom,
        height2 = 50 - margin.top - margin.bottom;

    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var xAxis = d3.axisBottom().scale(x).ticks(5),
        xAxis2 = d3.axisBottom().scale(x2).ticks(5),
        yAxis = d3.axisLeft().scale(y).ticks(5);

    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];        

    // var brush = d3.brushX()
    //     .extent([[0, 0], [width, height]])
    //     //.x(x2)        
    //     .on("brush", brushed)
    //     .on("end", function(){
    //     		//cf.byDate.filterRange(brush.empty() ? x2.domain() : brush.extent());
    //         //var dates = brush.empty() ? x2.domain() : brush.extent();
    //     		var selection = d3.event.selection;
    //         cf.byDate.filterRange(selection===null ? x2.domain() : selection);
    //         var dates = selection===null ? x2.domain() : selection;
    //         var dateFormatted = monthNames[dates[0].getMonth()] +" " + dates[0].getFullYear() + " - " +  monthNames[dates[1].getMonth()] +" " + dates[1].getFullYear();
    
    //         $("#dateextent").html("Average Price for period " + dateFormatted);
    //         if(curLevel === "adm0"){
    //             transitionBarChart(getAVG(cf.groupByAdm1Sum.all(),cf.groupByAdm1Count.all()));
    //         }
    //         if(curLevel === "adm1"){
    //             transitionBarChart(getAVG(cf.groupByMktSum.all(),cf.groupByMktCount.all()));
    //         }                        
    //     });
        
    var area = d3.area()
        //.interpolate("monotone")
        .x(function(d) { return x(d.key); })
        .y0(height)
        .y1(function(d) { return y(d.value); });

    var area2 = d3.area()
        //.interpolate("monotone")
        .x(function(d) { return x2(d.key); })
        .y0(height2)
        .y1(function(d) { return y2(d.value); });

    var main_chart = d3.select("#main_chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top+10 + margin.bottom);

    main_chart.append("defs").append("clipPath")
        .attr("id", "clip")
      .append("rect")
        .attr("width", width)
        .attr("height", height);

    var focus = main_chart.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + (margin.top+10) + ")");

    // var nav_chart = d3.select("#nav_chart").append("svg")
    //     .attr("width", width + margin.left + margin.right)
    //     .attr("height", height2 + margin.top + margin.bottom);

    // var context = nav_chart.append("g")
    //     .attr("class", "context")
    //     .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    x.domain(d3.extent(data.map(function(d) { return d.key; })));
    y.domain([0, d3.max(data.map(function(d) { return d.value; }))]);
    x2.domain(x.domain());
    y2.domain(y.domain());
    
    var price = main_chart.append("g")
         .attr("class", "pricelabel")
         .style("display", "none");

        price.append("circle")
            .attr("cy",10)
            .attr("r", 4)
            .attr("fill","#ffffff")
            .attr("stroke","#6fbfff");

        price.append("text")
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("class","wfplabel");    

    var bisectDate = d3.bisector(function(d) { return d.key; }).left;

    focus.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area)
        .on("mouseover", function() { price.style("display", null); })
        .on("mouseout", function() { price.style("display", "none"); })
        .on("mousemove",function(d){
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.key > d1.key - x0 ? d1 : d0;
            price.attr("transform", "translate(" + (x(d.key)+margin.left) + "," + (y(d.value)+margin.top) + ")");
            var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
            var m_names = new Array('Jan', 'Feb', 'Mar', 
                'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 
                'Oct', 'Nov', 'Dec'); 
            var date = m_names[d.key.getMonth()] + '-' + d.key.getFullYear();
            price.select("text").text(date+": "+value);
        });

    var linedata = [];
    
    data.forEach(function(e){
        linedata.push([{x:e.key,y:0},{x:e.key,y:e.value}]);
    });

    var line = d3.line()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); });

    focus.append("g")
        .selectAll(".line")
        .data(linedata)
        .enter().append("path")
        .attr("class", "priceline")
        .attr("d", line)
        .attr("stroke","#6fbfff")
        .attr("clip-path", "url(#clip)")
        .on("mouseover", function() { price.style("display", null); })
        .on("mouseout", function() { price.style("display", "none"); })
        .on("mousemove",function(d){
            var x0 = x.invert(d3.mouse(this)[0]),
                i = bisectDate(data, x0),
                d0 = data[i - 1],
                d1 = data[i],
                d = x0 - d0.key > d1.key - x0 ? d1 : d0;
            price.attr("transform", "translate(" + (x(d.key)+margin.left) + "," + (y(d.value)+margin.top) + ")");
            var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
            var m_names = new Array('Jan', 'Feb', 'Mar', 
                'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 
                'Oct', 'Nov', 'Dec'); 
            var date = m_names[d.key.getMonth()] + '-' + d.key.getFullYear();
            price.select("text").text(date+": "+value);
        });

    focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);
 
    // context.append("path")
    //     .datum(data)
    //     .attr("class", "area")
    //     .attr("d", area2);

    // context.append("g")
    //     .attr("class", "x axis")
    //     .attr("transform", "translate(0," + height2 + ")")
    //     .call(xAxis2);

    // context.append("g")
    //     .attr("class", "x brush")
    //     //.call(brush.extent(x2.domain()))
    //     .call(brush)
    //     .selectAll("rect")
    //         .attr("y", -6)
    //         .attr("height", height2+6)
    //         .style({
    //             "stroke-width":2,
    //             "stroke":"#6fbfff",
    //             "fill-opacity": "0"
    //         });  

  
    main_chart.append("text")
        .attr("class", "y wfplabel ylabel")
        .attr("text-anchor", "end")
        .attr("y", 0)
        .attr("x",-30)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("Price in local currency");
  
    $('#main_chart').append('<a id="mainchartdownload" href="">Download Data</a>');
    $('#mainchartdownload').click(function(event){
        event.preventDefault();
        downloadData(data,'Date',title);
    });
    
    //var dates = d3.event.selection==null ? x2.domain() : d3.event.selection;
    // var dates = x2.domain();
    // var dateFormatted = monthNames[dates[0].getMonth()] +" " + dates[0].getFullYear() + " - " +  monthNames[dates[1].getMonth()] +" " + dates[1].getFullYear();
    
    //$("#dateextent").html("Average Price for period " + dateFormatted);
  
    // function brushed() {
    // 	var selection = d3.event.selection;
    //   x.domain(selection===null ? x2.domain() : selection);
    //   focus.select(".area").attr("d", area);
    //   focus.select(".x.axis").call(xAxis);
    //   focus.selectAll(".priceline").attr("d", line); 
    // }
    
    // function setBrushExtent(data,months){
    //   var domain = d3.extent(data.map(function(d) { return d.key; }));  
    //   var endDate = domain[1];
    //   var tempDate = new Date(endDate.getFullYear(), endDate.getMonth()-months, endDate.getDate());
    //   var begDate = tempDate < domain[0] ? domain[0] : tempDate;
    //   d3.select(".brush").call(brush.extent([begDate,endDate]));
    //   brushed();
    // }
}

function downloadData(data,name,title){
    var csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += title+'\n\n';
    csvContent += name+',Price\n';
    var m_names = new Array('January', 'February', 'March', 
    'April', 'May', 'June', 'July', 'August', 'September', 
    'October', 'November', 'December');    
    data.forEach(function(e, index){
       if(name==='Date'){
           var key = m_names[e.key.getMonth()] + '-' + e.key.getFullYear();
       } else {
           var key = e.key;
       }
           
       var dataString = key+','+e.value;
       csvContent += index < data.length ? dataString+ '\n' : dataString;
    });
    var encodedUri = encodeURI(csvContent);
    var link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'data.csv');
    link.click();
}

function generateBarChart(data,cf,prod,unit,adm0,adm0_code,adm1){
    data.forEach(function(e){
        if(e.key.length>14){
            e.display = e.key.substring(0,14)+"...";
        } else {
            e.display = e.key;
        }
    });
    $('#drilldown_chart').html('<p>Click a bar on the chart below to explore data for that area. <span id="dateextent"></span></p>');
    var margin = {top: 20, right: 60, bottom: 60, left: 60},
        width = $("#drilldown_chart").width() - margin.left - margin.right,
        height =  135 - margin.top - margin.bottom;
    
    var x = d3.scaleBand()
        .rangeRound([0, width]);

    var y = d3.scaleLinear()
        .range([0,height]); 

    var xAxis = d3.axisBottom()
        .scale(x);

    var yAxis = d3.axisLeft()
        .scale(y)
        .ticks(3);
    
    x.domain(data.map(function(d) {return d.display; }));
    y.domain([d3.max(data.map(function(d) { return d.value; })),0]);
    
    var svg = d3.select("#drilldown_chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
        .attr("class", "x axis xaxis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")  
            .style("text-anchor", "start")
            .attr("transform", function(d) {
                return "rotate(30)"; 
            });

    svg.append("g")
        .attr("class", "y axis yaxis")
        .call(yAxis);

    var price = svg.append("g")
         .attr("class", "barpricelabel");
         //.style("display", "none");

        price.append("text")
            .attr("dy", ".35em")
            .style("text-anchor", "middle")
            .attr("class","wfplabel")

    svg.selectAll("rect")
            .data(data)
            .enter()
            .append("rect") 
            .attr("x", function(d,i) { return x(d.display); })
            .attr("width", x.bandwidth()-1)
            .attr("y", function(d){
                           return y(d.value);        
            })
            .attr("height", function(d) {
                            return height-y(d.value);
            })
            .attr("class","bar")
            .on("mouseover", function(d) {
                    price.style("display", null);
                    var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
                    price.attr("transform", "translate(" + (x(d.display)+(x.bandwidth()-1)/2) + "," + (y(d.value)-10) + ")");
                    price.select("text").text(value);
            })
            .on("mouseout", function() { 
                    price.style("display", "none");
            })    
            .on("click",function(d){
                if(curLevel === "adm1"){generateMktChartView(cf,d.key,prod,unit,adm0,adm0_code,adm1);};
                if(curLevel === "adm0"){generateADMChartView(cf,d.key,prod,unit,adm0,adm0_code);};
            });
 
            
}

function transitionBarChart(data){
    data.forEach(function(e){
        if(e.key.length>14){
            e.display = e.key.substring(0,14)+"...";
        } else {
            e.display = e.key;
        }
    });   
    
    var margin = {top: 10, right: 60, bottom: 60, left: 60},
        width = $("#drilldown_chart").width() - margin.left - margin.right,
        height =  130 - margin.top - margin.bottom;
    
    var x = d3.scaleBand()
        .rangeRound([0, width]);

    var y = d3.scaleLinear()
        .range([0,height]);

    
    x.domain(data.map(function(d) {return d.display; }));
    y.domain([d3.max(data.map(function(d) { return d.value; })),0]);
    
    var xAxis = d3.axisBottom()
        .scale(x);

    var yAxis = d3.axisLeft()
        .scale(y)
        .ticks(3);    
    
    d3.selectAll(".yaxis")
        .transition().duration(200)
        .call(yAxis);

    d3.selectAll(".xaxis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .selectAll("text")  
            .style("text-anchor", "start")
            .attr("transform", function(d) {
                return "rotate(30)";
    }); 
        
    var count = data.length;
    
    var svg = d3.select("#drilldown_chart").selectAll("rect")
            .attr("x", function(d,i) { return x(d.display); })
            .attr("width", x.bandwidth()-1)
            .attr("y", function(d){
                           return y(d.value);        
            })
            .attr("height", function(d,i) {
                if(i>=count){
                            return 0;
                } else {
                            return height-y(d.value);
                }
            }).on("mouseover", function(d) {
                    var price = d3.select(".barpricelabel");
                    price.style("display", null);
                    var value = d.value<100 ? d.value.toPrecision(3) : Math.round(d.value);
                    price.attr("transform", "translate(" + (x(d.display)+(x.bandwidth()-1)/2) + "," + (y(d.value)-10) + ")");
                    price.select("text").text(value);
            });
            
    
    var svg = d3.select("#drilldown_chart").selectAll("rect").data(data)
        .transition().duration(200)  
            .attr("x", function(d,i) { return x(d.display); })
            .attr("width", x.bandwidth()-1)
            .attr("y", function(d){
                           return y(d.value);        
            })
            .attr("height", function(d) {
                            return height-y(d.value);
            });  
                
}



function getMonth(m) {
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return months[m];
}

function compare(a, b) {
  const keyA = a.key.toLowerCase();
  const keyB = b.key.toLowerCase();

  let comparison = 0;
  if (keyA > keyB) {
    comparison = 1;
  } else if (keyA < keyB) {
    comparison = -1;
  }
  return comparison;
}

function wrap(text, width) {
  text.each(function() {
    var text = d3.select(this),
        words = text.text().split(/\s+/).reverse(),
        word,
        line = [],
        lineNumber = 0,
        lineHeight = 0.9, // ems
        y = text.attr("y"),
        dy = parseFloat(text.attr("dy")),
        tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y);
    while (word = words.pop()) {
      line.push(word);
      tspan.text(line.join(" "));
      if (tspan.node().getComputedTextLength() > width) {
        line.pop();
        tspan.text(line.join(" "));
        line = [word];
        tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", + lineHeight + "em").text(word);
      }
    }
  });
}

function truncateString(str, num) {
  if (str.length <= num) {
    return str;
  }
  return str.slice(0, num) + '...';
}

function formatValue(val) {
  var format = d3.format('$.3s');
  var value;
  if (val=='') {
    value = 'NA';
  }
  else {
    value = (isNaN(val) || val==0) ? val : format(val).replace(/G/, 'B');
  }
  return value;
}

function roundUp(x, limit) {
  return Math.ceil(x/limit)*limit;
}

function setSelect(id, valueToSelect) {    
  let element = document.getElementById(id);
  element.value = valueToSelect;
}

const countryCodeList = [
  'AFG',
  'BDI',
  'BFA',
  'CAF',
  'CMR',
  'COD',
  'COL',
  'ETH',
  'HTI',
  'IRQ',
  'LBY',
  'MLI',
  'MMR',
  'NER',
  'NGA',
  'PSE',
  'SDN',
  'SOM',
  'SSD',
  'SYR',
  'TCD',
  'UKR',
  'VEN',
  'YEM',
  'ZWE'
];
function setGlobalFigures() {
	var globalFigures = $('.global-figures');
	globalFigures.find('.figures, .source').empty();
	if (currentIndicator.id=='#affected+inneed+pct') {
		globalFigures.find('h2').text('People in Need');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', (d3.format('.4s'))(totalPIN));
		createKeyFigure('.figures', 'Number of Countries', '', nationalData.length);
		createSource(globalFigures, '#affected+inneed');
	}
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		globalFigures.find('h2').text('Humanitarian Funding Overview');
		var totalPIN = d3.sum(nationalData, function(d) { return +d['#affected+inneed']; });
		createKeyFigure('.figures', 'Total Funding Required', '', formatValue(worldData['#value+funding+required+usd']));
		createKeyFigure('.figures', 'GHRP Requirement (COVID-19)', '', formatValue(worldData['#value+covid+funding+ghrp+required+usd']));
		createKeyFigure('.figures', 'Funding Coverage', '', percentFormat(worldData['#value+funding+pct']));
		createKeyFigure('.figures', 'Countries Affected', '', nationalData.length);
		//createSource(globalFigures, '#affected+inneed');
	}
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		globalFigures.find('h2').text('CERF COVID-19 Allocations Overview');
		createKeyFigure('.figures', 'Total CERF COVID-19 Funding', '', formatValue(worldData['#value+cerf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCERFCountries);
		createSource(globalFigures, '#value+cerf+covid+funding+total+usd');
	}
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		globalFigures.find('h2').text('CBPF COVID-19 Allocations Overview');
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(worldData['#value+cbpf+covid+funding+global+usd']));
		createKeyFigure('.figures', 'Number of Countries', '', worldData.numCBPFCountries);
		createSource(globalFigures, '#value+cbpf+covid+funding+total+usd');
	}
	else {	
		//global figures
		var totalCases = d3.sum(nationalData, function(d) { return d['#affected+infected']; });
		var totalDeaths = d3.sum(nationalData, function(d) { return d['#affected+killed']; });
		globalFigures.find('h2').text('COVID-19 Pandemic in '+ nationalData.length +' GHRP Locations');
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', numFormat(totalDeaths));
		createSource(globalFigures, '#affected+infected');
	}
}

function createKeyFigure(target, title, className, value) {
  var targetDiv = $(target);
  return targetDiv.append("<div class='key-figure'><div class='inner'><h3>"+ title +"</h3><div class='num " + className + "'>"+ value +"</div></div></div></div>");
}


/************************/
/*** SOURCE FUNCTIONS ***/
/************************/
function createSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank">DATA</a></p>');
}

function updateSource(div, indicator) {
  var sourceObj = getSource(indicator);
  var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
  var sourceName = (sourceObj['#meta+source']==undefined) ? '' : sourceObj['#meta+source'];
  var sourceURL = (sourceObj['#meta+url']==undefined) ? '#' : sourceObj['#meta+url'];
  div.find('.date').text(date);
  div.find('.source-name').text(sourceName);
  div.find('.dataURL').attr('href', sourceURL);
}

function getSource(indicator) {
  var obj = {};
  sourcesData.forEach(function(item) {
    if (item['#indicator+name']==indicator) {
      obj = item;
    }
  });
  return obj;
}


var map, mapFeatures, globalLayer, globalLabelLayer, globalMarkerLayer, countryLayer, countryBoundaryLayer, countryLabelLayer, countryMarkerLayer, tooltip, markerScale, countryMarkerScale;
var adm0SourceLayer = '63_polbnda_int_uncs-29lk4r';
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/ckb843tjb46fy1ilaw49redy7',
    center: [10, 6],
    minZoom: 1,
    zoom: 2,
    attributionControl: false
  });

  map.addControl(new mapboxgl.NavigationControl())
     .addControl(new mapboxgl.AttributionControl(), 'bottom-right');

  map.on('load', function() {
    console.log('Map loaded')
    
    mapLoaded = true;
    if (dataLoaded==true) displayMap();
  });
}

function displayMap() {
  console.log('Display map');

  //remove loader and show vis
  $('.loader, #static-map').remove();
  $('#global-map, .country-select, .map-legend, .global-figures').css('opacity', 1);

  createEvents();

  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      case 'adm0-fills':
        globalLayer = layer.id;
        break;
      case 'adm0-label':
        globalLabelLayer = layer.id;
        break;
      case 'adm0-centroids':
        globalMarkerLayer = layer.id;
        break;
      case 'adm1-fills':
        countryLayer = layer.id;
        map.setLayoutProperty(countryLayer, 'visibility', 'none');
        break;
      case 'adm1-boundaries':
        countryBoundaryLayer = layer.id;
        map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
        break;
      case 'hrp25-centroid-adm1-simplified-o':
        countryLabelLayer = layer.id;
        map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
        break;
      case 'adm1-marker-points':
        countryMarkerLayer = layer.id;
        map.setLayoutProperty(countryMarkerLayer, 'visibility', 'none');
        break;
      default:
        //do nothing
    }
  });

  mapFeatures = map.queryRenderedFeatures();

  //country select event
  d3.select('.country-select').on('change',function(e) {
    var selected = d3.select('.country-select').node().value;
    if (selected=='') {
      resetMap();
    }
    else {        
      currentCountry.code = selected;
      currentCountry.name = d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
    }
  });

  //init global and country layers
  initGlobalLayer();
  initCountryLayer();

  //create tooltip
  tooltip = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    className: 'map-tooltip'
  });
}


function matchMapFeatures(country_code) {
  //loop through mapFeatures to find matches to currentCountry.code
  var selectedFeatures = [];
  mapFeatures.forEach(function(feature) {
    if (feature.sourceLayer==adm0SourceLayer && feature.properties.ISO_3==currentCountry.code) {
      selectedFeatures.push(feature)
    }
  });
  return selectedFeatures;
}

function createEvents() {
  //menu events
  $('.menu-indicators li').on('click', function() {
    $('.menu-indicators li').removeClass('selected')
    $(this).addClass('selected');
    currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};

    //set food prices view
    if (currentIndicator.id=='#food-prices') {
      $('.content').addClass('food-prices-view');
    }
    else {
      $('.content').removeClass('food-prices-view');
      closeModal();
    }

    //set travel restrictions view
    if (currentIndicator.id=='#severity+travel') {
      $('.content').addClass('travel-restrictions-view');
    }
    else {
      $('.content').removeClass('travel-restrictions-view');
    }

    updateGlobalLayer();
  });
  currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected div').text()};
  
  //back to global event
  $('.country-menu h2').on('click', function() {
    resetMap();
  });

  //country panel indicator select event
  d3.select('.indicator-select').on('change',function(e) {
    var selected = d3.select('.indicator-select').node().value;
    if (selected!='') {
      var container = $('.country-panel');
      var section = $('.'+selected);
      var offset = $('.panel-header').innerHeight();
      container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop() - offset}, 300);
    }
  });

  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
  });
}

function selectCountry(features) {
  //set first country indicator
  $('#foodSecurity').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  updateCountryLayer();
  map.setLayoutProperty(globalLayer, 'visibility', 'none');
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  var bbox = turf.bbox(turf.featureCollection(features));
  var offset = 50;
  map.fitBounds(bbox, {
    padding: {left: $('.map-legend.country').outerWidth()+offset+10, right: $('.country-panel').outerWidth()+offset},
    linear: true
  });

  map.once('moveend', initCountryView);
}

function setTravelDescription(country) { 
  var data = dataByCountry[country.code][0];
  var text = truncateString(data['#severity+travel'], 275);
  var content = '<h2 class="title">'+ country.name +'</h2>';
  content += '<span class="small">Published on: '+ data['#severity+date+travel'] +'</span>';
  content += '<p>Restrictions: '+ text +'</p>';
  content += '<a href="https://unwfp.maps.arcgis.com/apps/opsdashboard/index.html#/db5b5df309ac4f10bfd36145a6f8880e" target="_blank">Read More&nbsp;&nbsp;<i class="humanitarianicons-Out-of-platform"></i></a>';
  $('.layer-description .description-content').empty().append(content);
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function initGlobalLayer() {
  //create log scale for circle markers
  var maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
  markerScale = d3.scaleSqrt()
    .domain([1, maxCases])
    .range([2, 15]);
  
  //color scale
  colorScale = getGlobalColorScale();
  setGlobalLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val<=0 || val=='' || isNaN(val)) ? colorNoData : colorScale(val);
    expression.push(d['#country+code'], color);

    //covid markers
    var covidVal = d['#affected+infected'];
    var size = (covidVal=='') ? 0 : markerScale(covidVal);
    expressionMarkers.push(d['#country+code'], size);
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);
  
  //set properties
  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setPaintProperty(globalMarkerLayer, 'circle-stroke-opacity', 1);
  map.setPaintProperty(globalMarkerLayer, 'circle-opacity', 1);
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  map.setPaintProperty(globalMarkerLayer, 'circle-translate', [0,-7]);

  //define mouse events
  handleGlobalEvents();

  //global figures
  setGlobalFigures();
}

function handleGlobalEvents(layer) {
  map.on('mouseenter', globalLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    if (currentIndicator.id=='#food-prices' || currentIndicator.id=='#severity+travel') {
      //console.log(e)
    }
    else {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#food-prices' && currentIndicator.id!='#severity+travel') {
      var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
      var target;
      features.forEach(function(feature) {
        if (feature.sourceLayer==adm0SourceLayer)
          target = feature;
      });
      if (target!=undefined) {
        tooltip.setLngLat(e.lngLat);
        createMapTooltip(target.properties.ISO_3, target.properties.Terr_Name)
      }
    }
  });
     
  map.on('mouseleave', globalLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });

  map.on('click', function(e) {
    var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
    var target;
    features.forEach(function(feature) {
      if (feature.sourceLayer==adm0SourceLayer)
        target = feature;
    });
  
    if (target!=null) {
      currentCountry.code = target.properties.ISO_3;
      currentCountry.name = target.properties.Terr_Name;

      if (currentCountry.code!=undefined) {
        if (currentIndicator.id=='#food-prices') {
          openModal(currentCountry.name);
        }
        if (currentIndicator.id=='#severity+travel') {
          setTravelDescription(currentCountry);
        }
      }
    }
    
  });
}

function updateGlobalLayer() {
  setGlobalFigures();

  //color scales
  colorScale = getGlobalColorScale();

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = colorDefault;
    if (currentIndicator.id=='#food-prices') {
      color = foodPricesColor;
    }
    else if (currentIndicator.id=='#severity+travel') {
      color = travelColor;
    }
    else {
      color = (val<0 || val=='' || val==undefined) ? colorNoData : colorScale(val);
    }
    expression.push(d['#country+code'], color);
  });

  //default value for no data
  expression.push(colorDefault);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  setGlobalLegend(colorScale);

  if (currentIndicator.id=='#food-prices' || currentIndicator.id=='#severity+travel') {
    map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');

    var layer = $('.layer-description');
    layer.find('.description-content, .description-source').empty();    
    createSource($('.layer-description .description-source'), currentIndicator.id);
    if (currentIndicator.id=='#food-prices') {
      layer.find('h4').text('Click on a country to explore commodity prices');
    }
    if (currentIndicator.id=='#severity+travel') {
      layer.find('h4').text('Click on a country to view travel restrictions');
    }
  }
  else {
    map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  }
}

function getGlobalColorScale() {
  var max = d3.max(nationalData, function(d) { return +d[currentIndicator.id]; });
  if (currentIndicator.id.indexOf('pct')>-1 && currentIndicator.id!='#covid+cases+per+capita') max = 1;
  else if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else max = max;

  var scale;
  if (currentIndicator.id=='#severity+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id=='#value+funding+hrp+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleQuantize().domain([0, 1]).range(reverseRange);
  }
  else if (currentIndicator.id=='#vaccination-campaigns') {
    scale = d3.scaleOrdinal().domain(['Postponed / May postpone', 'On Track']).range(vaccinationColorRange);
  }
  else {
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }

  return scale;
}

function setGlobalLegend(scale) {
  var div = d3.select('.map-legend.global');
  var svg;

  //catch PIN pct indicator
  var indicator = (currentIndicator.id=='#affected+inneed+pct') ? '#affected+inneed' : currentIndicator.id;

  if (d3.select('.map-legend.global .scale').empty()) {
    createSource($('.map-legend.global .indicator-source'), indicator);
    svg = div.append('svg')
      .attr('class', 'legend-container');
    svg.append('g')
      .attr('class', 'scale');

    var nodata = div.append('svg')
      .attr('class', 'no-data-key');

    nodata.append('rect')
      .attr('width', 15)
      .attr('height', 15);

    nodata.append('text')
      .attr('class', 'label')
      .text('No Data');

    //cases
    $('.map-legend.global').append('<h4>Number of COVID-19 cases</h4>');
    createSource($('.map-legend.global'), '#affected+infected');
    var markersvg = div.append('svg')
      .attr('height', '55px');
    markersvg.append('g')
      .attr("transform", "translate(5, 10)")
      .attr('class', 'legendSize');

    var legendSize = d3.legendSize()
      .scale(markerScale)
      .shape('circle')
      .shapePadding(40)
      .labelFormat(numFormat)
      .labelOffset(15)
      .cells(2)
      .orient('horizontal');

    markersvg.select('.legendSize')
      .call(legendSize);
  }
  else {
    updateSource($('.indicator-source'), indicator);
  }

  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  $('.map-legend.global .indicator-title').text(legendTitle);

  if (currentIndicator.id=='#affected+inneed+pct') $('.no-data-key .label').text('Refugee/IDP data only')
  else $('.no-data-key .label').text('No Data')

  var legendFormat = ((currentIndicator.id).indexOf('pct')>-1) ? percentFormat : shortenNumFormat;
  var legend = d3.legendColor()
    .labelFormat(legendFormat)
    .cells(colorRange.length)
    .scale(scale);

  var g = d3.select('.map-legend.global .scale');
  g.call(legend);

  if (currentIndicator.id=='#vaccination-campaigns')
    $('.legend-container').addClass('vaccination-campaign');
  else
    $('.legend-container').removeClass('vaccination-campaign');
}


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryView() {
  $('.content').removeClass('food-prices-view');
  $('.content').removeClass('travel-restrictions-view');
  $('.content').addClass('country-view');
  $('.country-panel').show().scrollTop(0);

  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(colorRange);
  createCountryLegend(countryColorScale);

  //mouse events
  map.on('mouseenter', countryLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    tooltip.addTo(map);
  });

  map.on('mousemove', countryLayer, function(e) {
    var f = map.queryRenderedFeatures(e.point)[0];
    if (f.properties.ADM0_REF=='State of Palestine' || f.properties.ADM0_REF=='Venezuela (Bolivarian Republic of)') f.properties.ADM0_REF = currentCountry.name;
    if (f.properties.ADM0_PCODE!=undefined && f.properties.ADM0_REF==currentCountry.name) {
      map.getCanvas().style.cursor = 'pointer';
      createCountryMapTooltip(f.properties.ADM1_REF);
      tooltip
        .addTo(map)
        .setLngLat(e.lngLat);
    }
    else {
      map.getCanvas().style.cursor = '';
      tooltip.remove();
    }
  });
     
  map.on('mouseleave', countryLayer, function() {
    map.getCanvas().style.cursor = '';
    tooltip.remove();
  });
}

function updateCountryLayer() {
  if (currentCountryIndicator.id=='#affected+food+ipc+p3+pct') checkIPCData();

  $('.map-legend.country .legend-container').removeClass('no-data');
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num') max = roundUp(max, 10);

  //color scale
  var clrRange = (currentCountryIndicator.id.indexOf('vaccinated')>0) ? immunizationColorRange : colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  //create log scale for circle markers
  // var healthFacilityMax = d3.max(subnationalData, function(d) {
  //   if (d['#country+code']==currentCountry.code)
  //     return +d['#loc+count+health']; 
  // })
  // var markerScale = d3.scaleSqrt()
  //   .domain([1, healthFacilityMax])
  //   .range([2, 15]);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  //var expressionMarkers = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      color = (val<0 || val=='') ? colorNoData : countryColorScale(val);
      layerOpacity = 1;

      //health facility markers
      // var healthVal = (currentCountryIndicator.id=='#loc+count+health') ? d['#loc+count+health'] : 0;
      // markerSize = markerScale(healthVal);
    }
    else {
      color = colorDefault;
      layerOpacity = 0;
      //markerSize = 0;
    }
    
    expression.push(d['#adm1+code'], color);
    expressionOpacity.push(d['#adm1+code'], layerOpacity);
    //expressionMarkers.push(d['#adm1+code'], markerSize);
  });
  expression.push(colorDefault);
  expressionOpacity.push(0);
  //expressionMarkers.push(0);

  //set properties
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);

  //set health facility markers
  // map.setPaintProperty(countryMarkerLayer, 'circle-radius', expressionMarkers);
  // map.setPaintProperty(countryMarkerLayer, 'circle-color', '#007ce1');
  // map.setPaintProperty(countryMarkerLayer, 'circle-opacity', 0.6);
  // map.setPaintProperty(countryMarkerLayer, 'circle-translate', [0,-10]);

  //hide color scale if no data
  if (max!=undefined && max>0)
    updateCountryLegend(countryColorScale);
  else
    $('.map-legend.country .legend-container').addClass('no-data');

  //load pop density raster
  // var id = currentCountry.code.toLowerCase();
  // var raster = '';
  // switch(id) {
  //   case 'ukr':
  //     raster = 'adkwa0bw';
  //     break;
  //   case 'bdi':
  //     raster = '85uxb0dw';
  //     break;
  //   case 'col':
  //     raster = 'awxirkoh';
  //     break;
  //   case 'pse':
  //     raster = '1emy37d7';
  //     break;
  //   default:
  //     //
  // }


  // if (map.getLayer(id+'-popdensity')) {
  //   map.removeLayer(id+'-popdensity');
  // }
  // if (map.getSource(id+'-pop-tileset')) {
  //   map.removeSource(id+'-pop-tileset');
  // }


  // if (currentCountryIndicator.id=='#population' && raster!='') {
  //   map.addSource(id+'-pop-tileset', {
  //     type: 'raster',
  //     url: 'mapbox://humdata.'+raster
  //   });

  //   map.addLayer(
  //     {
  //       'id': id+'-popdensity',
  //       'type': 'raster',
  //       'source': id+'-pop-tileset'
  //     },
  //     countryBoundaryLayer
  //   );
  // }
}

function checkIPCData() {
  //swap food security data source if empty
  var index = 0;
  var isEmpty = false;
  subnationalData.forEach(function(d) {
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      if (index==0 && val==' ') {
        isEmpty = true;
      }
      if (isEmpty && index==1 && val!=' ') {
        isEmpty = false;
      }
      index++;
    }
  });

  if (isEmpty) currentCountryIndicator.id = '#affected+ch+food+p3+pct';
}

function getCountryIndicatorMax() {
  var max =  d3.max(subnationalData, function(d) { 
    if (d['#country+code']==currentCountry.code) {
      return +d[currentCountryIndicator.id]; 
    }
  });
  return max;
}

function createCountryLegend(scale) {
  createSource($('.map-legend.country .food-security-source'), '#affected+food+ipc+p3+pct');
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .orgs-source'), '#org+count+num');
  createSource($('.map-legend.country .health-facilities-source'), '#loc+count+health');
  createSource($('.map-legend.country .immunization-source'), '#population+ipv1+pct+vaccinated');

  var legend = d3.legendColor()
    .labelFormat(percentFormat)
    .cells(colorRange.length)
    .title('LEGEND')
    .scale(scale);

  var div = d3.select('.map-legend.country');
  var svg = div.append('svg')
    .attr('class', 'legend-container');

  svg.append('g')
    .attr('class', 'scale')
    .call(legend);

  //no data
  var nodata = div.append('svg')
    .attr('class', 'no-data-key');

  nodata.append('rect')
    .attr('width', 15)
    .attr('height', 15);

  nodata.append('text')
    .attr('class', 'label')
    .text('No Data');
}

function updateCountryLegend(scale) {
  if (currentCountryIndicator.id=='#affected+ch+food+p3+pct' || currentCountryIndicator.id=='#affected+food+ipc+p3+pct') {
    $('.map-legend.country .food-security-source').empty();
    createSource($('.map-legend.country .food-security-source'), currentCountryIndicator.id);
  }

  var legendFormat;
  switch(currentCountryIndicator.id) {
    case '#affected+food+ipc+p3+pct':
      legendFormat = percentFormat;
      break;
    case '#affected+ch+food+p3+pct':
      legendFormat = percentFormat;
      break;
    case '#population':
      legendFormat = shortenNumFormat;
      break;
    default:
      legendFormat = d3.format('.0s');
  }
  if (currentCountryIndicator.id.indexOf('vaccinated')>-1) legendFormat = percentFormat;
  var legend = d3.legendColor()
    .labelFormat(legendFormat)
    .cells(colorRange.length)
    .scale(scale);

  var g = d3.select('.map-legend.country .scale');
  g.call(legend);
}


/*************************/
/*** TOOLTIP FUNCTIONS ***/
/*************************/
var lastHovered = '';
function createMapTooltip(country_code, country_name) {
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  var val = country[0][currentIndicator.id];

  if (lastHovered!=country_code) {
    //format content for tooltip
    if (currentIndicator.id=='#vaccination-campaigns') {
      var vaccData = [];
      vaccinationDataByCountry.forEach(function(country) {
        if (country.key==country_code) {
          vaccData = country.values;
        }
      });
      if (vaccData.length<1) {
        var content = '<h2>' + country_name + '</h2><div class="stat">No data</div>';
      }
      else {
        var content = '<h2>' + country_name + '</h2>';
        content += '<table><tr><th>Campaign Vaccine:</th><th>Planned Start Date:</th><th>Status:</th></tr>';
        vaccData.forEach(function(row) {
          var className = (row['#status+name'].indexOf('Postpone')>-1) ? 'covid-postpone' : '';
          content += '<tr class="'+className+'"><td>'+row['#service+name']+'</td><td>'+row['#date+start']+'</td><td>'+row['#status+name']+'</td></tr>';
        });
        content += '</table>';
      }
    }
    else {
      if (val!=undefined && val!='') {
        if (currentIndicator.id.indexOf('pct')>-1) val = percentFormat(val);
        if (currentIndicator.id=='#severity+economic+num' || currentIndicator.id.indexOf('funding+total+usd')>-1) val = shortenNumFormat(val);
      }
      else {
        val = 'No Data';
      }
      var content = '<h2>' + country_name + '</h2>';

      //PIN layer shows refugees and IDPs
      if (currentIndicator.id=='#affected+inneed+pct') {
        if (val!='No Data') content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
        content += '<div class="pins">Refugees: '+ numFormat(country[0]['#affected+refugees']) +'<br/>IDPs: '+ numFormat(country[0]['#affected+displaced']) +'</div>';
      }
      else if (currentIndicator.id=='#covid+cases+per+capita') {
        var value = (val=='No Data') ? val : val.toFixed(2);
        content +=  currentIndicator.name + ':<div class="stat covid-capita">' + value + '</div>';

        content +=  "Weekly % increase of new cases" + ':<div class="stat covid-pct">' + percentFormat(country[0]['#covid+trend+pct']) + '</div>';
      }
      else {
        content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }

      //covid cases and deaths
      content += '<div class="cases">COVID-19 Cases: ' + numFormat(country[0]['#affected+infected']) + '<br/>';
      content += 'COVID-19 Deaths: ' + numFormat(country[0]['#affected+killed']) + '</div>';
    }

    tooltip.setHTML(content);

    //covid cases layer show sparkline
    if (currentIndicator.id=='#covid+cases+per+capita' && val!='No Data') {
      if (val!='No Data') {
        var sparklineArray = [];
        covidTrendData[country_code].forEach(function(d) {
          var obj = {date: d.date_epicrv, value: d.weekly_new_cases_per_ht};
          sparklineArray.push(obj);
        });
        createSparkline(sparklineArray, '.mapboxgl-popup-content .stat.covid-capita');
      }
      if (country[0]['#covid+trend+pct']!=undefined) {
        var pctArray = [];
        covidTrendData[country_code].forEach(function(d) {
          var obj = {date: d.date_epicrv, value: d.weekly_pc_increase};
          pctArray.push(obj);
        });
        createSparkline(pctArray, '.mapboxgl-popup-content .stat.covid-pct')
      }
      
    }

    //showMapTooltip(content);
  }
  lastHovered = country_code;
}

function createCountryMapTooltip(adm1_name) {
  var adm1 = subnationalData.filter(function(c) {
    if (c['#adm1+name']==adm1_name && c['#country+code']==currentCountry.code)
      return c;
  });

  if (adm1[0]!=undefined) {
    var val = adm1[0][currentCountryIndicator.id];

    //format content for tooltip
    if (val!=undefined && val!='' && !isNaN(val)) {
      if (currentCountryIndicator.id.indexOf('pct')>-1) val = (val>1) ? percentFormat(1) : percentFormat(val);
      if (currentCountryIndicator.id=='#population') val = shortenNumFormat(val);
    }
    else {
      val = 'No Data';
    }
    var content = '<h2>' + adm1_name + '</h2>' + currentCountryIndicator.name + ':<div class="stat">' + val + '</div>';

    showMapTooltip(content);
  }
}

function showMapTooltip(content) {
  tooltip.setHTML(content);
}


function resetMap() {
  // var id = currentCountry.code.toLowerCase();
  // if (map.getLayer(id+'-popdensity')) {
  //   map.removeLayer(id+'-popdensity');
  // }
  // if (map.getSource(id+'-pop-tileset')) {
  //   map.removeSource(id+'-pop-tileset');
  // }
  
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.country-panel').fadeOut();
  setSelect('countrySelect', '');

  if (currentIndicator.id=='#food-prices') {
    $('.content').addClass('food-prices-view');
  }
  if (currentIndicator.id=='#severity+travel') {
    $('.content').addClass('travel-restrictions-view');
  }

  updateGlobalLayer();

  map.flyTo({ 
    speed: 2,
    zoom: 2,
    center: [10, 6] 
  });
  map.once('moveend', function() {
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
    //map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  });
}


/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  updateTimeseries(timeseriesData, data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name']);

  //covid
  var covidDiv = $('.country-panel .covid .panel-inner');
  covidDiv.children().remove();  
  createFigure(covidDiv, {className: 'cases', title: 'Total Confirmed Cases', stat: numFormat(data['#affected+infected']), indicator: '#affected+infected'});
  createFigure(covidDiv, {className: 'deaths', title: 'Total Confirmed Deaths', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});

  //projections
  var projectionsDiv = $('.country-panel .projections .panel-inner');
  projectionsDiv.children().remove();  
  projectionsDiv.append('<h6>COVID-19 Projections</h6><div class="bar-chart projections-cases"><p class="chart-title">Cases</p></div>');
  var cases = [{model: 'Imperial', min: data['#affected+cases+infected+imperial+min'], max: data['#affected+cases+infected+imperial+max']},
               {model: 'LSHTM', min: data['#affected+cases+infected+lshtm+min'], max: data['#affected+cases+infected+lshtm+max']}];
  createBarChart(cases, 'Cases');
  
  projectionsDiv.append('<div class="bar-chart projections-deaths"><p class="chart-title">Deaths</p></div>');
  var deaths = [{model: 'Imperial', min: data['#affected+deaths+imperial+min'], max: data['#affected+deaths+imperial+max']},
                {model: 'LSHTM', min: data['#affected+deaths+lshtm+min'], max: data['#affected+deaths+lshtm+max']}];
  createBarChart(deaths, 'Deaths');

  //hrp
  var hrpDiv = $('.country-panel .hrp .panel-inner');
  hrpDiv.children().remove();
  createFigure(hrpDiv, {className: 'funding-required', title: 'HRP requirement', stat: formatValue(data['#value+funding+hrp+required+usd']), indicator: '#value+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-level', title: 'HRP Funding Level', stat: percentFormat(data['#value+funding+hrp+pct']), indicator: '#value+covid+funding+hrp+pct'});
  createFigure(hrpDiv, {className: 'funding-covid-required', title: 'COVID-19 GHRP requirement', stat: formatValue(data['#value+covid+funding+hrp+required+usd']), indicator: '#value+covid+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-allocation', title: 'COVID-19 GHRP allocation', stat: formatValue(data['#value+covid+funding+hrp+total+usd']), indicator: '#value+covid+funding+hrp+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cerf-allocation', title: 'CERF COVID-19 allocation', stat: formatValue(data['#value+cerf+covid+funding+total+usd']), indicator: '#value+cerf+covid+funding+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cbpf-allocation', title: 'CBPF COVID allocation', stat: formatValue(data['#value+cbpf+covid+funding+total+usd']), indicator: '#value+cbpf+covid+funding+total+usd'});

  //inform
  var informDiv = $('.country-panel .inform .panel-inner');
  informDiv.children().remove();  
  createFigure(informDiv, {className: 'risk-index', title: 'Risk Index<br>(1-10)', stat: data['#severity+num'], indicator: '#severity+num'});
  createFigure(informDiv, {className: 'risk-class', title: 'Risk Class<br>(Very Low-Very High)', stat: data['#severity+type'], indicator: '#severity+num'});

  //school
  var schoolDiv = $('.country-panel .schools .panel-inner');
  schoolDiv.children().remove();  
  createFigure(schoolDiv, {className: 'school', stat: data['#impact+type'], indicator: '#impact+type'});
}

function createFigure(div, obj) {
  div.append('<div class="figure '+ obj.className +'"><div class="figure-inner"></div></div>');
  var divInner = $('.'+ obj.className +' .figure-inner');
  if (obj.title != undefined) divInner.append('<h6 class="title">'+ obj.title +'</h6>');
  divInner.append('<p class="stat">'+ obj.stat +'</p>');

  createSource(divInner, obj.indicator);
}

var numFormat = d3.format(',');
var shortenNumFormat = d3.format('.2s');
var percentFormat = d3.format('.0%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var vaccinationColorRange = ['#F2645A','#EEEEEE'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var foodPricesColor = '#007CE1';
var travelColor = '#F2645A';//'#6EB4ED'
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var worldData, nationalData, subnationalData, vaccinationData, timeseriesData, covidTrendData, dataByCountry, colorScale = '';
var mapLoaded = false;
var dataLoaded = false;

var currentIndicator = {};
var currentCountryIndicator = {};
var popDataByCountry = {};
var currentCountry = {};

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')) ? true : false;
  //console.log(prod);
  
  var timeseriesPath = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS23DBKc8c39Aq55zekL0GCu4I6IVnK4axkd05N6jUBmeJe9wA69s3CmMUiIvAmPdGtZPBd-cLS9YwS/pub?gid=1253093254&single=true&output=csv';
  mapboxgl.accessToken = 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA';
  var minWidth = 1000;
  var viewportWidth = (window.innerWidth<minWidth) ? minWidth - $('.content-left').innerWidth() : window.innerWidth - $('.content-left').innerWidth();
  var viewportHeight = window.innerHeight;
  var tooltip = d3.select('.tooltip');


  function init() {
    //detect mobile users
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('.mobile-message').show();
    }
    $('.mobile-message').on('click', function() {
      $(this).remove();
    });

    //set content sizes based on viewport
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('.content-right').css('min-width', viewportWidth);
    $('.footnote').width(viewportWidth - $('.global-figures').innerWidth() - 50);
    if (viewportHeight<696) $('.map-legend.country').height(viewportHeight - parseInt($('.map-legend.country').css('top')) - 60);

    //load static map -- will only work for screens smaller than 1280
    if (viewportWidth<=1280) {
      var staticURL = 'https://api.mapbox.com/styles/v1/humdata/ckb843tjb46fy1ilaw49redy7/static/10,6,2/'+viewportWidth+'x'+viewportHeight+'?access_token='+mapboxgl.accessToken;
      $('#static-map').css('background-image', 'url('+staticURL+')');
    }
  
    getData();
    initMap();
  }

  function getData() {
    console.log('Loading data...')
    Promise.all([
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-covid-viz/master/out.json'),
      d3.csv(timeseriesPath),
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/pa-COVID-trend-analysis/master/hrp_covid_weekly_trend.json')
    ]).then(function(data) {
      console.log('Data loaded')
      $('.loader span').text('Initializing map...');

      //parse data
      var allData = data[0];
      timeseriesData = data[1];
      covidTrendData = data[2];
      worldData = allData.world_data[0];
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      sourcesData = allData.sources_data;
      vaccinationData = allData.vaccination_campaigns_data;

      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      })

      //group population data by country    
      popDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .rollup(function(v) { return d3.sum(v, function(d) { return d['#population']; }); })
        .object(subnationalData);

      //parse national data
      var numCERF = 0;
      var numCBPF = 0;
      nationalData.forEach(function(item) {
        //normalize PSE name
        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';

        //calculate and inject PIN percentage
        item['#affected+inneed+pct'] = (item['#affected+inneed']=='' || popDataByCountry[item['#country+code']]==undefined) ? '' : item['#affected+inneed']/popDataByCountry[item['#country+code']];
       
        //tally countries with cerf and cbpf data
        if (item['#value+cerf+covid+funding+total+usd']!='') numCERF++;
        if (item['#value+cbpf+covid+funding+total+usd']!='') numCBPF++;

        //store covid trend data
        var covidByCountry = covidTrendData[item['#country+code']];
        item['#covid+trend+pct'] = (covidByCountry!=undefined) ? covidByCountry[covidByCountry.length-1].weekly_pc_increase/100 : 0;
        item['#covid+cases+per+capita'] = (covidByCountry!=undefined) ? covidByCountry[covidByCountry.length-1].weekly_new_cases_per_ht : 0;
      })

      //inject data to world data
      worldData.numCERFCountries = numCERF;
      worldData.numCBPFCountries = numCBPF;

      //group national data by country -- drives country panel    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);

      //group vaccination data by country    
      vaccinationDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .entries(vaccinationData);

      //format dates and set overall status
      vaccinationDataByCountry.forEach(function(country) {
        var postponed = 'On Track';
        country.values.forEach(function(campaign) {
          var d = moment(campaign['#date+start'], ['YYYY-MM','MM/DD/YYYY']);
          var date = new Date(d.year(), d.month(), d.date());
          campaign['#date+start'] = (isNaN(date.getTime())) ? campaign['#date+start'] : getMonth(date.getMonth()) + ' ' + date.getFullYear();
          if (campaign['#status+name'].toLowerCase().indexOf('postponed')>-1) postponed = 'Postponed / May postpone';
        });

        nationalData.forEach(function(item) {
          if (item['#country+code'] == country.key) item['#vaccination-campaigns'] = postponed;
        });
      });

      //console.log(nationalData)
      //console.log(covidTrendData)
      // console.log(subnationalData)

      dataLoaded = true;
      if (mapLoaded==true) displayMap();

      initView();
    });
  }

  function initView() {
    //create country select
    var hrpData = nationalData.filter((row) => countryCodeList.includes(row['#country+code']));
    var countrySelect = d3.select('.country-select')
      .selectAll('option')
      .data(hrpData)
      .enter().append('option')
        .text(function(d) { return d['#country+name']; })
        .attr('value', function (d) { return d['#country+code']; });

    //insert default option    
    $('.country-select').prepend('<option value="">View Country Page</option>');
    $('.country-select').val($('.country-select option:first').val());

    //drawGlobalMap();
    initTimeseries(timeseriesData, '.country-timeseries-chart');
  }


  function initCountryView() {
    $('.content').addClass('country-view');
    $('.menu h2').html('<a href="#">< Back to Global View</a>');
    $('.country-panel').scrollTop(0);
    $('.country-panel').show();
    $('#foodSecurity').prop('checked', true);
    currentCountryIndicator = {id: $('input[name="countryIndicators"]:checked').val(), name: $('input[name="countryIndicators"]:checked').parent().text()};

    initCountryPanel();
  }


  function initTracking() {
    //initialize mixpanel
    let MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  init();
  //getData();
  //initTracking();
});