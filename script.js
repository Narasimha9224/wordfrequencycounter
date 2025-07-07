// DOM Elements
const textInput = document.getElementById('text-input');
const analyzeBtn = document.getElementById('analyze-btn');
const clearBtn = document.getElementById('clear-btn');
const sampleBtn = document.getElementById('sample-btn');
const removeStopwords = document.getElementById('remove-stopwords');
const caseSensitive = document.getElementById('case-sensitive');
const loadingSpinner = document.getElementById('loading');
const resultsContainer = document.getElementById('results-container');
const totalWordsEl = document.getElementById('total-words');
const uniqueWordsEl = document.getElementById('unique-words');
const tableBody = document.getElementById('table-body');
const tableSearch = document.getElementById('table-search');
const barLimit = document.getElementById('bar-limit');
const barChart = document.getElementById('bar-chart');
const wordCloud = document.getElementById('word-cloud');
const exportCsvBtn = document.getElementById('export-csv');
const exportJsonBtn = document.getElementById('export-json');

// Global variables
let currentResults = null;
let currentView = 'table';

// Tab switching
document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        const view = tab.dataset.view;
        
        // Update active tab
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Hide all views and show selected
        document.querySelectorAll('.view-container').forEach(v => v.classList.add('hidden'));
        document.getElementById(`${view}-view`).classList.remove('hidden');
        
        currentView = view;
        
        // Render the appropriate visualization
        if (currentResults) {
            if (view === 'bar') renderBarChart();
            if (view === 'cloud') renderWordCloud();
        }
    });
});

// Event Listeners
analyzeBtn.addEventListener('click', analyzeText);
clearBtn.addEventListener('click', clearAll);
sampleBtn.addEventListener('click', loadSampleText);
tableSearch.addEventListener('input', filterTable);
barLimit.addEventListener('change', renderBarChart);
exportCsvBtn.addEventListener('click', exportCSV);
exportJsonBtn.addEventListener('click', exportJSON);

// Functions
async function analyzeText() {
    const text = textInput.value.trim();
    
    if (!text) {
        alert('Please enter some text to analyze');
        return;
    }
    
    // Show loading spinner
    loadingSpinner.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    
    try {
        const response = await fetch('http://127.0.0.1:5000/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                removeStopwords: removeStopwords.checked,
                caseSensitive: caseSensitive.checked
            })
        });
        
        if (!response.ok) {
            throw new Error('Server error');
        }
        
        const data = await response.json();
        currentResults = data;
        
        // Update UI with results
        totalWordsEl.textContent = data.wordCount.toLocaleString();
        uniqueWordsEl.textContent = data.uniqueWords.toLocaleString();
        
        renderTable(data.frequencies);
        renderBarChart();
        renderWordCloud();
        
        // Hide loading spinner and show results
        loadingSpinner.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while analyzing the text. Please try again.');
        loadingSpinner.classList.add('hidden');
    }
}

