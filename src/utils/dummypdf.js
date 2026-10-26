import { StandardFonts } from 'pdf-lib';

// A utility function to break long paragraphs into perfectly sized lines
const wrapText = (text, maxWidth, font, fontSize) => {
  // Handle empty or undefined text
  if (!text) return [];

  // Split by actual line breaks first (important for code blocks!)
  const paragraphs = text.split('\n'); 
  const lines = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.split(' ');
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      // Measure what the width WOULD be if we added this word
      const testLine = `${currentLine} ${word}`;
      const textWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (textWidth < maxWidth) {
        // It fits, add it to the current line
        currentLine = testLine;
      } else {
        // It doesn't fit! Push the current line and start a new one
        lines.push(currentLine);
        currentLine = word;
      }
    }
    // Push the final line of the paragraph
    lines.push(currentLine);
  }

  return lines;
};


/// the new function starts from here and we need to copy this things to the main fucntion ok : // A factory function to create a new page with pre-printed headers and footers
const createNewPage = (pdfDoc, subjectDetails, studentDetails, pageNumber) => {
  // 1. Create a blank A4 page (595 points wide, 842 points tall)
  const page = pdfDoc.addPage([595, 842]); 
  
  // 2. Draw the Header
  page.drawText(`${subjectDetails.deptName}`, { x: 50, y: 800, size: 10 });
  page.drawText(`${subjectDetails.subjectName} (${subjectDetails.subjectCode})`, { x: 50, y: 785, size: 12 });
  
  // Draw a horizontal divider line under the header
  page.drawLine({ start: { x: 50, y: 775 }, end: { x: 545, y: 775 }, thickness: 1 });

  // 3. Draw the Footer
  const footerText = `${studentDetails.name} (${studentDetails.rollNo})`;
  page.drawText(footerText, { x: 50, y: 30, size: 12 });
  page.drawText(`Page ${pageNumber}`, { x: 500, y: 30, size: 12 });

  // 4. Return the new page and set the cursor just below the header line
  return { 
    newPage: page, 
    resetCursorY: 740 
  };
};


/// now we are at the crucial steps of the pdf rendering things : 
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const generateNativePdf = async (aiData, subjectDetails, studentDetails) => {
  const pdfDoc = await PDFDocument.create();
  
  // 1. Embed standard fonts & terminal font
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);
  
  // 2. Define layout constants
  const PAGE_WIDTH = 595;
  const MARGIN_LEFT = 50;
  const MARGIN_RIGHT = 50;
  const MAX_TEXT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  const BOTTOM_MARGIN = 50;
  const LINE_HEIGHT = 15;

  let currentPageNum = 1;
  let { newPage, resetCursorY } = createNewPage(pdfDoc, subjectDetails, studentDetails, currentPageNum);
  let currentPage = newPage;
  let cursorY = resetCursorY;

  // 3. The Virtual Cursor Loop
  for (const block of aiData.blueprint) {
    
    // --- HEADING LOGIC ---
    if (block.type === 'heading') {
      if (cursorY < BOTTOM_MARGIN + 30) {
        currentPageNum++;
        const freshPage = createNewPage(pdfDoc, subjectDetails, studentDetails, currentPageNum);
        currentPage = freshPage.newPage;
        cursorY = freshPage.resetCursorY;
      }
      currentPage.drawText(block.text, { x: MARGIN_LEFT, y: cursorY, size: 14, font: fontBold });
      cursorY -= (LINE_HEIGHT * 2); 
    }

    // --- STANDARD TEXT / CODE LOGIC ---
   // --- TERMINAL OUTPUT BOX LOGIC (PAGINATED) ---
    if (block.type === 'output') {
      const padding = 10;
      const wrappedLines = wrapText(block.text, MAX_TEXT_WIDTH - (padding * 2), fontCourier, 11);

      // Helper function: Draws a black background strip at the current cursor
      const drawBlackStrip = (height) => {
        currentPage.drawRectangle({
          x: MARGIN_LEFT,
          y: cursorY - height,
          width: MAX_TEXT_WIDTH,
          height: height,
          color: rgb(0.1, 0.1, 0.1),
        });
      };

      // 1. Check if we need a new page before even starting the box
      if (cursorY - padding - LINE_HEIGHT < BOTTOM_MARGIN) {
        currentPageNum++;
        const freshPage = createNewPage(pdfDoc, subjectDetails, studentDetails, currentPageNum);
        currentPage = freshPage.newPage;
        cursorY = freshPage.resetCursorY;
      }

      // 2. Draw the top padding (a blank black strip)
      drawBlackStrip(padding);
      cursorY -= padding;

      // 3. Loop through lines, drawing the background strip and text together
      for (const line of wrappedLines) {
        
        // If we hit the bottom margin mid-box
        if (cursorY - LINE_HEIGHT < BOTTOM_MARGIN) {
          // Add padding to seal the bottom of the box on the current page
          drawBlackStrip(padding);

          // Spawn a fresh page
          currentPageNum++;
          const freshPage = createNewPage(pdfDoc, subjectDetails, studentDetails, currentPageNum);
          currentPage = freshPage.newPage;
          cursorY = freshPage.resetCursorY;

          // Add padding to open the top of the box on the new page
          drawBlackStrip(padding);
          cursorY -= padding;
        }

        // Draw the background strip for this specific line
        drawBlackStrip(LINE_HEIGHT);
        
        // Draw the white text on top of the strip
        currentPage.drawText(line, { 
          x: MARGIN_LEFT + padding, 
          y: cursorY - 11, // Adjusted slightly so text baseline sits inside the strip
          size: 11, 
          font: fontCourier, 
          color: rgb(1, 1, 1) 
        });
        
        cursorY -= LINE_HEIGHT;
      }
      
      // 4. Draw the final bottom padding and add an external buffer
      drawBlackStrip(padding);
      cursorY -= (padding + LINE_HEIGHT); 
    }
  }

  // 4. Save and trigger browser download
  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${studentDetails.rollNo}_Generated_Practical.pdf`;
  link.click();
};