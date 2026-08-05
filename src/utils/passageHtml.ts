/**
 * Convert passage content (which may be plain text or HTML) into safe HTML for rendering.
 * - If the content already contains HTML tags, it is returned as-is.
 * - Otherwise, plain text is converted to <p> paragraphs (double newlines) with <br> line breaks.
 */
export function passageToHtml(text: string): string {
  if (!text) return '';
  if (/<\s*(p|div|h[1-6]|br|li|blockquote|table|span|b|strong|i|em|u|ul|ol)[\s>]/i.test(text)) {
    return text;
  }
  return text
    .split(/\n{2,}/)
    .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
