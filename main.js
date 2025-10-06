// Configuration
const RPI_BASE_URL = 'https://relativistic-kacie-puffingly.ngrok-free.dev'; // Your ngrok URL
const INFURA_URL = 'https://sepolia.infura.io/v3/8742554fd5c94c549cb8b4117b076e7a';
const CONTRACT_ADDRESS = '0x279FcACc1eB244BBD7Be138D34F3f562Da179dd5';
const CONTRACT_ABI = [
    {"inputs": [{"internalType": "string", "name": "_folder", "type": "string"}, {"internalType": "uint256", "name": "_frameIdx", "type": "uint256"}, {"internalType": "string", "name": "_error", "type": "string"}], "name": "logAnomaly", "outputs": [], "stateMutability": "nonpayable", "type": "function"},
    {"inputs": [], "stateMutability": "nonpayable", "type": "constructor"},
    {"inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "name": "anomalies", "outputs": [{"internalType": "string", "name": "folder", "type": "string"}, {"internalType": "uint256", "name": "frameIdx", "type": "uint256"}, {"internalType": "string", "name": "error", "type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}], "name": "getAnomaly", "outputs": [{"internalType": "string", "name": "", "type": "string"}, {"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "string", "name": "", "type": "string"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "getAnomalyCount", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
    {"inputs": [], "name": "owner", "outputs": [{"internalType": "address", "name": "", "type": "address"}], "stateMutability": "view", "type": "function"}
];
const POLL_INTERVAL = 30000; // 30 seconds

// Initialize Web3 for blockchain queries
let web3;
let contract;
async function initWeb3() {
    web3 = new Web3(INFURA_URL);
    contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
    return await web3.eth.getChainId() === 11155111; // Sepolia chain ID
}

// Anomaly Log Functions
async function fetchAnomalies() {
    const loading = document.getElementById('anomalyLoading');
    const list = document.getElementById('anomalyList');
    const error = document.getElementById('anomalyError');
    const noAnomalies = document.getElementById('noAnomalies');
    const errorMsg = document.getElementById('anomalyErrorMsg');

    loading.classList.remove('d-none');
    list.innerHTML = '';
    error.classList.add('d-none');
    noAnomalies.classList.add('d-none');

    try {
        const response = await fetch(`${RPI_BASE_URL}/api/rpi/history`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');

        if (data.history.length === 0) {
            noAnomalies.classList.remove('d-none');
            return;
        }

        data.history.forEach((item) => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="card anomaly-card h-100">
                    <img src="${RPI_BASE_URL}/api/rpi/image/${encodeURIComponent(item.filename || item.frame_path.split('/').pop())}" 
                         class="card-img-top" alt="Anomaly Frame" loading="lazy" 
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="card-body">
                        <h6 class="card-subtitle mb-2 text-muted">${item.timestamp}</h6>
                        <p class="card-text">
                            <strong>Score:</strong> <span class="badge ${item.status === 'ANOMALY' ? 'bg-danger' : 'bg-success'}">${item.score}</span><br>
                            <strong>Status:</strong> ${item.status}<br>
                            <strong>Hash:</strong> ${item.frame_hash.substring(0, 16)}...
                        </p>
                    </div>
                </div>
            `;
            list.appendChild(col);
        });
    } catch (err) {
        errorMsg.textContent = `Failed to fetch anomalies: ${err.message}`;
        error.classList.remove('d-none');
    } finally {
        loading.classList.add('d-none');
    }
}

// Live Video Feed Functions
function setupLiveFeed() {
    const video = document.getElementById('liveVideo');
    const loading = document.getElementById('videoLoading');
    const error = document.getElementById('videoError');
    const errorMsg = document.getElementById('videoErrorMsg');

    video.src = `${RPI_BASE_URL}/video_feed`;
    video.onload = () => {
        loading.classList.add('d-none');
        video.style.display = 'block';
    };
    video.onerror = () => {
        loading.classList.add('d-none');
        errorMsg.textContent = `Stream failed: Check RPi/ngrok at ${RPI_BASE_URL}`;
        error.classList.remove('d-none');
    };
}

// Blockchain Logs Functions
async function fetchBlockchainLogs() {
    const loading = document.getElementById('blockchainLoading');
    const list = document.getElementById('blockchainList');
    const countEl = document.getElementById('blockchainCount');
    const error = document.getElementById('blockchainError');
    const noLogs = document.getElementById('noBlockchainLogs');
    const errorMsg = document.getElementById('blockchainErrorMsg');

    loading.classList.remove('d-none');
    list.innerHTML = '';
    error.classList.add('d-none');
    noLogs.classList.add('d-none');

    try {
        const count = await contract.methods.getAnomalyCount().call();
        countEl.innerHTML = `<h5 class="text-success"><i class="fas fa-lock me-2"></i>Total Logs: ${count}</h5>`;

        if (count === '0') {
            noLogs.classList.remove('d-none');
            return;
        }

        let logs = [];
        for (let i = 0; i < Number(count); i++) {
            const anomaly = await contract.methods.getAnomaly(i).call();
            logs.push({
                index: i,
                folder: anomaly[0], // Timestamp
                frameIdx: anomaly[1].toString(), // Hash as string
                error: anomaly[2] // Score
            });
        }

        // Sort by index (newest first)
        logs.reverse();

        const table = `
            <table class="table table-striped">
                <thead><tr><th>Index</th><th>Timestamp (Folder)</th><th>Frame Hash (Idx)</th><th>Error Score</th></tr></thead>
                <tbody>
                    ${logs.map(log => `
                        <tr>
                            <td>${log.index}</td>
                            <td>${log.folder}</td>
                            <td>${log.frameIdx.substring(0, 16)}...</td>
                            <td><span class="badge bg-warning">${log.error}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        list.innerHTML = table;
    } catch (err) {
        errorMsg.textContent = `Blockchain query failed: ${err.message}`;
        error.classList.remove('d-none');
    } finally {
        loading.classList.add('d-none');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await initWeb3();
    fetchAnomalies();
    setupLiveFeed();
    fetchBlockchainLogs();

    // Manual refreshes
    document.getElementById('refreshAnomaly').addEventListener('click', fetchAnomalies);
    document.getElementById('refreshBlockchain').addEventListener('click', fetchBlockchainLogs);

    // Auto-poll
    setInterval(fetchAnomalies, POLL_INTERVAL);
    setInterval(fetchBlockchainLogs, POLL_INTERVAL);

    // Tab change: Setup live feed only when tab is shown
    const liveTab = new bootstrap.Tab(document.getElementById('live-feed-tab'));
    document.getElementById('live-feed-tab').addEventListener('shown.bs.tab', () => {
        if (!document.getElementById('liveVideo').src) setupLiveFeed();
    });
});
