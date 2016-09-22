import $ from 'jquery';
import * as d3 from 'd3';
import * as topojson from 'topojson';
import numeral from 'numeral';

class Choropleth {
  constructor(el, dataUrl) {
    this.el = el;
    this.dataUrl = dataUrl;
    this.shapeUrl = `/data/new-florida.json`;
    this.rateById = d3.map();
    this.quantize = d3.scaleQuantize()
      .domain([10000, 60000])
      .range(d3.range(4).map((i) => `median--${i + 1}`));
    this.projection = d3.geoMercator()
      .center([-81.5158, 27.6648])
      .scale(3500);
    this.path = d3.geoPath()
      .projection(this.projection);
  }

  render() {
    this.svg = d3.select(this.el).append(`svg`)
        .attr(`width`, `100%`)
        .attr(`class`, `choropleth__svg`)
        .append(`g`);

    this.loadData();
    this.resizeChoropleth();
    $(window).on(`resize`, this.resizeChoropleth.bind(this))
  }

  resizeChoropleth() {
    d3.select(`g`).attr(`transform`, `scale(${$(this.el).width() / 900})`);
    $(`.choropleth__svg`).height($(this.el).width() * 0.618);
  }

  loadData() {
    d3.queue()
      .defer(d3.json, this.shapeUrl)
      .await(this.drawMap.bind(this));
  }

  drawMap(error, shapeData, caseData) {
    if (error) throw error;

    this.svg.append(`g`)
        .attr(`class`, `counties`)
      .selectAll(`path`)
        .data(topojson.feature(shapeData, shapeData.objects.cb_2015_florida_county_20m).features)
      .enter().append(`path`)
        .attr(`class`, (d) => `${this.quantize(numeral().unformat(d.properties.Median))} circuit--${d.properties.CIRCUIT} county--${d.properties.NAME}`)
        .attr(`d`, this.path)
        .on(`mouseover`, (d) => {
          d3.select(`#info`)
              .attr(`class`, `choropleth__info--inner active`)
              .html(`
                <h2 class="info__circuit">Circuit ${d.properties.CIRCUIT}</h2>
                <div class="info__median--title">Median Price</div>
                <div class="info__median">${numeral(d.properties.Median).format('$0,0')} per case</div>
                <div class="info__cases">(${d.properties.Cases} total cases)</div>
                <div class="info__county">${d.properties.NAME} County</div>
              `)
        });

    shapeData.objects.cb_2015_florida_county_20m.geometries.forEach((x) => {
      this.svg.append(`path`)
          .datum(topojson.merge(shapeData, shapeData.objects.cb_2015_florida_county_20m.geometries.filter((d) => d.properties.CIRCUIT === x.properties.CIRCUIT )))
          .attr(`class`, `circuit`)
          .attr(`d`, this.path);
    });
  }
}

const loadChoropleths = () => {
  const $choropleth = $(`.js-choropleth`);

  $choropleth.each((index) => {
    const $this = $choropleth.eq(index);
    const id = $this.attr(`id`);
    const url = $this.data(`url`);

    new Choropleth(`#${id}`, url).render();
  });
}

export { loadChoropleths };
