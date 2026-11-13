// Shared by both charts: loads the data and holds the colors, the tooltip and the counting helpers.

let allData = []

const outcomes = ['Substantiated', 'Unsubstantiated', 'Exonerated']
// Orange and blue stay apart for color-blind readers.
// Gray marks unsubstantiated because it is the outcome where the board could not decide.
const colorScale = d3.scaleOrdinal(outcomes, ['#c2410c', '#a3a3a3', '#1d5fa8'])

const types = ['Abuse of Authority', 'Force', 'Discourtesy', 'Offensive Language']
const typeLabels = {
    'All': 'All allegations',
    'Abuse of Authority': 'Abuse of authority',
    'Force': 'Force',
    'Discourtesy': 'Discourtesy',
    'Offensive Language': 'Offensive language'
}

const firstYear = 1985
const lastYear = 2019 // 2020 only has 4 allegations, so the yearly charts stop at 2019

const formatCount = d3.format(',')    // 33358 -> 33,358
const formatPercent = d3.format('.0%') // 0.249 -> 25%

const t = 800; // 800ms transitions

function init(){
    d3.csv('./data/allegations.csv', d => ({
        // Besides converting the types, we also simplify the variable names here.
        complaint: d.complaint_id,
        officer: d.unique_mos_id,
        year: +d.year_received, // using + to convert to numbers
        type: d.fado_type,
        // The board uses 11 labels like "Substantiated (Charges)". Keeping the part before " (" leaves 3 outcomes.
        outcome: d.board_disposition.split(' (')[0]
    }))
    .then(data => {
            allData = data
            showTotals()
            setupWhiteHat()
            setupBlackHat()
        })
    .catch(error => console.error('Error loading data:', error));
}

// Fills in the totals quoted in the page text, so they always match the file
function showTotals(){
    // A Set keeps each id once, so its size is the number of different complaints or officers
    let complaints = new Set(allData.map(d => d.complaint))
    let officers = new Set(allData.map(d => d.officer))

    d3.selectAll('.totalAllegations').text(formatCount(allData.length))
    d3.selectAll('.totalComplaints').text(formatCount(complaints.size))
    d3.selectAll('.totalOfficers').text(formatCount(officers.size))
}

// Counts the allegations in rows by outcome, for example
// { key: 'Force', total: 7636, Substantiated: 974, Unsubstantiated: 3163, Exonerated: 3499 }
function countOutcomes(key, rows){
    let counts = { key: key, total: rows.length }
    outcomes.forEach(outcome => {
        counts[outcome] = rows.filter(d => d.outcome === outcome).length
    })
    return counts
}

// Turns one set of counts into stacked segments: each one starts where the one before it ended.
// useShare stacks shares of the total (0 to 1) instead of raw counts.
function stackSegments(counts, useShare, order){
    let start = 0
    let segments = []
    order.forEach(outcome => {
        let share = 0
        if (counts.total > 0) { // a filtered year can have no allegations
            share = counts[outcome] / counts.total
        }
        let size = useShare ? share : counts[outcome]
        segments.push({
            key: counts.key,
            outcome: outcome,
            count: counts[outcome],
            share: share,
            total: counts.total,
            start: start,
            end: start + size
        })
        start = start + size
    })
    return segments
}

// White text is readable on the orange and blue bars, black on the gray ones
function labelColor(outcome){
    if (outcome === 'Unsubstantiated') {
        return '#111'
    }
    return 'white'
}

function showTooltip(event, html){
    let left = event.pageX + 20
    // Flip to the left of the cursor near the right edge of the window
    if (left + 260 > window.innerWidth) {
        left = event.pageX - 260
    }

    d3.select('#tooltip')
        .style('display', 'block') // Make the tooltip visible
        .html(html)
        .style('left', left + 'px')
        .style('top', (event.pageY - 28) + 'px');
}

function hideTooltip(){
    d3.select('#tooltip')
        .style('display', 'none') // Hide tooltip when cursor leaves
}

// Tooltip text for one stacked segment
function segmentTooltip(title, d){
    return `<strong>${title}</strong><br/>
        ${d.outcome}: ${formatCount(d.count)} of ${formatCount(d.total)} allegations (${formatPercent(d.share)})`
}

// Fills in the button whose attribute matches value and outlines the others
function markActiveButton(selector, attribute, value){
    d3.selectAll(selector).each(function() {
        let active = d3.select(this).attr(attribute) === String(value)
        d3.select(this)
            .classed('btn-dark', active)
            .classed('btn-outline-dark', !active)
    })
}

window.addEventListener('load', init);
