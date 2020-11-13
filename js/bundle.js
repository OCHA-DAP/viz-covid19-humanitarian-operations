window.$ = window.jQuery = require('jquery');
var bbox = require('@turf/bbox');
var turfHelpers = require('@turf/helpers');
/*******************************/
/*** COVID PROJECTIONS CHART ***/
/*******************************/
function createProjectionsChart(data, type) {
  data.forEach(function(item, index) {
    if (!isVal(item.min) || !isVal(item.max))
      data.splice(index, 1);
  });

  var barColor = (type=='Cases') ? '#007CE1' : '#000';
  var maxVal = d3.max(data, function(d) { return +d.max; })
  var barHeight = 25;
  var barPadding = 20;
  var margin = {top: 0, right: 50, bottom: 30, left: 50},
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
      var source = getSource('#affected+killed+min+'+ d.model.toLowerCase());
      var sourceDate = new Date(source['#date']);
      if (sourceDate.getTime()!=date.getTime()) {
        date = sourceDate;
        projectionsDiv.find('.source').append(' <span class="date">'+ dateFormat(date) +'</span>');
      }
      projectionsDiv.find('.source').append(' | '+ d.model +': <a href="'+ source['#meta+url'] +'" class="dataURL" target="_blank" rel="noopener">DATA</a>');
    });
  }
}

/****************************************/
/*** COVID TIMESERIES CHART FUNCTIONS ***/
/****************************************/
function initTimeseries(data, div) {
  var timeseriesArray = formatTimeseriesData(data);
  createTimeSeries(timeseriesArray, div);
}

function formatTimeseriesData(data) {
  var dateSet = new Set();
  var timeseriesArray = [];
  var dataArray = Object.entries(data);
  dataArray.forEach(function(d) {
    var countryArray = [];
    if (d[0]=='Venezuela (Bolivarian Republic of)') d[0] = 'Venezuela';
    countryArray.push(d[0])
    var valueArray = d[1].reverse();
    valueArray.forEach(function(val) {
      dateSet.add(val['#date+reported']);
      var value = val['#affected+infected'];
      countryArray.push(value)
    });
    timeseriesArray.push(countryArray);
  });

  var dateArray = ['x'];
  dateSet.forEach(function(d) {
    var date = new Date(d);
    var startDate = new Date(2020,2,1);
    var utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    
    //start chart at march 1
    if (utcDate>=startDate) {
      dateArray.push(utcDate);
    }
  });

  timeseriesArray.unshift(dateArray);
  return timeseriesArray;
}


function createTimeSeries(array, div) {
  var isGlobal = (div.indexOf('global')>-1) ? true : false;
  var chartWidth = (isGlobal) ? viewportWidth - $('.secondary-panel').width() - 75 : 336;
  var chartHeight = (isGlobal) ? $(div).parent().height()-200 : 240;
  var colorArray = (isGlobal) ? 
    ['#1ebfb3', '#f2645a', '#007ce1', '#9c27b0', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'] :
    ['#999'];

  //filter HRP countries for country timeseries
  if (!isGlobal) {
    var hrpList = [];
    hrpData.forEach(function(d) {
      hrpList.push(d['#country+name']);
    });
    var hrpArray = array.filter((row) => hrpList.includes(row[0]));
    hrpArray.unshift(array[0]);
    array = hrpArray;
  }

  //get date values for x axis labels
  var dateSet = new Set();
  array[0].forEach(function(d, i) {
    if (i>0 && d.getDate()==1) {
      dateSet.add(d);
    }
  });
  var dateArray = [...dateSet];

	var chart = c3.generate({
    size: {
      width: chartWidth,
      height: chartHeight
    },
    padding: {
      bottom: 0,
      top: 10,
      left: 35,
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
      type: 'spline'
		},
    color: {
      pattern: colorArray
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
          outer: false,
          count: 5,
          values: dateArray,
          format: function(d) {
            var date = dateFormat(d);
            if (!isGlobal) {
              //display every other month for country view
              date = (d.getMonth()%2==0) ? date : '';
            }
            return date;
          }
				}
			},
			y: {
        //type: 'log',
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

  createTimeseriesLegend(chart);

  if (isGlobal) {
    globalTimeseriesChart = chart;
  }
  else {
    countryTimeseriesChart = chart;
    createSource($('.cases-timeseries'), '#affected+infected');
  }
}


function createTimeseriesLegend(chart, country) {
  var element = $(chart.element).attr('class');
  var isGlobal = (element.indexOf('global')>-1) ? true : false;
  if (isGlobal && $('.timeseries-legend').length>0) {
    $('.global-timeseries-chart .timeseries-legend').remove();
  }
  var names = [];
  chart.data.shown().forEach(function(d) {
    if (d.id==country || country==undefined)
      names.push(d.id)
  });

  //custom legend
  d3.select(chart.element).insert('div').attr('class', 'timeseries-legend').selectAll('div')
    .data(names)
    .enter().append('div')
    .attr('data-id', function(id) {
      return id;
    })
    .html(function(id) {
      return '<span></span>'+id;
    })
    .each(function(id) {
      var color = (isGlobal) ? chart.color(id) : '#007CE1';
      d3.select(this).select('span').style('background-color', color);
    })
    .on('mouseover', function(id) {
      if (isGlobal) chart.focus(id);
    })
    .on('mouseout', function(id) {
      if (isGlobal) chart.revert();
    });

  //set max height for legend
  if (isGlobal) {
    var chartHeight = $(chart.element).parent().height()-200;
    var itemHeight = 18;
    var numItems = Math.round((chartHeight-160)/itemHeight);
    var availSpace = itemHeight*numItems;
    $('.global-timeseries-chart .timeseries-legend').css('max-height', availSpace);
  }
}

function updateTimeseries(selected) {
  var maxValue = d3.max(countryTimeseriesChart.data(selected)[0].values, function(d) { return +d.value; });
  if (selected=='Venezuela (Bolivarian Republic of)') selected = 'Venezuela';

  countryTimeseriesChart.axis.max(maxValue*2);
  countryTimeseriesChart.focus(selected);
  $('.country-timeseries-chart .c3-chart-lines .c3-line').css('stroke', '#999');
  $('.country-timeseries-chart .c3-chart-lines .c3-line-'+selected).css('stroke', '#007CE1');

  $('.country-timeseries-chart .timeseries-legend').remove();
  createTimeseriesLegend(countryTimeseriesChart, selected);
}


/******************/
/*** SPARKLINES ***/
/******************/
function createSparkline(data, div, size) {
  var width = (div.indexOf('secondary')>-1) ? $(div).width() - 130 : $(div).width() - 6;
  var height = (size=='large') ? 25 : 15;
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
    .attr('height', height+5)
    .append('g')
      .attr('transform', 'translate(0,4)');
    
  svg.append('path')
   .datum(data)
   .attr('class', 'sparkline')
   .attr('d', line);
}

/*****************************/
/*** COVID TREND BAR CHART ***/
/*****************************/
function createTrendBarChart(data, div) {
  var total = data.length;
  var barMargin = 1;
  var barWidth = ($(div).width() - 130) / total - barMargin;
  var width = (barWidth+barMargin) * data.length;
  var height = 20;
  var parseDate = d3.timeParse("%Y-%m-%d");

  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.value = +d.value;
  });
  var min = d3.min(data, function(d) { return d.value; });
  var max = d3.max(data, function(d) { return d.value; });

  var x = d3.scaleTime()
    .domain([data[0].date, data[total-1].date])
    .range([0, width]);

  // set the ranges
  var y = d3.scaleLinear()
    .domain(d3.extent(data, function(d) { return d.value; }))
    .range([height, 0]);

  var svg = d3.select(div)
    .append('svg')
    .attr('width', width+barWidth)
    .attr('height', height)
    .append('g')
      .attr('x', 0)
      .attr('transform', 'translate(0,0)');

  // append bars
  var bars = svg.selectAll('.bar')
    .data(data)
    .enter().append('rect')
    .attr('class', 'bar')
    .attr('x', function(d) {
      return x(d.date);
    })
    .attr('y', function(d, i) { 
      return (d.value>0) ? y(d.value) : y(0);
    })
    .attr('fill', function(d) {
      return (d.value>0) ? '#F2645B' : '#BFBFBF';
    })
    .attr('height', function(d) { return Math.abs(y(d.value) - y(0)); })
    .attr('width', barWidth);
}


/*************************/
/*** RANKING BAR CHART ***/
/*************************/
var rankingX, rankingY, rankingBars, rankingData, rankingBarHeight, valueFormat;
function createRankingChart() {
  //set title
  $('.secondary-panel .ranking-container').removeClass('access-severity');
  $('.secondary-panel .ranking-title').text( $('.menu-indicators').find('.selected').attr('data-legend') + ' by Country' );

  var indicator;
  switch(currentIndicator.id) {
    case '#severity+inform+type':
      indicator = '#severity+inform+num';
      break;
    case '#vaccination-campaigns':
      indicator = '#vaccination+num+ratio';
      break;
    case '#food-prices':
      indicator = '#value+food+num+ratio';
      break;
    default:
      indicator = currentIndicator.id;
  }

  //switch sort dropdown if on covid layer
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    $('.ranking-container').addClass('covid');
    $('.ranking-select').val('#affected+infected+new+per100000+weekly');
  }
  else {
    $('.ranking-container').removeClass('covid');
    $('.ranking-select').val('descending');
  }

  //format data
  rankingData = formatRankingData(indicator);

  var valueMax = d3.max(rankingData, function(d) { return +d.value; });
  valueFormat = d3.format(',.0f');
  if (indicator.indexOf('funding')>-1 || indicator.indexOf('gdp')>-1) {
    valueFormat = formatValue;
    rankingData.reverse();
    $('.ranking-select').val('ascending');
  }
  if (indicator.indexOf('pct')>-1 || indicator.indexOf('ratio')>-1) {
    valueFormat = (currentIndicator.id=='#value+gdp+ifi+pct') ? d3.format('.2%') : percentFormat;
  }
  if (indicator=='#severity+inform+num') {
    valueFormat = d3.format(',.2r');;
  }

  //draw chart
  rankingBarHeight = 13;
  var barPadding = 9;

  //determine height available for chart
  var availSpace = viewportHeight - $('.ranking-chart').position().top - 40;
  var numRows = Math.floor(availSpace/(rankingBarHeight+barPadding));
  var rankingChartHeight = ((rankingBarHeight+barPadding) * numRows) + 14;
  $('.ranking-chart').css('height', rankingChartHeight);

  var margin = {top: 0, right: 70, bottom: 15, left: 100},
      width = $('.secondary-panel').width() - margin.left - margin.right,
      height = (rankingBarHeight + barPadding) * rankingData.length;

  var svg = d3.select('.ranking-chart').append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  rankingX = d3.scaleLinear()
    .range([0, width])
    .domain([0, valueMax]);

  rankingY = d3.scaleBand()
    .range([0, height])
    .domain(rankingData.map(function (d) {
      return d.key;
    }));

  var yAxis = d3.axisLeft(rankingY)
    .tickSize(0);

  var gy = svg.append('g')
    .attr('class', 'y axis')
    .call(yAxis)

  rankingBars = svg.selectAll('.bar')
    .data(rankingData)
    .enter().append('g')
    .attr('class', 'bar-container')
    .attr('transform', function(d, i) { return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; });

  //append rects
  rankingBars.append('rect')
    .attr('class', 'bar')
    .attr('height', rankingBarHeight)
    .attr('width', function (d) {
      return (d.value<0) ? 0 : rankingX(d.value);
    });

  //add country names
  rankingBars.append('text')
    .attr('class', 'name')
    .attr('x', -3)
    .attr('y', 9)
    .text(function (d) {
      return truncateString(d.key, 15);
    })

  //add a value label to the right of each bar
  rankingBars.append('text')
    .attr('class', 'label')
    .attr('y', 9)
    .attr('x', function (d) {
      return rankingX(d.value) + 3;
    })
    .text(function (d) {
      return valueFormat(d.value);
    });
}

