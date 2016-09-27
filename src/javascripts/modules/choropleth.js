import $ from 'jquery';
import * as d3 from 'd3';
import * as topojson from 'topojson';
import { TweenLite } from 'gsap';
import numeral from 'numeral';
import * as pym from 'pym.js'
window.$ = $;

class Choropleth {
  constructor(el) {
    this.el = el;
    this.aspectRatio = 0.6667;
    this.width = $(this.el).width();
    this.height = Math.ceil(this.aspectRatio * this.width);
    this.mapWidth = this.width;
    this.shapeUrl = `data/new-florida.json`;
    this.quantize = d3.scaleQuantize()
      .domain([10000, 60000])
      .range(d3.range(4).map((i) => `median--${i + 1}`));
    this.circuits = []
    this.pymChild = null;
  }

  render() {
    this.svg = d3.select(this.el).append(`svg`)
        .attr(`width`, `100%`)
        .attr(`class`, `choropleth__svg`)
        .append(`g`);

    this.loadData();
    this.resizeChoropleth();
    $(window).on(`resize`, this.resizeChoropleth.bind(this));
  }

  resizeChoropleth() {
    window.requestAnimationFrame(() => {
      const chart = $(this.el).find(`g`);

      this.width = $(this.el).width();
      this.height = Math.ceil(this.aspectRatio * this.width);

      TweenLite.set(chart, { scale: this.width / this.mapWidth });
      d3.select(`.choropleth__svg`).attr(`height`, this.height);
    });
  }

  loadData() {
    d3.queue()
      .defer(d3.json, this.shapeUrl)
      .await(this.drawMap.bind(this));
  }

  drawMap(error, shapeData) {
    if (error) throw error;

    this.projection = d3.geoEquirectangular()
      .fitSize([this.width, this.height], topojson.feature(shapeData, shapeData.objects[`cb_2015_florida_county_20m`]));
    this.path = d3.geoPath()
      .projection(this.projection);

    // https://github.com/wbkd/d3-extended
    d3.selection.prototype.moveToFront = function() {
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    };
    d3.selection.prototype.moveToBack = function() {
        return this.each(function() {
            var firstChild = this.parentNode.firstChild;
            if (firstChild) {
                this.parentNode.insertBefore(this, firstChild);
            }
        });
    };

    this.svg.selectAll(`path`)
        .data(topojson.feature(shapeData, shapeData.objects.cb_2015_florida_county_20m).features)
      .enter().append(`path`)
        .attr(`class`, (d) => `${this.quantize(numeral().unformat(d.properties.Median))} county`)
        .attr(`d`, this.path)
        .on(`mouseover`, (d) => {
          d3.selectAll(`.circuit`)
              .classed(`active`, false);

          d3.select(`.circuit--${d.properties.CIRCUIT}`)
              .moveToFront()
              .classed(`active`, true);

          d3.select(`#info`)
              .html(`
                <h2 class="info__circuit">Circuit ${d.properties.CIRCUIT}</h2>
                <div class="info__median--title">Median per case</div>
                <div class="info__median">${numeral(d.properties.Median).format('$0,0')}</div>
                <div class="info__cases--title">Total cases</div>
                <div class="info__cases">${d.properties.Cases}</div>
                <div class="info__cases--title">County selected</div>
                <div class="info__county">${d.properties.NAME}</div>
              `)
        });

    shapeData.objects.cb_2015_florida_county_20m.geometries.forEach((x) => {
      if (!this.circuits.includes(x.properties.CIRCUIT)) {
        this.svg.append(`path`)
            .datum(topojson.merge(shapeData, shapeData.objects.cb_2015_florida_county_20m.geometries.filter((d) => d.properties.CIRCUIT === x.properties.CIRCUIT )))
            .attr(`class`, `circuit circuit--${x.properties.CIRCUIT}`)
            .attr(`d`, this.path);

        this.circuits.push(x.properties.CIRCUIT);
      }
    });

    d3.select(`.circuit--11`)
        .classed(`active`, true);

    this.pymChild = new pym.Child({ renderCallback: this.resizeChoropleth.bind(this) });
  }
}

const loadChoropleths = () => {
  const $choropleth = $(`.js-choropleth`);

  $choropleth.each((index) => {
    const $this = $choropleth.eq(index);
    const id = $this.attr(`id`);

    new Choropleth(`#${id}`).render();
  });
}

export { loadChoropleths };
