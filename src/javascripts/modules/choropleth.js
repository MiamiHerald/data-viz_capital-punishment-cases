import $ from 'jquery';
import * as d3 from 'd3';
import * as topojson from 'topojson';

d3.select(window)
    .on("resize", sizeChange);

var rateById = d3.map();

var quantize = d3.scaleQuantize()
  .domain([0, 0.15])
  .range(d3.range(9).map(function(i) { return "q" + i + "-9"; }));

var projection = d3.geoMercator()
  .center([-81.5158, 27.6648])
  .scale(3500);

var path = d3.geoPath()
  .projection(projection);

var map = d3.select("#map")
    .append('svg')
    .attr('width', '100%')
        .append('g');

function init() {
  sizeChange();


  d3.queue()
      .defer(d3.json, "/data/florida.json")
      .defer(d3.tsv, "/data/unemployment.tsv", function(d) { rateById.set(d.id, +d.rate); })
      .await(ready);
}

function ready(error, fl) {
    if (error) throw error;

    map.append("g")
        .attr("class", "counties")
      .selectAll("path")
        .data(topojson.feature(fl, fl.objects.cb_2015_florida_county_20m).features)
      .enter().append("path")
        .attr("class", function(d) { return quantize(rateById.get(d.properties.GEOID)) })
        .attr("d", path);
}

function sizeChange() {
  d3.select("g").attr("transform", "scale(" + $("#map").width()/900 + ")");
  $("svg").height($("#map").width()*0.618);
}

export { init };
