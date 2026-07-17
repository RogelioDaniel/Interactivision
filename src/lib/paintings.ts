/* Interactivision — datos de las obras.
   Cada obra es generativa: se pinta en la GPU con su paleta.
   Para usar pinturas reales del cliente: ver README.md */

export interface Work {
  id: string;
  title: string;
  meta: string;
  desc: string;
  alt: string;
  seed: number;
  zoom: number;
  angle: number;
  /** [base oscura, media, acento, luz, gesso/borde] */
  palette: [string, string, string, string, string];
}

export const WORKS: Work[] = [
  {
    id: "nocturno-del-puerto",
    title: "Nocturno del puerto",
    meta: "Óleo y pigmento mineral · 130 × 162 cm · 2026",
    desc: "Agua quieta y luz de mercurio. El azul ultramar se hunde hasta volverse casi negro; el oro aparece solo donde el ojo insiste.",
    alt: "Pintura abstracta en azules profundos con vetas doradas, evocando un puerto de noche.",
    seed: 7.31,
    zoom: 2.6,
    angle: 0.35,
    palette: ["#0A1626", "#14324F", "#2E4BC6", "#C9A227", "#EDE7D8"],
  },
  {
    id: "bermellon-en-reposo",
    title: "Bermellón en reposo",
    meta: "Óleo sobre lino · 97 × 130 cm · 2025",
    desc: "Un rojo que ya no grita: respira. Capas de alizarina sobre tierra quemada, con el gesso asomando en los bordes como piel.",
    alt: "Pintura abstracta en rojos cálidos y tierras oscuras con destellos anaranjados.",
    seed: 21.87,
    zoom: 2.2,
    angle: -0.6,
    palette: ["#1C0E0C", "#6E1F14", "#D9481C", "#F2B279", "#EDE7D8"],
  },
  {
    id: "campo-de-ocres",
    title: "Campo de ocres",
    meta: "Temple y cera fría · 114 × 146 cm · 2025",
    desc: "La tarde entera cabe en cuatro tierras. Siena, sombra y un amarillo que se acuerda del trigo.",
    alt: "Pintura abstracta en ocres, sienas y amarillos terrosos, como un campo al atardecer.",
    seed: 42.05,
    zoom: 3.1,
    angle: 1.2,
    palette: ["#241A10", "#7A5222", "#C9973B", "#E8D9A8", "#EDE7D8"],
  },
  {
    id: "jardin-sumergido",
    title: "Jardín sumergido",
    meta: "Óleo sobre tabla · 122 × 152 cm · 2026",
    desc: "Verdes que crecen hacia abajo. Un jardín visto desde el fondo del estanque, con la luz llegando tarde y en silencio.",
    alt: "Pintura abstracta en verdes profundos y esmeralda con toques de celadón pálido.",
    seed: 63.44,
    zoom: 2.4,
    angle: -1.1,
    palette: ["#0B1F1A", "#14523F", "#2E8C6A", "#9AD9B0", "#EDE7D8"],
  },
  {
    id: "retrato-del-viento",
    title: "Retrato del viento",
    meta: "Pigmento y aglutinante · 89 × 116 cm · 2025",
    desc: "Lo único que el viento deja posar para su retrato: grises de Payne, lavanda de tormenta y una línea de tiza que se escapa.",
    alt: "Pintura abstracta en grises azulados y lavanda con trazos claros de tiza.",
    seed: 84.19,
    zoom: 2.9,
    angle: 0.8,
    palette: ["#14161C", "#3A4356", "#7B8BB0", "#D8DCE8", "#EDE7D8"],
  },
  {
    id: "brasa-y-ceniza",
    title: "Brasa y ceniza",
    meta: "Óleo y carbón · 130 × 162 cm · 2026",
    desc: "Lo que queda cuando el fuego acepta terminar. Carbón, ceniza tibia y una última brasa que se niega.",
    alt: "Pintura abstracta en carbones y cenizas con un naranja de brasa encendida.",
    seed: 99.73,
    zoom: 2.0,
    angle: -0.25,
    palette: ["#17110F", "#3B3835", "#C2451E", "#8C8377", "#EDE7D8"],
  },
];
