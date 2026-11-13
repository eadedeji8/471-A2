// White hat: how the board ruled, by type of allegation (chart 1) and by year (chart 2).

const svgWidth = 860

let selectedType = 'All' // 'All' or one of the four types
let showShare = false    // false: bar height is a count. true: bar height is a share of that year.

// The most common allegations of each type, shown under the row labels
const typeExamples = {
    'All': 'the four types combined',
    'Abuse of Authority': 'stops, searches, threats of arrest',
    'Force': 'physical force, pointing a gun',
    'Discourtesy': 'rude words, actions or gestures',
    'Offensive Language': 'slurs about race, gender, ethnicity'
}

// ---------- Chart 1: outcome by type of allegation ----------

const typeMargin = { top: 30, right: 100, bottom: 50, left: 220 };
const typeWidth = svgWidth - typeMargin.left - typeMargin.right;
const rowHeight = 54
const barHeight = 28
const typeHeight = 5 * rowHeight // one row for all allegations and one for each type

const typeSvg = d3.select('#typeChart')
    .append('svg')
    .attr('viewBox', `0 0 ${svgWidth} ${typeHeight + typeMargin.top + typeMargin.bottom}`)
    .append('g')
    .attr('transform', `translate(${typeMargin.left},${typeMargin.top})`);

const typeX = d3.scaleLinear()
    .domain([0, 1])
    .range([0, typeWidth]);