function formatRankingData(indicator) {
  var rankingByCountry = d3.nest()
    .key(function(d) {
      if (regionMatch(d['#region+name'])) return d['#country+name']; 
    })
    .rollup(function(v) {
      if (regionMatch(v[0]['#region+name'])) return v[0][indicator]; 
    })
    .entries(nationalData);

  var data = rankingByCountry.filter(function(item) { 
    return isVal(item.value) && !isNaN(item.value);
  });
  data.sort(function(a, b){ return d3.descending(+a.value, +b.value); });
  return data;
}

function updateRankingChart(sortMode) {
  if (sortMode=='ascending' || sortMode=='descending') {
    rankingData.sort(function(a, b){
      if (sortMode=='ascending')
        return d3.ascending(+a.value, +b.value); 
      else
        return d3.descending(+a.value, +b.value);
    });
    rankingY.domain(rankingData.map(function (d) { return d.key; }));
    rankingBars.transition()
      .duration(400)
      .attr('transform', function(d, i) { return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; });
  }
  else {
    rankingData = formatRankingData(sortMode);
    rankingData.sort(function(a, b){
       return d3.descending(+a.value, +b.value);
    });

    var valueMax = d3.max(rankingData, function(d) { return +d.value; });
    rankingX.domain([0, valueMax]);
    rankingY.domain(rankingData.map(function (d) { return d.key; }));
    rankingBars.data(rankingData);

    rankingBars.transition()
      .duration(400)
      .attr('transform', function(d, i) { return 'translate(1,' + (rankingY(d.key) + rankingBarHeight/2) + ')'; });

    rankingBars.select('.bar').transition()
      .duration(400)
      .attr('width', function (d) { return (d.value<0) ? 0 : rankingX(d.value); });

    rankingBars.select('.name')
      .text(function (d) { return truncateString(d.key, 15); })

    rankingBars.select('.label')
      .attr('x', function (d) { return rankingX(d.value) + 3; })
      .text(function (d) { return d3.format(',.0f')(d.value); });
  }
}

var datastoreID = '12d7c8e3-eff9-4db0-93b7-726825c4fe9a';
var dataDomain = 'https://data.humdata.org';

//const foodPricesCountries = {};
//getCountryIDs();
const foodPricesCountries = {1: "Afghanistan",8: "Angola",12: "Argentina",13: "Armenia",23: "Bangladesh",26: "Belarus",29: "Benin",33: "Bolivia",42: "Burkina Faso",43: "Burundi",44: "Cambodia",45: "Cameroon",47: "Cape Verde",49: "Central African Republic",50: "Chad",52: "China",57: "Colombia",59: "Congo",66: "Cote d'Ivoire",68: "Democratic Republic of the Congo",70: "Djibouti",72: "Dominican Republic",73: "Ecuador",75: "El Salvador",79: "Ethiopia",90: "Gambia",94: "Ghana",103: "Guatemala",105: "Guinea-Bissau",106: "Guinea",108: "Haiti",111: "Honduras",115: "Bassas da India",116: "Indonesia",117: "Islamic Republic of Iran",118: "Iraq",126: "Japan",130: "Jordan",132: "Kazakhstan",133: "Kenya",138: "Kyrgyzstan",139: "Lao People's Democratic Republic",141: "Lebanon",142: "Lesotho",144: "Liberia",145: "Libya",152: "Malawi",155: "Mali",159: "Mauritania",162: "Mexico",167: "Mongolia",170: "Mozambique",171: "Myanmar",172: "Namibia",180: "Nicaragua",181: "Niger",182: "Nigeria",188: "Pakistan",191: "Panama",194: "Paraguay",195: "Peru",196: "Philippines",204: "Russian Federation",205: "Rwanda",217: "Senegal",221: "Sierra Leone",226: "Somalia",227: "South Africa",231: "Sri Lanka",235: "Swaziland",238: "Syrian Arab Republic",239: "Tajikistan",240: "Thailand",243: "Togo",249: "Turkey",253: "Uganda",257: "United Republic of Tanzania",269: "Yemen",270: "Zambia",999: "Occupied Palestinian Territory",40764: "Sudan",40765: "Egypt",70001: "South Sudan"};

$('.modal-bg-overlay, .modal-close-btn').on('click', closeModal);

function getCountryNameByID(adm0_id) {
  return foodPricesCountries[adm0_id];
}

function getCountryIDByName(adm0_name) {
  const entries = Object.entries(foodPricesCountries)
  for (const [id, name] of entries) {
    if (name==adm0_name) return id;
  }
}

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

	var adm0_id = getCountryIDByName(country_name);
	initCountry(adm0_id, country_name);
}

function initCountry(adm0_code, adm0_name){
  getProductsByCountryID(adm0_code, adm0_name);
}

function getCountryIDs() {
  var today = new Date();
  var sql = 'SELECT distinct adm0_id FROM "' + datastoreID + '" WHERE mp_year='+today.getFullYear();

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
  var sql = 'SELECT distinct adm0_name FROM "' + datastoreID + '" where adm0_id=' + adm0;

  $.ajax({
    type: 'GET',
    url: dataDomain + '/api/3/action/datastore_search_sql?sql=' + encodeURIComponent(sql),
    success: function(data) {
      foodPricesCountries[adm0] = data.result.records[0].adm0_name;
    }
  });
}

