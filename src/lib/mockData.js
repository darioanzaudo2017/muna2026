// 12 sections templates with icons
export const SECCIONES_MOCK = [
  { id: 1, nombre: 'Datos generales', orden: 1, icon: 'domain' },
  { id: 2, nombre: 'Datos socioeconómicos', orden: 2, icon: 'analytics' },
  { id: 3, nombre: 'Primera infancia', orden: 3, icon: 'child_care' },
  { id: 4, nombre: 'Inclusión educativa', orden: 4, icon: 'school' },
  { id: 5, nombre: 'Salud sexual y reproductiva', orden: 5, icon: 'favorite' },
  { id: 6, nombre: 'Entornos saludables', orden: 6, icon: 'forest' }, // Will have no active questions
  { id: 7, nombre: 'Entornos libres de violencia', orden: 7, icon: 'shield' },
  { id: 8, nombre: 'Discapacidad', orden: 8, icon: 'accessible' },
  { id: 9, nombre: 'Medio ambiente', orden: 9, icon: 'public' },
  { id: 10, nombre: 'Participación', orden: 10, icon: 'groups' },
  { id: 11, nombre: 'Articulación sector privado', orden: 11, icon: 'handshake' }, // Will have no active questions
  { id: 12, nombre: 'Protección digital', orden: 12, icon: 'security' },
]

