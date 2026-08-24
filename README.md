# NutriEdu Mobile

Aplicacion movil de NutriEdu para Android e iOS. Usa React Native, Expo SDK 54, Expo Router y TypeScript, y consume la misma API Express que la aplicacion web. SDK 54 se mantiene temporalmente para probar con la version publica de Expo Go disponible en dispositivos fisicos.

## Estado actual

Implementado:

- login contra `POST /api/users/login`;
- registro con inicio de sesion automatico;
- solicitud de recuperacion de contrasena;
- restauracion de sesion al iniciar la app;
- JWT almacenado con Expo SecureStore en Android e iOS;
- rutas publicas y protegidas con Expo Router;
- resumen de perfil desde `GET /api/profile`;
- edicion de datos personales, actividad y habitos alimentarios;
- calendario nativo para seleccionar la fecha de nacimiento;
- ayuda contextual para interpretar estilos alimentarios;
- seleccion priorizada de objetivos nutricionales;
- gestion y busqueda de condiciones clinicas y restricciones alimentarias;
- edicion manual de metas y limites nutricionales;
- navegacion inferior para perfil, recetas, analisis, plan y compras;
- recetas recomendadas, ingredientes y evaluacion personalizada;
- exploracion de recetas por nombre o descripcion, nivel de salud y rango de calorias;
- paginacion de recetas en bloques de 12 con carga incremental, refresco y proteccion contra respuestas obsoletas;
- filtros reutilizados en el selector de recetas del planificador;
- base i18n con recursos estructurados y espanol como unico idioma habilitado en esta version;
- recursos ingleses de navegacion, recetas y notificaciones conservados solo como trabajo de desarrollo, sin selector publico hasta completar UI, catalogos y mensajes del backend;
- plan semanal editable con busqueda de recetas compatibles;
- guardado atomico del plan y validacion de sus 21 espacios desde la API;
- lista de compras sincronizada con el plan y estado local persistente;
- formularios ajustables al teclado para mantener visibles las busquedas inferiores;
- captura desde camara o galeria con permisos, vista previa y validacion de imagen;
- intake multipart autenticado sin retencion de la imagen;
- normalizacion local a JPEG antes del procesamiento visual externo;
- consentimiento explicito por imagen cuando existe un proveedor configurado;
- resultado estructurado con plato, ingredientes, nutrientes, confianza e incertidumbres;
- correccion de ingredientes y reevaluacion contra el perfil clinico;
- correccion manual de porcion y los ocho nutrientes del analisis;
- resultado de desarrollo para probar la revision visual sin costo de IA;
- limite diario visible para analisis y bloqueo cuando se agota el cupo;
- captura o seleccion de documentos medicos PDF, JPEG y PNG;
- consentimiento especifico e intake autenticado de documentos sin retencion ni cambios del perfil;
- revision estructurada de medicamentos, posibles condiciones, indicaciones y metas nutricionales;
- aceptacion individual, correccion y descarte de hallazgos sin aplicar cambios al perfil;
- vista previa exacta de condiciones y metas antes de modificar el perfil;
- confirmacion final con hash, aplicacion transaccional y registro de auditoria;
- medicamentos e indicaciones sin campo equivalente visibles como hallazgos no aplicables;
- historial medico con detalle estructurado, estado, expiracion y paginacion;
- eliminacion confirmada de revisiones no aplicadas sin modificar el perfil;
- centro de privacidad con politica de retencion e historial medico;
- eliminacion permanente de cuenta con contrasena, checkbox y confirmacion nativa;
- cierre de sesion y borrado del JWT local despues de eliminar la cuenta;
- bandeja de notificaciones con paginacion, no leidas, marcar una o todas y navegacion interna segura;
- preferencias de notificacion por categoria, selector buscable de zona horaria IANA, horas silenciosas y horarios de comidas, plan y compras;
- recordatorios locales diarios y semanales con permiso explicito, reprogramacion, horas silenciosas y navegacion al tocar el aviso;
- eventos internos de bienvenida y actualizacion del plan sin push ni costo externo;
- extraccion de desarrollo para probar el flujo medico sin IA ni costo;
- invalidacion visual de scores y alertas mientras existan correcciones pendientes;
- estados de carga, error, perfil incompleto y actualizacion manual;
- exportacion correcta para Android, iOS y web.

Siguiente bloque:

- inspeccionar Supabase y registrar o aplicar solo migraciones que superen la verificacion correspondiente;
- definir contenido localizado para catalogos, recetas y alertas del backend antes de habilitar ingles;
- completar la migracion i18n de autenticacion, perfil, analisis, plan, compras y documentos;
- probar recordatorios locales en un development build real, todavia sin push remoto.

## Requisitos

