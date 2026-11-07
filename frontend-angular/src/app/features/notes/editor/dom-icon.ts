import type { DOMOutputSpec } from '@tiptap/pm/model';
import type { IconNode } from 'lucide';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SVG_ATTRS = {
  width: '16',
  height: '16',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  focusable: 'false',
};

/** Icone Lucide sous forme de specification ProseMirror (renderHTML), sans passer par du HTML brut. */
export function iconSpec(icon: IconNode): DOMOutputSpec {
  return [
    `${SVG_NS} svg`,
    SVG_ATTRS,
    ...icon.map(([tag, attrs]) => [`${SVG_NS} ${tag}`, stringAttrs(attrs)] as DOMOutputSpec),
  ] as DOMOutputSpec;
}

/** Icone Lucide construite avec l'API DOM (vues de noeuds). */
export function iconElement(icon: IconNode): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [k, v] of Object.entries(SVG_ATTRS)) svg.setAttribute(k, v);
  for (const [tag, attrs] of icon) {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(stringAttrs(attrs))) child.setAttribute(k, v);
    svg.appendChild(child);
  }
  return svg;
}

function stringAttrs(attrs: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, String(v)]));
}
