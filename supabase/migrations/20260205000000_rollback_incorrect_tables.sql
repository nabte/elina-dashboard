-- Eliminar tablas incorrectas creadas por error en la migración de optimizaciones
DROP TABLE IF EXISTS preset_responses CASCADE;
DROP TABLE IF EXISTS auto_tags CASCADE;
DROP TABLE IF EXISTS objections CASCADE;
