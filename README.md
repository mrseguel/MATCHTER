# Matchter

La rama `main` contiene el código fuente de la beta de revisión de Matchter. La demo usa datos ficticios.

[Ver la beta](https://matchter-beta-revision.vercel.app/)

## Reproducir la beta

Usa una copia de trabajo limpia. Desde la raíz, ejecuta:

```sh
npm install
node scripts/build-demo.cjs
```

El segundo comando aplica las transformaciones históricas de la beta, ejecuta las pruebas y genera `client/dist`. Modifica archivos de la copia durante la compilación. Para repetir el proceso utiliza otra copia limpia.

Los 167 archivos de la aplicación se recuperaron del despliegue `dpl_Fn9VgwMR96Fz8bBp7UukQPRqesYx`. Las versiones anteriores se conservan en el historial de Git. El despliegue de referencia carecía de un archivo de bloqueo de dependencias.