function drawTypeChart(){
    let rows = types.map(type => countOutcomes(type, allData.filter(d => d.type === type)))
    // Sorted so the type with the largest substantiated share comes first
    rows.sort((a, b) => b.Substantiated / b.total - a.Substantiated / a.total)
    // The row for all allegations goes on top as the reference
    rows.unshift(countOutcomes('All', allData))

    const xAxis = d3.axisBottom(typeX)
        .ticks(4)
        .tickFormat(formatPercent)

    typeSvg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${typeHeight})`)
        .call(xAxis);

    typeSvg.append('text')
        .attr('x', typeWidth / 2)
        .attr('y', typeHeight + typeMargin.bottom - 8)
        .attr('text-anchor', 'middle')
        .text('Share of allegations')
        .attr('class', 'labels')

    // Column headers
    typeSvg.append('text')
        .attr('x', -typeMargin.left)
        .attr('y', -12)
        .text('Type of allegation')
        .attr('class', 'columnHeader')

    typeSvg.append('text')
        .attr('x', typeWidth + typeMargin.right)
        .attr('y', -12)
        .attr('text-anchor', 'end')
        .text('Allegations')
        .attr('class', 'columnHeader')

    // One group per row, moved down to its place
    let rowGroups = typeSvg.selectAll('.typeRow')
        .data(rows)
        .enter()
        .append('g')
        .attr('class', 'typeRow')
        .attr('transform', (d, i) => `translate(0,${i * rowHeight})`)

    rowGroups.append('text')
        .attr('x', -typeMargin.left)
        .attr('y', rowHeight / 2 - 3)
        .text(d => typeLabels[d.key])
        .attr('class', 'rowLabel')

    rowGroups.append('text')
        .attr('x', -typeMargin.left)
        .attr('y', rowHeight / 2 + 15)
        .text(d => typeExamples[d.key])
        .attr('class', 'rowExamples')

    rowGroups.append('text')
        .attr('x', typeWidth + typeMargin.right)
        .attr('y', rowHeight / 2 + 5)
        .attr('text-anchor', 'end')
        .text(d => formatCount(d.total))
        .attr('class', 'rowTotal')

    rowGroups.selectAll('.typeSegment')
        .data(d => stackSegments(d, true, outcomes))
        .enter()
        .append('rect')
        .attr('class', 'typeSegment')
        .attr('x', d => typeX(d.start))
        .attr('y', (rowHeight - barHeight) / 2)
        .attr('width', d => Math.max(0, typeX(d.share) - 2)) // 2px of white between segments
        .attr('height', barHeight)
        .style('fill', d => colorScale(d.outcome))
        .on('mouseover', function (event, d) {
            d3.select(this)
                .style('stroke', 'black')
                .style('stroke-width', '2px')
            showTooltip(event, segmentTooltip(typeLabels[d.key], d))
        })
        .on('mouseout', function (event, d) {
            d3.select(this).style('stroke', 'none') // Remove the highlight
            hideTooltip()
        })
        .on('click', function (event, d) {
            // Clicking the selected row again goes back to all types
            if (d.key === selectedType) {
                selectType('All')
            } else {
                selectType(d.key)
            }
        })

    // Print the share inside each segment that is wide enough to hold it
    rowGroups.selectAll('.segmentLabel')
        .data(d => stackSegments(d, true, outcomes).filter(s => typeX(s.share) >= 36))
        .enter()
        .append('text')
        .attr('class', 'segmentLabel')
        .attr('x', d => typeX(d.start) + 7)
        .attr('y', rowHeight / 2 + 5)
        .style('fill', d => labelColor(d.outcome))
        .text(d => formatPercent(d.share))
}

// Fades the rows that are not selected. The row for all allegations always stays.
function updateTypeRows(){
    typeSvg.selectAll('.typeRow')
        .transition().duration(t / 2)
        .style('opacity', d => {
            if (selectedType === 'All' || d.key === 'All' || d.key === selectedType) {
                return 1
            }
            return 0.35
        })
}

// ---------- Chart 2: allegations by year received ----------

const yearMargin = { top: 76, right: 16, bottom: 52, left: 76 };
const yearWidth = svgWidth - yearMargin.left - yearMargin.right;
const yearHeight = 440 - yearMargin.top - yearMargin.bottom;

const years = d3.range(firstYear, lastYear + 1) // [1985, 1986, ..., 2019]

const yearSvg = d3.select('#yearChart')
    .append('svg')
    .attr('viewBox', `0 0 ${svgWidth} ${yearHeight + yearMargin.top + yearMargin.bottom}`)
    .append('g')
    .attr('transform', `translate(${yearMargin.left},${yearMargin.top})`);

const yearX = d3.scaleBand()
    .domain(years)
    .range([0, yearWidth])
    .padding(0.2);

let yearY // set in updateYearChart because its domain depends on the controls

function setupYearChart(){
    const xAxis = d3.axisBottom(yearX)
        .tickValues(years.filter(year => year % 5 === 0)) // a label every 5 years

    yearSvg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${yearHeight})`)
        .call(xAxis);

    yearSvg.append('text')
        .attr('x', yearWidth / 2)
        .attr('y', yearHeight + yearMargin.bottom - 8)
        .attr('text-anchor', 'middle')
        .text('Year the complaint was received')
        .attr('class', 'labels')

    // The y-axis and its label change with the controls, so updateYearChart fills them in
    yearSvg.append('g')
        .attr('class', 'axis grid')
        .attr('id', 'yearYAxis')

    yearSvg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -yearHeight / 2)
        .attr('y', -yearMargin.left + 18)
        .attr('text-anchor', 'middle')
        .attr('class', 'labels')
        .attr('id', 'yearYLabel')

    addYearNote(firstYear, 2000, 'start', [
        '1985 to 2000: few records. Most officers from these',
        'years had left the force by June 2020, so they are not in the data.'
    ])
    addYearNote(lastYear, lastYear, 'end', [
        '2019 is incomplete: cases',
        'still open were not released.'
    ])
}

// Draws a bracket over a range of years with a note above it.
// Notes sit in the top margin so the bars never cover them.
function addYearNote(fromYear, toYear, anchor, lines){
    let left = yearX(fromYear)
    let right = yearX(toYear) + yearX.bandwidth()
    let bracketY = -14

    yearSvg.append('path')
        .attr('class', 'noteBracket')
        .attr('d', `M ${left},${bracketY + 6} L ${left},${bracketY} L ${right},${bracketY} L ${right},${bracketY + 6}`)

    lines.forEach((line, i) => {
        yearSvg.append('text')
            .attr('class', 'note')
            .attr('x', anchor === 'start' ? left : right)
            .attr('y', bracketY - 10 - (lines.length - 1 - i) * 17) // the last line sits just above the bracket
            .attr('text-anchor', anchor)
            .text(line)
    })
}

