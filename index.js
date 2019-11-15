const fs = require('fs')
const lineByLine = require('n-readlines')
const timeseries = require("timeseries-analysis")

/**
 * Data types
 * 
 * @typedef {Object} ClassHistogram
 * @property {number} count
 * @property {number} bytes
 * 
 * @typedef {Object.<string, ClassHistogram>} Histogram
 * 
 * @typedef {Object} FlattenHistogram
 * @property {string[]} times
 * @property {Object.<string, ClassHistogram>} classes
 * 
 * @typedef {Object} HeapInfo
 * @property {string} time
 * @property {string} percentage
 */

/**
 * Reads histograms from input file.
 * @param {string} file  name of histograms file
 * @returns {Histogram[]}
 */
function readHistograms(file) {
    const contents = []
    let content = null

    const reader = new lineByLine(file)
    let line
    while (line = reader.next()) {
        const sLine = line.toString("ascii").trim().replace()
        if (sLine.length == 0) continue

        if (sLine.startsWith('***')) {
            if (content && Object.keys(content).length > 1) {
                contents.push(content)
            }
            content = {}
            const timestamp = sLine.replace(/\*\*\*/g, ' ').trim()
            content['__ts__'] = timestamp
            continue
        }

        const splitted = sLine.split(/\s+/)
        if (splitted.length != 4) continue

        const count = parseInt(splitted[1])
        const bytes = parseInt(splitted[2])
        const name = splitted[3]
        
        content[name] = {
            count: count,
            bytes: bytes
        }
    }

    if (content && Object.keys(content).length > 1) {
        contents.push(content)
    }

    console.log(contents.length, 'histograms read')
    return contents
}

/**
 * Collect unique class names from array of histograms
 * @param {Histogram[]} histograms 
 * @returns {string[]}
 */
function collectUniqueClassNames(histograms) {
    const classNames = {}
    for (let i in histograms) {
        const histo = histograms[i]
        for (let c in histo) {
            classNames[c] = true
        }
    }
    return Object.keys(classNames)
}

/**
 * Convert flatten view of histograms.
 * @param {Histogram[]} histograms 
 * @returns {FlattenHistogram}
 */
function toArrays(histograms) {
    const output = {times: [], classes: {}}

    // collect time points
    for (let i in histograms) {
        const ts = histograms[i]['__ts__']
        output.times.push(ts)
    }

    collectUniqueClassNames(histograms).forEach(function(className) {
        if (className == '__ts__')
            return

        histograms.forEach(function(histo) {
            const inputEntry = histo[className] || {count: 0, bytes: 0}
            const outputEntry = output.classes[className] || {count: [], bytes: []}
    
            outputEntry.count.push(inputEntry.count)
            outputEntry.bytes.push(inputEntry.bytes)
    
            output.classes[className] = outputEntry
        })
    })

    return output
}

/**
 * Parse histograms to a form which is easily processed.
 * @param {string} file 
 * @returns {FlattenHistogram}
 */
function parseHistograms(file) {
    const histograms = readHistograms(file)
    return toArrays(histograms)
}

/**
 * Read heap usage information from file.
 * @param {string} file 
 * @returns {HeapInfo[]}
 */
function readHeaps(file) {
    const contents = []
    let content = null
    let inOldGenSection = false

    const reader = new lineByLine(file)
    let line
    while (line = reader.next()) {
        const sLine = line.toString("ascii").trim().replace()
        if (sLine.length == 0) continue

        if (sLine.startsWith('***')) {
            if (content && Object.keys(content).length > 1) {
                contents.push(content)
            }
            content = {}
            inOldGenSection = false
            const timestamp = sLine.replace(/\*\*\*/g, ' ').trim()
            content['time'] = timestamp
            continue
        }

        if (sLine.startsWith('concurrent mark-sweep generation:')) {
            inOldGenSection = true
            continue
        }

        const splitted = sLine.split(/\s+/)
        if (splitted.length != 2) continue
        if (!inOldGenSection || !splitted[0].endsWith('%') || splitted[1] != "used") continue

        content['percentage'] = splitted[0]
        inOldGenSection = false
    }

    if (content && Object.keys(content).length > 1) {
        contents.push(content)
    }

    return contents
}

/**
 * Gather old generation heap space information and store in CSV-like format.
 * @param {string} inFile 
 * @param {string} outFile 
 */
function getHeaps(inFile, outFile) {
    const heaps = readHeaps(inFile)
    console.log(heaps.length,"heaps read, ranging from",heaps[0].time,'to',heaps[heaps.length - 1].time)
    
    const writer = fs.createWriteStream(outFile)
    
    for (let i in heaps) {
        const heap = heaps[i]
        writer.write(heap.time)
        writer.write('\t')
        writer.write(heap.percentage)
        writer.write('\n')
    }
    
    writer.end()
}

/**
 * Analyze histograms.
 * @param {FlattenHistogram} histograms 
 * @param {string} outFile 
 * @param {string} title 
 */
function analyzeHistograms(histograms, outFile, title) {
    const writer = fs.createWriteStream(outFile)
    writer.write('<html><head>\n')
    writer.write('<title>' + title + '</title>\n')
    writer.write('<style>')
    writer.write('* {box-sizing: border-box;}\n')
    writer.write('.column {float: left; width: 50%;}\n')
    writer.write('.row:after {content: ""; display: table; clear: both; padding: 10px;}\n')
    writer.write('</style></head>\n<body>\n')
    let filteredOut = 0
    for (className in histograms.classes) {
        const histogram = histograms.classes[className]

        const tc = new timeseries.main(timeseries.adapter.fromArray(histogram.count))
        const tb = new timeseries.main(timeseries.adapter.fromArray(histogram.bytes))

        if (tc.stdev() > 0) {
            writer.write('<div class="row">\n')
            writer.write('<h4>' + className + '</h4>' + '\n')
            writer.write('<div class="column"><h5>bytes</h5><image src="' + tb.chart() + '"></image></div>\n')
            writer.write('<div class="column"><h5>count</h5><image src="' + tc.chart() + '"></image></div>\n')
            writer.write('</div>')
            writer.write('<hr/>\n')
        } else {
            ++filteredOut
        }
    }
    console.log('dropped',filteredOut,"of total",Object.keys(histograms.classes).length)
    writer.write('</body></html>')
    writer.end()
}

if (process.argv.length >= 2 + 2) {
    const server = process.argv[2]
    const pid = process.argv[3]

    const base = './histo'
    if (!fs.existsSync(base)) {
        fs.mkdirSync(base)
    }

    const dir = base + '/' + server
    const heapInFile = dir + '/my-heap-' + pid + '.log'
    const heapOutFile = dir + '/heap-' + pid + '.log'
    getHeaps(heapInFile, heapOutFile)

    const histoIn = dir + '/my-histo-' + pid + '.log'
    const histoOut = dir + '/histo-' + pid + '.html'
    analyzeHistograms(parseHistograms(histoIn), histoOut, "memory usage of " + server + '-' + pid)
}
