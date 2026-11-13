// Black hat: the same data, drawn to mislead. The buttons under it undo one trick at a time.
// Comments that start with "Black hat:" mark the choices made to mislead.

const blackSvgWidth = 430
const blackMargin = { top: 16, bottom: 44 };
const blackHeight = 290 - blackMargin.top - blackMargin.bottom;

const navy = '#1d3f66'
// Black hat: the substantiated share is the same pale gray as an empty track, so it reads as nothing there
const trackColor = '#e6e9ee'

// 0: as published. Each later step keeps the fixes before it.
// 1: name the outcomes. 2: yearly counts. 3: axis from zero. 4: every year.
let step = 0

// ---------- Left chart: share of allegations by type ----------

const barLeft = 150
const barWidth = blackSvgWidth - barLeft - 14
const blackBarHeight = 24
const blackRowHeight = blackHeight / 4 // four types

// Black hat: the two outcomes that are not "substantiated" are drawn first, so one color joins them into one bar
const mergedOrder = ['Unsubstantiated', 'Exonerated', 'Substantiated']

const barSvg = d3.select('#blackBars')
    .append('svg')
    .attr('viewBox', `0 0 ${blackSvgWidth} ${blackHeight + blackMargin.top + blackMargin.bottom}`)
    .append('g')
    .attr('transform', `translate(${barLeft},${blackMargin.top})`);

const barX = d3.scaleLinear()
    .domain([0, 1])
    .range([0, barWidth]);

let blackRows = [] // outcome counts for each type

function notSubstantiated(counts){
    return 1 - counts.Substantiated / counts.total
}