function updateYearChart(){
    let shownData = allData
    if (selectedType !== 'All') {
        shownData = allData.filter(d => d.type === selectedType)
    }

    let yearCounts = years.map(year => countOutcomes(year, shownData.filter(d => d.year === year)))

    // One flat list of segments: 3 for each year
    let segments = []
    yearCounts.forEach(counts => {
        stackSegments(counts, showShare, outcomes).forEach(segment => segments.push(segment))
    })

    // Bars start at zero because bar height is compared as a proportion
    yearY = d3.scaleLinear()
        .domain([0, showShare ? 1 : d3.max(yearCounts, d => d.total)])
        .range([yearHeight, 0]);

    const yAxis = d3.axisLeft(yearY)
        .ticks(5)
        .tickSize(-yearWidth) // stretch the ticks across the chart as gridlines
        .tickFormat(showShare ? formatPercent : formatCount)

    d3.select('#yearYAxis')
        .transition().duration(t)
        .call(yAxis);

    d3.select('#yearYLabel')
        .text(showShare ? "Share of that year's allegations" : 'Number of allegations')

    yearSvg.selectAll('.yearSegment')
        .data(segments, d => d.key + d.outcome)
        .join(
            // Enter: new segments grow up from the baseline
            function (enter) {
                return enter
                    .append('rect')
                    .attr('class', 'yearSegment')
                    .attr('x', d => yearX(d.key))
                    .attr('width', yearX.bandwidth())
                    .attr('y', yearHeight)
                    .attr('height', 0)
                    .style('fill', d => colorScale(d.outcome))
                    .style('opacity', d => segmentOpacity(d))
                    .on('mouseover', function (event, d) {
                        d3.select(this)
                            .style('stroke', 'black')
                            .style('stroke-width', '2px')
                        showTooltip(event, segmentTooltip(d.key, d))
                    })
                    .on('mouseout', function (event, d) {
                        d3.select(this).style('stroke', 'none') // Remove the highlight
                        hideTooltip()
                    })
                    .transition().duration(t)
                    .attr('y', d => yearY(d.end))
                    .attr('height', d => segmentHeight(d))
            },
            // Update: existing segments move to their new size
            function (update) {
                return update
                    .transition().duration(t)
                    .attr('y', d => yearY(d.end))
                    .attr('height', d => segmentHeight(d))
                    .style('opacity', d => segmentOpacity(d))
            },
            // Exit: never happens because every year always has its 3 segments
            function (exit) {
                exit.remove()
            }
        )

    let title = typeLabels[selectedType]
    if (selectedType !== 'All') {
        title = title + ' allegations'
    }
    d3.select('#yearTitle').text(title)
}

// Leaves 1px of white between the segments of one bar
function segmentHeight(d){
    return Math.max(0, yearY(d.start) - yearY(d.end) - 1)
}

// Fades the bars a reader should trust less: 2019 is incomplete,
// and in the share view a year with under 100 allegations swings on a few cases
function segmentOpacity(d){
    if (d.key === lastYear || (showShare && d.total < 100)) {
        return 0.4
    }
    return 1
}

// ---------- Controls ----------

function selectType(type){
    selectedType = type
    markActiveButton('.typeButton', 'data-type', selectedType)
    updateTypeRows()
    updateYearChart()
}

function setupWhiteHat(){
    drawTypeChart()
    setupYearChart()
    updateYearChart()

    d3.selectAll('.typeButton')
        .on('click', function (event) {
            selectType(d3.select(this).attr('data-type'))
        })

    d3.selectAll('.modeButton')
        .on('click', function (event) {
            let mode = d3.select(this).attr('data-mode')
            showShare = mode === 'share'
            markActiveButton('.modeButton', 'data-mode', mode)
            updateYearChart()
        })
}