function getProductsByCountryID(adm0_code,adm0_name){
  var today = new Date();
  var yearnow = today.getFullYear()
  var monthnow = today.getMonth()
  var sql = 'SELECT T1.cm_id,T1.cm_name,T1.um_id,T1.um_name,avg(cast(T1.mp_month as double precision)) AS month_num,T1.mp_year,avg(T1.mp_price) FROM "' + datastoreID + '" AS T1 INNER JOIN (SELECT DISTINCT adm0_id,cm_id,um_id from "' + datastoreID + '" WHERE '
  for (i = 1; i < 7; i++) {
    var month = monthnow - i;
    var year = yearnow;
    if (month <= 0) {
      month = 12 - month;
      year -= 1;
    }
    sql += '(mp_year='+year+' AND cast(mp_month as int)='+month+') OR ';
  }
  sql = sql.substring(0, sql.length - 4);
  sql += ') AS T2 ON T1.adm0_id=T2.adm0_id AND T1.cm_id=T2.cm_id AND T1.um_id=T2.um_id WHERE T1.adm0_id=' + adm0_code + ' AND T1.mp_year>'+(yearnow-11)+' GROUP BY T1.cm_id,T1.cm_name,T1.um_name,T1.um_id,T1.mp_month,T1.mp_year ORDER BY T1.cm_id, T1.um_id, T1.mp_year, month_num';

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

    var headerHtml = '<h5>'+adm0_name+' Food Market Prices – since '+ results[0].mp_year +' <span class="source small"><a href="" target="_blank" rel="noopener">DATA</a></span></h5>';
    $(targetHeader).html(headerHtml);

    var country_name = adm0_name.replace(/\s+/g, '-').toLowerCase();
    $(targetHeader).find('.source a').attr('href', 'https://data.humdata.org/dataset/wfp-food-prices-for-'+country_name);

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



function mpTrack(view, content) {
  mixpanel.track('viz interaction', {
    'page title': document.title,
    'embedded in': window.location.href,
    'action': 'switch viz',
    'viz type': 'oad covid-19',
    'current view': view,
    'content': content
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
  if (!isVal(val)) {
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

function isVal(value) {
  return (value===undefined || value===null || value==='') ? false : true;
}

function regionMatch(region) {
  var match = false;
  var regions = region.split('|');
  for (var region of regions) {
    if (currentRegion=='' || region==currentRegion) {
      match = true;
      break;
    }
  }
  return match;
}

function hasGamData(data, indicator) {
  var hasGAM = false;
  if (indicator=='cases')
    hasGAM = (data['#affected+infected+m+pct']!=undefined || data['#affected+f+infected+pct']!=undefined) ? true : false;
  else if (indicator=='deaths')
    hasGAM = (data['#affected+killed+m+pct']!=undefined || data['#affected+f+killed+pct']!=undefined) ? true : false;
  else
    hasGAM = (data['#affected+infected+m+pct']!=undefined || data['#affected+f+infected+pct']!=undefined || data['#affected+killed+m+pct']!=undefined || data['#affected+f+killed+pct']!=undefined) ? true : false;
  return hasGAM;
}

function getGamText(data, indicator) {
  var gmText = '**Gender-Age Marker:<br>';
  for (var i=0;i<5;i++) {
    var pct = (data['#value+'+ indicator + '+covid+funding+gm'+ i +'+total+usd']!=undefined) ? percentFormat(data['#value+'+ indicator + '+covid+funding+gm'+ i +'+total+usd'] / data['#value+'+ indicator + '+covid+funding+total+usd']) : '0%';
    gmText += '['+i+']: ' + pct;
    gmText += ', ';
  }
  gmText += '[NA]: ';
  gmText += (data['#value+'+ indicator + '+covid+funding+gmempty+total+usd']!=undefined) ? percentFormat(data['#value+'+ indicator + '+covid+funding+gmempty+total+usd'] / data['#value+'+ indicator +'+covid+funding+total+usd']) : '0%';
  return gmText;
}

function getBeneficiaryText(data) {
  var beneficiaryText = 'Beneficiary breakdown:<br>';
  beneficiaryText += (data['#affected+cbpf+covid+funding+men']!=undefined) ? percentFormat(data['#affected+cbpf+covid+funding+men'] / data['#affected+cbpf+covid+funding+total']) + ' Male, ' : '0% Male, ';
  beneficiaryText += (data['#affected+cbpf+covid+funding+women']!=undefined) ? percentFormat(data['#affected+cbpf+covid+funding+women'] / data['#affected+cbpf+covid+funding+total']) + ' Female, ' : '0% Female, ';
  beneficiaryText += (data['#affected+boys+cbpf+covid+funding']!=undefined) ? percentFormat(data['#affected+boys+cbpf+covid+funding'] / data['#affected+cbpf+covid+funding+total']) + ' Boys, ' : '0% Boys, ';
  beneficiaryText += (data['#affected+cbpf+covid+funding+girls']!=undefined) ? percentFormat(data['#affected+cbpf+covid+funding+girls'] / data['#affected+cbpf+covid+funding+total']) + ' Girls' : '0% Girls';
  return beneficiaryText;
}

function createFootnote(target, text, indicator) {
  var className = (indicator==undefined) ? 'footnote' : 'footnote footnote-indicator';
  var indicatorName = (indicator==undefined) ? '' : indicator;
  var footnote = $('<p class="'+ className +'" data-indicator="'+ indicatorName +'">'+ truncateString(text, 65) +' <a href="#" class="expand">MORE</a></p>');
  $(target).append(footnote);
  footnote.click(function() {
    if ($(this).find('a').hasClass('collapse')) {
      $(this).html(truncateString(text, 65) + ' <a href="#" class="expand">MORE</a>');
    }
    else {
      $(this).html(text + ' <a href="#" class="collapse">LESS</a>');
    }
  });
}

//regional id/name list
const regionalList = [
  {id: 'H25', name: 'Humanitarian Response Plan Countries'},
  {id: 'ROAP', name: 'Asia and the Pacific'},
  {id: 'ROCCA', name: 'Eastern Europe'},
  {id: 'ROLAC', name: 'Latin America and the Caribbean'},
  {id: 'ROMENA', name: 'Middle East and North Africa'},
  {id: 'ROSEA', name: 'Southern and Eastern Africa'},
  {id: 'ROWCA', name: 'West and Central Africa'}
];

//25 HRP country codes and raster ids
const countryCodeList = {
  AFG: '8oeer8pw',
  BDI: '85uxb0dw',
  BFA: '489tayev',
  CAF: '6stu6e7d',
  CMR: '6v09q3l9',
  COD: '70s1gowk',
  COL: 'awxirkoh',
  ETH: '8l382re2',
  HTI: '4in4ae66',
  IRQ: '079oa80i',
  LBY: '0o4l8ysb',
  MLI: '17y8a20i',
  MMR: '7wk9p4wu',
  NER: '9gbs4a2a',
  NGA: '3ceksugh',
  PSE: '1emy37d7',
  SDN: 'a2zw3leb',
  SOM: '3s7xeitz',
  SSD: '3556pb27',
  SYR: '2qt39dhl',
  TCD: 'd6tya3am',
  UKR: 'adkwa0bw',
  VEN: '9vcajdlr',
  YEM: '3m20d1v8',
  ZWE: '1ry8x8ul'
};


function setKeyFigures() {
	var secondaryPanel = $('.secondary-panel');
	var secondaryPanelSource = $('.secondary-panel .source-container');
	secondaryPanel.find('.figures, .source-container, .ranking-chart').empty();
	secondaryPanel.find('.source-container').show();

	//source
	var indicator = currentIndicator.id;
	if (indicator=='#affected+inneed+pct') indicator = '#affected+inneed';
	if (indicator=='#event+year+todate+num') indicator = '#access-data';
	createSource(secondaryPanelSource, indicator);

	//global stats
	var globalData = regionalData.filter(function(region) { return region['#region+name']=='global'; });
	secondaryPanel.find('.global-figures').html('<b>Global COVID-19 Figures:</b><br>'+ shortenNumFormat(globalData[0]['#affected+infected']) +' total confirmed cases<br>'+ shortenNumFormat(globalData[0]['#affected+killed']) +' total confirmed deaths');

	var data = worldData;
	if (currentRegion!='') {
		regionalData.forEach(function(d) {
			if (d['#region+name']==currentRegion) {
				data = d;
			}
		});
	}

	var totalCountries = 0;
	nationalData.forEach(function(d) {
		if (regionMatch(d['#region+name'])) {
			var val = d[currentIndicator.id];
			if (currentIndicator.id=='#severity+inform+type') {
				if (val!=undefined)
					totalCountries++;
			}
			else {
				if (isVal(val) && !isNaN(val)) {
					totalCountries++;
				}
			}
		}
	});

	//PIN
	if (currentIndicator.id=='#affected+inneed+pct') {
		// var totalPIN = d3.sum(nationalData, function(d) {
		// 	if (regionMatch(d['#region+name'])) {
		// 		return +d['#affected+inneed']; 
		// 	}
		// });
		//hardcoding PIN to match OCHA data
		createKeyFigure('.figures', 'Total Number of People in Need', 'pin', '431M');//(d3.format('.4s'))(totalPIN)
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//access severity
	else if (currentIndicator.id=='#event+year+todate+num') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		if (data['#event+year+todate+num']!=undefined) createKeyFigure('.figures', 'Total Violent Security Incidents Against Humanitarian Workers since Jan 2020', '', data['#event+year+todate+num']);
		if (data['#access+visas+pct']!=undefined) createKeyFigure('.figures', 'Average of Visas Pending or Denied', '', percentFormat(data['#access+visas+pct']));
		if (data['#access+travel+pct']!=undefined) createKeyFigure('.figures', 'Average of Travel Authorizations Denied', '', percentFormat(data['#access+travel+pct']));
		if (data['#activity+cerf+project+insecurity+pct']!=undefined) createKeyFigure('.figures', 'Average of CERF Projects Affected by Access Constraints', '', percentFormat(data['#activity+cerf+project+insecurity+pct']));
		if (data['#activity+cbpf+project+insecurity+pct']!=undefined) createKeyFigure('.figures', 'Average of CBPF Projects Affected by Access Constraints', '', percentFormat(data['#activity+cbpf+project+insecurity+pct']));
	}
	//humanitarian funding
	else if (currentIndicator.id=='#value+funding+hrp+pct') {
		var numCountries = 0;
		nationalData.forEach(function(d) {
			if (regionMatch(d['#region+name'])) {
				numCountries++;
			}
		});
		createKeyFigure('.figures', 'Total Funding Required (including COVID-19 GHRP)', '', formatValue(data['#value+funding+hrp+required+usd']));
		createKeyFigure('.figures', 'Total Funding Level', '', percentFormat(data['#value+funding+hrp+pct']));
		createKeyFigure('.figures', 'COVID-19 GHRP Requirement', '', formatValue(data['#value+covid+funding+hrp+required+usd']));
		createKeyFigure('.figures', 'COVID-19 GHRP Funding Level', '', percentFormat(data['#value+covid+funding+hrp+pct']));
		createKeyFigure('.figures', 'Number of Countries', '', numCountries);
	}
	//CERF
	else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CERF COVID-19 Funding', '', formatValue(data['#value+cerf+covid+funding+total+usd']));
		if (data['#value+cerf+covid+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cerf');
			$('.figures .key-figure .inner').append('<div class="small">'+ gmText +'</div>');
		}
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//CBPF
	else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
		createKeyFigure('.figures', 'Total CBPF COVID-19 Funding', '', formatValue(data['#value+cbpf+covid+funding+total+usd']));
		
		//gam
		if (data['#value+cbpf+covid+funding+total+usd'] > 0) {
			var gmText = getGamText(data, 'cbpf');
			$('.figures .key-figure .inner').append('<div class="small">'+ gmText +'</div>');
		}

		//beneficieries
		if (data['#affected+cbpf+covid+funding+total'] > 0) {
			var beneficiaryText = getBeneficiaryText(data);
			$('.figures .key-figure .inner').append('<div class="small">'+ beneficiaryText +'</div>');
		}

		//num countries
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}
	//IFI
	else if (currentIndicator.id=='#value+gdp+ifi+pct') {
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Funding', '', formatValue(data['#value+ifi+total']));
	}
	//covid figures
	else if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
		var totalCases = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']))
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']))
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));

		var covidGlobal = (currentRegion!='') ? covidTrendData[currentRegion] : covidTrendData.H63;
		var weeklyCases = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+weekly'] : 0;
		var weeklyDeaths = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+killed+new+weekly'] : 0;
		var weeklyTrend = (covidGlobal!=undefined) ? covidGlobal[covidGlobal.length-1]['#affected+infected+new+pct+weekly'] : 0;
		
		if (covidGlobal!=undefined) {
			//weekly new cases
			createKeyFigure('.figures', 'Weekly Number of New Cases', 'weekly-cases', shortenNumFormat(weeklyCases));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      	var obj = {date: d['#date+reported'], value: d['#affected+infected+new+weekly']};
	     	sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.secondary-panel .weekly-cases');

			//weekly new deaths
			createKeyFigure('.figures', 'Weekly Number of New Deaths', 'weekly-deaths', shortenNumFormat(weeklyDeaths));
			var sparklineArray = [];
			covidGlobal.forEach(function(d) {
	      var obj = {date: d['#date+reported'], value: d['#affected+killed+new+weekly']};
	      sparklineArray.push(obj);
	    });
			createSparkline(sparklineArray, '.secondary-panel .weekly-deaths');

			//weekly trend
			createKeyFigure('.figures', 'Weekly Trend<br>(new cases past week / prior week)', 'cases-trend', weeklyTrend.toFixed(1) + '%');
	    var pctArray = [];
	    covidGlobal.forEach(function(d) {
	      var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']};
	      pctArray.push(obj);
	    });
			createSparkline(pctArray, '.secondary-panel .cases-trend');
	    //createTrendBarChart(pctArray, '.secondary-panel .cases-trend');
		}
	}
	else if (currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
		//num countries
		createKeyFigure('.figures', 'Number of Countries with Sex-disaggregated data', '', totalCountries);

		var totalCases = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']) && d['#affected+infected+sex+new+avg+per100000']!=null)
				return d['#affected+infected']; 
		});
		var totalDeaths = d3.sum(nationalData, function(d) { 
			if (regionMatch(d['#region+name']) && d['#affected+infected+sex+new+avg+per100000']!=null)
				return d['#affected+killed']; 
		});
		createKeyFigure('.figures', 'Total Confirmed Cases', 'cases', shortenNumFormat(totalCases));
		createKeyFigure('.figures', 'Total Confirmed Deaths', 'deaths', shortenNumFormat(totalDeaths));
	}
	else {
		//no global figures
		createKeyFigure('.figures', 'Number of Countries', '', totalCountries);
	}

	//ranking chart
	$('.ranking-container').show();
	createRankingChart();
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
  div.append('<p class="small source"><span class="date">'+ date +'</span> | <span class="source-name">'+ sourceName +'</span> | <a href="'+ sourceURL +'" class="dataURL" target="_blank" rel="noopener">DATA</a></p>');
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
	if (indicator=='#affected+food+p3plus+pct') indicator = '#affected+food+ipc+p3plus+pct';
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
var hoveredStateId = null;
function initMap() {
  console.log('Loading map...')
  map = new mapboxgl.Map({
    container: 'global-map',
    style: 'mapbox://styles/humdata/ckb843tjb46fy1ilaw49redy7/',
    center: [-25, 0],
    minZoom: 1,
    zoom: zoomLevel,
    attributionControl: false
  });

  map.addControl(new mapboxgl.NavigationControl({showCompass: false}))
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
  $('#global-map, .country-select, .map-legend, .tab-menubar').css('opacity', 1);

  //position global figures
  if (window.innerWidth>=1440) {
    $('.menu-indicators li:first-child div').addClass('expand');
    $('.tab-menubar, #chart-view').css('left', $('.secondary-panel').outerWidth());
    $('.secondary-panel').animate({
      left: 0
    }, 200);
  }

  //set initial indicator
  currentIndicator = {id: $('.menu-indicators').find('.selected').attr('data-id'), name: $('.menu-indicators').find('.selected').attr('data-legend')};

  //init element events
  createEvents();

  //get layers
  map.getStyle().layers.map(function (layer) {
    switch(layer.id) {
      case 'adm0-fills':
        globalLayer = layer.id;

        map.setFeatureState(
          { source: 'composite', sourceLayer: adm0SourceLayer, id: globalLayer },
          { hover: false }
        );
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

  //load pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    var raster = countryCodeList[country_code];
    if (raster!='') {
      map.addSource(id+'-pop-tileset', {
        type: 'raster',
        url: 'mapbox://humdata.'+raster
      });

      map.addLayer(
        {
          id: id+'-popdensity',
          type: 'raster',
          source: {
            type: 'raster',
            tiles: ['https://api.mapbox.com/v4/humdata.'+raster+'/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA'],
          }
        },
        countryBoundaryLayer
      );
      // map.addLayer(
      //   {
      //     'id': id+'-popdensity',
      //     'type': 'raster',
      //     'source': id+'-pop-tileset'
      //   },
      //   countryBoundaryLayer
      // );

      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
    }
  });

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

  //deeplink to country if parameter exists
  if (viewInitialized==true) deepLinkCountryView();
}

function deepLinkCountryView() {
  var location = window.location.search;
  if (location.indexOf('?c=')>-1) {
    var countryCode = location.split('=')[1].toUpperCase();
    if (countryCodeList.hasOwnProperty(countryCode)) {    
      $('.country-select').val(countryCode);
      currentCountry.code = countryCode;
      currentCountry.name = d3.select('.country-select option:checked').text();

      //find matched features and zoom to country
      var selectedFeatures = matchMapFeatures(currentCountry.code);
      selectCountry(selectedFeatures);
    }
  }
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
    $('.menu-indicators li').removeClass('selected');
    $('.menu-indicators li div').removeClass('expand');
    $(this).addClass('selected');
    if (currentIndicator.id==$(this).attr('data-id')) {
      toggleSecondaryPanel(this);
    }
    else {
      currentIndicator = {id: $(this).attr('data-id'), name: $(this).attr('data-legend')};
      toggleSecondaryPanel(this, 'open');

      //set food prices view
      if (currentIndicator.id!='#value+food+num+ratio') {
        closeModal();
      }

      mpTrack('wrl', $(this).find('div').text());
      updateGlobalLayer();
    }

    //handle tab views
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
      $('.content').addClass('tab-view');
      $('.tab-menubar').show();
    }
    else {
      $('.content').removeClass('tab-view');
      $('.tab-menubar').hide();
      $('#chart-view').hide();
    }
  });

  //global figures close button
  $('.secondary-panel .close-btn').on('click', function() {
    var currentBtn = $('[data-id="'+currentIndicator.id+'"]');
    toggleSecondaryPanel(currentBtn);
  });

  //ranking select event
  d3.selectAll('.ranking-select').on('change',function(e) {
    var selected = d3.select(this).node().value;
    if (selected!='') {
      updateRankingChart(selected);
    }
  });

  //region select event
  d3.select('.region-select').on('change',function(e) {
    currentRegion = d3.select('.region-select').node().value;
    if (currentRegion=='') {
      resetMap();
    }
    else {        
      selectRegion();
    }
  });

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
  
  //back to global event
  $('.backtoGlobal').on('click', function() {
    resetMap();
    window.history.replaceState(null, null, window.location.pathname);
  });

  //country panel indicator select event
  d3.select('.indicator-select').on('change',function(e) {
    var selected = d3.select('.indicator-select').node().value;
    if (selected!='') {
      var container = $('.panel-content');
      var section = $('.'+selected);
      container.animate({scrollTop: section.offset().top - container.offset().top + container.scrollTop()}, 300);
    }
  });

  //country legend radio events
  $('input[type="radio"]').click(function(){
    var selected = $('input[name="countryIndicators"]:checked');
    currentCountryIndicator = {id: selected.val(), name: selected.parent().text()};
    updateCountryLayer();
    mpTrack(currentCountry.code, currentCountryIndicator.name);
  });
}