function drawBlackBars(){
    blackRows = types.map(type => countOutcomes(type, allData.filter(d => d.type === type)))
    // Black hat: sorted so the most favorable type, force, is read first
    blackRows.sort((a, b) => notSubstantiated(b) - notSubstantiated(a))

    const xAxis = d3.axisBottom(barX)
        .ticks(4)
        .tickFormat(formatPercent)

    barSvg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${blackHeight})`)
        .call(xAxis);

    barSvg.append('text')
        .attr('x', barWidth / 2)
        .attr('y', blackHeight + blackMargin.bottom - 6)
        .attr('text-anchor', 'middle')
        .attr('class', 'labels')
        .attr('id', 'barAxisLabel')

    let rowGroups = barSvg.selectAll('.barRow')
        .data(blackRows)
        .enter()
        .append('g')
        .attr('class', 'barRow')
        .attr('transform', (d, i) => `translate(0,${i * blackRowHeight})`)

    rowGroups.append('text')
        .attr('x', -10)
        .attr('y', blackRowHeight / 2 + 5)
        .attr('text-anchor', 'end')
        .text(d => typeLabels[d.key])
        .attr('class', 'rowLabel')

    rowGroups.selectAll('.blackSegment')
        .data(d => stackSegments(d, true, mergedOrder))
        .enter()
        .append('rect')
        .attr('class', 'blackSegment')
        .attr('x', d => barX(d.start))
        .attr('y', (blackRowHeight - blackBarHeight) / 2)
        .attr('height', blackBarHeight)
        .on('mouseover', function (event, d) {
            showTooltip(event, blackBarTooltip(d))
        })
        .on('mouseout', hideTooltip)

    // Shares of the three outcomes, hidden until the outcomes are named
    rowGroups.selectAll('.blackSegmentLabel')
        .data(d => stackSegments(d, true, mergedOrder).filter(s => barX(s.share) >= 32))
        .enter()
        .append('text')
        .attr('class', 'segmentLabel blackSegmentLabel')
        .attr('x', d => barX(d.start) + 4)
        .attr('y', blackRowHeight / 2 + 5)
        .style('fill', d => labelColor(d.outcome))
        .text(d => formatPercent(d.share))

    // The one number the published chart prints: the merged share
    rowGroups.append('text')
        .attr('class', 'segmentLabel mergedLabel')
        .attr('x', d => barX(notSubstantiated(d)) - 8)
        .attr('y', blackRowHeight / 2 + 5)
        .attr('text-anchor', 'end')
        .style('fill', 'white')
        .text(d => formatPercent(notSubstantiated(d)))
}

function blackBarTooltip(d){
    if (step >= 1) {
        return segmentTooltip(typeLabels[d.key], d)
    }
    // As published, the tooltip reports the merged share, like the bar does
    let row = blackRows.filter(r => r.key === d.key)[0]
    return `<strong>${typeLabels[d.key]}</strong><br/>
        Not substantiated: ${formatPercent(notSubstantiated(row))} of ${formatCount(row.total)} allegations`
}

function updateBlackBars(){
    let named = step >= 1

    barSvg.selectAll('.blackSegment')
        .transition().duration(t)
        // Black hat: the merged halves overlap by 1px so no seam shows where one outcome ends
        .attr('width', d => Math.max(0, barX(d.share) + (named ? -2 : 1)))
        .style('fill', d => {
            if (named) {
                return colorScale(d.outcome)
            }
            if (d.outcome === 'Substantiated') {
                return trackColor
            }
            return navy
        })

    barSvg.selectAll('.blackSegmentLabel')
        .transition().duration(t)
        .style('opacity', named ? 1 : 0)

    barSvg.selectAll('.mergedLabel')
        .transition().duration(t)
        .style('opacity', named ? 0 : 1)

    d3.select('#barAxisLabel')
        .text(named ? 'Share of allegations' : 'Share of allegations not substantiated')
    d3.select('#barTitle')
        .text(named ? 'How the board ruled, by type of allegation' : 'Allegations not substantiated, by type')
    d3.select('#blackLegend').classed('d-none', !named)
    d3.select('#notSubstantiatedTile').classed('debunked', named)
}

// ---------- Right chart: complaints by year ----------

// Black hat: the window opens on the year with the most complaints in the data
const windowStart = 2009

const lineLeft = 52
const lineWidth = blackSvgWidth - lineLeft - 28

const lineSvg = d3.select('#blackLine')
    .append('svg')
    .attr('viewBox', `0 0 ${blackSvgWidth} ${blackHeight + blackMargin.top + blackMargin.bottom}`)
    .append('g')
    .attr('transform', `translate(${lineLeft},${blackMargin.top})`);

let complaints = [] // one { year, count, average } per year
let lineX, lineY
let lastPointCount = 0

function setupBlackLine(){
    d3.range(firstYear, lastYear + 1).forEach(year => {
        // One complaint holds several allegations, so count each complaint id once
        let ids = new Set(allData.filter(d => d.year === year).map(d => d.complaint))
        complaints.push({ year: year, count: ids.size })
    })

    // Black hat: a 3-year average spreads the unfinished 2019 count over three points,
    // so one incomplete year looks like a steady decline
    complaints.forEach((d, i) => {
        let lastThree = complaints.slice(Math.max(0, i - 2), i + 1)
        d.average = d3.mean(lastThree, c => c.count)
    })

    lineSvg.append('g').attr('class', 'axis grid').attr('id', 'lineYAxis')
    lineSvg.append('g').attr('class', 'axis').attr('id', 'lineXAxis')
        .attr('transform', `translate(0,${blackHeight})`)

    lineSvg.append('text')
        .attr('x', lineWidth / 2)
        .attr('y', blackHeight + blackMargin.bottom - 6)
        .attr('text-anchor', 'middle')
        .text('Year received')
        .attr('class', 'labels')

    lineSvg.append('path').attr('class', 'trendLine')
    lineSvg.append('text').attr('class', 'callout').attr('text-anchor', 'end')
}

// The value plotted for one year: the 3-year average as published, the real count once that is undone
function lineValue(d){
    if (step >= 2) {
        return d.count
    }
    return d.average
}

// Builds the path string one point at a time, in order of year
function linePath(rows){
    let path = ''
    rows.forEach((d, i) => {
        if (i === 0) {
            path += `M ${lineX(d.year)},${lineY(lineValue(d))} `
        } else {
            path += `L ${lineX(d.year)},${lineY(lineValue(d))} `
        }
    })
    return path
}

function updateBlackLine(){
    let startYear = step >= 4 ? firstYear : windowStart
    let rows = complaints.filter(d => d.year >= startYear)
    let last = rows[rows.length - 1]

    lineX = d3.scaleLinear()
        .domain([startYear, lastYear])
        .range([0, lineWidth]);

    // Black hat: the axis is fitted to the data, rounded to the nearest 50, instead of starting at zero.
    // Many chart tools do this by default, and it makes a small change fill the whole height.
    let lowest = Math.floor(d3.min(rows, d => lineValue(d)) / 50) * 50
    let highest = Math.ceil(d3.max(rows, d => lineValue(d)) / 50) * 50
    lineY = d3.scaleLinear()
        .domain([step >= 3 ? 0 : lowest, highest])
        .range([blackHeight, 0]);

    const xAxis = d3.axisBottom(lineX)
        .tickValues(step >= 4 ? d3.range(firstYear, lastYear, 5) : d3.range(windowStart, lastYear + 1, 2))
        .tickFormat(d3.format('d')) // 2,009 -> 2009
    const yAxis = d3.axisLeft(lineY)
        .ticks(4)
        .tickSize(-lineWidth) // stretch the ticks across the chart as gridlines

    d3.select('#lineXAxis').transition().duration(t).call(xAxis);
    d3.select('#lineYAxis').transition().duration(t).call(yAxis);

    // A path can only animate between shapes with the same number of points
    let line = lineSvg.select('.trendLine')
    if (rows.length === lastPointCount) {
        line = line.transition().duration(t)
    }
    line.attr('d', linePath(rows))
    lastPointCount = rows.length

    lineSvg.selectAll('.trendPoint')
        .data(rows, d => d.year)
        .join(
            // Enter: new points start at their place with no size
            function (enter) {
                return enter
                    .append('circle')
                    .attr('class', 'trendPoint')
                    .attr('cx', d => lineX(d.year))
                    .attr('cy', d => lineY(lineValue(d)))
                    .attr('r', 0)
                    .on('mouseover', function (event, d) {
                        let note = step >= 2 ? '' : ' (3-year average)'
                        showTooltip(event, `<strong>${d.year}</strong><br/>
                            ${formatCount(Math.round(lineValue(d)))} complaints${note}`)
                    })
                    .on('mouseout', hideTooltip)
            },
            function (update) {
                return update
            },
            function (exit) {
                exit.remove()
            }
        )
        // New and existing points both move to their place for this step
        .transition().duration(t)
        .attr('cx', d => lineX(d.year))
        .attr('cy', d => lineY(lineValue(d)))
        .attr('r', step >= 4 ? 3 : 4)
        // A hollow point marks 2019 as incomplete once every year is shown
        .style('fill', d => step >= 4 && d.year === lastYear ? 'white' : navy)
        .style('stroke', d => step >= 4 && d.year === lastYear ? navy : 'white')

    // The headline number always compares the 3-year averages of 2009 and 2019, as published
    let windowFirst = complaints.filter(d => d.year === windowStart)[0]
    let decline = formatPercent(1 - last.average / windowFirst.average)
    let callout = ''
    if (step <= 1) {
        callout = `▼ ${decline} since ${windowStart}`
    } else if (step >= 4) {
        callout = `${lastYear} is incomplete`
    }
    lineSvg.select('.callout')
        .text(callout)
        .attr('x', lineX(last.year) - 12)
        .attr('y', lineY(lineValue(last)) + (step >= 4 ? 5 : -12))

    let title = 'Complaints against NYPD officers, 3-year average'
    if (step >= 4) {
        title = 'Complaints in this data, by year received'
    } else if (step >= 2) {
        title = 'Complaints against NYPD officers, by year'
    }
    d3.select('#lineTitle').text(title)
    d3.select('#declineValue').text(decline)
    d3.select('#declineTile').classed('debunked', step >= 2)
}

// ---------- Stepper ----------

function selectStep(newStep){
    step = newStep
    markActiveButton('.stepButton', 'data-step', step)
    // Show only the caption written for this step
    d3.selectAll('.stepCaption').classed('d-none', function() {
        return +d3.select(this).attr('data-step') !== step
    })
    updateBlackBars()
    updateBlackLine()
}

function setupBlackHat(){
    d3.select('#notSubstantiatedValue')
        .text(formatPercent(notSubstantiated(countOutcomes('All', allData))))

    drawBlackBars()
    setupBlackLine()
    selectStep(0)

    d3.selectAll('.stepButton')
        .on('click', function (event) {
            selectStep(+d3.select(this).attr('data-step'))
        })
}
