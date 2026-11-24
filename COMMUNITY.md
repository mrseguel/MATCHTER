# Comunidad MATCHTER — propuesta e implementación de demo
Solicitado: comunidad vertical de videos para los cuatro tipos de cuenta; trabajos, avances, resultados, oficios; seguir, likes de contenido, comentarios, mensajes privados y solicitudes de contratación.
Esta rama experimental parte del diseño aprobado. No modifica main ni demo/diseno-aprobado. Acceso adicional Videos en cabecera; ubicación e icono nuevos sujetos a validación visual.
La demo tiene reproducción vertical, carga de videos locales (sin subirlos a internet), ejemplos claramente identificados sin video, publicaciones propias, seguir, comentarios, solicitudes de mensajes sociales y aceptación/rechazo, ocultar y eliminar; contratación llama al flujo privado existente. Likes sociales no crean matches. No hay persistencia después de salir/recargar ni interacción entre dispositivos. No hay autenticación real ni moderación efectiva. No publicar información privada real.
Para producción: autenticación y autorización por rol, almacenamiento de objetos con URLs firmadas, límites de tamaño, transcodificación y miniaturas, CDN, moderación y reportes, bloqueo, privacidad, modelo de datos de publicaciones, seguidores, reacciones, comentarios, hilos y mensajes sociales, feed y paginación, pruebas e2e y presupuesto de infraestructura. Mensajería de contratación y comunidad se mantienen separadas.

## Revisión de navegación y experiencia solicitada
Título Match Play. Menú inferior: Community, Contratos, Explorar, Mensajes, Reclamos, Mi perfil. Portafolio y Wallet se abren desde Mi perfil. El acceso de contacto en videos es discreto, debajo de la descripción, y abre el chat social con opciones editables para solicitar presupuesto o hablar sobre un proyecto; no abre formulario ni envía nada automáticamente. El destinatario acepta o rechaza la primera solicitud de mensaje. Las contrataciones de Explorar conservan el flujo anterior. Compartir usa el menú nativo si está disponible, o copia la descripción; los videos locales no tienen URL pública. Mensajes permite abrir la bandeja de Community. Los datos continúan siendo temporales en la demo. Pendiente validación de navegador y Vercel.

## Nombre elegido
Match Play es el nombre de la sección de videos y su etiqueta en el menú inferior. Se conservan la navegación, diseño y funcionalidades anteriores.

## Videos ilustrativos para Match Play
Se incorporan cuatro clips verticales de Pexels como ejemplos de prueba, con enlaces originales y créditos visibles. La atribución no implica que sus autores sean usuarios de MATCHTER ni que los perfiles de demostración hayan realizado esos trabajos. Los botones de servicio y conversaciones son únicamente simulaciones. Licencia: https://www.pexels.com/license/ . No redistribuir los archivos originales como un banco de stock. El reproductor carga desde las URLs de medios derivadas de los enlaces de descarga públicos; no se han copiado archivos a GitHub. Si falla la reproducción, aparece un enlace al original. La reproducción y el peso real deben validarse en Vercel; no se ha verificado la reproducción de los MP4 en esta sesión.
- Mikael Blomkvist: https://www.pexels.com/video/a-man-drilling-a-wood-8965566/ (4 s).
- RECALL FROM THE FUTURE :): https://www.pexels.com/video/workers-on-building-construction-11567463/ (20 s).
- shakar adalat: https://www.pexels.com/video/a-man-in-a-yellow-vest-is-painting-a-wall-17998566/ (14 s).
- Fernanda Neitzel: https://www.pexels.com/video/modern-black-kitchen-interior-design-34292920/ (6 s).