function toggleSecondaryPanel(currentBtn, state) {
  var width = $('.secondary-panel').outerWidth();
  var pos = $('.secondary-panel').position().left;
  var newPos = (pos<0) ? 0 : -width;
  if (state=='open') { newPos = 0; }
  var newTabPos = (newPos==0) ? width : 0;
  
  $('.secondary-panel').animate({
    left: newPos
  }, 200, function() {
    var div = $(currentBtn).find('div');
    if ($('.secondary-panel').position().left==0) {
      div.addClass('expand');
    }
    else {
      div.removeClass('expand');
    }
  });

  $('.tab-menubar, #chart-view').animate({
    left: newTabPos
  }, 200);
}


function selectRegion() {
  var regionFeature = regionBoundaryData.filter(d => d.properties.tbl_regcov_2020_ocha_Field3 == currentRegion);
  var offset = 50;
  map.fitBounds(regionFeature[0].bbox, {
    padding: {top: offset, right: $('.map-legend').outerWidth()+offset, bottom: offset, left: $('.secondary-panel').outerWidth()+offset},
    linear: true
  });

  mpTrack(currentRegion, currentIndicator.name);
  updateGlobalLayer();
}

function selectCountry(features) {
  //set first country indicator
  $('#population').prop('checked', true);
  currentCountryIndicator = {
    id: $('input[name="countryIndicators"]:checked').val(), 
    name: $('input[name="countryIndicators"]:checked').parent().text()
  };

  //reset panel
  $('.panel-content').animate({scrollTop: 0}, 300);
  $('.indicator-select').val('');

  updateCountryLayer();
  map.setLayoutProperty(globalLayer, 'visibility', 'none');
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'visible');
  map.setLayoutProperty(countryMarkerLayer, 'visibility', 'visible');

  var target = bbox.default(turfHelpers.featureCollection(features));
  var offset = 50;
  map.fitBounds(target, {
    padding: {top: offset, right: $('.map-legend.country').outerWidth()+offset, bottom: offset, left: ($('.country-panel').outerWidth() - $('.content-left').outerWidth()) + offset},
    linear: true
  });

  map.once('moveend', initCountryView);
  mpTrack(currentCountry.code, currentCountryIndicator.name);

  //append country code to url
  window.history.replaceState(null, null, '?c='+currentCountry.code);
}


/****************************/
/*** GLOBAL MAP FUNCTIONS ***/
/****************************/
function handleGlobalEvents(layer) {
  map.on('mouseenter', globalLayer, function(e) {
    map.getCanvas().style.cursor = 'pointer';
    if (currentIndicator.id!='#value+food+num+ratio') {
      tooltip.addTo(map);
    }
  });

  map.on('mousemove', function(e) {
    if (currentIndicator.id!='#value+food+num+ratio') {
      var features = map.queryRenderedFeatures(e.point, { layers: [globalLayer, globalLabelLayer, globalMarkerLayer] });
      var target;
      features.forEach(function(feature) {
        if (feature.sourceLayer==adm0SourceLayer)
          target = feature;
      });
      if (target!=undefined) {
        tooltip.setLngLat(e.lngLat);
        if (target.properties.Terr_Name=='CuraÃ§ao') target.properties.Terr_Name = 'Curaçao';
        createMapTooltip(target.properties.ISO_3, target.properties.Terr_Name, e.point);
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
      currentCountry.name = (target.properties.Terr_Name=='CuraÃ§ao') ? 'Curaçao' : target.properties.Terr_Name;

      if (currentCountry.code!=undefined) {
        var country = nationalData.filter(c => c['#country+code'] == currentCountry.code);
        if (currentIndicator.id=='#value+food+num+ratio' && country[0]['#value+food+num+ratio']!=undefined) {
          openModal(currentCountry.name);
        }
      }
    }
  });
}


function initGlobalLayer() {
  //create log scale for circle markers
  var maxCases = d3.max(nationalData, function(d) { return +d['#affected+infected']; })
  markerScale = d3.scaleSqrt()
    .domain([1, maxCases])
    .range([2, 15]);
  
  //color scale
  colorScale = getGlobalLegendScale();
  setGlobalLegend(colorScale);

  //data join
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    var val = d[currentIndicator.id];
    var color = (val==null) ? colorNoData : colorScale(val);
    expression.push(d['#country+code'], color);

    //covid markers
    var covidVal = d['#affected+infected'];
    var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
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
  setKeyFigures();
}

function updateGlobalLayer() {
  setKeyFigures();

  //color scales
  colorScale = getGlobalLegendScale();
  colorNoData = (currentIndicator.id=='#affected+inneed+pct' || currentIndicator.id=='#value+funding+hrp+pct') ? '#E7E4E6' : '#FFF';

  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  //data join
  var countryList = [];
  var expression = ['match', ['get', 'ISO_3']];
  var expressionMarkers = ['match', ['get', 'ISO_3']];
  nationalData.forEach(function(d) {
    if (regionMatch(d['#region+name'])) {
      var val = d[currentIndicator.id];
      var color = colorDefault;
      
      if (currentIndicator.id=='#affected+infected+new+weekly') {
        color = (val==null) ? colorNoData : colorScale(val);
      }
      else if (currentIndicator.id=='#severity+inform+type') {
        color = (!isVal(val)) ? colorNoData : colorScale(val);
      }
      else {
        color = (val<0 || isNaN(val) || !isVal(val)) ? colorNoData : colorScale(val);
      }
      expression.push(d['#country+code'], color);

      //covid markers
      var covidVal = d['#affected+infected'];
      var size = (!isVal(covidVal)) ? 0 : markerScale(covidVal);
      expressionMarkers.push(d['#country+code'], size);

      //create country list for global timeseries chart
      countryList.push(d['#country+name']);
    }
  });

  //default value for no data
  expression.push(colorDefault);
  expressionMarkers.push(0);

  map.setPaintProperty(globalLayer, 'fill-color', expression);
  map.setLayoutProperty(globalMarkerLayer, 'visibility', 'visible');
  map.setPaintProperty(globalMarkerLayer, 'circle-radius', expressionMarkers);
  setGlobalLegend(colorScale);

  //update global timeseries chart
  globalTimeseriesChart.hide();
  globalTimeseriesChart.show(countryList);
  createTimeseriesLegend(globalTimeseriesChart);
}

function getGlobalLegendScale() {
  //get min/max
  var min = d3.min(nationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id]; 
  });
  var max = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name'])) return +d[currentIndicator.id];
  });
  if (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) max = 1;
  else if (currentIndicator.id=='#severity+economic+num') max = 10;
  else if (currentIndicator.id=='#affected+inneed') max = roundUp(max, 1000000);
  else if (currentIndicator.id=='#severity+inform+type') max = 0;
  else max = max;

  //set scale
  var scale;
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
    var data = [];
    nationalData.forEach(function(d) {
      if (d[currentIndicator.id]!=null && regionMatch(d['#region+name']))
        data.push(d[currentIndicator.id]);
    })
    if (data.length==1)
      scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
    else
      scale = d3.scaleQuantile().domain(data).range(colorRange);
  }
  else if (currentIndicator.id=='#severity+stringency+num') {
    scale = d3.scaleQuantize().domain([0, 100]).range(oxfordColorRange);
  }
  else if (currentIndicator.id=='#severity+inform+type') {
    scale = d3.scaleOrdinal().domain(['Very Low', 'Low', 'Medium', 'High', 'Very High']).range(informColorRange);
  }
  else if (currentIndicator.id.indexOf('funding')>-1) {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleQuantize().domain([0, max]).range(reverseRange);
  }
  else if (currentIndicator.id=='#value+gdp+ifi+pct') {
    var reverseRange = colorRange.slice().reverse();
    scale = d3.scaleThreshold()
      .domain([ .01, .02, .03, .05, .05 ])
      .range(reverseRange);
  }
  else {
    scale = d3.scaleQuantize().domain([0, max]).range(colorRange);
  }

  return (max==undefined) ? null : scale;
}

