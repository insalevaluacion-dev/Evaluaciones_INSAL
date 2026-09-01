-- ═══════════════════════════════════════════════════════════════════
-- Corrección de DATOS (no de esquema) en evaluaciones.niveles
-- ═══════════════════════════════════════════════════════════════════
-- La columna 'nombre' contenía números ('1', '2', '3', '4') y el texto
-- presentable vivía en 'descripcion'. Ahora 'nombre' es el texto que se
-- muestra en el selector "Tipo de evaluación" de /seleccion y en el
-- panel de rúbricas. 'descripcion' NO se modifica.
--
-- Ejecutar en Railway (pestaña Query) o con psql ANTES de probar
-- /seleccion, ya que la vista lee estos nombres directamente.

UPDATE evaluaciones.niveles SET nombre = 'Expo de Logros'           WHERE nivel_id = 1;
UPDATE evaluaciones.niveles SET nombre = 'Expotecnia - Primer año'  WHERE nivel_id = 2;
UPDATE evaluaciones.niveles SET nombre = 'Expotecnia - Segundo año' WHERE nivel_id = 3;
UPDATE evaluaciones.niveles SET nombre = 'Expotecnia - Tercer año'  WHERE nivel_id = 4;

-- Verificación: los 4 nombres deben ser legibles
SELECT nivel_id, nombre FROM evaluaciones.niveles ORDER BY nivel_id;
