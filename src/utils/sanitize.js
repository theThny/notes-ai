import DOMPurify from 'dompurify';

/**
 * Higieniza strings para evitar ataques XSS.
 * Remove iframes, scripts e links do tipo javascript:
 */
export const cleanText = (dirty) => {
  if (!dirty) return '';
  if (typeof dirty !== 'string') return dirty;

  return DOMPurify.sanitize(dirty, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus', 'onblur'],
    ALLOW_DATA_ATTR: true,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    ADD_TAGS: ['img', 'mark', 'span', 'div', 'h3', 'p'],
    ADD_ATTR: ['style', 'data-color', 'src', 'alt', 'title', 'class']
  });
};