// Mock questions for the 12 sections
export const PREGUNTAS_MOCK = [
  // Section 1: Datos generales
  { 
    id: 1, 
    id_seccion: 1, 
    orden: 1, 
    codigo: 'gen_01', 
    texto: '¿Hay algún espacio donde las áreas municipales se junten a trabajar temas de niñez?', 
    tipo: 'opcion', 
    requerida: true, 
    activa: true,
    opciones_pregunta: [
      { id: 101, etiqueta: 'Sí, formalizado por ordenanza', valor: 'si_formalizado', orden: 1 },
      { id: 102, etiqueta: 'Sí, mesa de trabajo informal', valor: 'si_informal', orden: 2 },
      { id: 103, etiqueta: 'No, trabajan por separado', valor: 'no', orden: 3 },
      { id: 104, etiqueta: 'En proceso de conformación', valor: 'en_proceso', orden: 4 }
    ]
  },
  { 
    id: 2, 
    id_seccion: 1, 
    orden: 2, 
    codigo: 'gen_02', 
    texto: '¿Cuál es el área de niñez oficial del municipio?', 
    tipo: 'texto', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 3, 
    id_seccion: 1, 
    orden: 3, 
    codigo: 'gen_03', 
    texto: '¿Cuál es la densidad poblacional del municipio? (hab/km²)', 
    tipo: 'numero', 
    requerida: false, 
    activa: true, 
    opciones_pregunta: [] 
  },

  // Section 2: Datos socioeconómicos
  { 
    id: 4, 
    id_seccion: 2, 
    orden: 1, 
    codigo: 'soc_01', 
    texto: '¿Cuenta el municipio con un censo o registro actualizado de hogares vulnerables?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 5, 
    id_seccion: 2, 
    orden: 2, 
    codigo: 'soc_02', 
    texto: 'Porcentaje estimado de Necesidades Básicas Insatisfechas (NBI) en el municipio:', 
    tipo: 'numero', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },

  // Section 3: Primera infancia
  { 
    id: 6, 
    id_seccion: 3, 
    orden: 1, 
    codigo: 'inf_01', 
    texto: '¿Cuántos Centros de Desarrollo Infantil (CDI) o guarderías públicas funcionan actualmente?', 
    tipo: 'numero', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 7, 
    id_seccion: 3, 
    orden: 2, 
    codigo: 'inf_02', 
    texto: 'Indique los servicios de primera infancia disponibles de manera gratuita en el municipio:', 
    tipo: 'array', 
    requerida: false, 
    activa: true,
    opciones_pregunta: [
      { id: 301, etiqueta: 'Estimulación temprana', valor: 'estimulacion', orden: 1 },
      { id: 302, etiqueta: 'Lactarios públicos o espacios de lactancia', valor: 'lactancia', orden: 2 },
      { id: 303, etiqueta: 'Control de crecimiento y desarrollo', valor: 'control_crecimiento', orden: 3 },
      { id: 304, etiqueta: 'Asistencia alimentaria complementaria', valor: 'alimento', orden: 4 }
    ]
  },

  // Section 4: Inclusión educativa
  { 
    id: 8, 
    id_seccion: 4, 
    orden: 1, 
    codigo: 'edu_01', 
    texto: '¿Qué iniciativas de reinserción escolar se aplican en el nivel secundario?', 
    tipo: 'texto', 
    requerida: false, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 9, 
    id_seccion: 4, 
    orden: 2, 
    codigo: 'edu_02', 
    texto: 'Tasa de deserción escolar anual estimada en el nivel medio (%):', 
    tipo: 'numero', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },

  // Section 5: Salud sexual y reproductiva
  { 
    id: 10, 
    id_seccion: 5, 
    orden: 1, 
    codigo: 'sal_01', 
    texto: '¿Cuenta el municipio con consejerías o asesorías de salud sexual específicas para adolescentes?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 11, 
    id_seccion: 5, 
    orden: 2, 
    codigo: 'sal_02', 
    texto: '¿Cuáles son los métodos anticonceptivos que se distribuyen activamente en los centros de salud locales?', 
    tipo: 'array', 
    requerida: false, 
    activa: true,
    opciones_pregunta: [
      { id: 501, etiqueta: 'Preservativos', valor: 'preservativos', orden: 1 },
      { id: 502, etiqueta: 'Anticonceptivos orales (pastillas)', valor: 'pastillas', orden: 2 },
      { id: 503, etiqueta: 'Anticonceptivos inyectables', valor: 'inyectables', orden: 3 },
      { id: 504, etiqueta: 'Implante subdérmico (chip)', valor: 'implante', orden: 4 }
    ]
  },

  // Section 6: Entornos saludables - NO ACTIVE QUESTIONS (To test fallback logic)
  { 
    id: 12, 
    id_seccion: 6, 
    orden: 1, 
    codigo: 'ent_01', 
    texto: '¿Existe un plan de manejo de residuos urbanos?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: false, 
    opciones_pregunta: [] 
  },

  // Section 7: Entornos libres de violencia
  { 
    id: 13, 
    id_seccion: 7, 
    orden: 1, 
    codigo: 'vio_01', 
    texto: '¿Hay un protocolo municipal aprobado para la atención de casos de maltrato o abuso infantil?', 
    tipo: 'opcion', 
    requerida: true, 
    activa: true,
    opciones_pregunta: [
      { id: 701, etiqueta: 'Sí, formalizado e implementado', valor: 'si_formal', orden: 1 },
      { id: 702, etiqueta: 'Sí, pero sin presupuesto o personal suficiente', valor: 'si_deficiente', orden: 2 },
      { id: 703, etiqueta: 'No formalizado (se derivan directamente)', valor: 'no_derivado', orden: 3 }
    ]
  },
  { 
    id: 14, 
    id_seccion: 7, 
    orden: 2, 
    codigo: 'vio_02', 
    texto: 'Número de denuncias por violencia intrafamiliar o hacia NNyA recibidas en el último trimestre:', 
    tipo: 'numero', 
    requerida: false, 
    activa: true, 
    opciones_pregunta: [] 
  },

  // Section 8: Discapacidad
  { 
    id: 15, 
    id_seccion: 8, 
    orden: 1, 
    codigo: 'dis_01', 
    texto: '¿Tiene el municipio una oficina, dirección o área específica de atención a personas con discapacidad?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 16, 
    id_seccion: 8, 
    orden: 2, 
    codigo: 'dis_02', 
    texto: 'Describa las principales barreras de accesibilidad urbana identificadas en plazas y escuelas públicas:', 
    tipo: 'texto', 
    requerida: false, 
    activa: true, 
    opciones_pregunta: [] 
  },

  // Section 9: Medio ambiente
  { 
    id: 17, 
    id_seccion: 9, 
    orden: 1, 
    codigo: 'amb_01', 
    texto: '¿Cuenta el municipio con programas activos de educación ambiental en escuelas primarias locales?', 
    tipo: 'boolean', 
    requerida: false, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 18, 
    id_seccion: 9, 
    orden: 2, 
    codigo: 'amb_02', 
    texto: '¿Cuáles son los principales focos de riesgo de contaminación ambiental identificados en el ejido municipal?', 
    tipo: 'array', 
    requerida: true, 
    activa: true,
    opciones_pregunta: [
      { id: 901, etiqueta: 'Basurales a cielo abierto o informales', valor: 'basurales', orden: 1 },
      { id: 902, etiqueta: 'Efluentes cloacales o industriales sin tratar', valor: 'efluentes', orden: 2 },
      { id: 903, etiqueta: 'Uso de agroquímicos cercano a zonas pobladas', valor: 'agroquimicos', orden: 3 },
      { id: 904, etiqueta: 'Ninguno / Zonas seguras controladas', valor: 'ninguno', orden: 4 }
    ]
  },

  // Section 10: Participación
  { 
    id: 19, 
    id_seccion: 10, 
    orden: 1, 
    codigo: 'par_01', 
    texto: '¿Existe un Consejo Local de Niñez y Adolescencia funcionando activamente?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 20, 
    id_seccion: 10, 
    orden: 2, 
    codigo: 'par_02', 
    texto: 'Frecuencia de reuniones del Consejo Local o espacio de debate participativo de niñez:', 
    tipo: 'opcion', 
    requerida: false, 
    activa: true,
    opciones_pregunta: [
      { id: 1001, etiqueta: 'Semanal / Quincenal', valor: 'semanal_quincenal', orden: 1 },
      { id: 1002, etiqueta: 'Mensual', valor: 'mensual', orden: 2 },
      { id: 1003, etiqueta: 'Bimestral / Trimestral', valor: 'trimestral', orden: 3 },
      { id: 1004, etiqueta: 'Irregular o a demanda', valor: 'irregular', orden: 4 }
    ]
  },

  // Section 11: Articulación sector privado - NO ACTIVE QUESTIONS
  { 
    id: 21, 
    id_seccion: 11, 
    orden: 1, 
    codigo: 'pri_01', 
    texto: '¿Hay convenios con empresas privadas para inserción laboral joven?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: false, 
    opciones_pregunta: [] 
  },

  // Section 12: Protección digital
  { 
    id: 22, 
    id_seccion: 12, 
    orden: 1, 
    codigo: 'dig_01', 
    texto: '¿Se realizan talleres periódicos de ciudadanía digital y prevención de grooming/ciberbullying en escuelas?', 
    tipo: 'boolean', 
    requerida: true, 
    activa: true, 
    opciones_pregunta: [] 
  },
  { 
    id: 23, 
    id_seccion: 12, 
    orden: 2, 
    codigo: 'dig_02', 
    texto: 'Cantidad de plazas o espacios públicos con conectividad Wifi municipal gratuita y segura para NNyA:', 
    tipo: 'numero', 
    requerida: false, 
    activa: true, 
    opciones_pregunta: [] 
  },
]
