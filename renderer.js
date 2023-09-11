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
    clearFileStatusList();  // Clear the list for the new batch
    const chunk = urls.slice(i, i + CONCURRENT_DOWNLOADS);
    await Promise.all(chunk.map(url =>
      downloadFile(url).then(updateProgress)
    ));
    if (!allFilesExist(chunk)) {
      await sleep(2000);  // Wait for 2 seconds before processing the next chunk
    }
  }

  document.getElementById('status').textContent = 'Download completed!';
});

function allFilesExist(chunk) {
  return chunk.every(url => {
    const fileName = url.split('/').pop();
    const filePath = `${downloadFolder}/${fileName}`;
    return fs.existsSync(filePath);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


async function downloadFile(url) {
  const fileName = url.split('/').pop();
  const filePath = `${downloadFolder}/${fileName}`;

  // Check if file already exists
  if (fs.existsSync(filePath)) {
    appendFileStatus(fileName, 'Already exists. Skipping.');
    return;
  }

  try {
    appendFileStatus(fileName, 'Downloading...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.arrayBuffer();
    const buffer = Buffer.from(data);
    fs.writeFileSync(filePath, buffer);
    updateFileStatus(fileName, 'Downloaded');
  } catch (error) {
    console.error(`Failed to download ${url}. Error: ${error.message}`);
    updateFileStatus(fileName, `Error: ${error.message}`);
  }
}

function clearFileStatusList() {
  const fileStatusList = document.getElementById('fileStatusList');
  fileStatusList.innerHTML = '';
}


function appendFileStatus(fileName, status) {
  const fileStatusList = document.getElementById('fileStatusList');
  const listItem = document.createElement('li');
  listItem.id = `status-${fileName}`;
  listItem.textContent = `${fileName}: ${status}`;
  fileStatusList.appendChild(listItem);
}

function updateFileStatus(fileName, status) {
  const listItem = document.getElementById(`status-${fileName}`);
  if (listItem) {
    listItem.textContent = `${fileName}: ${status}`;
  }
}