- Node.js LTS;
- Expo Go en Android o iOS, o un simulador local;
- backend NutriEdu accesible desde el dispositivo.

## Configuracion

```bash
cd nutriedu-mobile
npm install
cp .env.example .env
```

Configura la API:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3002/api
```

Un telefono fisico no puede acceder al backend del computador mediante `localhost`. Usa la IP local del computador y conecta ambos dispositivos a la misma red. Para probar contra produccion puedes usar:

```env
EXPO_PUBLIC_API_URL=https://nutriedu-backend.onrender.com/api
```

Reinicia Expo cuando cambies variables de entorno.

## Ejecucion

```bash
npm start -- --lan --clear
```

Escanea el codigo QR con Expo Go. En iOS tambien puedes escanearlo con la aplicacion Camara. Tambien puedes ejecutar:

```bash
npm run android
npm run ios
npm run web
```

## Validacion

```bash
npm run typecheck
npm run lint
npx expo export --platform all
```

## Builds nativos con EAS

La identidad nativa reservada es `com.xrhon0s.nutriedu` para Android e iOS. `eas.json` separa tres perfiles:

- `development`: cliente interno para probar modulos nativos;
- `preview`: APK/distribucion interna para aceptacion;
- `production`: build de stores con version incremental administrada por EAS.

`expo-dev-client` y los modulos nativos de notificaciones ya estan instalados. Para producir el primer development build se autentica EAS y se vincula el proyecto, sin guardar tokens en el repositorio:

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build --profile development --platform android
```

Las variables publicas por ambiente se configuran en EAS; `EXPO_PUBLIC_API_URL` puede formar parte del bundle, pero nunca debe contener secretos.

### Estado actual de distribucion

- Android funciona durante desarrollo mediante Expo Go.
- La configuracion EAS, `expo-dev-client`, notificaciones nativas e identidades de Android/iOS estan preparadas localmente.
- La cuenta Expo todavia no esta autenticada en esta maquina (`npx eas-cli whoami` devuelve `Not logged in`).
- El proyecto aun no esta vinculado a EAS y no existe un APK/AAB independiente generado.
- El siguiente gate es completar `npx eas-cli login`, ejecutar `npx eas-cli init` y crear el build Android `development`.

## Estructura inicial

```txt
src/
├── app/
│   ├── (app)/
│   │   ├── recipes/
│   │   │   ├── [id].tsx
│   │   │   ├── _layout.tsx
│   │   │   └── index.tsx
│   │   ├── _layout.tsx
│   │   ├── analyze.tsx
│   │   ├── medical-documents.tsx
│   │   ├── notifications.tsx
│   │   ├── plan.tsx
│   │   ├── profile.tsx
│   │   └── shopping.tsx
│   ├── _layout.tsx
│   ├── forgot-password.tsx
│   ├── index.tsx
│   ├── login.tsx
│   └── register.tsx
├── components/
│   ├── auth-form.tsx
│   ├── date-field.native.tsx
│   ├── date-field.tsx
│   ├── food-analysis-review.tsx
│   ├── profile-controls.tsx
│   ├── recipe-card.tsx
│   ├── recipe-filters.tsx
│   ├── recipe-picker-modal.tsx
│   └── screen-state.tsx
├── constants/
│   └── nutriedu-theme.ts
├── context/
│   └── auth-context.tsx
├── i18n/
│   ├── index.ts
│   └── locales/
│       ├── en.ts
│       └── es.ts
├── services/
    ├── api.ts
    └── storage.ts
└── types/
    └── api.ts
```

## Seguridad

- La app nunca guarda la contrasena.
- En Android e iOS, el JWT se almacena mediante Expo SecureStore.
- El backend obtiene la identidad desde el JWT y no confia en IDs enviados por la app.
- El backend rechaza recetas inexistentes o incompatibles con las restricciones al guardar el plan.
- El plan semanal se reemplaza dentro de una transaccion para evitar guardados parciales.
- Las imagenes del intake se validan en memoria y se descartan; actualmente no existe almacenamiento de fotos.
- El analisis externo requiere consentimiento por imagen y la API key permanece exclusivamente en el backend.
- Los archivos medicos se validan en memoria y se descartan. Tras revision explicita, solo los hallazgos estructurados y los cambios confirmados se conservan para auditoria.
- `EXPO_PUBLIC_API_URL` no debe contener secretos; las variables `EXPO_PUBLIC_*` forman parte del bundle.

## Dependencias conocidas

`npm audit` informa vulnerabilidades moderadas y altas en dependencias transitivas de las herramientas Expo. La correccion automatica propone cambios incompatibles con el SDK seleccionado, por lo que no se aplico `npm audit fix --force`. Deben revisarse al migrar a un development build y actualizar Expo.
