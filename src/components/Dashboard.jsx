import React, { useState, useEffect } from 'react';
import { patchAndDownloadPdf } from '../utils/pdfPatcher';

export default function Dashboard({ 
  studentDetails, 
  setStudentDetails, 
  onSelectCustom 
}) {
  const [catalog, setCatalog] = useState(null);
  
  // Selection States
  const [activeDeptId, setActiveDeptId] = useState('');
  const [activeSubjectCode, setActiveSubjectCode] = useState('');
  
  // Bulk Download States
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetch('/data/catalog.json')
      .then(res => res.json())
      .then(data => {
        setCatalog(data);
        if (data.departments && data.departments.length > 0) {
          const firstDept = data.departments[0];
          setActiveDeptId(firstDept.deptId);
          if (firstDept.subjects && firstDept.subjects.length > 0) {
            setActiveSubjectCode(firstDept.subjects[0].subjectCode);
          }
        }
      })
      .catch(err => console.error("Error loading catalog:", err));
  }, []);

  const handleDeptChange = (e) => {
    const newDeptId = e.target.value;
    setActiveDeptId(newDeptId);
    setSelectedIds([]); // Clear selections on department change
    
    const dept = catalog?.departments?.find(d => d.deptId === newDeptId);
    if (dept && dept.subjects && dept.subjects.length > 0) {
      setActiveSubjectCode(dept.subjects[0].subjectCode);
    } else {
      setActiveSubjectCode('');
    }
  };

  const handleSubjectChange = (e) => {
    setActiveSubjectCode(e.target.value);
    setSelectedIds([]); // Clear selections on subject change
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setStudentDetails(prev => ({ ...prev, [name]: value }));
  };

  // --- CHECKBOX LOGIC ---
  const handleCheckboxToggle = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e, availablePracticals) => {
    if (e.target.checked) {
      setSelectedIds(availablePracticals.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  // --- INLINE BULK DOWNLOAD LOGIC ---
 const handleBulkDownload = async (idsToDownload) => {
    if (!studentDetails.name || !studentDetails.rollNo) {
      alert('Please enter your Name and Roll Number first!');
      return;
    }

    if (idsToDownload.length === 0) return;

    setIsDownloading(true);
    try {
      const activeDept = catalog.departments?.find(d => d.deptId === activeDeptId);
      const activeSubject = activeDept?.subjects?.find(s => s.subjectCode === activeSubjectCode);
      const practicalsList = activeSubject?.practicals || [];

      // No more templates.json fetch needed here!

      for (const id of idsToDownload) {
        const practical = practicalsList.find(p => p.id === id);
        if (practical) {
          const payload = {
            ...practical,
            deptName: activeDept?.deptName || '',
            subjectName: activeSubject?.subjectName || '',
            subjectCode: activeSubject?.subjectCode || '',
            sem: activeSubject?.sem || ''
          };
          
          // Just pass the payload, it already has the template!
          await patchAndDownloadPdf(payload, studentDetails); 
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setSelectedIds([]);
    } catch (error) {
      console.error(error);
      alert("Error processing PDFs. Make sure original PDFs are in the /public/pdfs/ folder.");
    }
    setIsDownloading(false);
  };

  if (!catalog) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading Database...</div>;

  const activeDept = catalog.departments?.find(d => d.deptId === activeDeptId) || null;
  const activeSubject = activeDept?.subjects?.find(s => s.subjectCode === activeSubjectCode) || null;
  const practicals = activeSubject?.practicals || [];
  
  // Filter for practicals that actually have PDFs available for standard download
  const availablePracticals = practicals.filter(p => p.isAvailable);
  const allSelected = availablePracticals.length > 0 && selectedIds.length === availablePracticals.length;

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px' }}>
      <h2 style={{ textAlign: 'center', color: '#fff' }}>Practical Assignment Downloader</h2>
      
      <div style={{ background: '#333', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <input 
          type="text" name="name" 
          placeholder="Student Name (e.g., Raushan Yadav)" 
          value={studentDetails.name} onChange={handleInputChange} 
          style={{ display: 'block', margin: '10px 0', padding: '12px', width: '100%', boxSizing: 'border-box', border: '1px solid #555', borderRadius: '4px', background: '#444', color: 'white' }} 
        />
        <input 
          type="text" name="rollNo" 
          placeholder="Roll Number (e.g., 92400118227)" 
          value={studentDetails.rollNo} onChange={handleInputChange} 
          style={{ display: 'block', margin: '10px 0', padding: '12px', width: '100%', boxSizing: 'border-box', border: '1px solid #555', borderRadius: '4px', background: '#444', color: 'white' }} 
        />
      </div>

      <div style={{ backgroundColor: '#e3f2fd', padding: '20px', borderRadius: '8px', borderLeft: '5px solid #1976d2', marginBottom: '20px', color: '#333' }}>
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#1976d2' }}>DEPARTMENT</label>
            <select value={activeDeptId} onChange={handleDeptChange} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #1976d2' }}>
              {catalog?.departments?.map(dept => (
                <option key={dept.deptId} value={dept.deptId}>{dept.deptName}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontWeight: 'bold', fontSize: '13px', marginBottom: '5px', color: '#1976d2' }}>SUBJECT</label>
            <select value={activeSubjectCode} onChange={handleSubjectChange} style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #1976d2' }}>
              {(activeDept?.subjects || []).map(sub => (
                <option key={sub.subjectCode} value={sub.subjectCode}>{sub.subjectName} (Sem {sub.sem})</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* BULK ACTION BAR */}
      {availablePracticals.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#444', padding: '10px 15px', borderRadius: '8px', marginBottom: '15px', color: 'white' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
            <input 
              type="checkbox" 
              checked={allSelected}
              onChange={(e) => handleSelectAll(e, availablePracticals)}
              style={{ width: '18px', height: '18px' }}
            />
            Select All
          </label>
          <button 
            onClick={() => handleBulkDownload(selectedIds)}
            disabled={selectedIds.length === 0 || isDownloading}
            style={{ 
              background: selectedIds.length > 0 ? '#1976d2' : '#666', 
              color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: selectedIds.length > 0 ? 'pointer' : 'not-allowed', fontWeight: 'bold' 
            }}
          >
            {isDownloading ? 'Processing...' : `Download Selected (${selectedIds.length})`}
          </button>
        </div>
      )}

      <div>
        {practicals.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#aaa' }}>No practicals available for this subject yet.</p>
        ) : (
          practicals.map((practical) => (
            <div key={practical.id} style={{ margin: '12px 0', padding: '15px', border: '1px solid #444', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#333', color: 'white' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {/* Checkbox for Standard Download */}
                {practical.isAvailable && (
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(practical.id)}
                    onChange={() => handleCheckboxToggle(practical.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                )}
                <div>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', display: 'block' }}>
                    Practical {practical.practicalNo}
                  </span>
                  <span style={{ fontSize: '13px', color: '#ccc' }}>{practical.name}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                {practical.isAvailable && (
                  <button 
                    onClick={() => handleBulkDownload([practical.id])}
                    disabled={isDownloading}
                    style={{ background: '#555', color: 'white', border: '1px solid #777', padding: '8px 12px', borderRadius: '4px', cursor: isDownloading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '13px' }}
                  >
                    Download Standard
                  </button>
                )}
                
                <button 
                  onClick={() => {
                    if (!studentDetails.name || !studentDetails.rollNo) return alert('Enter Name/Roll No!');
                    
                    const payload = {
                      ...practical,
                      deptName: activeDept?.deptName || '',
                      subjectName: activeSubject?.subjectName || '',
                      subjectCode: activeSubject?.subjectCode || '',
                      sem: activeSubject?.sem || ''
                    };
                    onSelectCustom(payload);
                  }}
                  style={{ background: '#28a745', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', fontSize: '13px' }}
                >
                  Create Unique
                </button>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}