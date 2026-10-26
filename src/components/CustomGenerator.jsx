import React, { useState } from 'react';
import { generateNativePdf } from '../utils/pdfGenerator';
import structures from '../data/structures.json';

// FIX: Yahan exactly wahi props receive karenge jo App.jsx bhej raha hai
const CustomGenerator = ({ practical = {}, studentDetails = {}, onBack }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [uploadedImages, setUploadedImages] = useState({});
  const [copyText, setCopyText] = useState("1. Copy Prompt for AI");

  // 1. Data ko 'practical' object ke andar se extract karenge
  const subjectCode = practical.subjectCode || "";
  const subjectName = practical.subjectName || "Subject";
  const deptName = practical.deptName || "Department";
  const practicalNo = practical.practicalNo || 1;
  const practicalName = practical.name || "";

  // 2. Key banayenge aur data dhoondhenge
  const safeSubjectCode = subjectCode ? subjectCode.toLowerCase() : "";
  const targetKey = `${safeSubjectCode}_${practicalNo}`;
  
  // 3. Data lookup
  const currentStructure = structures[targetKey] 
                        || structures[`${safeSubjectCode}_1`]
                        || structures["01a10506_1"] 
                        || { imageSlots: [], customPrompt: "" };

  const handleCopyPrompt = () => {
    if (currentStructure.customPrompt) {
      navigator.clipboard.writeText(currentStructure.customPrompt);
      setCopyText("Copied! Paste in AI");
      setTimeout(() => setCopyText("1. Copy Prompt for AI"), 3000);
    } else {
      alert(`Error: Tried to find key "${targetKey}" but no prompt found.`);
    }
  };

  const handleImageUpload = async (placeholder, e) => {
    const file = e.target.files[0];
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      setUploadedImages(prev => ({ ...prev, [placeholder]: arrayBuffer }));
    }
  };

  const handleGeneratePdf = async () => {
    try {
      if (!jsonInput.trim()) return alert("Paste AI JSON first!");
      const aiData = JSON.parse(jsonInput);
      
      // Native PDF engine ko data bhejenge
      const subjectDetails = { subjectCode, subjectName, deptName, practicalNo, practicalName };
      await generateNativePdf(aiData, subjectDetails, studentDetails, uploadedImages);
      
    } catch (error) {
      alert("Invalid JSON! Make sure you copied the pure JSON from the AI without any extra text.");
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-md" style={{ backgroundColor: 'white', color: 'black', padding: '24px', borderRadius: '8px' }}>
      
      {/* HEADER WITH BACK BUTTON */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #eee', paddingBottom: '10px' }}>
        <h2 className="text-2xl font-bold" style={{ color: '#111', margin: 0 }}>Native PDF Generator</h2>
        {onBack && (
          <button onClick={onBack} style={{ padding: '8px 16px', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            ← Back to Home
          </button>
        )}
      </div>
      
      {/* ACTIVE SUBJECT INFO */}
      <div style={{ marginBottom: '15px', color: '#4b5563', fontSize: '14px', backgroundColor: '#f3f4f6', padding: '10px', borderRadius: '4px' }}>
        <strong>Generating for:</strong> {subjectName} ({subjectCode}) - Practical {practicalNo}: {practicalName || "Practical"}
      </div>

      <div className="mb-4">
        <button 
          onClick={handleCopyPrompt}
          style={{ backgroundColor: '#3b82f6', color: 'white', padding: '12px', width: '100%', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', border: 'none' }}
        >
          {copyText}
        </button>
      </div>

      <div className="mb-4">
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: '#444' }}>2. Paste AI Generated JSON Here:</label>
        <textarea 
          style={{ width: '100%', height: '250px', backgroundColor: '#f8f9fa', color: 'black', border: '1px solid #ccc', padding: '12px', fontFamily: 'monospace' }}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder='{"blueprint": [ ... ]}'
        />
      </div>

      {currentStructure.imageSlots && currentStructure.imageSlots.length > 0 && (
        <div style={{ marginBottom: '25px', padding: '20px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '6px' }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#3730a3', fontSize: '18px' }}>3. Upload Required Images</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
            {currentStructure.imageSlots.map((slot, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#fff', padding: '10px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                <label style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px', color: '#374151' }}>{slot.label}</label>
                <input 
                  type="file" 
                  accept="image/png, image/jpeg"
                  onChange={(e) => handleImageUpload(slot.placeholder, e)}
                  style={{ fontSize: '13px' }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={handleGeneratePdf}
        style={{ backgroundColor: '#16a34a', color: 'white', padding: '12px', width: '100%', borderRadius: '6px', cursor: 'pointer', marginTop: '16px', fontWeight: 'bold', border: 'none' }}
      >
        4. Generate Native PDF
      </button>
    </div>
  );
};

export default CustomGenerator;
