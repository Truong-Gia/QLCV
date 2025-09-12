export function stringToColor(str) {
    if (!str) return '#e0e7ff';
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        color += ('00' + (value & 0xCF | 0x30)).toString(16).substr(-2);
    }
    return color;
}

export function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 80%, 92%)`;
}


export const debounce = (func, timeout = 300) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
};

export function createChart(canvasId, type, labels, data, colors, chartInstances) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (chartInstances[canvasId]) { chartInstances[canvasId].destroy(); }

    chartInstances[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{ label: 'Số lượng', data: data, backgroundColor: colors, borderWidth: type === 'doughnut' ? 0 : 1 }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { 
                legend: { 
                    display: true, 
                    position: 'top' 
                },
                tooltip: { 
                    enabled: true
                }
            },
            cutout: type === 'doughnut' ? '70%' : '0%'
        }
    });
}
