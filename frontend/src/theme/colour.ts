/**
 * The colour arithmetic a theme of your own is worked out with (`derive.ts`) and measured with
 * (`pairs.ts`): sRGB hex to OKLab and back, WCAG's luminance and contrast, one colour laid over
 * another as a browser composites it, and a lightness solved until a colour reads on a ground.
 *
 * Ported from the #28 workshop's `colour.mjs` operation for operation, so a theme made here comes
 * out value for value as the prototype's did, which is what the renders the user picked from
 * showed. OKLab is Björn Ottosson's, with the matrices `palette.test.ts` uses for the genre
 * stripes. The tests that hold index.css to its contrasts keep arithmetic of their own, so a slip
 * here cannot pass the palettes it would be measured against.
 */

export type Rgb = readonly [number, number, number];
export type Lab = readonly [l: number, a: number, b: number];
export type Lch = readonly [l: number, c: number, h: number];

/** A colour as index.css writes a genre stripe: OKLCH, the hue in degrees. */
export interface Oklch {
  readonly l: number;
  readonly c: number;
  readonly h: number;
}

/** `#rrggbb` to its three channels, each 0 to 1 as encoded. */
export function parseHex(hex: string): Rgb {
  const value = hex.trim().replace('#', '');
  const [r, g, b] = [0, 2, 4].map((at) => Number.parseInt(value.slice(at, at + 2), 16) / 255);
  return [r!, g!, b!];
}

/** Three encoded channels to `#rrggbb`, each clipped to the gamut first. */
export function toHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

const decode = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const encode = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

/** WCAG's relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map(decode) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG's contrast ratio, from 1 to 21, either way round. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * One colour laid over another at an opacity, as `bg-danger/10` is painted over a card: the
 * browser composites in sRGB's encoded channels, so the mix is taken there and not in linear
 * light. The result is a ground no token names.
 */
export function over(top: string, bottom: string, opacity: number): string {
  const t = parseHex(top).map((c) => Math.round(c * 255));
  const b = parseHex(bottom).map((c) => Math.round(c * 255));
  return `#${t
    .map((c, i) =>
      Math.round(c * opacity + b[i]! * (1 - opacity))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

export function hexToLab(hex: string): Lab {
  const [r, g, b] = parseHex(hex).map(decode) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Linear sRGB from OKLab, unclipped, so a caller can tell whether it is inside the gamut. */
function labToLinear([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = (linear: Rgb) => linear.every((c) => c >= -1e-4 && c <= 1 + 1e-4);

export function labToHex(lab: Lab): string {
  return toHex(labToLinear(lab).map((c) => encode(Math.min(1, Math.max(0, c)))));
}

/** OKLab to OKLCH: lightness, chroma, and the hue in degrees from 0 to 360. */
export const lch = ([L, a, b]: Lab): Lch => [
  L,
  Math.hypot(a, b),
  ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
];

export const fromLch = ([L, c, h]: Lch): Lab => [
  L,
  c * Math.cos((h * Math.PI) / 180),
  c * Math.sin((h * Math.PI) / 180),
];

/**
 * OKLCH to `#rrggbb`, with the chroma taken down until the colour is inside sRGB: roughly what
 * CSS Color 4 does, keeping the lightness and the hue that were asked for.
 */
export function lchToHex([L, c, h]: Lch): string {
  if (inGamut(labToLinear(fromLch([L, c, h])))) {
    return labToHex(fromLch([L, c, h]));
  }

  let lo = 0;
  let hi = c;
  for (let i = 0; i < 30; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(labToLinear(fromLch([L, mid, h])))) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return labToHex(fromLch([L, lo, h]));
}

/** Where `t` lands on the line from `x` to `y` in OKLab: how far along it, and how far off it. */
export function project(x: string, y: string, t: string): { u: number; off: number } {
  const [a, b, p] = [hexToLab(x), hexToLab(y), hexToLab(t)];
  const d = b.map((v, i) => v - a[i]!);
  const len2 = d.reduce((sum, v) => sum + v * v, 0);
  const u =
    len2 === 0 ? 0 : p.map((v, i) => v - a[i]!).reduce((sum, v, i) => sum + v * d[i]!, 0) / len2;
  const on = a.map((v, i) => v + d[i]! * u);
  return { u, off: 100 * Math.hypot(...p.map((v, i) => v - on[i]!)) };
}

/**
 * The lightness at a hue and chroma whose contrast with `ground` is at least `target`, as near the
 * ground as that allows, on the side `side` names: `above` lighter, `below` darker. If no
 * lightness on that side reaches the target, the furthest there is, and `reached` false.
 */
export function solveLightness(
  { c, h }: { c: number; h: number },
  ground: string,
  target: number,
  side: 'above' | 'below',
): { hex: string; reached: boolean } {
  const at = (L: number) => lchToHex([L, c, h]);
  const groundL = lch(hexToLab(ground))[0];
  let [lo, hi] = side === 'above' ? [groundL, 1] : [0, groundL];
  const far = side === 'above' ? 1 : 0;
  if (contrast(at(far), ground) < target) {
    return { hex: at(far), reached: false };
  }

  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    const reads = contrast(at(mid), ground) >= target;
    if (side === 'above') {
      if (reads) {
        hi = mid;
      } else {
        lo = mid;
      }
    } else if (reads) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return { hex: at(side === 'above' ? hi : lo), reached: true };
}

/**
 * WCAG's relative luminance of an OKLCH colour: OKLab, then linear sRGB clipped to the gamut, as
 * `palette.test.ts` measures a genre stripe.
 */
export function oklchLuminance({ l, c, h }: Oklch): number {
  const rad = (h * Math.PI) / 180;
  const [a, b] = [c * Math.cos(rad), c * Math.sin(rad)];
  const [long, medium, short] = [
    l + 0.3963377774 * a + 0.2158037573 * b,
    l - 0.1055613458 * a - 0.0638541728 * b,
    l - 0.0894841775 * a - 1.291485548 * b,
  ].map((cone) => cone ** 3) as [number, number, number];
  const [red, green, blue] = [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map((channel) => Math.min(1, Math.max(0, channel))) as [number, number, number];

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
