import PDFDocument from 'pdfkit';
import dotenv from 'dotenv';
dotenv.config();

const HOSPITAL_NAME = process.env.HOSPITAL_NAME || 'City General Hospital';
const HOSPITAL_ADDRESS = process.env.HOSPITAL_ADDRESS || '123 Health Avenue, Medical District';

export function generateBillPDF({ bill, patient, visit }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).font('Helvetica-Bold').text(HOSPITAL_NAME, { align: 'center' });
      doc.fontSize(10).font('Helvetica').text(HOSPITAL_ADDRESS, { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(12).font('Helvetica-Bold').text('PATIENT BILL / INVOICE', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();

      doc.fontSize(11).font('Helvetica-Bold').text('Bill Details', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica');
      doc.text(`Bill ID: ${bill.id}`, 50, doc.y);
      doc.text(`Bill Date: ${new Date(bill.createdAt).toLocaleString('en-IN')}`, 300, doc.y - 14);
      doc.text(`P_ID: ${bill.patientId}`, 50, doc.y + 4);
      doc.text(`V_ID: ${bill.visitId}`, 300, doc.y);
      doc.moveDown();

      if (patient) {
        doc.fontSize(11).font('Helvetica-Bold').text('Patient Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${patient.firstName} ${patient.lastName}`, 50, doc.y);
        doc.text(`Gender: ${patient.gender}`, 300, doc.y - 14);
        doc.text(`Age: ${patient.age} yrs, Weight: ${patient.weight || '-'} kg`, 50, doc.y + 4);
        doc.text(`Mobile: ${patient.mobileNumber}`, 300, doc.y);
        if (patient.email) doc.text(`Email: ${patient.email}`, 50, doc.y + 4);
        if (patient.address) doc.text(`Address: ${patient.address}`, 50, doc.y + 22);
        doc.moveDown();
      }

      if (visit) {
        doc.fontSize(11).font('Helvetica-Bold').text('Visit Details', { underline: true });
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Token: ${visit.token || '-'}`, 50, doc.y);
        doc.text(`Department: ${visit.department || '-'}`, 300, doc.y - 14);
        doc.text(`Date: ${new Date(visit.visitDate).toLocaleString('en-IN')}`, 50, doc.y + 4);
        doc.text(`Status: ${visit.visitStatus || '-'}`, 300, doc.y);
        if (visit.mainProblem) doc.text(`Complaint: ${visit.mainProblem}`, 50, doc.y + 22);
        doc.moveDown();
      }

      doc.fontSize(11).font('Helvetica-Bold').text('Charges Breakdown', { underline: true });
      doc.moveDown(0.4);

      const startY = doc.y;
      const colX = [50, 200, 330, 400, 470];
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Type', colX[0], startY);
      doc.text('Description', colX[1], startY);
      doc.text('Base (₹)', colX[2], startY, { width: 70, align: 'right' });
      doc.text('GST (₹)', colX[3], startY, { width: 70, align: 'right' });
      doc.text('Total (₹)', colX[4], startY, { width: 80, align: 'right' });

      let y = startY + 18;
      doc.fontSize(9).font('Helvetica');
      for (const c of bill.charges) {
        doc.text(String(c.type).toUpperCase(), colX[0], y);
        let desc = c.description || '-';
        if (c.quantity) desc = `${desc} x${c.quantity}`;
        doc.text(desc.substring(0, 40), colX[1], y);
        doc.text(Number(c.base).toFixed(2), colX[2], y, { width: 70, align: 'right' });
        doc.text(Number(c.gst).toFixed(2), colX[3], y, { width: 70, align: 'right' });
        doc.text(Number(c.total).toFixed(2), colX[4], y, { width: 80, align: 'right' });
        y += 15;
        if (y > 720) { doc.addPage(); y = 50; }
      }

      doc.moveTo(50, y - 2).lineTo(545, y - 2).stroke();
      y += 5;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Subtotal:', colX[2], y, { width: 70, align: 'right' });
      doc.text(Number(bill.subtotal).toFixed(2), colX[4], y, { width: 80, align: 'right' });
      y += 15;
      doc.text('GST Total:', colX[2], y, { width: 70, align: 'right' });
      doc.text(Number(bill.gstTotal).toFixed(2), colX[4], y, { width: 80, align: 'right' });
      y += 18;
      doc.moveTo(colX[2], y - 4).lineTo(545, y - 4).stroke();
      doc.fontSize(13).font('Helvetica-Bold');
      doc.text('TOTAL (₹):', colX[2], y, { width: 70, align: 'right' });
      doc.text(Number(bill.total).toFixed(2), colX[4], y, { width: 80, align: 'right' });

      y += 30;
      doc.fontSize(11).font('Helvetica-Bold');
      doc.text(`Payment Status: `, 50, y);
      doc.fontSize(11).fillColor(bill.paymentStatus === 'paid' ? '#16a34a' : '#dc2626').font('Helvetica-Bold').text(bill.paymentStatus.toUpperCase(), 180, y);
      doc.fillColor('#000000');

      if (bill.paidAt) {
        doc.fontSize(9).font('Helvetica').text(`Paid at: ${new Date(bill.paidAt).toLocaleString('en-IN')}`, 50, y + 18);
      }

      doc.moveDown(2);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(8).font('Helvetica-Oblique').text('This is a computer-generated receipt. Authorized signature not required for payment confirmation.', { align: 'center' });
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica-Oblique').text(`${HOSPITAL_NAME} — Prototype demo system. For testing & evaluation purposes only.`, { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}
