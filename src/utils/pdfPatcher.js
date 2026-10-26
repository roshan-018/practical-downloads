import { PDFDocument, rgb } from 'pdf-lib';

export const patchAndDownloadPdf = async (practical, studentDetails) => {
  try {
    const pdfUrl = `/pdfs/${practical.fileName}`;
    const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    // 1. Grab the template directly from the practical object
    const template = practical.template;
    if (!template) {
      console.warn(`No template found for practical ${practical.id}. Downloading original.`);
    } else {
      const { patch, text } = template;
      const studentString = `${studentDetails.name} (${studentDetails.rollNo})`;

      pages.forEach((page) => {
        page.drawRectangle({
          x: patch.x,
          y: patch.y,
          width: patch.width,
          height: patch.height,
          color: rgb(1, 1, 1), 
        });

        page.drawText(studentString, {
          x: text.x,
          y: text.y,
          size: text.size,
          color: rgb(0, 0, 0),
        });
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${studentDetails.rollNo}_Practical_${practical.practicalNo}.pdf`;
    link.click();

    return true;
  } catch (error) {
    console.error("PDF Patching Error:", error);
    throw error;
  }
};