import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// A utility function to break long paragraphs into perfectly sized lines
const wrapText = (text, maxWidth, font, fontSize) => {
    if (!text) return [];

    const paragraphs = text.split('\n');
    const lines = [];

    for (const paragraph of paragraphs) {
        const words = paragraph.split(' ');
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const testLine = `${currentLine} ${word}`;
            const textWidth = font.widthOfTextAtSize(testLine, fontSize);

            if (textWidth < maxWidth) {
                currentLine = testLine;
            } else {
                lines.push(currentLine)
                currentLine = word;
            }
        }
        lines.push(currentLine);
    }
    return lines;
}

export const generateNativePdf = async (aiData, subjectDetails, studentDetails, uploadedImages) => {
    const pdfDoc = await PDFDocument.create();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontCourier = await pdfDoc.embedFont(StandardFonts.Courier);

    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const MAX_TEXT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
    const BOTTOM_MARGIN = 50;
    const LINE_HEIGHT = 15;

    // Moved inside to easily access fonts and PAGE_WIDTH
    const createNewPage = (pageNumber) => {
        const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        let currentCursorY = 800;

        if (pageNumber === 1) {
            // OFFICIAL MU HEADER (First Page Only)
            const drawCentered = (text, font, size, y) => {
                const textWidth = font.widthOfTextAtSize(text, size);
                page.drawText(text, { x: (PAGE_WIDTH - textWidth) / 2, y, size, font });
            };

            drawCentered("Marwadi University", fontBold, 16, currentCursorY);
            currentCursorY -= 20;
            drawCentered("FACULTY OF ENGINEERING AND TECHNOLOGY", fontBold, 12, currentCursorY);
            currentCursorY -= 15;
            drawCentered(subjectDetails.deptName || "Department of Computer Engineering", fontRegular, 12, currentCursorY);
            currentCursorY -= 25;

            const manualTitle = `${subjectDetails.subjectCode || ""} ${subjectDetails.subjectName || ""} Lab Manual`;
            drawCentered(manualTitle, fontBold, 12, currentCursorY);
            currentCursorY -= 25;

            // Use practical number if passed from CustomGenerator, otherwise fallback
            const pracNum = subjectDetails.practicalNo ? String(subjectDetails.practicalNo).padStart(2, '0') : "XX";
            drawCentered(`PRACTICAL-${pracNum}`, fontBold, 14, currentCursorY);
            currentCursorY -= 30;

            const aimText = `AIM: ${subjectDetails.practicalName || "Implementation of algorithm."}`;
            const aimLines = wrapText(aimText, MAX_TEXT_WIDTH, fontBold, 12);
            for(const line of aimLines) {
                page.drawText(line, { x: MARGIN_LEFT, y: currentCursorY, size: 12, font: fontBold });
                currentCursorY -= 16;
            }
            currentCursorY -= 15; // Extra padding before code/blueprint starts
        } else {
            // Minimal top margin for page 2 onwards
            currentCursorY = 780; 
        }

        // FOOTER (Every Page)
        const footerText = `${studentDetails.name || "Student"} (${studentDetails.rollNo || "RollNo"})`;
        page.drawText(footerText, { x: MARGIN_LEFT, y: 30, size: 11, font: fontRegular });
        page.drawText(`Page ${pageNumber}`, { x: PAGE_WIDTH - MARGIN_RIGHT - 40, y: 30, size: 11, font: fontRegular });

        return {
            newPage: page,
            resetCursorY: currentCursorY
        };
    }

    let currentPageNum = 1;
    let { newPage, resetCursorY } = createNewPage(currentPageNum);
    let currentPage = newPage;
    let cursorY = resetCursorY;

    for (const block of aiData.blueprint) {
        
        // --- HEADING LOGIC ---
        if (block.type == 'heading') {
            if (cursorY < BOTTOM_MARGIN + 40) {
                currentPageNum++;
                const freshPage = createNewPage(currentPageNum);
                currentPage = freshPage.newPage;
                cursorY = freshPage.resetCursorY;
            }
            currentPage.drawText(block.text, { x: MARGIN_LEFT, y: cursorY, size: 14, font: fontBold });
            cursorY -= (LINE_HEIGHT * 1.5);
        }
        
        // --- STANDARD TEXT / CODE LOGIC --- 
        if (block.type === 'textBlock' || block.type === 'codeBlock') {
            const isCode = block.type === 'codeBlock';
            const fontToUse = isCode ? fontCourier : fontRegular;
            const fontSize = isCode ? 10 : 12;
            const lineHeightToUse = isCode ? 13 : LINE_HEIGHT;
            const WrappedLines = wrapText(block.text, MAX_TEXT_WIDTH, fontToUse, fontSize);
            for (const line of WrappedLines) {
                if (cursorY < BOTTOM_MARGIN) {
                    currentPageNum++;
                    const freshPage = createNewPage(currentPageNum);
                    currentPage = freshPage.newPage;
                    cursorY = freshPage.resetCursorY;
                }
                currentPage.drawText(line, { x: MARGIN_LEFT, y: cursorY, size: fontSize, font: fontToUse });
                cursorY -= lineHeightToUse;
            }
            cursorY -= (LINE_HEIGHT / 2);
        }

        // --- TERMINAL OUTPUT BOX LOGIC ---
        if (block.type == 'output') {
            const padding = 10;
            const wrappedLines = wrapText(block.text, MAX_TEXT_WIDTH - (padding * 2), fontCourier, 11);

            const drawBlackStrip = (height) => {
                currentPage.drawRectangle({
                    x: MARGIN_LEFT,
                    y: cursorY - height,
                    width: MAX_TEXT_WIDTH,
                    height: height,
                    color: rgb(0.1, 0.1, 0.1),
                });
            };

            if(cursorY - padding - LINE_HEIGHT < BOTTOM_MARGIN){
                currentPageNum++;
                const freshPage = createNewPage(currentPageNum);
                currentPage = freshPage.newPage;
                cursorY = freshPage.resetCursorY;
            }

            drawBlackStrip(padding);
            cursorY -= padding;
            
            for(const line of wrappedLines){
                if(cursorY - LINE_HEIGHT < BOTTOM_MARGIN){
                    drawBlackStrip(padding); // Close previous box
                    currentPageNum++;
                    const freshPage = createNewPage(currentPageNum);
                    currentPage = freshPage.newPage;
                    cursorY = freshPage.resetCursorY;
                    drawBlackStrip(padding); // Open new box on new page
                    cursorY -= padding;
                }

                drawBlackStrip(LINE_HEIGHT);
                currentPage.drawText(line , {
                    x: MARGIN_LEFT + padding,
                    y : cursorY-11, 
                    size : 11,
                    font : fontCourier,
                    color : rgb(1,1,1) 
                });
                cursorY -= LINE_HEIGHT;
            }
            drawBlackStrip(padding);
            cursorY -= (padding + LINE_HEIGHT);
        }

        // --- IMAGE LOGIC (CENTERED) ---
        if (block.type === 'imageSlot' && uploadedImages && uploadedImages[block.placeholder]) {
            const imageBytes = uploadedImages[block.placeholder];
            let embeddedImage;
            
            try {
                embeddedImage = await pdfDoc.embedPng(imageBytes);
            } catch (e) {
                embeddedImage = await pdfDoc.embedJpg(imageBytes);
            }

            // Scale to fit: Max width 400, Max height 300
            const imgDims = embeddedImage.scaleToFit(400, 300);

            if (cursorY - imgDims.height < BOTTOM_MARGIN) {
                currentPageNum++;
                const freshPage = createNewPage(currentPageNum);
                currentPage = freshPage.newPage;
                cursorY = freshPage.resetCursorY;
            }

            // Calculate exact center alignment
            const centerX = MARGIN_LEFT + ((MAX_TEXT_WIDTH - imgDims.width) / 2);

            currentPage.drawImage(embeddedImage, {
                x: centerX,
                y: cursorY - imgDims.height,
                width: imgDims.width,
                height: imgDims.height,
            });

            cursorY -= (imgDims.height + LINE_HEIGHT * 2);
        }
    }
    
    // 4. Save and trigger browser download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], {type: 'application/pdf'});
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob);
    link.download = `${studentDetails.rollNo || 'Practical'}_Generated.pdf`;
    link.click();
}