function renderTable(frequencies) {
    tableBody.innerHTML = '';
    
    frequencies.forEach((item, index) => {
        const row = document.createElement('tr');
        const percentValue = ((item.count / currentResults.wordCount) * 100).toFixed(2);
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${item.word}</td>
            <td>${item.count.toLocaleString()}</td>
            <td>${percentValue}%</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function filterTable() {
    const searchTerm = tableSearch.value.toLowerCase();
    
    Array.from(tableBody.getElementsByTagName('tr')).forEach(row => {
        const wordCell = row.getElementsByTagName('td')[1];
        const word = wordCell.textContent.toLowerCase();
        
        if (word.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function renderBarChart() {
    if (!currentResults) return;
    
    barChart.innerHTML = '';
    const limit = parseInt(barLimit.value);
    const data = currentResults.frequencies.slice(0, limit);
    
    // Set up SVG dimensions
    const margin = { top: 20, right: 20, bottom: 60, left: 80 };
    const width = barChart.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Create SVG
    const svg = d3.select('#bar-chart')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const x = d3.scaleBand()
        .domain(data.map(d => d.word))
        .range([0, width])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.count)])
        .nice()
        .range([height, 0]);
    
    // Create bars
    svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.word))
        .attr('y', d => y(d.count))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d.count))
        .on('mouseover', function(event, d) {
            d3.select(this).attr('fill', '#4fc3f7');
            
            svg.append('text')
                .attr('class', 'tooltip')
                .attr('x', x(d.word) + x.bandwidth() / 2)
                .attr('y', y(d.count) - 10)
                .attr('text-anchor', 'middle')
                .text(`${d.count}`);
        })
        .on('mouseout', function() {
            d3.select(this).attr('fill', '#4a6fa5');
            svg.selectAll('.tooltip').remove();
        });
    
    // Add x-axis
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em');
    
    // Add y-axis
    svg.append('g')
        .call(d3.axisLeft(y));
    
    // Add labels
    svg.append('text')
        .attr('transform', `translate(${width / 2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text('Words');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Frequency');
}

function renderWordCloud() {
    if (!currentResults) return;
    
    wordCloud.innerHTML = '';
    
    // Word cloud implementation using D3
    const width = wordCloud.clientWidth;
    const height = 400;
    
    // Simplified word cloud implementation
    const svg = d3.select('#word-cloud')
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2}, ${height / 2})`);
    
    // Prepare data for word cloud
    const words = currentResults.frequencies.slice(0, 50).map(d => ({
        text: d.word,
        size: 10 + (d.count / currentResults.frequencies[0].count) * 40
    }));
    
    // Simple layout algorithm for placing words
    let placedWords = [];
    let angleIndex = 0;
    const angles = [0, 45, -45, 90, -90];
    const radiusStep = 10;
    
    words.forEach((word, i) => {
        let placed = false;
        let radius = 0;
        let x = 0;
        let y = 0;
        let angle = angles[angleIndex % angles.length];
        
        // Try to place word without overlapping
        while (!placed && radius < 200) {
            radius += radiusStep;
            const radians = (Math.PI / 180) * angle;
            x = radius * Math.cos(radians);
            y = radius * Math.sin(radians);
            
            // Check if this position overlaps with any placed word
            let overlaps = false;
            for (let j = 0; j < placedWords.length; j++) {
                const pw = placedWords[j];
                const dx = pw.x - x;
                const dy = pw.y - y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < (word.size + pw.size) / 2) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps) {
                placed = true;
                placedWords.push({ x, y, size: word.size });
            }
            
            // Change angle if we can't place at current angle
            if (!placed && radius % (5 * radiusStep) === 0) {
                angleIndex++;
                angle = angles[angleIndex % angles.length];
            }
        }
        
        // Color scale for words
        const color = d3.scaleOrdinal(d3.schemeCategory10);
        
        // Add word to SVG
        if (placed) {
            svg.append('text')
                .attr('x', x)
                .attr('y', y)
                .attr('text-anchor', 'middle')
                .attr('transform', `rotate(${angle}, ${x}, ${y})`)
                .style('font-size', `${word.size}px`)
                .style('fill', color(i % 10))
                .text(word.text)
                .on('mouseover', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('font-size', `${word.size * 1.2}px`)
                        .style('font-weight', 'bold');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .style('font-size', `${word.size}px`)
                        .style('font-weight', 'normal');
                });
        }
    });
}

function loadSampleText() {
    textInput.value = `Natural Language Processing (NLP) is a subfield of linguistics, computer science, and artificial intelligence concerned with the interactions between computers and human language, in particular how to program computers to process and analyze large amounts of natural language data.

The challenges in NLP involve speech recognition, natural language understanding, and natural language generation. Many different classes of machine learning algorithms have been applied to natural language processing tasks. These algorithms take as input a large set of features that are generated from the input data.

Modern NLP algorithms are based on machine learning, especially statistical machine learning. The machine learning paradigm calls instead for using statistical inference to automatically learn such rules through the analysis of large corpora of typical real-world examples.

Many different classes of machine learning algorithms have been applied to natural language processing tasks. These algorithms take as input a large set of features that are generated from the input data. Some of the earliest-used algorithms, such as decision trees, produced systems of hard if-then rules similar to existing hand-written rules. Increasingly, however, research has focused on statistical models, which make soft, probabilistic decisions based on attaching real-valued weights to each input feature. Such models have the advantage that they can express the relative certainty of many different possible answers rather than only one, producing more reliable results when such a model is included as a component of a larger system.`;
}

function clearAll() {
    textInput.value = '';
    resultsContainer.classList.add('hidden');
    currentResults = null;
}

function exportCSV() {
    if (!currentResults) return;
    
    let csvContent = 'Rank,Word,Count,Percentage\n';
    
    currentResults.frequencies.forEach((item, index) => {
        const percentage = ((item.count / currentResults.wordCount) * 100).toFixed(2);
        csvContent += `${index + 1},"${item.word}",${item.count},${percentage}\n`;
    });
    
    downloadFile(csvContent, 'word-frequency.csv', 'text/csv');
}

function exportJSON() {
    if (!currentResults) return;
    
    const jsonContent = JSON.stringify(currentResults, null, 2);
    downloadFile(jsonContent, 'word-frequency.json', 'application/json');
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}