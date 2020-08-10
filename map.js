const colors = [
  'rgb(198,219,239)',
  'rgb(158,202,225)',
  'rgb(107,174,214)',
  'rgb(66,146,198)',
  'rgb(33,113,181)',
  'rgb(8,81,156)',
  'rgb(8,48,107)',
  'rgb(3,19,43)',
  'rgb(0,0,0)'
]

document.addEventListener('DOMContentLoaded', function (event) {
  // sizes
  const margin = { top: 0, right: 0, bottom: 0, left: 0 }
  const width = 960 - margin.left - margin.right
  const height = 500 - margin.top - margin.bottom

  // svg setup
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  // projection setup
  const projection = d3.geoRobinson()
    .scale(148)
    .rotate([352, 0, 0])
    .translate([width / 2, height / 2])
  const path = d3.geoPath().projection(projection)

  // tooltips setup
  const tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(d => `<strong>Country: </strong><span class='details'>${d.properties.name}<br></span><strong>Confirmed cases: </strong><span class='details'>${d.case}</span>`)
  svg.call(tip)

  // load datas before init
  Promise.all([
    d3.json('./data/world_countries.json'),
    d3.json('./data/covid_info.json'),
    d3.json('./data/country_code3.json')
  ]).then((res) => {
    // world data for map drawing
    const world = res[0]
    world.features = world.features.filter(v => v.id !== 'ATA')
    // covid19 data
    const data = res[1].data
      .map(v => {
        v.id = res[2][v.countrycode]
        v.cases = parseInt(v.cases)
        return v
      })

    const color = d3.scaleThreshold()
      .domain([100, 1000, 3000, 8000, 20000, 50000, 100000,200000])
      .range(colors)

    // map
    const dates = data
      .map(v => v.date)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort((a, b) => new Date(a) - new Date(b))
    let selectedDate = dates[dates.length - 1]

    function redraw () {
      svg.selectAll('g.countries').remove()

      const dataByName = {}
      const dataByDate = data.filter(v => v.date === selectedDate)
      dataByDate.forEach(v => { dataByName[v.id] = v.cases })
      world.features.forEach(d => {d.case = typeof dataByName[d.id] === 'number' ? dataByName[d.id] : 0})

      svg
        .append('g')
        .attr('class', 'countries')
        .selectAll('path')
        .data(world.features)
        .enter()
        .append('path')
        .attr('d', path)
        .style('fill', d => dataByName[d.id] ? color(dataByName[d.id]) : colors[0])
        .style('stroke', 'white')
        .style('opacity', 0.8)
        .style('stroke-width', 0.3)
        .on('mouseover', function (d) {
          tip.show(d, this)
          d3.select(this)
            .style('opacity', 1)
            .style('stroke-width', 3)
        })
        .on('mouseout', function (d) {
          tip.hide(d)
          d3.select(this, this)
            .style('opacity', 0.8)
            .style('stroke-width', 0.3)
        })
    }

    redraw()

    document.getElementById('date').textContent = dates[dates.length - 1]
    let tickIndex = 0
    const slider = d3
      .sliderRight()
      .max(dates.length - 1)
      .tickValues(Array.from(dates.keys()))
      .step(1)
      .height(400)
      .tickFormat(d => ++tickIndex % 10 === 0 ? dates[d] : null)
      .displayFormat(d => dates[d])
      .default(dates.length - 1)
      .on('onchange', d => {
        selectedDate = dates[d]
        document.getElementById('date').textContent = dates[d]
        redraw()
      })

    svg
      .append('g')
      .attr('transform', 'translate(30,30)')
      .call(slider)

    const legend = svg.append('g')
      .attr('class', 'legendQuant')
      .attr('transform', 'translate(180,450)')

    legend.call(d3.legendColor()
      .orient('horizontal')
      .shapeWidth(80)
      .labelFormat(d3.format('i'))
      .labels(d3.legendHelpers.thresholdLabels)
      .scale(color))
  })
})
