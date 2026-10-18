// @ts-check

import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { finished } from 'node:stream/promises';
import PDFDocument from 'pdfkit';
import { marked } from 'marked';
import { decode } from 'he';
import { execFileSync } from 'node:child_process';

const markdown = await readFile('SKILL.md', 'utf8');
const tokens = marked.lexer(markdown);

const stream = createWriteStream('SKILL.pdf');
const doc = new PDFDocument({ size: 'A4', margin: 50 });
doc.pipe(stream);

const fontPath = execFileSync(
  'fc-match',
  ['-f', '%{file}', 'Noto Sans:lang=ru'],
  { encoding: 'utf8' },
).trim();
doc.font(fontPath);

function plain(text = '') {
  const html = /** @type string */ (marked.parseInline(text));
  return decode(
    html
      .replace(/\n/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/a>/gi, '')
      .replace(/<[^>]*>/g, ''),
  );
}

for (const token of tokens) {
  switch (token.type) {
    case 'heading':
      doc.moveDown(0.5);
      doc.fontSize(token.depth === 1 ? 18 : 14).text(plain(token.text));
      doc.fontSize(8).moveDown(0.5);
      break;

    case 'paragraph':
      doc.fontSize(8).text(plain(token.text), { paragraphGap: 8 });
      break;

    case 'list':
      for (const item of token.items) {
        doc.fontSize(8).text(
          `${token.ordered ? '•' : '•'}  ${plain(item.text)}`,
          { indent: 12, paragraphGap: 4 },
        );
      }
      doc.moveDown(0.5);
      break;

    case 'code':
      doc.fontSize(6).text(token.text, { indent: 12 });
      doc.fontSize(8).moveDown();
      break;

    case 'blockquote':
      doc.fontSize(8).text(plain(token.text), { indent: 20 });
      doc.moveDown();
      break;

    case 'hr':
      doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown();
      break;
  }
}

doc.end();
await finished(stream);