function setGlobalLegend(scale) {
  var div = d3.select('.map-legend.global');
  var svg;
  var indicator = (currentIndicator.id=='#affected+inneed+pct') ? '#affected+inneed' : currentIndicator.id;
  $('.map-legend.global .source-secondary').empty();

  //SETUP
  if (d3.select('.map-legend.global .scale').empty()) {
    //current indicator
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

    //secondary source
    $('.map-legend.global').append('<div class="source-secondary"></div>');

    //covid positive testing footnote
    createFootnote('.map-legend.global', 'Positive Testing Rate: This is the daily positive rate, given as a rolling 7-day average. According WHO, a positive rate of less than 5% is one indicator that the pandemic may be under control in a country.', '#affected+infected+new+per100000+weekly');
    //vacc footnote
    createFootnote('.map-legend.global', 'Methodology: Information about interrupted vaccination campaigns contains both official and unofficial information sources. The country ranking has been determined by calculating the ratio of total number of postponed or cancelled campaigns and total vaccination campaigns. Note: data collection is ongoing and may not reflect all the campaigns in every country.', '#vaccination+num+ratio');
    //food prices footnote
    createFootnote('.map-legend.global', 'Methodology: Information about food prices is collected from data during the last 6 month moving window. The country ranking for food prices has been determined by calculating the ratio of the number of commodities in alert, stress or crisis and the total number of commodities. The commodity status comes from <a href="https://dataviz.vam.wfp.org" target="_blank" rel="noopener">WFP’s model</a>.', '#value+food+num+ratio');
    //oxford footnote
    createFootnote('.map-legend.global', 'Note: This is a composite measure based on nine response indicators including school closures, workplace closures, and travel bans, rescaled to a value from 0 to 100 (100 = strictest)', '#severity+stringency+num');
    

    //cases
    $('.map-legend.global').append('<h4>Number of COVID-19 Cases</h4>');
    createSource($('.map-legend.global'), '#affected+infected');

    var markersvg = div.append('svg')
      .attr('height', '55px')
      .attr('class', 'casesScale');
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

    //gender disaggregation footnote
    // $('.map-legend.global').append('<h4><i class="humanitarianicons-User"></i> (On hover) COVID-19 Sex-Disaggregated Data Tracker</h4>');
    // createSource($('.map-legend.global'), '#affected+killed+m+pct');
    createFootnote('.map-legend.global', '*Distribution of COVID19 cases and deaths by gender are taken from Global Health 50/50 COVID-19 <a href="https://data.humdata.org/organization/global-health-50-50" target="_blank" rel="noopener">Sex-disaggregated Data Tracker</a>. Figures refer to the last date where sex-disaggregated data was available and in some cases the gender distribution may only refer to a portion of total cases or deaths. These proportions are intended to be used to understand the breakdown of cases and deaths by gender and not to monitor overall numbers per country. Definitions of COVID-19 cases and deaths recorded may vary by country.', '#affected+infected+sex+new+avg+per100000');

    //GAM footnote
    var gamText = '**Gender-Age Marker: 0- Does not systematically link programming actions<br>1- Unlikely to contribute to gender equality (no gender equality measure and no age consideration)<br>2- Unlikely to contribute to gender equality (no gender equality measure but includes age consideration)<br>3- Likely to contribute to gender equality, but without attention to age groups<br>4- Likely to contribute to gender equality, including across age groups';
    createFootnote('.map-legend.global', gamText, '#value+cerf+covid+funding+total+usd');
    createFootnote('.map-legend.global', gamText, '#value+cbpf+covid+funding+total+usd');

    //boundaries disclaimer
    createFootnote('.map-legend.global', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

    //expand/collapse functionality
    $('.map-legend.global .toggle-icon, .map-legend.global .collapsed-title').on('click', function() {
      $(this).parent().toggleClass('collapsed');
    });
  }
  else {
    updateSource($('.indicator-source'), indicator);
  }

  //POPULATE
  var legendTitle = $('.menu-indicators').find('.selected').attr('data-legend');
  if (currentIndicator.id=='#value+food+num+ratio') legendTitle += '<br>Click on a country to explore commodity prices';
  $('.map-legend.global .indicator-title').html(legendTitle);

  //current indicator
  if (scale==null) {
    $('.map-legend.global .legend-container').hide();
  }
  else {
    $('.map-legend.global .legend-container').show();
    var legend;
    if (currentIndicator.id=='#value+gdp+ifi+pct') {
      var legendFormat = d3.format('.0%');
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale)
        .labels(d3.legendHelpers.thresholdLabels)
        //.useClass(true);
    }
    else {
      var legendFormat = (currentIndicator.id.indexOf('pct')>-1 || currentIndicator.id.indexOf('ratio')>-1) ? d3.format('.0%') : shortenNumFormat;
      if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000') legendFormat = d3.format('.1f');
      legend = d3.legendColor()
        .labelFormat(legendFormat)
        .cells(colorRange.length)
        .scale(scale);
    }
    var g = d3.select('.map-legend.global .scale');
    g.call(legend);
  }

  //no data
  var noDataKey = $('.map-legend.global .no-data-key');
  if (currentIndicator.id=='#affected+inneed+pct') {
    noDataKey.find('.label').text('Refugee/IDP data only');
    noDataKey.find('rect').css('fill', '#E7E4E6');

    createSource($('.map-legend.global .source-secondary'), '#affected+refugees');
    createSource($('.map-legend.global .source-secondary'), '#affected+displaced');
  }
  else if (currentIndicator.id=='#value+funding+hrp+pct') {
    noDataKey.find('.label').text('Other response plans');
    noDataKey.find('rect').css('fill', '#E7E4E6');
  }
  else {
    noDataKey.find('.label').text('No Data');
    noDataKey.find('rect').css('fill', '#FFF');
  }

  //show/hide footnotes
  $('.footnote-indicator').hide();
  $('.footnote-indicator[data-indicator="'+ currentIndicator.id +'"]').show();

  //cases
  var maxCases = d3.max(nationalData, function(d) { 
    if (regionMatch(d['#region+name']))
      return +d['#affected+infected']; 
  });
  markerScale.domain([1, maxCases]);

  d3.select('.casesScale .cell:nth-child(2) .label').text(numFormat(maxCases));
}


/*****************************/
/*** COUNTRY MAP FUNCTIONS ***/
/*****************************/
function initCountryView() {
  $('.content').removeClass('tab-view').addClass('country-view');
  $('.country-panel').scrollTop(0);

  initCountryPanel();
}

function initCountryLayer() {
  //color scale
  var clrRange = (currentCountryIndicator.id=='#population') ? populationColorRange : colorRange;
  var countryColorScale = d3.scaleQuantize().domain([0, 1]).range(clrRange);
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
  colorNoData = '#FFF';
  if (currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct') checkIPCData();
  $('.map-legend.country .legend-container').removeClass('no-data');

  //max
  var max = getCountryIndicatorMax();
  if (currentCountryIndicator.id.indexOf('pct')>0 && max>0) max = 1;
  if (currentCountryIndicator.id=='#org+count+num' || currentCountryIndicator.id=='#loc+count+health') max = roundUp(max, 10);

  //color scale
  var clrRange;
  switch(currentCountryIndicator.id) {
    case '#population':
      clrRange = populationColorRange;
      break;
    case '#vaccination+num+ratio':
      clrRange = immunizationColorRange;
      break;
    default:
      clrRange = colorRange;
  }
  var countryColorScale = d3.scaleQuantize().domain([0, max]).range(clrRange);

  //data join
  var expression = ['match', ['get', 'ADM1_PCODE']];
  var expressionBoundary = ['match', ['get', 'ADM1_PCODE']];
  var expressionOpacity = ['match', ['get', 'ADM1_PCODE']];
  subnationalData.forEach(function(d) {
    var color, boundaryColor, layerOpacity, markerSize;
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      color = (val<0 || val=='' || isNaN(val)) ? colorNoData : countryColorScale(val);
      boundaryColor = (currentCountryIndicator.id=='#population') ? '#FFF' : '#E0E0E0';
      layerOpacity = 1;
    }
    else {
      color = colorDefault;
      boundaryColor = '#E0E0E0';
      layerOpacity = 0;
    }
    
    expression.push(d['#adm1+code'], color);
    expressionBoundary.push(d['#adm1+code'], boundaryColor);
    expressionOpacity.push(d['#adm1+code'], layerOpacity);
  });
  expression.push(colorDefault);
  expressionBoundary.push('#E0E0E0');
  expressionOpacity.push(0);

  
  //hide all pop density rasters
  var countryList = Object.keys(countryCodeList);
  countryList.forEach(function(country_code) {
    var id = country_code.toLowerCase();
    if (map.getLayer(id+'-popdensity'))
      map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  });

  //set properties
  if (currentCountryIndicator.id=='#population') {
    var id = currentCountry.code.toLowerCase();
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'visible');
  }
  map.setPaintProperty(countryLayer, 'fill-color', expression);
  map.setPaintProperty(countryBoundaryLayer, 'line-opacity', expressionOpacity);
  map.setPaintProperty(countryBoundaryLayer, 'line-color', expressionBoundary);
  map.setPaintProperty(countryLabelLayer, 'text-opacity', expressionOpacity);

  //hide color scale if no data
  if (max!=undefined && max>0)
    updateCountryLegend(countryColorScale);
  else
    $('.map-legend.country .legend-container').addClass('no-data');
}

function checkIPCData() {
  //swap food security data source if empty
  var index = 0;
  var isEmpty = false;
  subnationalData.forEach(function(d) {
    if (d['#country+code']==currentCountry.code) {
      var val = +d[currentCountryIndicator.id];
      if (index==0 && (!isVal(val) || isNaN(val))) {
        isEmpty = true;
      }
      if (index==1 && isEmpty && isVal(val) && !isNaN(val)) {
        isEmpty = false;
      }
      index++;
    }
  });
  if (isEmpty) currentCountryIndicator.id = '#affected+ch+food+p3plus+pct';
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
  createSource($('.map-legend.country .population-source'), '#population');
  createSource($('.map-legend.country .food-security-source'), '#affected+food+ipc+p3plus+pct');
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

  //boundaries disclaimer
  createFootnote('.map-legend.country', 'The boundaries and names shown and the designations used on this map do not imply official endorsement or acceptance by the United Nations.');

  //expand/collapse functionality
  $('.map-legend.country .toggle-icon, .map-legend.country .collapsed-title').on('click', function() {
    $(this).parent().toggleClass('collapsed');
  });
}

