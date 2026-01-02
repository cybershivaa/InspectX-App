import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdf = async (element: HTMLElement, fileName: string) => {
  const canvas = await html2canvas(element, {
    scale: 2, // Higher scale for better quality
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const ratio = canvasWidth / canvasHeight;
  const widthInPdf = pdfWidth;
  const heightInPdf = widthInPdf / ratio;
  
  let position = 0;
  let heightLeft = heightInPdf;

  pdf.addImage(imgData, 'PNG', 0, position, widthInPdf, heightInPdf);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - heightInPdf;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, widthInPdf, heightInPdf);
    heightLeft -= pdfHeight;
  }

  pdf.save(fileName);
};
