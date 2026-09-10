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
- recetas recomendadas mediante ranking explicable por restricciones, objetivos, condiciones, metas y preferencias;
- detalle de receta con alertas y alternativas seguras limitadas a la misma funcion culinaria;
- exploracion de recetas por nombre o descripcion, nivel de salud y rango de calorias;
- paginacion de recetas en bloques de 12 con carga incremental, refresco y proteccion contra respuestas obsoletas;
- filtros reutilizados en el selector de recetas del planificador;
- base i18n con recursos estructurados y espanol como unico idioma habilitado en esta version;
- recursos ingleses de navegacion, recetas y notificaciones conservados solo como trabajo de desarrollo, sin selector publico hasta completar UI, catalogos y mensajes del backend;
- plan semanal editable con busqueda de recetas compatibles;
- guardado atomico del plan y validacion de sus 21 espacios desde la API;
- reevaluacion de recetas guardadas al cargar el plan, bloqueo de incompatibilidades y acceso a sus alternativas;
- confirmacion antes de descartar cambios locales mediante actualizacion manual;
- lista de compras detallada, agrupada por familia alimentaria y sincronizada con el plan;
- cantidades agregadas en gramos o unidades, recetas de origen y aviso de datos incompletos;
- progreso de compras persistente por usuario y firma del plan, con vistas de todos o pendientes;
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
- completar nutrientes y porciones auditables del catalogo de recetas para elevar la confianza del ranking;
- validar en dispositivo fisico compras detalladas y alternativas de recetas con un perfil restringido;
- definir contenido localizado para catalogos, recetas y alertas del backend antes de habilitar ingles;
- completar la migracion i18n de autenticacion, perfil, analisis y documentos;
- completar la aceptacion de recordatorios locales en Android e iOS, todavia sin push remoto.

## Requisitos

- Node.js LTS;
- NutriEdu development build en Android para validar modulos nativos; Expo Go puede usarse solo para flujos compatibles;
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

- Android funciona durante desarrollo mediante el development build de NutriEdu conectado a Metro.
- La configuracion EAS, `expo-dev-client`, notificaciones nativas e identidades de Android/iOS estan preparadas localmente.
- La maquina esta autenticada como `apol0x` y el proyecto esta vinculado a [`@apol0x/nutriedu-mobile`](https://expo.dev/accounts/apol0x/projects/nutriedu-mobile).
- EAS administra el `versionCode` remoto y las credenciales Android; el primer keystore ya fue creado.
- El primer build Android `development` finalizo correctamente con ID `75dec52a-0a97-45b6-9d29-d94b333eaf20`; su artefacto ya expiro y debe generarse un build nuevo para reinstalarlo.
- El development client carga JavaScript desde Metro y usa el `EXPO_PUBLIC_API_URL` del `.env` local; no es un APK autonomo de produccion.
- El backend productivo ya expone perfil, notificaciones, analisis y lista de compras detallada. Antes de cada build `preview` o `production` se debe ejecutar la matriz de aceptacion contra Render.
- Los canales OTA se mantienen fuera de `eas.json` hasta instalar y configurar `expo-updates` de forma deliberada.

Despues de instalar el development client en Android, se inicia Metro con:

```bash
npm run android:lan
```

Este comando detecta la IP privada actual del Mac, actualiza el `.env` local ignorado por Git, comprueba la API en el puerto `3002`, muestra la URL manual para Android e inicia Metro. El telefono y la maquina deben compartir red.

### Instalar y probar el development build en Android

1. Abrir el enlace de EAS Build desde el telefono Android y descargar el APK.
2. Autorizar temporalmente la instalacion desde el navegador o gestor de archivos cuando Android lo solicite.
3. Instalar y abrir NutriEdu. Esta version contiene `expo-dev-client`, por lo que espera un servidor Metro.
4. En la maquina, confirmar que el backend corre y que `.env` contiene una IP LAN alcanzable desde el telefono.
5. Iniciar Metro y copiar la URL manual mostrada:

```bash
npm run android:lan
```

6. Escanear el QR o abrir el proyecto desde el launcher de NutriEdu.
7. En Preferencias > Notificaciones, usar **Probar notificacion ahora** y confirmar el aviso de cinco segundos.
8. Guardar horarios y confirmar que un recordatorio real abre Plan o Compras.

Android 12 o posterior requiere `android.permission.SCHEDULE_EXACT_ALARM` para avisos programados a una hora exacta. La configuracion nativa ya declara ese permiso, pero cualquier cambio en `app.json` requiere generar e instalar un APK nuevo. La prueba de cinco segundos usa un intervalo corto para diagnosticar por separado el permiso general, el canal y la presentacion del aviso.

NutriEdu development client y Expo Go son aplicaciones distintas. El mensaje `Project is incompatible with this version of Expo Go` demuestra que el enlace se abrio con Expo Go: cerrar esa aplicacion y abrir directamente **NutriEdu** desde el launcher de Android. Si Android pregunta con que aplicacion abrir el enlace, elegir NutriEdu, no Expo Go.

El artefacto anterior expiro el 7 de septiembre de 2026. El registro permanece en EAS, pero para una nueva instalacion es necesario generar otro APK.

### Cuando el telefono no encuentra Metro

La IP LAN puede cambiar al alternar entre Wi-Fi y hotspot. En macOS, obtener la direccion actual con:

```bash
ipconfig getifaddr en0
```

Usar esa misma IP en `.env` para `EXPO_PUBLIC_API_URL` y al iniciar Metro:

```bash
REACT_NATIVE_PACKAGER_HOSTNAME=<IP_LAN> npx expo start --dev-client
```

Desde el telefono, abrir `http://<IP_LAN>:3002/api/users/restrictions`. Una respuesta JSON o HTTP `401` demuestra que el backend es alcanzable. Luego introducir `http://<IP_LAN>:8081` en el launcher del development client. Si Metro no registra ningun intento, revisar que ambos dispositivos compartan Wi-Fi y que no exista VPN, red de invitados o aislamiento entre clientes.

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