function updateCountryLegend(scale) {
  //if (currentCountryIndicator.id=='#affected+ch+food+p3plus+pct' || currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct') {
    //$('.map-legend.country .food-security-source').empty();
    //createSource($('.map-legend.country .food-security-source'), '#affected+food+ipc+p3plus+pct');
  //}
  
  //special case for IPC source date in legend
  var data = dataByCountry[currentCountry.code][0];
  if (data['#date+ipc+start']!=undefined && data['#date+ipc+end']!=undefined) {
    var startDate = new Date(data['#date+ipc+start']);
    var endDate = new Date(data['#date+ipc+end']);
    startDate = (startDate.getFullYear()==endDate.getFullYear()) ? d3.utcFormat('%b')(startDate) : d3.utcFormat('%b %Y')(startDate);
    var dateRange = startDate +'-'+ d3.utcFormat('%b %Y')(endDate);// +' - '+ data['#date+ipc+period'];
    $('.map-legend.country').find('.food-security-source .source .date').text(dateRange);
  }
  else {
    var sourceObj = getSource('#affected+food+ipc+p3plus+pct');
    var date = (sourceObj['#date']==undefined) ? '' : dateFormat(new Date(sourceObj['#date']));
    $('.map-legend.country').find('.food-security-source .source .date').text(date);
  }

  var legendFormat;
  if (currentCountryIndicator.id=='#affected+ch+food+p3plus+pct' || currentCountryIndicator.id=='#affected+food+ipc+p3plus+pct' || currentCountryIndicator.id.indexOf('vaccinated')>-1)
    legendFormat = d3.format('.0%');
  else if (currentCountryIndicator.id=='#population')
    legendFormat = shortenNumFormat;
  else
    legendFormat = d3.format('.0f');

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
function createMapTooltip(country_code, country_name, point) {
  var country = nationalData.filter(c => c['#country+code'] == country_code);
  var val = country[0][currentIndicator.id];

  //format content for tooltip
  if (lastHovered!=country_code) {
    //set formats for value
    if (isVal(val)) {
      if (currentIndicator.id.indexOf('pct')>-1) {
        if (currentIndicator.id=='#value+gdp+ifi+pct')
          val = (isNaN(val)) ? 'No Data' : d3.format('.2%')(val);
        else
          val = (isNaN(val)) ? 'No Data' : percentFormat(val);
      }
      if (currentIndicator.id=='#severity+economic+num') val = shortenNumFormat(val);
      if (currentIndicator.id.indexOf('funding+total')>-1) val = formatValue(val);
    }
    else {
      val = 'No Data';
    }

    //format content for display
    var content = '<h2>'+ country_name +'</h2>';

    //COVID layer
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
      if (val!='No Data') {
        content += '<div class="stat-container covid-cases-per-capita"><div class="stat-title">'+ currentIndicator.name +':</div><div class="stat">' + d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) + '</div><div class="sparkline-container"></div></div>';

        content += '<div class="stat-container condensed-stat covid-cases"><div class="stat-title">Weekly Number of New Cases:</div><div class="stat">' + numFormat(country[0]['#affected+infected+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
        content += '<div class="stat-container condensed-stat covid-deaths"><div class="stat-title">Weekly Number of New Deaths:</div><div class="stat">' + numFormat(country[0]['#affected+killed+new+weekly']) + '</div><div class="sparkline-container"></div></div>';
        content += '<div class="stat-container condensed-stat covid-pct"><div class="stat-title">Weekly Trend (new cases past week / prior week):</div><div class="stat">' + percentFormat(country[0]['#covid+trend+pct']) + '</div><div class="sparkline-container"></div></div>';

        //testing data
        var testingVal = (country[0]['#affected+tested+positive+pct']==undefined) ? 'No Data' : percentFormat(country[0]['#affected+tested+positive+pct']);
        content += '<div class="stat-container condensed-stat covid-test-per-capita"><div class="stat-title">Positive Test Rate (rolling 7-day avg):</div><div class="stat">'+ testingVal +'</div></div>';

      }
      else {
        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }
    }
    //COVID by gender layer
    else if (currentIndicator.id=='#affected+infected+sex+new+avg+per100000') {
      //if (val!='No Data') {
        content += '<div class="table-display">';
        content += '<div class="table-row"><div>'+ currentIndicator.name +':</div><div>'+ d3.format('.1f')(country[0]['#affected+infected+new+per100000+weekly']) +'</div></div>';
        content += '</div>';

        //covid cases and deaths
        var numCases = (isVal(country[0]['#affected+infected'])) ? country[0]['#affected+infected'] : 'NA';
        var numDeaths = (isVal(country[0]['#affected+killed'])) ? country[0]['#affected+killed'] : 'NA';
        var casesMale = (hasGamData(country[0], 'cases')) ? percentFormat(country[0]['#affected+infected+m+pct']) : 'No Data';
        var casesFemale = (hasGamData(country[0], 'cases')) ? percentFormat(country[0]['#affected+f+infected+pct']) : 'No Data';
        var deathsMale = (hasGamData(country[0], 'deaths')) ? percentFormat(country[0]['#affected+killed+m+pct']) : 'No Data';
        var deathsFemale = (hasGamData(country[0], 'deaths')) ? percentFormat(country[0]['#affected+f+killed+pct']) : 'No Data';
        
        content += '<div class="table-display">';
        content += '<br><div class="table-row"><div>Total COVID-19 Cases:</div><div>' + numFormat(numCases) + '</div></div>';
        content += '<div class="table-row"><div>Female</div><div>'+ casesFemale + '</div></div>';
        content += '<div class="table-row"><div>Male</div><div>'+ casesMale + '</div></div>';
        content += '<div class="table-row"><div>Intersex</div><div>No Data</div></div>';
        content += '<br><div class="table-row"><div>Total COVID-19 Deaths:</div><div>' + numFormat(numDeaths) + '</div></div>';
        content += '<div class="table-row"><div>Female</div><div>'+ deathsFemale + '</div></div>';
        content += '<div class="table-row"><div>Male</div><div>'+ deathsMale + '</div></div>';
        content += '<div class="table-row"><div>Intersex</div><div>No Data</div></div>';
        content += '</div>';
      // }
      // else {
      //   content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
      // }
    }
    //PIN layer shows refugees and IDPs
    else if (currentIndicator.id=='#affected+inneed+pct') {
      if (val!='No Data') {
        if (parseFloat(val)>100) val = '100.0%';
        content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
      }

      content += '<div class="table-display">';
      if (country_code=='COL') {
        //hardcode PIN for COL
        content += '<div class="table-row">Refugees & Migrants:<span>1,700,000</span></div>';
      }
      else {
        var tableArray = [{label: 'People in Need', value: country[0]['#affected+inneed']},
                          {label: 'Refugees & Migrants', value: country[0]['#affected+refugees']},
                          {label: 'IDPs', value: country[0]['#affected+displaced']}];
        tableArray.forEach(function(row, index) {
          if (row.value!=undefined) {
            content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ numFormat(row.value) +'</div></div>';
          }
        });
      }
      content += '</div>';
    }
    //Access layer
    else if (currentIndicator.id=='#event+year+todate+num') {
      var tableArray = [{label: 'Violent Security Incidents Against Humanitarian Workers since Jan 2020', value: '#event+year+todate+num'},
                        {label: '% of Visas Pending or Denied', value: '#access+visas+pct'},
                        {label: '% of Travel Authorizations Denied', value: '#access+travel+pct'},
                        {label: '% of CERF Projects Affected by Access Constraints', value: '#activity+cerf+project+insecurity+pct'},
                        {label: '% of CBPF Projects Affected by Access Constraints', value: '#activity+cbpf+project+insecurity+pct'},
                        {label: 'Status of Polio Vaccination Campaign', value: '#status+name'},
                        {label: 'Status of Schools', value: '#impact+type'}];
      content += '<div class="table-display">';
      tableArray.forEach(function(row) {
        var data = (country[0][row.value]==undefined) ? 'N/A' : country[0][row.value];
        var val = (row.label.indexOf('%')>-1 && !isNaN(data)) ? percentFormat(data) : data;
        var sourceObj = getSource(row.value);
        content += '<div class="table-row row-separator"><div>'+ row.label +':<br><span class="subtext">'+ sourceObj['#meta+source'] +'</span></div><div>'+ val +'</div></div>';
      });
      content += '</div>';
    }
    //IPC layer
    else if (currentIndicator.id=='#affected+food+p3plus+pct') {
      var dateSpan = '';
      if (country[0]['#date+ipc+start']!=undefined) {
        var startDate = new Date(country[0]['#date+ipc+start']);
        var endDate = new Date(country[0]['#date+ipc+end']);
        startDate = (startDate.getFullYear()==endDate.getFullYear()) ? d3.utcFormat('%b')(startDate) : d3.utcFormat('%b %Y')(startDate);
        var dateSpan = '<span class="subtext">('+ startDate +'-'+ d3.utcFormat('%b %Y')(endDate) +' - '+ country[0]['#date+ipc+period'] +')</span>';
      }
      content += 'Total % Population in IPC Phase 3+ '+ dateSpan +':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        content += '<span>('+ percentFormat(country[0]['#affected+food+analysed+pct']) +' of Total Country Population Analysed)</span>';
        var tableArray = [{label: 'IPC Phase 3 (Critical)', value: country[0]['#affected+food+p3+pct']},
                          {label: 'IPC Phase 4 (Emergency)', value: country[0]['#affected+food+p4+pct']},
                          {label: 'IPC Phase 5 (Famine)', value: country[0]['#affected+food+p5+pct']}];
        content += '<div class="table-display">Breakdown:';
        tableArray.forEach(function(row) {
          if (row.value!=undefined) content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ percentFormat(row.value) +'</div></div>';
        });
        content += '</div>';
      }
    }
    //Vaccination campaigns layer
    else if (currentIndicator.id=='#vaccination+num+ratio') {
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
    //INFORM layer
    else if (currentIndicator.id=='#severity+inform+type') {
      var numVal = (isVal(country[0]['#severity+inform+num'])) ? country[0]['#severity+inform+num'] : 'No Data';
      content += 'INFORM COVID-19 Risk Index:<div class="stat">' + numVal + '</div>';
      if (numVal!='No Data') {
        var tableArray = [{label: 'Lack of Coping Capacity', value: country[0]['#severity+coping+inform+num']},
                          {label: 'COVID-19 Hazard & Exposure', value: country[0]['#severity+hazard+inform+num']},
                          {label: 'Vulnerability', value: country[0]['#severity+inform+num+vulnerability']}];
        content += '<div class="table-display">';
        tableArray.forEach(function(row) {
          if (row.value!=undefined) content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ row.value +'</div></div>';
        });
        content += '</div>';
      }
    }
    //Humanitarian Funding Level layer
    else if (currentIndicator.id=='#value+funding+hrp+pct') {
      if (val!='No Data') {
        content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
        var tableArray = [{label: 'HRP Requirement', value: country[0]['#value+funding+hrp+required+usd']},
                          {label: 'HRP Funding Level for COVID-19 GHRP', value: country[0]['#value+covid+funding+hrp+pct']},
                          {label: 'HRP Requirement for COVID-19 GHRP', value: country[0]['#value+covid+funding+hrp+required+usd']}];
        content += '<div class="table-display">';
        tableArray.forEach(function(row) {
          if (isVal(row.value)) {
            var value = (row.label=='HRP Funding Level for COVID-19 GHRP') ? percentFormat(row.value) : formatValue(row.value);
            content += '<div class="table-row"><div>'+ row.label +':</div><div>'+ value +'</div></div>';
          }
        });
        content += '</div>';
      }
      else {
        if (isVal(country[0]['#value+funding+other+planname'])) {
          var planArray = country[0]['#value+funding+other+planname'].split('|');
          var planPctArray = (isVal(country[0]['#value+funding+other+pct'])) ? country[0]['#value+funding+other+pct'].split('|') : [0];
          var planRequiredArray = (isVal(country[0]['#value+funding+other+required+usd'])) ? country[0]['#value+funding+other+required+usd'].split('|') : [0];
          var planTotalArray = (isVal(country[0]['#value+funding+other+total+usd'])) ? country[0]['#value+funding+other+total+usd'].split('|') : [0];

          if (val!='No Data') content += '<br/>';
          planArray.forEach(function(plan, index) {
            content +=  plan +' Funding Level:<div class="stat">' + percentFormat(planPctArray[index]) + '</div>';
            content += '<div class="table-display">';
            content += '<div class="table-row"><div>Requirement:</div><div>'+ formatValue(planRequiredArray[index]) +'</div></div>';
            content += '<div class="table-row"><div>Total:</div><div>'+ formatValue(planTotalArray[index]) +'</div></div>';
            content += '</div>';
            if (index==0 && planArray.length>1) content += '<br/>';
          });
        }
        else {
          content +=  currentIndicator.name + ':<div class="stat">Under Review</div>';
        }
      }
    }
    //CERF
    else if (currentIndicator.id=='#value+cerf+covid+funding+total+usd') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        if (country[0]['#value+cerf+covid+funding+total+usd'] > 0) {
          var gmText = getGamText(country[0], 'cerf');
          content += '<div class="gam">'+ gmText +'</div>';
        }
      }
    }
    //CBPF
    else if (currentIndicator.id=='#value+cbpf+covid+funding+total+usd') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      //hardcode value for CBPF Turkey
      if (country_code=='TUR') content+='<span>(Syria Cross Border HF)</span>';

      if (val!='No Data') {
        //gam
        if (country[0]['#value+cbpf+covid+funding+total+usd'] > 0) {
          var gmText = getGamText(country[0], 'cbpf');
          content += '<div class="gam small-pad">'+ gmText +'</div>';
        }

        //beneficieries
        if (country[0]['#affected+cbpf+covid+funding+total'] > 0) {
          var beneficiaryText = getBeneficiaryText(country[0]);
          content += '<div class="gam">'+ beneficiaryText +'</div>';
        }
      }
    }
    //IFI financing layer
    else if (currentIndicator.id=='#value+gdp+ifi+pct') {
      content +=  currentIndicator.name + ':<div class="stat">' + val + '</div>';
      if (val!='No Data') {
        content += '<div class="table-display">';
        if (isVal(country[0]['#value+ifi+percap'])) content += '<div class="table-row"><div>Total IFI Funding per Capita:</div><div>'+ d3.format('$,.2f')(country[0]['#value+ifi+percap']) +'</div></div>';
        if (isVal(country[0]['#value+ifi+total'])) content += '<div class="table-row"><div>Total Amount Combined:</div><div>'+ formatValue(country[0]['#value+ifi+total']) +'</div></div>';
        content += '</div>';

        if (parseFloat(val)>0) {
          content += '<div class="table-display subtext">Breakdown:';
          var fundingArray = ['adb','afdb','eib','idb','ifc','imf','isdb','unmptf','wb'];
          fundingArray.forEach(function(fund) {
            var fundName = (fund=='wb') ? 'World Bank' : fund.toUpperCase(); 
            if (isVal(country[0]['#value+'+fund+'+total'])) content += '<div class="table-row"><div>'+ fundName +':</div><div>'+ formatValue(country[0]['#value+'+fund+'+total']) +'</div></div>';
          });
          content += '</div>';
        }
      }
    }
    //all other layers
    else {
      content += currentIndicator.name + ':<div class="stat">' + val + '</div>';
    }

    //covid cases and deaths
    if (currentIndicator.id!='#affected+infected+sex+new+avg+per100000') {
      var numCases = (isVal(country[0]['#affected+infected'])) ? numFormat(country[0]['#affected+infected']) : 'NA';
      var numDeaths = (isVal(country[0]['#affected+killed'])) ? numFormat(country[0]['#affected+killed']) : 'NA';
      content += '<div class="cases-total">Total COVID-19 Cases: ' + numCases + '</div>';
      content += '<div class="deaths-total">Total COVID-19 Deaths: ' + numDeaths + '</div>';
    }

    //set content for tooltip
    tooltip.setHTML(content);

    //COVID cases layer charts -- inject this after divs are created in tooltip
    if (currentIndicator.id=='#affected+infected+new+per100000+weekly' || currentIndicator.id=='#affected+infected+sex+new+avg+per100000' && val!='No Data') {
      //weekly cases per capita sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d['#date+reported'], value: d['#affected+infected+new+per100000+weekly']};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-cases-per-capita .sparkline-container', 'large');

      //weekly cases sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d['#date+reported'], value: d['#affected+infected+new+weekly']};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-cases .sparkline-container');

      //weekly deaths sparkline
      var sparklineArray = [];
      covidTrendData[country_code].forEach(function(d) {
        var obj = {date: d['#date+reported'], value: d['#affected+killed+new+weekly']};
        sparklineArray.push(obj);
      });
      createSparkline(sparklineArray, '.mapboxgl-popup-content .covid-deaths .sparkline-container');
      
      //weekly trend bar charts
      if (country[0]['#covid+trend+pct']!=undefined) {
        var pctArray = [];
        covidTrendData[country_code].forEach(function(d) {
          var obj = {date: d['#date+reported'], value: d['#affected+infected+new+pct+weekly']};
          pctArray.push(obj);
        });
        createSparkline(pctArray, '.mapboxgl-popup-content .covid-pct .sparkline-container');
        //createTrendBarChart(pctArray, '.mapboxgl-popup-content .covid-pct .sparkline-container');
      }
    }
  }
  lastHovered = country_code;

  setTooltipPosition(point);
}

