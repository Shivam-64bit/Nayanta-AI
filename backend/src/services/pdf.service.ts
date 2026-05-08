/**
 * services/pdf.service.ts
 *
 * Generates scholarship application PDFs using pdfkit.
 * Fills form fields from structured application data.
 * Uploads the generated PDF to GCS and returns a signed URL (1-hour expiry).
 */

import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile, getSignedUrl } from '../config/storage.config';
import type { UserProfile, MatchedScholarship } from '../schemas';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PdfGenerationInput {
  applicationId: string;
  userId: string;
  profile: UserProfile;
  scheme: MatchedScholarship;
  applicationText: string;
  coverLetter: string;
}

export interface PdfGenerationResult {
  pdfUrl: string;
  gcsPath: string;
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

class PdfService {
  /**
   * Generates a scholarship application PDF and uploads it to GCS.
   * Returns a signed URL valid for 1 hour.
   */
  async generateApplicationPdf(input: PdfGenerationInput): Promise<PdfGenerationResult> {
    const buffer = await this.buildPdf(input);
    const gcsPath = `applications/${input.userId}/${input.applicationId}/${uuidv4()}.pdf`;

    await uploadFile(buffer, gcsPath, 'application/pdf');
    const pdfUrl = await getSignedUrl(gcsPath);

    console.log(`[PdfService] Generated PDF for ${input.applicationId} → ${gcsPath}`);

    return {
      pdfUrl,
      gcsPath,
      generatedAt: new Date().toISOString(),
    };
  }

  // -----------------------------------------------------------------------
  // PDF Construction
  // -----------------------------------------------------------------------

  private buildPdf(input: PdfGenerationInput): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Uint8Array[] = [];

      doc.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // --- Header ---
      doc.fontSize(18).font('Helvetica-Bold')
        .text('Scholarship Application', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica')
        .text(`Application ID: ${input.applicationId}`, { align: 'center' })
        .text(`Generated: ${new Date().toISOString()}`, { align: 'center' });
      doc.moveDown(1);

      // --- Scheme Info ---
      this.addSection(doc, 'Scheme Details');
      this.addField(doc, 'Scheme Name', input.scheme.schemeName);
      this.addField(doc, 'Annual Amount', `₹${input.scheme.annualAmount.toLocaleString('en-IN')}`);
      this.addField(doc, 'Match Score', `${input.scheme.matchScore}/100`);
      doc.moveDown(0.5);

      // --- Applicant Info ---
      this.addSection(doc, 'Applicant Details');
      this.addField(doc, 'Name', input.profile.name);
      this.addField(doc, 'Date of Birth', input.profile.dob);
      this.addField(doc, 'Category', input.profile.category.toUpperCase());
      this.addField(doc, 'Annual Family Income', `₹${input.profile.income.toLocaleString('en-IN')}`);
      this.addField(doc, 'State', input.profile.state);
      this.addField(doc, 'Course', input.profile.course);
      this.addField(doc, 'Institute', input.profile.institute);
      this.addField(doc, 'Marks', `${input.profile.marks}%`);

      if (input.profile.phone) {
        this.addField(doc, 'Phone', input.profile.phone);
      }
      doc.moveDown(0.5);

      // --- Cover Letter ---
      if (input.coverLetter) {
        this.addSection(doc, 'Cover Letter');
        doc.fontSize(10).font('Helvetica').text(input.coverLetter, { lineGap: 4 });
        doc.moveDown(0.5);
      }

      // --- Application Text ---
      this.addSection(doc, 'Application');
      doc.fontSize(10).font('Helvetica').text(input.applicationText, { lineGap: 4 });
      doc.moveDown(1);

      // --- Declaration ---
      this.addSection(doc, 'Declaration');
      doc.fontSize(9).font('Helvetica')
        .text(
          'I hereby declare that the information provided in this application is true and correct to the best of my knowledge. ' +
          'I understand that any false information may lead to disqualification.',
          { lineGap: 3 },
        );
      doc.moveDown(1.5);

      doc.fontSize(10).font('Helvetica')
        .text(`Signature: ____________________`, { align: 'left' })
        .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, { align: 'left' });

      doc.end();
    });
  }

  private addSection(doc: PDFKit.PDFDocument, title: string): void {
    doc.fontSize(13).font('Helvetica-Bold')
      .text(title)
      .moveTo(doc.x, doc.y)
      .lineTo(doc.x + 500, doc.y)
      .stroke()
      .moveDown(0.3);
  }

  private addField(doc: PDFKit.PDFDocument, label: string, value: string): void {
    doc.fontSize(10)
      .font('Helvetica-Bold').text(`${label}: `, { continued: true })
      .font('Helvetica').text(value);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

let instance: PdfService | null = null;

export function getPdfService(): PdfService {
  if (!instance) {
    instance = new PdfService();
  }
  return instance;
}
