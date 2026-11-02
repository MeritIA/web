import type { VacanteAbierta } from '../modelos';

/**
 * Catálogo de ejemplo para la pantalla de explorar. Empresas y ofertas ficticias.
 * Desaparece cuando el backend ofrezca vacantes abiertas.
 */
export const CATALOGO_SIMULADO: VacanteAbierta[] = [
  {
    id: 'sim-0001',
    titulo: 'Desarrollador backend Node.js',
    empresa: 'Andina Pagos',
    sector: 'financiero',
    ubicacion: 'Bogotá · híbrido',
    modalidad: 'híbrido',
    descripcion:
      'Construirás servicios de conciliación y pagos en Node.js y TypeScript. Trabajas con un equipo pequeño que revisa todo el código en pareja.',
    tecnologias: ['Node.js', 'TypeScript', 'PostgreSQL'],
    ejercicios: 2,
    intentosPorEjercicio: 2,
    publicadaEn: '2026-10-26T15:00:00.000Z',
    cierreEstimado: '2026-12-15T23:59:59.000Z',
  },
  {
    id: 'sim-0002',
    titulo: 'Analista de datos de obra',
    empresa: 'Constructora Páramo',
    sector: 'construccion',
    ubicacion: 'Medellín · presencial',
    modalidad: 'presencial',
    descripcion:
      'Limpiarás y modelarás datos de avance de obra para anticipar retrasos. Se valora SQL sólido y criterio para comunicar hallazgos.',
    tecnologias: ['SQL', 'Python', 'Power BI'],
    ejercicios: 1,
    intentosPorEjercicio: 1,
    publicadaEn: '2026-10-28T15:00:00.000Z',
    cierreEstimado: '2026-11-30T23:59:59.000Z',
  },
  {
    id: 'sim-0003',
    titulo: 'Ingeniero de calidad (QA automatizado)',
    empresa: 'Lumen Salud',
    sector: 'salud',
    ubicacion: 'Remoto · Colombia',
    modalidad: 'remoto',
    descripcion:
      'Diseñarás la estrategia de pruebas de una plataforma de citas médicas y automatizarás los flujos críticos de punta a punta.',
    tecnologias: ['Playwright', 'TypeScript', 'CI/CD'],
    ejercicios: 2,
    intentosPorEjercicio: 3,
    publicadaEn: '2026-10-30T15:00:00.000Z',
    cierreEstimado: null,
  },
  {
    id: 'sim-0004',
    titulo: 'Desarrollador frontend Angular',
    empresa: 'Cumbre Educación',
    sector: 'educacion',
    ubicacion: 'Remoto · LATAM',
    modalidad: 'remoto',
    descripcion:
      'Evolucionarás un campus virtual usado por 40 000 estudiantes. Accesibilidad y rendimiento son parte del trabajo, no un extra.',
    tecnologias: ['Angular', 'RxJS', 'SCSS'],
    ejercicios: 1,
    intentosPorEjercicio: 2,
    publicadaEn: '2026-11-01T15:00:00.000Z',
    cierreEstimado: '2026-12-20T23:59:59.000Z',
  },
  {
    id: 'sim-0005',
    titulo: 'Ingeniero de datos junior',
    empresa: 'Río Energía',
    sector: 'energia',
    ubicacion: 'Cali · híbrido',
    modalidad: 'híbrido',
    descripcion:
      'Mantendrás los pipelines que consolidan lecturas de medidores inteligentes. Aprenderás orquestación y calidad de datos con un mentor.',
    tecnologias: ['Python', 'Airflow', 'SQL'],
    ejercicios: 2,
    intentosPorEjercicio: 2,
    publicadaEn: '2026-11-02T12:00:00.000Z',
    cierreEstimado: '2027-01-10T23:59:59.000Z',
  },
];