function setTooltipPosition(point) {
  var tooltipWidth = $('.map-tooltip').width();
  var tooltipHeight = $('.map-tooltip').height();
  var anchorDirection = (point.x + tooltipWidth > viewportWidth) ? 'right' : 'left';
  var yOffset = 0;
  if (point.y + tooltipHeight/2 > viewportHeight) yOffset = viewportHeight - (point.y + tooltipHeight/2);
  if (point.y - tooltipHeight/2 < 0) yOffset = tooltipHeight/2 - point.y;
  var popupOffsets = {
    'right': [0, yOffset],
    'left': [0, yOffset]
  };
  tooltip.options.offset = popupOffsets;
  tooltip.options.anchor = anchorDirection;

  if (yOffset>0) {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-start');
    $('.mapboxgl-popup-tip').css('margin-top', point.y);
  }
  else if (yOffset<0)  {
    $('.mapboxgl-popup-tip').css('align-self', 'flex-end');
    $('.mapboxgl-popup-tip').css('margin-bottom', viewportHeight-point.y-10);
  }
  else {
    $('.mapboxgl-popup-tip').css('align-self', 'center');
    $('.mapboxgl-popup-tip').css('margin-top', 0);
    $('.mapboxgl-popup-tip').css('margin-bottom', 0);
  }
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

    tooltip.setHTML(content);
  }
}


function resetMap() {
  if (currentCountry.code!=undefined) {
    var id = currentCountry.code.toLowerCase()
    map.setLayoutProperty(id+'-popdensity', 'visibility', 'none');
  }
  map.setLayoutProperty(countryBoundaryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLayer, 'visibility', 'none');
  map.setLayoutProperty(countryLabelLayer, 'visibility', 'none');
  $('.content').removeClass('country-view');
  $('.country-select').val('');

  //reset region
  if (currentRegion!='') {
    selectRegion();
    map.setLayoutProperty(globalLayer, 'visibility', 'visible');
  }
  else {
    updateGlobalLayer();

    map.flyTo({ 
      speed: 2,
      zoom: zoomLevel,
      center: [-25, 0] 
    });
    map.once('moveend', function() {
      map.setLayoutProperty(globalLayer, 'visibility', 'visible');
    });
  }

  //reset tab view
  if (currentIndicator.id=='#affected+infected+new+per100000+weekly') {
    $('.content').addClass('tab-view');
  }
}


