import React, { useState, useEffect } from 'react';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default function App() {
  const [studentDetails, setStudentDetails] = useState({ name: '', rollNo: '' });
  const [selectedPracticals, setSelectedPracticals] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [availablePracticals, setAvailablePracticals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch only available practicals
  useEffect(() => {
    fetch('/practicals.json')
      .then((response) => response.json())
      .then((data) => {
        // FILTER LOGIC ADDED HERE
        const readyPracticals = data.filter((item) => item.isAvailable === true);
        setAvailablePracticals(readyPracticals);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching practicals data:", error);
        setIsLoading(false);
      });
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (id) => {
    setSelectedPracticals((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const handleDownload = async () => {
    if (!studentDetails.name || !studentDetails.rollNo) {
      alert('Please enter both Name and Roll Number first.');
      return;
    }

    setIsProcessing(true);
    const practicalsToDownload = availablePracticals.filter((p) =>
      selectedPracticals.includes(p.id)
    );

    for (const practical of practicalsToDownload) {
      try {
        const response = await fetch(`/${practical.actualFileName}`);
        if (!response.ok) throw new Error(`Could not find ${practical.actualFileName}`);
        const existingPdfBytes = await response.arrayBuffer();
        
        const pdfDoc = await PDFDocument.load(existingPdfBytes);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();
        
        const textToStamp = `${studentDetails.name} (${studentDetails.rollNo})`;

        pages.forEach((page) => {
          // Adjust these coordinates if needed
          const patchX = 60;
          const patchY = 40;
          const patchWidth = 200;
          const patchHeight = 20;

          page.drawRectangle({
            x: patchX,
            y: patchY,
            width: patchWidth,
            height: patchHeight,
            color: rgb(1, 1, 1), 
          });

          page.drawText(textToStamp, {
            x: patchX,
            y: patchY + 4, 
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        });

        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        
        const cleanName = studentDetails.name.trim().replace(/\s+/g, '_');
        const customFilename = `${studentDetails.rollNo}_${cleanName}_${practical.subjectCode}_Practical_${practical.practicalNo}.pdf`;
        
        const link = document.createElement('a');
        link.href = url;
        link.download = customFilename;
        document.body.appendChild(link);
        link.click();
        
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error(`Error processing ${practical.actualFileName}:`, error);
        alert(`Failed to process Practical ${practical.practicalNo}. Check console.`);
      }
    }
    setIsProcessing(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Practical Assignment Downloader</h2>
      
      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <input
          type="text"
          name="name"
          placeholder="Student Name (e.g., abcd)"
          value={studentDetails.name}
          onChange={handleInputChange}
          style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="text"
          name="rollNo"
          placeholder="Roll Number (e.g., 12345678910)"
          value={studentDetails.rollNo}
          onChange={handleInputChange}
          style={{ display: 'block', margin: '10px 0', padding: '10px', width: '100%', boxSizing: 'border-box', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ backgroundColor: '#e3f2fd', padding: '10px', borderRadius: '4px', borderLeft: '4px solid #1976d2', marginBottom: '15px' }}>
          <strong>Sem - 5 | CSE AI & ML | Digital Image Processing</strong>
          <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#555' }}>Select the practicals you want to generate:</p>
          <p>Regular updates will be provided. To contribute, please contact the administrator</p>
        </div>

        {isLoading ? (
          <p>Loading available practicals...</p>
        ) : availablePracticals.length === 0 ? (
          <p>No practicals available right now.</p>
        ) : (
          availablePracticals.map((practical) => (
            <div key={practical.id} style={{ margin: '12px 0', fontSize: '16px' }}>
              <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  checked={selectedPracticals.includes(practical.id)}
                  onChange={() => handleCheckboxChange(practical.id)}
                  style={{ width: '18px', height: '18px' }}
                />
                Practical {practical.practicalNo}: {practical.practicalName}
              </label>
            </div>
          ))
        )}
      </div>

      <button
        onClick={handleDownload}
        disabled={selectedPracticals.length === 0 || isProcessing}
        style={{ 
          padding: '12px 24px', 
          cursor: (selectedPracticals.length === 0 || isProcessing) ? 'not-allowed' : 'pointer', 
          backgroundColor: (selectedPracticals.length === 0 || isProcessing) ? '#ccc' : '#007BFF', 
          color: 'white', 
          border: 'none', 
          borderRadius: '6px', 
          fontSize: '16px',
          width: '100%'
        }}
      >
        {isProcessing ? 'Processing Documents...' : `Download Selected (${selectedPracticals.length})`}
      </button>
    </div>
  );
}