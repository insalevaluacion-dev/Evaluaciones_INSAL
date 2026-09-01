-- ═══════════════════════════════════════════════════════════════════
-- Eliminación en cascada (a nivel de DATOS) de la rúbrica de prueba
-- "Rubrica 5" (nivel_id = 5, solo existe en la BD local)
-- ═══════════════════════════════════════════════════════════════════
-- Las FK hacia evaluaciones.niveles NO tienen ON DELETE CASCADE
-- (criterios_nivel_id_fkey y proyectos_nivel_id_fkey usan NO ACTION),
-- por lo que el borrado se hace manualmente en orden inverso de
-- dependencias, dentro de una transacción. Sin cambios de esquema.
--
-- Orden de dependencias (quién referencia a quién):
--   niveles ← criterios ← evaluacion_criterios → evaluaciones ← proyectos
--                                                proyectos ← estudiantes

-- ─────────────────────────────────────────────────────────
-- PASO 0 (opcional): previsualizar cuántas filas se borrarán
-- Ejecutar solo este bloque primero para revisar.
-- ─────────────────────────────────────────────────────────
SELECT
    (SELECT count(*) FROM evaluaciones.criterios
        WHERE nivel_id = 5)                                              AS criterios,
    (SELECT count(*) FROM evaluaciones.proyectos
        WHERE nivel_id = 5)                                              AS proyectos,
    (SELECT count(*) FROM evaluaciones.estudiantes est
        JOIN evaluaciones.proyectos p ON est.proyecto_id = p.proyecto_id
        WHERE p.nivel_id = 5)                                            AS estudiantes_en_proyectos,
    (SELECT count(*) FROM evaluaciones.evaluaciones e
        JOIN evaluaciones.proyectos p ON e.proyecto_id = p.proyecto_id
        WHERE p.nivel_id = 5)                                            AS evaluaciones,
    (SELECT count(*) FROM evaluaciones.evaluacion_criterios ec
        JOIN evaluaciones.evaluaciones e ON ec.evaluacion_id = e.evaluacion_id
        JOIN evaluaciones.proyectos p ON e.proyecto_id = p.proyecto_id
        WHERE p.nivel_id = 5)                                            AS detalles_evaluacion;

-- ─────────────────────────────────────────────────────────
-- Borrado en cascada (transacción: todo o nada)
-- ─────────────────────────────────────────────────────────
BEGIN;

-- Guardia de seguridad: abortar si el nivel 5 no es la rúbrica de prueba
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM evaluaciones.niveles
        WHERE nivel_id = 5 AND nombre = 'Rubrica 5'
    ) THEN
        RAISE EXCEPTION 'El nivel 5 no es "Rubrica 5". Revisa antes de borrar.';
    END IF;
END $$;

-- 1. Detalles de criterios: de las evaluaciones de proyectos del nivel 5
--    Y de los criterios propios de la rúbrica 5
DELETE FROM evaluaciones.evaluacion_criterios
WHERE evaluacion_id IN (
        SELECT e.evaluacion_id
        FROM evaluaciones.evaluaciones e
        JOIN evaluaciones.proyectos p ON e.proyecto_id = p.proyecto_id
        WHERE p.nivel_id = 5
    )
   OR criterio_id IN (
        SELECT criterio_id FROM evaluaciones.criterios WHERE nivel_id = 5
    );

-- 2. Evaluaciones (cabeceras) de proyectos del nivel 5
DELETE FROM evaluaciones.evaluaciones
WHERE proyecto_id IN (
    SELECT proyecto_id FROM evaluaciones.proyectos WHERE nivel_id = 5
);

-- 3. Estudiantes asignados a proyectos del nivel 5
DELETE FROM evaluaciones.estudiantes
WHERE proyecto_id IN (
    SELECT proyecto_id FROM evaluaciones.proyectos WHERE nivel_id = 5
);

-- 4. Proyectos del nivel 5
DELETE FROM evaluaciones.proyectos WHERE nivel_id = 5;

-- 5. Criterios de la rúbrica 5
DELETE FROM evaluaciones.criterios WHERE nivel_id = 5;

-- 6. La rúbrica de prueba
DELETE FROM evaluaciones.niveles
WHERE nivel_id = 5 AND nombre = 'Rubrica 5';

COMMIT;

-- ─────────────────────────────────────────────────────────
-- Verificación: deben quedar solo los 4 niveles reales
-- ─────────────────────────────────────────────────────────
SELECT nivel_id, nombre FROM evaluaciones.niveles ORDER BY nivel_id;
