const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { dialog } = require('@electron/remote');

let fileList = [];

function updateFileList() {
  const fileListElement = document.getElementById('fileList');
  fileListElement.innerHTML = '';
  
  fileList.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';
    li.draggable = true;
    li.innerHTML = `
      <span>${file.name}</span>
      <span class="remove-btn" data-index="${index}">Remove</span>
    `;
    
    // Drag and drop event listeners
    li.addEventListener('dragstart', (e) => {
      e.target.classList.add('dragging');
      e.dataTransfer.setData('text/plain', index);
    });
    
    li.addEventListener('dragend', (e) => {
      e.target.classList.remove('dragging');
    });
    
    li.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    
    li.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = index;
      
      if (fromIndex !== toIndex) {
        const item = fileList[fromIndex];
        fileList.splice(fromIndex, 1);
        fileList.splice(toIndex, 0, item);
        updateFileList();
      }
    });
    
    fileListElement.appendChild(li);
  });
  
  // Add click event listeners for remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      fileList.splice(index, 1);
      updateFileList();
    });
  });
}

document.getElementById('pdfFiles').addEventListener('change', (event) => {
  const newFiles = Array.from(event.target.files);
  fileList = [...fileList, ...newFiles];
  updateFileList();
});

document.getElementById('mergeBtn').addEventListener('click', async () => {
  if (fileList.length === 0) {
    alert('Please select PDF files to merge');
    return;
  }

  try {
    // Show save dialog to get the save path and filename
    const result = await dialog.showSaveDialog({
      title: 'Save Merged PDF',
      defaultPath: 'merged.pdf',
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ]
    });

    if (result.canceled) {
      return;
    }

    const outputPath = result.filePath;
    const mergedPdf = await PDFDocument.create();

    for (const file of fileList) {
      const data = await file.arrayBuffer();
      const pdf = await PDFDocument.load(data);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, mergedBytes);
    alert(`PDFs merged successfully!\nSaved to: ${outputPath}`);
  } catch (error) {
    alert('Error merging PDFs: ' + error.message);
  }
});