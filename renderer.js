const { ipcRenderer } = require('electron');
const fs = require('fs');
const axios = require('axios');

const CONCURRENT_DOWNLOADS = 10;
let downloadFolder = null;

document.getElementById('selectCsv').addEventListener('click', () => {
  ipcRenderer.send('select-csv');
});

document.getElementById('selectFolder').addEventListener('click', () => {
  ipcRenderer.send('select-folder');
});

ipcRenderer.on('folder-selected', (event, folderPath) => {
  downloadFolder = folderPath;
  document.getElementById('folderPath').textContent = `Selected Folder: ${folderPath}`;
});

ipcRenderer.on('csv-selected', async (event, csvPath) => {
  const csvData = fs.readFileSync(csvPath, 'utf-8');
  const urls = csvData.split('\n').map(line => line.trim()).filter(Boolean);

  const progressBar = document.getElementById('downloadProgress');
  const progressLabel = document.getElementById('progressLabel');

  progressBar.setAttribute('max', urls.length);

  let completedDownloads = 0;

  // Function to update progress
  const updateProgress = () => {
    completedDownloads++;
    progressBar.value = completedDownloads;
    const progressPercent = Math.round((completedDownloads / urls.length) * 100);
    progressLabel.textContent = `Progress: ${progressPercent}%`;
  }

  // Split URLs into chunks and download
  for (let i = 0; i < urls.length; i += CONCURRENT_DOWNLOADS) {
    const chunk = urls.slice(i, i + CONCURRENT_DOWNLOADS);
    await Promise.all(chunk.map(url =>
      downloadFile(url).then(updateProgress)
    ));
  }

  document.getElementById('status').textContent = 'Download completed!';
});

async function downloadFile(url) {
  if (!downloadFolder) {
    alert("Please select a download folder first.");
    return;
  }

  const response = await axios.get(url, { responseType: 'arraybuffer' });
  const fileName = url.split('/').pop();
  fs.writeFileSync(`${downloadFolder}/${fileName}`, response.data);
}