/***********************/
/*** PANEL FUNCTIONS ***/
/***********************/
function initCountryPanel() {
  var data = dataByCountry[currentCountry.code][0];

  //timeseries
  updateTimeseries(data['#country+name']);

  //set panel header
  $('.flag').attr('src', 'assets/flags/'+data['#country+code']+'.png');
  $('.country-panel h3').text(data['#country+name']);

  //covid
  var covidDiv = $('.country-panel .covid .panel-inner');
  covidDiv.children().remove();  
  createFigure(covidDiv, {className: 'cases', title: 'Total Confirmed Cases', stat: numFormat(data['#affected+infected']), indicator: '#affected+infected'});
  createFigure(covidDiv, {className: 'deaths', title: 'Total Confirmed Deaths', stat: numFormat(data['#affected+killed']), indicator: '#affected+killed'});
  var covidData = covidTrendData[currentCountry.code];
  var weeklyCases = covidData[covidData.length-1]['#affected+infected+new+weekly'];
  var weeklyDeaths = covidData[covidData.length-1]['#affected+killed+new+weekly'];
  createFigure(covidDiv, {className: 'weekly-cases', title: 'Weekly Number of New Cases', stat: numFormat(weeklyCases), indicator: '#affected+killed'});
  createFigure(covidDiv, {className: 'weekly-deaths', title: 'Weekly Number of New Deaths', stat: numFormat(weeklyDeaths), indicator: '#affected+killed'});

  //projections
  var projectionsDiv = $('.country-panel .projections .panel-inner');
  projectionsDiv.children().remove();  
  projectionsDiv.append('<h6>COVID-19 Projections</h6><div class="bar-chart projections-cases"><p class="chart-title">Cases</p></div>');
  var cases = [{model: 'Imperial', min: data['#affected+infected+min+imperial'], max: data['#affected+infected+max+imperial']},
               {model: 'LSHTM', min: data['#affected+infected+min+lshtm'], max: data['#affected+infected+max+lshtm']}];
  createProjectionsChart(cases, 'Cases');
  
  projectionsDiv.append('<div class="bar-chart projections-deaths"><p class="chart-title">Deaths</p></div>');
  var deaths = [{model: 'Imperial', min: data['#affected+killed+min+imperial'], max: data['#affected+killed+max+imperial']},
                {model: 'LSHTM', min: data['#affected+killed+min+lshtm'], max: data['#affected+killed+max+lshtm']}];
  createProjectionsChart(deaths, 'Deaths');

  //hrp
  var hrpDiv = $('.country-panel .hrp .panel-inner');
  hrpDiv.children().remove();
  createFigure(hrpDiv, {className: 'funding-required', title: 'HRP Requirement', stat: formatValue(data['#value+funding+hrp+required+usd']), indicator: '#value+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-level', title: 'HRP Funding Level', stat: percentFormat(data['#value+funding+hrp+pct']), indicator: '#value+covid+funding+hrp+pct'});
  createFigure(hrpDiv, {className: 'funding-covid-required', title: 'HRP Requirement for COVID-19 GHRP', stat: formatValue(data['#value+covid+funding+hrp+required+usd']), indicator: '#value+covid+funding+hrp+required+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-allocation', title: 'HRP Allocation for COVID-19 GHRP', stat: formatValue(data['#value+covid+funding+hrp+total+usd']), indicator: '#value+covid+funding+hrp+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cerf-allocation', title: 'CERF COVID-19 Allocation', stat: formatValue(data['#value+cerf+covid+funding+total+usd']), indicator: '#value+cerf+covid+funding+total+usd'});
  createFigure(hrpDiv, {className: 'funding-covid-cbpf-allocation', title: 'CBPF COVID Allocation', stat: formatValue(data['#value+cbpf+covid+funding+total+usd']), indicator: '#value+cbpf+covid+funding+total+usd'});

  //inform
  var informDiv = $('.country-panel .inform .panel-inner');
  informDiv.children().remove();  
  createFigure(informDiv, {className: 'risk-index', title: 'Risk Index<br>(1-10)', stat: data['#severity+inform+num'], indicator: '#severity+inform+num'});
  createFigure(informDiv, {className: 'risk-class', title: 'Risk Class<br>(Very Low-Very High)', stat: data['#severity+inform+type'], indicator: '#severity+inform+num'});

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
var percentFormat = d3.format('.1%');
var dateFormat = d3.utcFormat("%b %d, %Y");
var colorRange = ['#F7DBD9', '#F6BDB9', '#F5A09A', '#F4827A', '#F2645A'];
var informColorRange = ['#FFE8DC','#FDCCB8','#FC8F6F','#F43C27','#961518'];
var immunizationColorRange = ['#CCE5F9','#99CBF3','#66B0ED','#3396E7','#027CE1'];
var populationColorRange = ['#FFE281','#FDB96D','#FA9059','#F27253','#E9554D'];
var accessColorRange = ['#79B89A','#F6B98E','#C74B4F'];
var oxfordColorRange = ['#ffffd9','#c7e9b4','#41b6c4','#225ea8','#172976'];
var colorDefault = '#F2F2EF';
var colorNoData = '#FFF';
var regionBoundaryData, regionalData, worldData, nationalData, subnationalData, vaccinationData, timeseriesData, covidTrendData, dataByCountry, countriesByRegion, colorScale, viewportWidth, viewportHeight, currentRegion = '';
var globalTimeseriesChart, countryTimeseriesChart = '';
var mapLoaded = false;
var dataLoaded = false;
var viewInitialized = false;
var zoomLevel = 1.4;

var hrpData = [];
var currentIndicator = {};
var currentCountryIndicator = {};
var currentCountry = {};

$( document ).ready(function() {
  var prod = (window.location.href.indexOf('ocha-dap')>-1 || window.location.href.indexOf('data.humdata.org')>-1) ? true : false;
  console.log(prod);
  
  mapboxgl.accessToken = (prod) ? 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2hnbWs5NzkxMXh2MnNvcmF6dXIxMWE0In0.0GfmJoEJyWFQ5UzNxl2WgA' : 'pk.eyJ1IjoiaHVtZGF0YSIsImEiOiJja2FvMW1wbDIwMzE2MnFwMW9teHQxOXhpIn0.Uri8IURftz3Jv5It51ISAA';
  var tooltip = d3.select('.tooltip');
  var minWidth = 1000;
  viewportWidth = (window.innerWidth<minWidth) ? minWidth - $('.content-left').innerWidth() : window.innerWidth - $('.content-left').innerWidth();
  viewportHeight = window.innerHeight;


  function init() {
    //detect mobile users
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
      $('.mobile-message').show();
    }
    $('.mobile-message').on('click', function() {
      $(this).remove();
    });

    //set content sizes based on viewport
    $('.secondary-panel').height(viewportHeight-40);
    $('.content').width(viewportWidth + $('.content-left').innerWidth());
    $('.content').height(viewportHeight);
    $('.content-right').width(viewportWidth);
    $('#chart-view').height(viewportHeight - $('.tab-menubar').height());
    $('.country-panel .panel-content').height(viewportHeight - $('.country-panel .panel-content').position().top);
    $('.map-legend.global, .map-legend.country').css('max-height', viewportHeight - 200);
    if (viewportHeight<696) {
      zoomLevel = 1.4;
    }

    //load static map -- will only work for screens smaller than 1280
    if (viewportWidth<=1280) {
      var staticURL = 'https://api.mapbox.com/styles/v1/humdata/ckb843tjb46fy1ilaw49redy7/static/-25,0,'+zoomLevel+'/'+viewportWidth+'x'+viewportHeight+'?access_token='+mapboxgl.accessToken;
      $('#static-map').css('background-image', 'url('+staticURL+')');
    }

    //set daily download date
    var today = new Date();
    $('.download-link .today-date').text(dateFormat(today));


    getData();
    initMap();
  }

  function getData() {
    console.log('Loading data...')
    Promise.all([
      d3.json('https://raw.githubusercontent.com/OCHA-DAP/hdx-scraper-covid-viz/master/out.json'),
      d3.json('data/ocha-regions-bbox.geojson')
    ]).then(function(data) {
      console.log('Data loaded');
      $('.loader span').text('Initializing map...');

      //parse data
      var allData = data[0];
      worldData = allData.world_data[0];
      regionBoundaryData = data[1].features;
      timeseriesData = allData.covid_series_data;
      regionalData = allData.regional_data;
      nationalData = allData.national_data;
      subnationalData = allData.subnational_data;
      sourcesData = allData.sources_data;
      covidTrendData = allData.who_covid_data;
      vaccinationData = allData.vaccination_campaigns_data;
      
      //format data
      subnationalData.forEach(function(item) {
        var pop = item['#population'];
        if (item['#population']!=undefined) item['#population'] = parseInt(pop.replace(/,/g, ''), 10);
        item['#org+count+num'] = +item['#org+count+num'];
      });

      //parse national data
      nationalData.forEach(function(item) {
        //normalize country names
        if (item['#country+name']=='State of Palestine') item['#country+name'] = 'occupied Palestinian territory';
        if (item['#country+name']=='Bolivia (Plurinational State of)') item['#country+name'] = 'Bolivia';

        //hardcode CBPF val for Turkey
        if (item['#country+code']=='TUR') item['#value+cbpf+covid+funding+total+usd'] = 23000000;

        //calculate and inject PIN percentage
        item['#affected+inneed+pct'] = (item['#affected+inneed']=='' || item['#population']=='') ? '' : item['#affected+inneed']/item['#population'];

        //store covid trend data
        var covidByCountry = covidTrendData[item['#country+code']];
        item['#covid+trend+pct'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+infected+new+pct+weekly']/100;
        item['#affected+infected+new+per100000+weekly'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+infected+new+per100000+weekly'];
        item['#affected+infected+new+weekly'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+infected+new+weekly'];
        item['#affected+killed+new+weekly'] = (covidByCountry==undefined) ? null : covidByCountry[covidByCountry.length-1]['#affected+killed+new+weekly'];
        item['#covid+total+cases+per+capita'] = (item['#affected+infected'] / item['#population']) * 100000;

        //create cases by gender indicator
        item['#affected+infected+sex+new+avg+per100000'] = (item['#affected+infected+m+pct']!=undefined || item['#affected+f+infected+pct']!=undefined) ? item['#affected+infected+new+per100000+weekly'] : null;
        
        //consolidate IPC data
        if (item['#affected+food+ipc+analysed+pct'] || item['#affected+ch+food+analysed+pct']) {
          item['#affected+food+analysed+pct'] = (item['#affected+ch+food+analysed+pct']) ? item['#affected+ch+food+analysed+pct'] : item['#affected+food+ipc+analysed+pct'];
        }
        if (item['#affected+food+ipc+p3+pct'] || item['#affected+ch+food+p3+pct']) {
          item['#affected+food+p3+pct'] = (item['#affected+ch+food+p3+pct']) ? item['#affected+ch+food+p3+pct'] : item['#affected+food+ipc+p3+pct'];
        }
        if (item['#affected+food+ipc+p3plus+pct'] || item['#affected+ch+food+p3plus+pct']) {
          item['#affected+food+p3plus+pct'] = (item['#affected+ch+food+p3plus+pct']) ? item['#affected+ch+food+p3plus+pct'] : item['#affected+food+ipc+p3plus+pct'];
        }
        if (item['#affected+food+ipc+p4+pct'] || item['#affected+ch+food+p4+pct']) {
          item['#affected+food+p4+pct'] = (item['#affected+ch+food+p4+pct']) ? item['#affected+ch+food+p4+pct'] : item['#affected+food+ipc+p4+pct'];
        }
        if (item['#affected+food+ipc+p5+pct'] || item['#affected+ch+food+p5+pct']) {
          item['#affected+food+p5+pct'] = (item['#affected+ch+food+p5+pct']) ? item['#affected+ch+food+p5+pct'] : item['#affected+food+ipc+p5+pct'];
        }
      });

      //group national data by country -- drives country panel    
      dataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .object(nationalData);

      //group countries by region    
      countriesByRegion = d3.nest()
        .key(function(d) { return d['#region+name']; })
        .object(nationalData);

      //group vaccination data by country    
      vaccinationDataByCountry = d3.nest()
        .key(function(d) { return d['#country+code']; })
        .entries(vaccinationData);

      //format dates and set overall status
      vaccinationDataByCountry.forEach(function(country) {
        var postponed = 'On Track';
        var isPostponed = false;
        country.values.forEach(function(campaign) {
          var d = moment(campaign['#date+start'], ['YYYY-MM','MM/DD/YYYY']);
          var date = new Date(d.year(), d.month(), d.date());
          campaign['#date+start'] = (isNaN(date.getTime())) ? campaign['#date+start'] : getMonth(date.getMonth()) + ' ' + date.getFullYear();
          if (campaign['#status+name'].toLowerCase().indexOf('unknown')>-1 && !isPostponed) postponed = 'Unknown';
          if (campaign['#status+name'].toLowerCase().indexOf('postponed')>-1) {
            isPostponed = true;
            postponed = 'Postponed / May postpone';
          }
        });

        nationalData.forEach(function(item) {
          if (item['#country+code'] == country.key) item['#vaccination-campaigns'] = postponed;
        });
      });

      //console.log(nationalData)
      //console.log(subnationalData)

      dataLoaded = true;
      if (mapLoaded==true) displayMap();
      initView();
    });
  }

  function initView() {
    //create regional select
    $('.region-select').empty();
    var regionalSelect = d3.select('.region-select')
      .selectAll('option')
      .data(regionalList)
      .enter().append('option')
        .text(function(d) { return d.name; })
        .attr('value', function (d) { return d.id; });
    //insert default option    
    $('.region-select').prepend('<option value="">All Regions</option>');
    $('.region-select').val($('.region-select option:first').val());

    //create country select
    var countryArray = Object.keys(countryCodeList);
    hrpData = nationalData.filter((row) => countryArray.includes(row['#country+code']));
    hrpData.sort(function(a, b){
      return d3.ascending(a['#country+name'].toLowerCase(), b['#country+name'].toLowerCase());
    })
    var countrySelect = d3.select('.country-select')
      .selectAll('option')
      .data(hrpData)
      .enter().append('option')
        .text(function(d) { return d['#country+name']; })
        .attr('value', function (d) { return d['#country+code']; });
    //insert default option    
    $('.country-select').prepend('<option value="">View Country Page</option>');
    $('.country-select').val($('.country-select option:first').val());

    //create tab events
    $('.tab-menubar .tab-button').on('click', function() {
      $('.tab-button').removeClass('active');
      $(this).addClass('active');
      if ($(this).data('id')=='chart-view') {
        $('#chart-view').show();
      }
      else {
        $('#chart-view').hide();
      }
      mpTrack($(this).data('id'), currentIndicator.name);
    });

    //load timeseries for global view 
    createSource($('#chart-view .source-container'), '#affected+infected');
    initTimeseries(timeseriesData, '.global-timeseries-chart');

    //load timeseries for country view 
    initTimeseries(timeseriesData, '.country-timeseries-chart');

    //check map loaded status
    if (mapLoaded==true && viewInitialized==false)
      deepLinkCountryView();

    viewInitialized = true;
  }


  function initCountryView() {
    $('.content').addClass('country-view');
    $('.country-panel').scrollTop(0);
    $('#population').prop('checked', true);
    currentCountryIndicator = {id: $('input[name="countryIndicators"]:checked').val(), name: $('input[name="countryIndicators"]:checked').parent().text()};

    initCountryPanel();
  }


  function initTracking() {
    //initialize mixpanel
    var MIXPANEL_TOKEN = window.location.hostname=='data.humdata.org'? '5cbf12bc9984628fb2c55a49daf32e74' : '99035923ee0a67880e6c05ab92b6cbc0';
    mixpanel.init(MIXPANEL_TOKEN);
    mixpanel.track('page view', {
      'page title': document.title,
      'page type': 'datavis'
    });
  }

  init();
  initTracking();
});