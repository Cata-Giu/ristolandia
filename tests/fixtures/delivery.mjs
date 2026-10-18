// Tiny text PDF built in tests; contains only fictional delivery data.
export function deliveryPdf(number = 'DEMO-42', extra = '') {
  const lines = [
    'FORNITORE: Dispensa Demo',
    `DDT n. ${number}`,
    'Data: 18/10/2026',
    'Descrizione UM Quantita Prezzo',
    'Spaghettoni kg 2,5 2,80',
    'Acqua naturale pz 12 0,55',
    'Tovaglioli pz 200 0,03',
    extra,
  ].filter(Boolean);
  const content =
    'BT /F1 14 Tf 50 790 Td 24 TL ' +
    lines
      .map(
        (l, i) =>
          (i ? 'T* ' : '') + '(' + l.replace(/[()\\]/g, '\\$&') + ') Tj',
      )
      .join('\n') +
    ' ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n',
    offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf);
  pdf +=
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, '0') + ' 00000 n \n')
      .join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
