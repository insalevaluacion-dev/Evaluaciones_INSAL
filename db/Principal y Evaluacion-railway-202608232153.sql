--
-- PostgreSQL database dump
--

\restrict iZt6gIZ1wETF3OObo5CefeWTSBCgeVTUapIoIYdVaeVdYOmmhkClckIAQenIwHN

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg13+2)
-- Dumped by pg_dump version 18.4

-- Started on 2026-08-23 21:53:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 6 (class 2615 OID 25990)
-- Name: evaluaciones; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA evaluaciones;


ALTER SCHEMA evaluaciones OWNER TO postgres;

--
-- TOC entry 7 (class 2615 OID 25991)
-- Name: principal; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA principal;


ALTER SCHEMA principal OWNER TO postgres;

--
-- TOC entry 259 (class 1255 OID 26023)
-- Name: fn_set_actualizado_en(); Type: FUNCTION; Schema: principal; Owner: postgres
--

CREATE FUNCTION principal.fn_set_actualizado_en() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION principal.fn_set_actualizado_en() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 231 (class 1259 OID 26263)
-- Name: criterios; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.criterios (
    criterio_id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion character varying(255) NOT NULL,
    porcentaje smallint NOT NULL,
    nivel_id integer NOT NULL,
    CONSTRAINT criterios_porcentaje_check CHECK (((porcentaje >= 1) AND (porcentaje <= 100)))
);


ALTER TABLE evaluaciones.criterios OWNER TO postgres;

--
-- TOC entry 3684 (class 0 OID 0)
-- Dependencies: 231
-- Name: TABLE criterios; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.criterios IS 'Rubros de calificación con su peso porcentual por nivel de evaluación';


--
-- TOC entry 232 (class 1259 OID 26272)
-- Name: criterios_criterio_id_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.criterios ALTER COLUMN criterio_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.criterios_criterio_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 233 (class 1259 OID 26273)
-- Name: estudiantes; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.estudiantes (
    estudiante_id integer NOT NULL,
    proyecto_id integer NOT NULL,
    grado_id integer NOT NULL,
    asistencia boolean
);


ALTER TABLE evaluaciones.estudiantes OWNER TO postgres;

--
-- TOC entry 3685 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE estudiantes; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.estudiantes IS 'Alumnos participantes por proyecto con registro de asistencia';


--
-- TOC entry 3686 (class 0 OID 0)
-- Dependencies: 233
-- Name: COLUMN estudiantes.asistencia; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON COLUMN evaluaciones.estudiantes.asistencia IS 'TRUE=presente, FALSE=ausente, NULL=sin registrar';


--
-- TOC entry 234 (class 1259 OID 26279)
-- Name: estudiantes_estudiante_id_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.estudiantes ALTER COLUMN estudiante_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.estudiantes_estudiante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 235 (class 1259 OID 26280)
-- Name: evaluacion_criterios; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.evaluacion_criterios (
    id_evaluacion_criterio integer NOT NULL,
    criterio_id integer NOT NULL,
    evaluacion_id integer,
    puntuacion numeric(4,1) NOT NULL,
    CONSTRAINT evaluacion_criterios_puntuacion_check CHECK ((puntuacion >= (0)::numeric))
);


ALTER TABLE evaluaciones.evaluacion_criterios OWNER TO postgres;

--
-- TOC entry 3687 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE evaluacion_criterios; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.evaluacion_criterios IS 'Detalle de puntuación por criterio dentro de una evaluación';


--
-- TOC entry 236 (class 1259 OID 26287)
-- Name: evaluacion_criterios_id_evaluacion_criterio_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.evaluacion_criterios ALTER COLUMN id_evaluacion_criterio ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.evaluacion_criterios_id_evaluacion_criterio_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 237 (class 1259 OID 26288)
-- Name: evaluaciones; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.evaluaciones (
    evaluacion_id integer NOT NULL,
    evaluador_id integer NOT NULL,
    proyecto_id integer NOT NULL,
    fecha_evaluacion timestamp with time zone DEFAULT now() NOT NULL,
    nota_evaluacion numeric(4,1),
    CONSTRAINT evaluaciones_nota_evaluacion_check CHECK (((nota_evaluacion >= (0)::numeric) AND (nota_evaluacion <= (10)::numeric)))
);


ALTER TABLE evaluaciones.evaluaciones OWNER TO postgres;

--
-- TOC entry 3688 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE evaluaciones; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.evaluaciones IS 'Cabecera de cada acto de evaluación: juez, proyecto y nota final';


--
-- TOC entry 3689 (class 0 OID 0)
-- Dependencies: 237
-- Name: COLUMN evaluaciones.nota_evaluacion; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON COLUMN evaluaciones.evaluaciones.nota_evaluacion IS 'Nota total de la evaluación; rango 0-10';


--
-- TOC entry 238 (class 1259 OID 26297)
-- Name: evaluaciones_evaluacion_id_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.evaluaciones ALTER COLUMN evaluacion_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.evaluaciones_evaluacion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 239 (class 1259 OID 26298)
-- Name: evaluadores; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.evaluadores (
    evaluador_id integer NOT NULL,
    nombre character varying(65) NOT NULL,
    email character varying(65) NOT NULL
);


ALTER TABLE evaluaciones.evaluadores OWNER TO postgres;

--
-- TOC entry 3690 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE evaluadores; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.evaluadores IS 'Jueces internos y externos; email único para evitar duplicados';


--
-- TOC entry 240 (class 1259 OID 26304)
-- Name: evaluadores_evaluador_id_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.evaluadores ALTER COLUMN evaluador_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.evaluadores_evaluador_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 241 (class 1259 OID 26305)
-- Name: niveles; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.niveles (
    nivel_id integer NOT NULL,
    nombre character varying(50),
    descripcion text
);


ALTER TABLE evaluaciones.niveles OWNER TO postgres;

--
-- TOC entry 3691 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE niveles; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.niveles IS 'Tipos de evaluación: Expo de Logros y Expotecnia por año';


--
-- TOC entry 242 (class 1259 OID 26311)
-- Name: niveles_nivel_id_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.niveles ALTER COLUMN nivel_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.niveles_nivel_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 243 (class 1259 OID 26312)
-- Name: proyectos; Type: TABLE; Schema: evaluaciones; Owner: postgres
--

CREATE TABLE evaluaciones.proyectos (
    proyecto_id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    grado_id integer NOT NULL,
    nota numeric(5,2),
    nivel_id integer NOT NULL,
    CONSTRAINT proyectos_nota_check CHECK (((nota >= (0)::numeric) AND (nota <= (10)::numeric)))
);


ALTER TABLE evaluaciones.proyectos OWNER TO postgres;

--
-- TOC entry 3692 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE proyectos; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON TABLE evaluaciones.proyectos IS 'Proyectos presentados por grado en cada tipo de evaluación';


--
-- TOC entry 3693 (class 0 OID 0)
-- Dependencies: 243
-- Name: COLUMN proyectos.nota; Type: COMMENT; Schema: evaluaciones; Owner: postgres
--

COMMENT ON COLUMN evaluaciones.proyectos.nota IS 'Promedio calculado de las evaluaciones; puede actualizarse con un trigger';


--
-- TOC entry 244 (class 1259 OID 26320)
-- Name: proyectos_proyecto_id_seq; Type: SEQUENCE; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE evaluaciones.proyectos ALTER COLUMN proyecto_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME evaluaciones.proyectos_proyecto_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 223 (class 1259 OID 26084)
-- Name: bachilleratos; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.bachilleratos (
    bachillerato_id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE principal.bachilleratos OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 26321)
-- Name: bachilleratos_bachillerato_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

CREATE SEQUENCE principal.bachilleratos_bachillerato_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE principal.bachilleratos_bachillerato_id_seq OWNER TO postgres;

--
-- TOC entry 3694 (class 0 OID 0)
-- Dependencies: 245
-- Name: bachilleratos_bachillerato_id_seq; Type: SEQUENCE OWNED BY; Schema: principal; Owner: postgres
--

ALTER SEQUENCE principal.bachilleratos_bachillerato_id_seq OWNED BY principal.bachilleratos.bachillerato_id;


--
-- TOC entry 221 (class 1259 OID 26055)
-- Name: estudiantes; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.estudiantes (
    estudiante_id integer NOT NULL,
    nie character varying(10) NOT NULL,
    grado_id integer NOT NULL,
    anio_escolar smallint NOT NULL,
    estado boolean DEFAULT true NOT NULL,
    genero character varying(10) NOT NULL,
    fecha_nacimiento date,
    edad integer,
    bachillerato_id integer,
    direccion text,
    departamento character varying(100),
    municipio character varying(100),
    telefono_residencia character varying(15),
    correo_electronico character varying(150),
    telefono_movil character varying(15),
    nombre_completo character varying(150),
    CONSTRAINT estudiantes_anio_escolar_check CHECK ((anio_escolar >= 2000))
);


ALTER TABLE principal.estudiantes OWNER TO postgres;

--
-- TOC entry 3695 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE estudiantes; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON TABLE principal.estudiantes IS 'Alumnos inscritos; historial por ciclo con campo activo';


--
-- TOC entry 3696 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN estudiantes.nie; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON COLUMN principal.estudiantes.nie IS 'Número de Identificación Estudiantil — formato XXXXXXXX-D';


--
-- TOC entry 3697 (class 0 OID 0)
-- Dependencies: 221
-- Name: COLUMN estudiantes.anio_escolar; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON COLUMN principal.estudiantes.anio_escolar IS 'Ciclo de inscripción; no se modifica, se archiva con activo=FALSE';


--
-- TOC entry 246 (class 1259 OID 26322)
-- Name: estudiantes_estudiante_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

ALTER TABLE principal.estudiantes ALTER COLUMN estudiante_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME principal.estudiantes_estudiante_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 247 (class 1259 OID 26323)
-- Name: familiares; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.familiares (
    familiar_id integer NOT NULL,
    estudiante_id integer NOT NULL,
    tipo_familiar character varying(20) NOT NULL,
    nombres_apellidos character varying(150) NOT NULL,
    dui character varying(10),
    direccion text,
    telefono character varying(15)
);


ALTER TABLE principal.familiares OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 26332)
-- Name: familiares_familiar_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

CREATE SEQUENCE principal.familiares_familiar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE principal.familiares_familiar_id_seq OWNER TO postgres;

--
-- TOC entry 3698 (class 0 OID 0)
-- Dependencies: 248
-- Name: familiares_familiar_id_seq; Type: SEQUENCE OWNED BY; Schema: principal; Owner: postgres
--

ALTER SEQUENCE principal.familiares_familiar_id_seq OWNED BY principal.familiares.familiar_id;


--
-- TOC entry 222 (class 1259 OID 26068)
-- Name: grados; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.grados (
    grado_id integer NOT NULL,
    niveles_estudio_id integer NOT NULL,
    bachillerato_id integer NOT NULL,
    seccion_id integer NOT NULL,
    turno_id integer NOT NULL,
    anio integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE principal.grados OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 26333)
-- Name: grados_grado_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

CREATE SEQUENCE principal.grados_grado_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE principal.grados_grado_id_seq OWNER TO postgres;

--
-- TOC entry 3699 (class 0 OID 0)
-- Dependencies: 249
-- Name: grados_grado_id_seq; Type: SEQUENCE OWNED BY; Schema: principal; Owner: postgres
--

ALTER SEQUENCE principal.grados_grado_id_seq OWNED BY principal.grados.grado_id;


--
-- TOC entry 226 (class 1259 OID 26110)
-- Name: maestros; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.maestros (
    maestro_id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    contrasena text NOT NULL,
    materia_id integer,
    turno_id integer,
    rol_id integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp with time zone DEFAULT now() NOT NULL,
    email character varying(255),
    contrasena_plana character varying(255),
    rol_sesion character varying(20),
    orientador_declinado boolean DEFAULT false NOT NULL
);


ALTER TABLE principal.maestros OWNER TO postgres;

--
-- TOC entry 3700 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE maestros; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON TABLE principal.maestros IS 'Todos los usuarios del sistema: director, admins, secretarias y maestros';


--
-- TOC entry 3701 (class 0 OID 0)
-- Dependencies: 226
-- Name: COLUMN maestros.contrasena; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON COLUMN principal.maestros.contrasena IS 'Hash bcrypt/argon2 — NUNCA texto plano';


--
-- TOC entry 250 (class 1259 OID 26334)
-- Name: maestros_maestro_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

ALTER TABLE principal.maestros ALTER COLUMN maestro_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME principal.maestros_maestro_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 227 (class 1259 OID 26131)
-- Name: materias; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.materias (
    materia_id integer CONSTRAINT materia_materia_id_not_null NOT NULL,
    nombre_materia character varying(100) CONSTRAINT materia_nombre_materia_not_null NOT NULL
);


ALTER TABLE principal.materias OWNER TO postgres;

--
-- TOC entry 3702 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE materias; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON TABLE principal.materias IS 'Catálogo de asignaturas de la institución';


--
-- TOC entry 251 (class 1259 OID 26335)
-- Name: materias_materia_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

ALTER TABLE principal.materias ALTER COLUMN materia_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME principal.materias_materia_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 26091)
-- Name: niveles_estudios; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.niveles_estudios (
    niveles_estudios_id integer NOT NULL,
    nombre character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE principal.niveles_estudios OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 26336)
-- Name: niveles_estudios_niveles_estudios_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

CREATE SEQUENCE principal.niveles_estudios_niveles_estudios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE principal.niveles_estudios_niveles_estudios_id_seq OWNER TO postgres;

--
-- TOC entry 3703 (class 0 OID 0)
-- Dependencies: 252
-- Name: niveles_estudios_niveles_estudios_id_seq; Type: SEQUENCE OWNED BY; Schema: principal; Owner: postgres
--

ALTER SEQUENCE principal.niveles_estudios_niveles_estudios_id_seq OWNED BY principal.niveles_estudios.niveles_estudios_id;


--
-- TOC entry 253 (class 1259 OID 26337)
-- Name: orientaciones_log; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.orientaciones_log (
    log_id integer NOT NULL,
    maestro_id integer NOT NULL,
    grado_id_anterior integer,
    grado_id_nuevo integer,
    anio_escolar smallint NOT NULL,
    fecha_cambio timestamp with time zone DEFAULT now() NOT NULL,
    motivo character varying(255)
);


ALTER TABLE principal.orientaciones_log OWNER TO postgres;

--
-- TOC entry 3704 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE orientaciones_log; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON TABLE principal.orientaciones_log IS 'Bitácora de cambios de orientador por grado y ciclo';


--
-- TOC entry 254 (class 1259 OID 26345)
-- Name: orientaciones_log_log_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

ALTER TABLE principal.orientaciones_log ALTER COLUMN log_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME principal.orientaciones_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 26183)
-- Name: orientadores; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.orientadores (
    orientador_id integer NOT NULL,
    maestro_id integer NOT NULL,
    grado_id integer NOT NULL,
    anio_escolar integer NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE principal.orientadores OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 26346)
-- Name: orientadores_orientador_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

CREATE SEQUENCE principal.orientadores_orientador_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE principal.orientadores_orientador_id_seq OWNER TO postgres;

--
-- TOC entry 3705 (class 0 OID 0)
-- Dependencies: 255
-- Name: orientadores_orientador_id_seq; Type: SEQUENCE OWNED BY; Schema: principal; Owner: postgres
--

ALTER SEQUENCE principal.orientadores_orientador_id_seq OWNED BY principal.orientadores.orientador_id;


--
-- TOC entry 229 (class 1259 OID 26213)
-- Name: roles; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.roles (
    rol_id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    estado boolean DEFAULT true NOT NULL
);


ALTER TABLE principal.roles OWNER TO postgres;

--
-- TOC entry 3706 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE roles; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON TABLE principal.roles IS 'Tipos de usuario: director y administrador';


--
-- TOC entry 256 (class 1259 OID 26347)
-- Name: roles_rol_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

ALTER TABLE principal.roles ALTER COLUMN rol_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME principal.roles_rol_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 225 (class 1259 OID 26098)
-- Name: secciones; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.secciones (
    seccion_id integer NOT NULL,
    letra character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE principal.secciones OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 26348)
-- Name: secciones_seccion_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

CREATE SEQUENCE principal.secciones_seccion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE principal.secciones_seccion_id_seq OWNER TO postgres;

--
-- TOC entry 3707 (class 0 OID 0)
-- Dependencies: 257
-- Name: secciones_seccion_id_seq; Type: SEQUENCE OWNED BY; Schema: principal; Owner: postgres
--

ALTER SEQUENCE principal.secciones_seccion_id_seq OWNED BY principal.secciones.seccion_id;


--
-- TOC entry 230 (class 1259 OID 26239)
-- Name: turnos; Type: TABLE; Schema: principal; Owner: postgres
--

CREATE TABLE principal.turnos (
    turno_id integer CONSTRAINT turno_turno_id_not_null NOT NULL,
    nombre character varying(50) CONSTRAINT turno_nombre_not_null NOT NULL
);


ALTER TABLE principal.turnos OWNER TO postgres;

--
-- TOC entry 3708 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE turnos; Type: COMMENT; Schema: principal; Owner: postgres
--

COMMENT ON TABLE principal.turnos IS 'Turnos disponibles: Matutino y Vespertino';


--
-- TOC entry 258 (class 1259 OID 26349)
-- Name: turnos_turno_id_seq; Type: SEQUENCE; Schema: principal; Owner: postgres
--

ALTER TABLE principal.turnos ALTER COLUMN turno_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME principal.turnos_turno_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 3385 (class 2604 OID 26357)
-- Name: bachilleratos bachillerato_id; Type: DEFAULT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.bachilleratos ALTER COLUMN bachillerato_id SET DEFAULT nextval('principal.bachilleratos_bachillerato_id_seq'::regclass);


--
-- TOC entry 3400 (class 2604 OID 26358)
-- Name: familiares familiar_id; Type: DEFAULT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.familiares ALTER COLUMN familiar_id SET DEFAULT nextval('principal.familiares_familiar_id_seq'::regclass);


--
-- TOC entry 3383 (class 2604 OID 26359)
-- Name: grados grado_id; Type: DEFAULT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.grados ALTER COLUMN grado_id SET DEFAULT nextval('principal.grados_grado_id_seq'::regclass);


--
-- TOC entry 3387 (class 2604 OID 26360)
-- Name: niveles_estudios niveles_estudios_id; Type: DEFAULT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.niveles_estudios ALTER COLUMN niveles_estudios_id SET DEFAULT nextval('principal.niveles_estudios_niveles_estudios_id_seq'::regclass);


--
-- TOC entry 3395 (class 2604 OID 26361)
-- Name: orientadores orientador_id; Type: DEFAULT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.orientadores ALTER COLUMN orientador_id SET DEFAULT nextval('principal.orientadores_orientador_id_seq'::regclass);


--
-- TOC entry 3389 (class 2604 OID 26362)
-- Name: secciones seccion_id; Type: DEFAULT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.secciones ALTER COLUMN seccion_id SET DEFAULT nextval('principal.secciones_seccion_id_seq'::regclass);


--
-- TOC entry 3651 (class 0 OID 26263)
-- Dependencies: 231
-- Data for Name: criterios; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--

INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (1, 'Presentación', 'La presentación personal (corte de cabello es el adecuado para la ocasión, su vestuario de manera ordenada, limpia y de acuerdo con el proyecto; se dirige de forma adecuada y respetuosa).', 10, 1);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (2, 'Diseño', 'Defiende su proyecto de forma coherente, creativa e innovadora.', 20, 1);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (3, 'Funcionamiento y aplicación', 'El trabajo presentado está de acuerdo con el contenido programático del área de estudio.', 30, 1);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (4, 'Dominio y control', 'En la defensa del proyecto presenta seguridad, fluidez y dominio del contenido.', 30, 1);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (5, 'Imagen y ambientación', 'La imagen del stand está de acuerdo con el tema desarrollado; su ambientación es agradable haciendo buen uso de los recursos.', 10, 1);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (6, 'Presentación', 'La presentación personal (corte de cabello, el peinado es adecuado, usa vestuario de manera ordenada, limpia y de acuerdo al proyecto que se está exponiendo; se dirige de forma educada y respetuosa).', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (7, 'Diseño y contenido', 'La exposición y defensa de la idea de negocio se hace de forma coherente, con creatividad, innovador y lo puede defender.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (8, 'Descripción', 'Explica de manera clara la descripción del negocio: nombre y ubicación del negocio.', 5, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (9, 'Organigrama', 'Explica el organigrama de integrantes del equipo de manera clara y concisa.', 5, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (10, 'Resumen', 'Presenta un resumen del proyecto: a qué se va a dedicar, cuáles son sus productos principales, precio y proveedores.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (11, 'Ventana de oportunidad', 'Explica la ventana de oportunidad en el mercado (demanda insatisfecha) y socios clave del negocio.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (12, 'Objetivo y misión', 'Presenta el objetivo, la misión, visión, valores y principios de su idea de negocio.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (13, 'Funcionamiento y aplicación', 'El proyecto presentado, está enfocado de acuerdo al ámbito de desarrollo de las competencias del bachillerato técnico que estudia.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (14, 'Informe impreso', 'Presenta informe impreso del emprendimiento.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (15, 'Expresión y dominio', 'Presenta seguridad, fluidez y dominio del proyecto, al explicar cada parte del contenido.', 20, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (16, 'Imagen y ambientación', 'La imagen y la ambientación del stand es la apropiada para el proyecto mostrado, haciendo uso correcto de los recursos.', 10, 2);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (17, 'Presentación', 'La presentación personal (corte de cabello adecuado, el peinado es adecuado, usa vestuario de manera ordenada, limpia y de acuerdo al proyecto; se dirige de forma adecuada y respetuosa).', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (18, 'Diseño y contenido', 'La exposición y defensa de la idea de negocio se hace de forma coherente, con creatividad, innovador y puede defenderlo.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (19, 'Descripción', 'Explica de manera clara la descripción del negocio: identificación, resumen, socios, actividades claves, objetivo, misión, visión y valores empresariales.', 5, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (20, 'Plan de producción', 'Explica el plan de producción: base de proveedores, proceso de compra, proceso de producción, control de calidad.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (21, 'Plan de mercadeo', 'Presenta un resumen del plan de mercadeo: principales competidores, condiciones del mercado, lista de productos/servicios a ofrecer.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (22, 'Plan de organización', 'Presenta el plan de organización: organización y estructura de la gestión.', 5, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (23, 'Plan financiero', 'Presenta el plan financiero de su negocio: estimación de costos, cálculo del precio de venta y punto de equilibrio.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (24, 'Funcionamiento y aplicación', 'El proyecto presentado está enfocado de acuerdo al ámbito de desarrollo de las competencias del bachillerato técnico que estudia.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (25, 'Informe impreso', 'Presenta informe impreso del emprendimiento.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (26, 'Expresión y dominio', 'Presenta seguridad, fluidez, y dominio del proyecto, al explicar cada parte del contenido.', 20, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (27, 'Imagen y ambientación', 'La imagen y la ambientación del stand es la apropiada para el proyecto mostrado, haciendo uso correcto de los recursos.', 10, 3);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (28, 'Presentación', 'La presentación personal (corte de cabello, el peinado es adecuado, usa vestuario de manera ordenada, limpia y de acuerdo al proyecto; se dirige de forma adecuada y respetuosa).', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (29, 'Diseño y contenido', 'La exposición y defensa de la idea de negocio se hace de forma coherente, con creatividad, innovador y puede defenderlo.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (30, 'Descripción', 'Explica de manera clara la descripción del negocio: identificación, resumen, socios, actividades claves, objetivo, misión, visión y valores empresariales.', 5, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (31, 'Plan de producción', 'Explica el plan de producción: base de proveedores, proceso de compra, proceso de producción, control de calidad, distribución en planta.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (32, 'Plan de mercadeo', 'Presenta un resumen del plan de mercadeo: principales competidores, condiciones del mercado, lista de productos/servicios a ofrecer, propuesta de valor del producto, variables de mercado y proceso de venta.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (33, 'Plan de organización', 'Presenta plan de organización: cuadro de los integrantes del equipo, organización y estructura de la gestión.', 5, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (34, 'Plan financiero', 'Presenta el plan financiero de su negocio: estimación de costos, cálculo de precio de venta y punto de equilibrio, proyección en ventas y plan de inversión.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (35, 'Modelo CANVAS', 'Presenta modelo CANVAS.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (36, 'Funcionamiento y aplicación', 'El proyecto presentado está enfocado de acuerdo al ámbito de desarrollo de las competencias del bachillerato técnico que estudia.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (37, 'Informe impreso', 'Presenta informe impreso del emprendimiento.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (38, 'Expresión y dominio', 'Presenta seguridad, fluidez y dominio del proyecto al explicar cada parte del contenido.', 10, 4);
INSERT INTO evaluaciones.criterios OVERRIDING SYSTEM VALUE VALUES (39, 'Imagen y ambientación', 'La imagen y la ambientación del stand es la apropiada para el proyecto mostrado, haciendo uso correcto de los recursos.', 10, 4);


--
-- TOC entry 3653 (class 0 OID 26273)
-- Dependencies: 233
-- Data for Name: estudiantes; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--



--
-- TOC entry 3655 (class 0 OID 26280)
-- Dependencies: 235
-- Data for Name: evaluacion_criterios; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--



--
-- TOC entry 3657 (class 0 OID 26288)
-- Dependencies: 237
-- Data for Name: evaluaciones; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--



--
-- TOC entry 3659 (class 0 OID 26298)
-- Dependencies: 239
-- Data for Name: evaluadores; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--



--
-- TOC entry 3661 (class 0 OID 26305)
-- Dependencies: 241
-- Data for Name: niveles; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--

INSERT INTO evaluaciones.niveles OVERRIDING SYSTEM VALUE VALUES (1, '1', 'Criterios para evaluación de Expo de Logros');
INSERT INTO evaluaciones.niveles OVERRIDING SYSTEM VALUE VALUES (2, '2', 'Criterios para evaluación de Expotecnia para primeros años');
INSERT INTO evaluaciones.niveles OVERRIDING SYSTEM VALUE VALUES (3, '3', 'Criterios para evaluación de Expotecnia de segundos años');
INSERT INTO evaluaciones.niveles OVERRIDING SYSTEM VALUE VALUES (4, '4', 'Criterios de evaluación para Expotecnia de terceros años');


--
-- TOC entry 3663 (class 0 OID 26312)
-- Dependencies: 243
-- Data for Name: proyectos; Type: TABLE DATA; Schema: evaluaciones; Owner: postgres
--



--
-- TOC entry 3643 (class 0 OID 26084)
-- Dependencies: 223
-- Data for Name: bachilleratos; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.bachilleratos VALUES (1, 'Bachillerato GENERAL', '2026-08-21 23:29:30.776168');
INSERT INTO principal.bachilleratos VALUES (2, 'Bachillerato TECNICO PRODUCTIVO EN SALUD Y BIENESTAR SOCIAL', '2026-08-21 23:29:30.776168');
INSERT INTO principal.bachilleratos VALUES (3, 'Bachillerato TECNICO PRODUCTIVO EN SISTEMAS ELECTRICOS Y ENERGIAS RENOVABLES', '2026-08-21 23:29:30.776168');
INSERT INTO principal.bachilleratos VALUES (4, 'Bachillerato TECNICO PRODUCTIVO  EN LOGISTICA COMERCIAL Y GLOBAL', '2026-08-21 23:29:30.776168');
INSERT INTO principal.bachilleratos VALUES (5, 'Bachillerato TECNICO VOCACIONAL ADMINISTRATIVO CONTABLE CONTABLE', '2026-08-21 23:29:30.776168');
INSERT INTO principal.bachilleratos VALUES (6, 'Bachillerato TECNICO VOCACIONAL EN DESARROLLO DE SOFTWARE', '2026-08-21 23:29:30.776168');
INSERT INTO principal.bachilleratos VALUES (7, 'Bachillerato TECNICO VOCACIONAL EN DISEÑO GRAFICO', '2026-08-21 23:29:30.776168');


--
-- TOC entry 3641 (class 0 OID 26055)
-- Dependencies: 221
-- Data for Name: estudiantes; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1, '20088545', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Alfredo Aguilar Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (2, '10176667', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Alexandra Anaya Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (3, '10176668', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Selena Alexandra Argueta Nerio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (4, '2727283', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Wilber Alejandro Bonilla Arce');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (5, '19933687', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Caleb Vladimir Cortez Arias');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (6, '19933689', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alejandro Delgado Padilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (7, '19710121', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Stephany Estrada Castro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (8, '19870763', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Geovani Funes Ventura');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (9, '20161572', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Vanessa Abigail Girales Juarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (10, '10176690', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Reynaldo Isaac Guzman Espinoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (11, '10176691', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria Jose Henriquez Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (12, '4659325', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sarai Abigail Henriquez Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (13, '20001602', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Yanira Areli Hernandez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (14, '4659380', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Roque Amaury Joachin Jimenez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (15, '20147170', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Marvin Alexander Larin Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (16, '4658405', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashley Melanie Lazo Guardado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (17, '20163838', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lizbeth Sarai Lopez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (18, '3984060', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Valeria Lopez Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (19, '19813685', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Rene Ovidio Madriz Serrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (20, '19941409', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Manuel de Jesus Marquez Carranza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (21, '19958930', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Maria Nerio Ortiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (22, '19890057', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Enrique Isai Orellana Aviles');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (23, '4965980', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Benjamin David Palacios Guevara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (24, '19992932', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Eduardo Perez Estrada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (25, '10184185', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Abigail Perez Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (26, '3267414', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Edgardo Pineda Santamaria');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (27, '19989115', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Gabriela Ramirez Castro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (28, '20002002', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emerson Vladimir Ramirez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (29, '19941465', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Allison Michelle Rivas Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (30, '19910372', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Samara Valentina Rivera Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (31, '3269267', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hilary Alessandra Rosales Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (32, '19896557', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Xavier Alexis Ruiz Saldana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (33, '20002106', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Eduardo Salazar Castaneda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (34, '10176722', 1, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristopher Alessandro Santos Quintanilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (35, '5304700', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Silvia Nicole Torres Herrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (36, '20002166', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sofia Alejandra Toruno Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (37, '6955047', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Esmeralda Celeste Velasquez Ortiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (38, '4659781', 1, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Nicolle Zamora Anaya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (39, '19804868', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Wilfredo Alfaro Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (40, '5869131', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gemma Georgina Alfaro Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (41, '4659733', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Milton Adonay Alvarado Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (42, '2727199', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Julissa Andrade Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (43, '4965982', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alejandro Jose Cardenas Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (44, '5304681', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cesar Steven Castro Dominguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (45, '19933688', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Ivonne Coto Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (46, '19804872', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lenny Benjamin Diaz Alvarenga');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (47, '19897228', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Joel Eduardo Escobar Joya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (48, '6371082', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Adriana Escobar Portillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (49, '4931421', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Claudia Elizabeth Flores Granados');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (50, '19785213', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Steven Gomez Jimenez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (51, '5065304', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ruben Alexander Guevara Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (52, '19932235', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Enrique Henriquez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (53, '20147160', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hernan Levi Henriquez Portillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (54, '20161614', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Francisco Jose Lopez Guevara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (55, '19985367', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Steven Lue Cordova');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (56, '19886968', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alejandro Maldonado Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (57, '20001785', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alejandro Melendez Solis');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (58, '19878937', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Leonardo Molina Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (59, '4658121', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alejandro Ernesto Morales Mena');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (60, '19895961', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alma Yadira Morales Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (61, '20163841', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Axel David Orellana Montes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (62, '20114830', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sindy Vanessa Paiz Erroa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (63, '20114831', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Mariela Carolina Pastul Siliezar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (64, '5070021', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Daniel Penate Chavez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (65, '20110691', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Gabriela Perez Urbina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (66, '4658505', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Rafael Pineda Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (67, '4659777', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Immer Jose Ramirez Leon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (68, '6376326', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Guadalupe Rivas Funez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (69, '20091077', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Abigail Romero Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (70, '4976888', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Joel Romero Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (71, '3267525', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Dinora Roque Realegeno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (72, '20163843', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Francisco Adonay Serrano Franco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (73, '10170759', 2, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Mayency Guadalupe Serrano Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (74, '20091658', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Joshua Alberto Tovar Castro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (75, '6658407', 2, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Gabriel Villalta Echeverria');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (76, '4658112', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Vladimir Ardon Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (77, '10176943', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cinthya Betsabe Ayala Banos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (78, '5452324', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Iveth Beltran Barahona');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (79, '19874817', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cesar Eduardo Benitez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (80, '4521263', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nimsi Merisy Bernabe Rauda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (81, '4659375', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emerson Emanuel Bonilla Penado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (82, '4966000', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Samuel Alexander Campos Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (83, '2725942', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emanuel Alexander Carballo Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (84, '3267516', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Mauricio Ernesto Carballo Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (85, '10176946', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lucia Esmeralda Deodanes Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (86, '10277544', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Scarlet Teresa Diaz Sandoval');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (87, '6728289', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Milena Espana Chavez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (88, '3164662', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Pamela Alessandra Flores Mendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (89, '5752965', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gustavo Samuel Fuentes Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (90, '20156294', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Camila Nahomy Galdamez Leon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (91, '20156295', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ivania Crystal Galdamez Leon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (92, '19992901', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Antonio Garcia Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (93, '20081854', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeimy Nicolle Hernandez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (94, '19720187', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alejandra Tatiana Hernandez Mendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (95, '20061959', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Griselda Areli Iraheta Cabrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (96, '20121948', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Milagro Alejandra Lima Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (97, '20001693', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Alejandra Luna Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (98, '20011035', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Laura Lissette Maldonado Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (99, '4965937', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Daniel Martinez Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (100, '20090019', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Estrella Azucena Martinez Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (101, '4658118', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lesly Daniela Martinez Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (102, '19973140', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Benjamin Mejia Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (103, '19941421', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Alexander Mineros Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (104, '4521262', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Valeria Pena Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (105, '19926486', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Daniela Perez Mira');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (106, '10268752', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria Alexandra Portillo Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (107, '19992167', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana Gloria Ramos Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (108, '5304685', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Josseline Beatriz Rivas Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (109, '19906226', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Keiry Vanessa Rivera Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (110, '4658127', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Nahomy Rodriguez Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (111, '4113904', 17, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Gilberto Sanchez Alfaro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (112, '20147224', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sheyla Valeria Sanchez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (113, '20011053', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Abigail Serrano Ardon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (114, '4960155', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Keiry Stephany Velasquez Baires');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (115, '20148328', 17, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Miriam Andrea Zelaya Delgado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (116, '4521255', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Ezequiel Alvarez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (117, '20001248', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Elias Argueta Lobato');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (118, '5070034', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexis Leonel Aviles Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (119, '19874566', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Nicole Aviles Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (120, '19988107', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Isaias Ezequiel Ayala Bonilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (121, '5070101', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Elias Ayala Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (122, '19988736', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Ernesto Barahona Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (123, '19766298', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Vladimir Cadenas Alvarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (124, '20104256', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Josue Castro Blanco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (125, '20147144', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kenneth Alexander Diaz Coreas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (126, '3982164', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Camila Elizabeth Henriquez Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (127, '4931616', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Jahleel Hernandez Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (128, '5070053', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Josue Hernandez Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (129, '19989564', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Israel Juarez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (130, '5070019', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Neftali Alexander Juarez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (131, '4960220', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria Fernanda Lopez Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (132, '5827907', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Noe Lopez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (133, '20001690', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Alejandra Lovo Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (134, '20147175', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'William Ezequiel Marroquin Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (135, '19714760', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kenia Michelle Martinez Arteaga');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (136, '20147177', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Nicole Martinez Chavez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (137, '19868336', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nathaly Marcela Miranda Montoya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (138, '19933702', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Byron Giovanni Monge Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (139, '3714792', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos David Orellana Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (140, '19870903', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hendrick Aran Perez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (141, '4658832', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Guadalupe Perez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (142, '19930909', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Magdalena Pineda Meraz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (143, '20090694', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Armando Ponce Canenguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (144, '5358526', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daira Jezabel Rivas Montano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (145, '20147217', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Dayana Romero Carpio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (146, '2936565', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Adonay Sagastume Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (147, '20002119', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jesica Johana Sanchez Segovia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (148, '4658376', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Steven Santos Vargas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (149, '19989594', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Abner Stanley Sosa Paiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (150, '19813710', 18, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Libny Sarai Texin Palacios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (151, '20091845', 18, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Justin Cristofher Zavaleta Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (152, '19994975', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Gisselle Aguirre Monterrosa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (687, '2725908', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Alexandra Romero Canales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (153, '19874398', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Alexander Alvarez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (154, '4995045', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Abigail Arias Ardon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (155, '5750686', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Moises Alexander Aviles Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (156, '6798338', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Douglas Omar Barahona Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (157, '4659783', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Rene Fernando Chavarria Rosa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (158, '20114805', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Estrella Raquel Claros Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (159, '20001381', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Ricciery Cruz Acevedo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (160, '6537066', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Nicole Cubias Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (161, '5070008', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dennys Stanley Diaz Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (162, '20001411', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Roxana Melissa Diaz Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (163, '4299944', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Madisson Elizabeth Elias Reina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (164, '19868306', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Lissette Flores Marquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (165, '4657905', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Gabriel Garcia Espinal');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (166, '19895925', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Glenda Maria Gonzalez Sermeno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (167, '19895924', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Samaria Guadalupe Gonzalez Sermeno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (168, '4661082', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Bryan Alejandro Gutierrez Marquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (169, '2726035', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Stephanie Lopez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (170, '19732180', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Sarai Martinez Jimenez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (171, '6658273', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremy Stanley Navarrete Coreas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (172, '4657878', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Adrian Novoa Monico');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (173, '20114828', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nelson Andres Oporto Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (174, '5615949', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Marco Antonio Pacheco Ruiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (175, '4658768', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Axel Santiago Ramirez Monterrosa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (176, '4269598', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria de los Angeles Recinos Villalta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (177, '20114840', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Emmanuel Rico Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (178, '20114843', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeimy Aracely Rivas Paiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (179, '4658407', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Blanca Jamileth Rodriguez Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (180, '2936594', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Keily Michelle Roscala Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (181, '10244670', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Nicolle Sanchez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (182, '19756165', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexandra Santos Saravia Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (183, '20158785', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Leonardo Turcios Cortez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (184, '20091682', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Eylin Marisol Urquilla Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (185, '4660288', 19, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Rudy Albeiro Vasquez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (186, '20147234', 19, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashley Nicolle Zelaya Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (187, '19988732', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Lisseth Alvarado Jandres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (188, '19802963', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Priscila Abigail Angel Arucha');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (189, '2726041', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Mauricio Antonio Barrera Argumedo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (190, '19941360', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Manuel Adonay Chanta Burgos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (191, '10241211', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Allison Nicole Claros Mestanza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (192, '19813558', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alejandra Abigail Fernandez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (193, '2955567', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Victoria Melissa Flores Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (194, '20114809', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Marilyn Guadalupe Flores Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (195, '19967157', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gissela Yamileth Fuentes Corvera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (196, '19806341', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Miguel Antonio Guerrero Zaldana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (197, '20147158', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Aura Lilibeth Guevara Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (198, '5068574', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Zoyla Estela Gutierrez Mestanza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (199, '19991377', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Sophia Hernandez Mineros');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (200, '19741420', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lesly Fabiola Hernandez Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (201, '19881961', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Enoc Alexander Herrera Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (202, '19893941', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Darin Stanley Leon Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (203, '6955185', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Ezequiel Lopez Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (204, '5944859', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andre Ariel Melgar Posadas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (205, '19941418', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Briseyda Arely Mena Jarquin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (206, '20090293', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Yamileth Mendez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (207, '20147192', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose David Monge Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (208, '20001890', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Manuel Arnulfo Ortiz Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (209, '2686343', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Marcela Palacios Aguiluz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (210, '19773520', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Alberto Palacios Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (211, '20090760', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dennis Alejandro Quintanilla Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (212, '6688480', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriel Alejandro Rivas Elena');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (213, '20002046', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Samuel Benjamin Rivas Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (214, '19989585', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Derek Javier Rodriguez Bernal');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (215, '4214815', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Fabio Josue Rodriguez de Leon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (216, '6899448', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Victoria Valentina Tamayo Jovel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (217, '6376331', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'David Edgardo Urquilla Luna');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (218, '20038032', 20, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Abigail Valencia Aldana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (219, '6339336', 20, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Oswaldo Villalta Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (220, '10176664', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Mateo Aguilar Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (221, '20088671', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Luis Arana Chinchilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (222, '4658113', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Alexandra Barahona Guerra');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (223, '20025358', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Keyri Yesenia Benitez Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (224, '20161670', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ronald Geovanny Caceres Renderos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (225, '19754663', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima del Carmen Campos Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (226, '4977055', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Esther Castillo Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (227, '19809054', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Roberto Eugenio Cortez Figueroa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (228, '19988742', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Helen Berenice Cruz Gutierrez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (229, '19811451', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Madeline Fabiola Cruz Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (230, '5583967', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Perla Daniela Escobar Barrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (231, '19865755', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Nicole Escobar Sandoval');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (232, '5584038', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Arlyn Adriana Flores Dominguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (233, '10173864', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Stephanie Michelle Flores Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (234, '19867826', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Rocio Garcia Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (235, '20201543', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Andres Giovanni Gonzalez Angel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (236, '19884452', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Adalberto Guerrero Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (237, '20090210', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria de los Angeles Medrano Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (238, '20090225', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Camila Alexandra Mejia Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (239, '19933701', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Eleana Mejia Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (240, '6134566', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Abraham Melara Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (241, '20156304', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Wilbert Alejandro Menjivar Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (242, '20147191', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Marcela Belen Merino Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (243, '4661091', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Joel Isai Osegueda Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (244, '20114834', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Lila Jeannette Pineda Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (245, '19854951', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonatan David Ramirez Alvarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (246, '20090973', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Alejandro Rivera Carcache');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (247, '20011051', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernanda Nicole Rodriguez Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (248, '4661103', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Stephany Sanchez Chicas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (249, '3040868', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Melissa Sanchez Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (250, '20147227', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Stephany Esmeralda Santos Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (251, '7363213', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Allyson Yurisel Solorzano Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (252, '5833413', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana Guadalupe Torres Alvarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (253, '4976915', 4, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Xiomara Guadalupe Vasquez Valle');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (254, '19698199', 4, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Armando Vasquez Callejas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (255, '3383357', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Judit Abimelec Abrego Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (256, '20025353', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Lilian Abigail Aparicio Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (257, '19910926', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Meilyn Consuelo Ayala Paiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (258, '19896916', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Regina Fabiola Ayala Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (259, '6536471', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Nayeli Julieth Barahona Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (260, '19866656', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Valery Tatiana Beltran Melgar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (261, '5062515', 5, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeferson Balmore Bonifacio Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (262, '19813575', 5, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriel Alexander Castillo Medrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (263, '19985356', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Rebeca Abigail Coreas Aquino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (264, '20147137', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Abigail Elisabet Cruz Martir');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (265, '20089393', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Lidia Raquel Flores Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (266, '20147153', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Liset Garcia Villalta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (267, '4658216', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Alejandra Gonzalez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (268, '20161423', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Veronica Sarai Guardado Andrade');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (269, '20001554', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kayla Siloe Guevara Escobar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (270, '10217112', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Nicole Hernandez Aparicio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (271, '4661084', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Raquel Lisbeth Hernandez Farfan');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (272, '4960151', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeniffer Abigail Hernandez Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (273, '6874986', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sarah Alisson Luna Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (274, '20161622', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Josseline Steffany Martinez Mira');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (275, '4960170', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Michelle Alejandra Monterrosa Olivares');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (276, '3267551', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sailor Francesca Munoz Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (277, '19988763', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Elizabeth Azucena Ortiz Gil');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (278, '19990109', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Claudia Margarita Pineda Velasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (279, '20038536', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Veronica Tatiana Ramirez Figueroa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (280, '20094536', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Roxana Lizbeth Ramirez Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (281, '20156314', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Nicolle Ramos Huezo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (282, '19959884', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Danaly Guadalupe Rivera Aparicio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (283, '6955050', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karen Maria Rodriguez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (284, '20002082', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Martha Judith Rodriguez Quintanilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (285, '10176721', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Stephanie Guadalupe Ruiz Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (286, '19862916', 5, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'David Ezequiel Sanchez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (287, '20306341', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Marjorie Alexandra Vasquez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (288, '20091762', 5, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Nallely Vasquez Villanueva');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (289, '19853745', 5, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Alexis Villalta Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (290, '5584020', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Marco Alberto Aguilar Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (291, '19874377', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kennet Isaac Aguilar Oliva');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (292, '10176665', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Santiago Alexander Alvarado Henrriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (293, '20088664', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremy Alexander Aquino Escobar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (294, '10176944', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Axel Ariel Batres Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (295, '20114800', 6, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Iveth Beltran Luna');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (296, '5070096', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Enrique Burgos Munoz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (297, '5066479', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Roberto Jose Cabrera Coreas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (298, '10176945', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Xavier Alexander Castro Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (299, '10176669', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Cesar Eduardo Contreras Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (300, '19906214', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Harold Isaac Cortez Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (301, '19984512', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Erick Enrique de Paz Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (302, '19859203', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Johan Joaquin Elias de la Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (303, '20089333', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Mauricio Steven Figueroa Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (304, '19941379', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Irvin Daniel Flores Silva');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (305, '19868309', 6, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Evelyn Elizabeth Galdamez Portillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (306, '20001493', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Justin Javier Garcia Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (307, '10176684', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Leonardo Josue Garcia Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (308, '20091822', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Alejandro Landaverde Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (309, '20011032', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Ezequiel Adonay Larin Cortez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (310, '10176710', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Josue Lopez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (311, '19988753', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Geovany Lopez Montano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (312, '6796829', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jaime Guillermo Lopez Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (313, '3166674', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Joel Alexander Martinez Ascencio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (314, '19970698', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Charlie Josue Mena Membreno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (315, '19941422', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Vladimir Miranda Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (316, '19941423', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Roberto Carlos Molina Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (317, '10176697', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan David Palacios Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (318, '3267567', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonatan Eliseo Quintanilla Pena');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (319, '19941467', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Adonay Rivera Vela');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (320, '3040853', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Milton Ricardo Rodriguez Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (321, '19956319', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan David Rodriguez Saenz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (322, '19882223', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Eliseo Santamaria Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (323, '10170752', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Angel Seveda Gutierrez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (324, '4658495', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Ademir Torres Aleman');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (325, '4094179', 6, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Eliezer Benjamin Vasquez Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (326, '20114857', 6, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Beatriz Abigail Villalta Luna');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (327, '19770155', 6, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kiara Nohemy Villanueva Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (328, '19868285', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Alvaro Enmanuel Blanco Moreno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (329, '20161506', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Elias Esau Carrillos Mancia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (330, '19846140', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Benjamin Castro Claros');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (331, '20089093', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Lorena de los Angeles Comayagua Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (332, '10244653', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Adonay Cubas Contreras');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (333, '5070010', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Keiry Johana Flores Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (334, '19941381', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Zulema Anahi Fuentes Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (335, '5945072', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Alejandro Funes Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (336, '10176693', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Alejandra Hernandez Valencia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (337, '19913453', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Marcela Adaly Herrera Canjura');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (338, '20163837', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Candida Guadalupe Jovel Canales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (339, '19995993', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Samir Leiva Raymundo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (340, '4212480', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Keyri Adriana Marroquin Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (341, '19881964', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Alexia Martinez de la O');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (342, '20121969', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Edwin Josue Martinez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (343, '20114823', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Lilian Abigail Martinez Guerra');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (344, '20147181', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Anthony Vladimir Medrano Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (345, '20090264', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Jessica Abigail Melendez Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (346, '20090274', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Israel Melgar Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (347, '4299906', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Lissette Mendez Magana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (348, '20147193', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Jaqueline Noemi Morales Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (349, '19911057', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Maylin Beatriz Munguia Posada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (350, '19813717', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Leonardo Esteban Perez Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (351, '20001974', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Wilson Jesus Portillo Santos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (352, '19778412', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Edward Fabricio Raimundo Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (353, '19739156', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Nathaly Michelle Ramirez Candelario');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (354, '19882219', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Melissa Ramos Erazo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (355, '19710740', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'David Alexander Raymundo Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (356, '3267330', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'David Alexander Rogel Escobar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (357, '2694548', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Allison Abigail Sanchez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (358, '19862914', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Lesly Esmeralda Siguenza Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (359, '4658154', 3, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Mirian Esperanza Valle Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (360, '5206560', 3, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Javier Vega Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (361, '19874667', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alejandro Barahona Zamora');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (362, '2694537', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Carolina Bolanos Tobias');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (363, '20088874', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Kenneth Adonay Bonilla Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (364, '19961556', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Melissa Marielos Burgos Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (365, '20001319', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Jose Carrillo Coto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (366, '6536515', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Marcos Alejandro Cruz Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (367, '6048175', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Joshua Abimael Espinoza Cardoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (368, '19935623', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alexis Ferman Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (369, '4960153', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Keiry Guadalupe Fuentes Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (370, '2727281', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Scarleth Bridget Garay Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (371, '20097199', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Nicolle Giron Varela');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (372, '4141745', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Julio Alexander Gonzalez Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (373, '10168969', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Miguel Antonio Hernandez Angel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (374, '20001594', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Moises Hernandez Cubias');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (375, '19886963', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Sarai Hernandez Ponce');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (376, '4141697', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Alexandra Herrera Galdamez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (377, '20161609', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Ismael Lopez Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (378, '6015081', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Abigail Lopez Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (379, '10176949', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Josue Marquez Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (380, '2936473', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Leticia Alejandra Nieto Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (381, '20090520', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Graciela Orellana Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (382, '2694539', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Iveth Perez Galdamez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (383, '4403639', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Michelle Ramirez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (384, '19863922', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Ariel Ramirez Medrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (385, '4657740', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Estiven Sebastian Ramos Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (386, '2727309', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Edwin Saul Reyes Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (387, '20114844', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Stanley Alejandro Rivera Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (388, '19976142', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Beatriz Ruiz Funes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (389, '20091582', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Sofia Beatriz Sanchez Delgado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (390, '2936595', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Alexis Tobar Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (391, '20003340', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Merly Michelle Vasquez Funes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (392, '2694547', 7, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Alma Gabriela Velasquez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (393, '20147233', 7, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Aaron Vladimir Ventura Alvarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (394, '20088595', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Nathalia Sofia Alfaro Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (395, '20342950', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Berta Patricia Alvarenga Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (396, '5945068', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Nahomy Yassyr Ascencio Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (397, '20001272', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Ismael Beltran Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (398, '5583977', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Carlos Bonilla Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (399, '4658501', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Michelle Castillo Godines');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (400, '6496602', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Sarai Betsabe Castro Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (401, '5102618', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Rosmery Nicolle Coronado Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (402, '6536531', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'David Santiago Cruz Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (403, '20089245', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Abigail Dominguez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (404, '2936567', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'William Alexis Flores Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (405, '20282550', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Isai Flores Mendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (406, '10176947', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Karen Mariana Gonzalez Fuentes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (407, '20163834', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Tatiana Isabel Gonzalez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (408, '19813561', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashley Vanessa Hernandez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (409, '20156301', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Alejandro Leiva Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (410, '19868487', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniella Stephanie Lenchoni Moran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (411, '19873105', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Vanessa Lopez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (412, '19960839', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela de los Angeles Lopez Recinos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (413, '20031429', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Nicole Lopez Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (414, '19881965', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Sarai Martinez Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (415, '20090174', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Marjorie Michelle Martinez Valle');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (416, '20030393', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Nataly Liliana Masin Chicas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (417, '20090231', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Daniel Mejia Moreno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (418, '19766396', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Diana Camila Monterrosa Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (419, '19987525', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Stefany Ortiz Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (420, '20280164', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Sharon Nayeli Otero Caceres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (421, '20293332', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Alexander Portillo Coreas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (422, '20161676', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Arianna Carolina Rivas Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (423, '19862908', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Joaquin Alejandro Rodas Granadeno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (424, '20161682', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Hector David Rodriguez Juarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (425, '4960121', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Ismael Ezequiel Sotelo Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (426, '6015086', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Valentina Tomasino Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (427, '20091665', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Derek Alexander Turcios Amaya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (428, '5583980', 10, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Rosa Miriam Velasco Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (429, '19978252', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Antonio Villeda Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (430, '19853574', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Axel Armando Zavala Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (431, '19806647', 10, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Guillermo Alejandro Zelaya Lainez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (432, '19960782', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Erick Alexander Alfaro Belloso');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (433, '20147122', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Samuel Alfaro Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (434, '10176702', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Adrian Emilio Alvarado Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (435, '4659782', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'David Edilson Alvarez Funes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (436, '20001235', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Michelle Amaya Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (437, '4210931', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Carolina Ayala Argueta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (438, '20240146', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Josue Barrera Robles');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (439, '19813557', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Guillermo Echeverria Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (440, '20073900', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefersson Alexander Flores Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (441, '20001468', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Michael Jared Fuentes Interiano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (442, '10176685', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Nelson Alberto Gomez Henrriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (443, '19988539', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriel Alejandro Gonzalez Angel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (444, '19868318', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Walter Steven Hernandez Jaimes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (445, '10176709', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Byron Elisee Hernandez Rolin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (446, '20002514', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Isabel Hernandez Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (447, '20001757', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Gamaliel Herrera Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (448, '4965987', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Salvador Jimenez Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (449, '10228597', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Anellys Clared Lainez Benavides');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (450, '19862877', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jacqueline Esmeralda Lopez Juarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (451, '10176711', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Denis Ernesto Lopez Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (452, '20165239', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Justin Alexander Martinez Callejas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (453, '19882206', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremy Isaac Martinez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (454, '20092746', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Alejandro Martinez Platero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (455, '20293331', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'David Alexander Mendoza de Leon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (456, '10440790', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Miguel Angel Mendoza Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (457, '10176712', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Samuel Alberto Menjivar Shical');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (458, '10176713', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alison Nicole Merino Calderon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (459, '19988758', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Fernando Molina Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (460, '10176714', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Elizabeth Molina Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (461, '19813676', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Emanuel Perez Abrego');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (462, '19941456', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Gerardo Daniel Ramirez Guzman');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (463, '10176719', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Rene Reyes Jovel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (464, '19988765', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Alessandro Rivas Luna');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (465, '19868543', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Alexander Rivas Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (466, '19988768', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Kenneth Stanley Rivera Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (467, '4976903', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Kimberly Nicole Salinas Calderon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (468, '10176723', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Iker Johan Urrea Zepeda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (469, '5583979', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremias Emanuel Velasco Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (470, '19988565', 8, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Guadalupe del Carmen Vigil Ortiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (471, '20265748', 8, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeancarlos Javier Villanueva Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (472, '19941331', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Byron Ernesto Acevedo Guzman');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (473, '4960133', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Elmer Alessandro Alfaro Delgado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (474, '4661071', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Kelvin Alexis Aparicio Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (475, '20157850', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Mauricio Alejandro Bonilla Pena');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (476, '4658161', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Armando Emanuel Calderon Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (477, '2936589', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Miguel Enrique Colocho Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (478, '20089158', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Edenilson Alexander Cruz Marroquin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (479, '20001409', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Gael Enrique Diaz Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (480, '3877064', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexis Abraham Echeverria Bonilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (481, '2936580', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Ismael Estevez Rodas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (482, '2936591', 9, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Abigail Estrada Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (483, '4960148', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Anthony David Flores Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (484, '19941385', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'David Misael Garcia Salinas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (485, '3634296', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Mario Salvador Garcia Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (486, '4976909', 9, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Melissa Alexandra Gomez Ardon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (487, '10176688', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Armando Gonzalez Herrador');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (488, '6013883', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Reynaldo Alexander Guzman Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (489, '19935656', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Emanuel Henriquez Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (490, '19720168', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Giovanni Antonio Hernandez Mendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (491, '19868319', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Anthony Samuel Hernandez Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (492, '2694552', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Luis Hernandez Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (493, '19708053', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Bradley Alexander Jovel Velasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (494, '10176696', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Justin Misael Leon Brizuela');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (495, '20079103', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristopher Geovanny Lopez Valle');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (496, '20163839', 9, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Britany Nicole Luna Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (497, '19868323', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Alonso Martinez Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (498, '19882209', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Josue Martinez Vega');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (499, '19854867', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristopher Gustavo Mejia Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (500, '19896543', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Sachiel Yerik Melendez Membreno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (501, '3876881', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Stanley Moran Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (502, '20001921', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Cesar Enrique Perez Cano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (503, '3007730', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Daniel Pineda Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (504, '20147199', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Gerson Alejandro Quele Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (505, '19956315', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Guillermo Steven Rauda Bonilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (506, '3714369', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Daniel Rivas Elias');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (507, '20002068', 9, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Kriscia Abigail Rivera Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (508, '4960149', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Etan Ariel Rodriguez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (509, '20161709', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jason Geovany Sura Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (510, '19941512', 9, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Eduardo Vasquez Aviles');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (511, '4658158', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Magdalena Abigail Aguilar Siguenza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (512, '20001251', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashley Dayanna Arteaga Brizuela');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (513, '6658303', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Alejandro Ascencio Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (514, '2726024', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Axel Jesus Avalos Melgar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (515, '20121799', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nelson Daniel Capacho Velasco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (516, '20147135', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Angela Berenice Castro Parada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (517, '2891611', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Guillermo Cativo Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (518, '4658400', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Karen Eunice Chavez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (519, '20002947', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Nohemy Climaco Alvarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (520, '6048174', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexandra Yamileth Cosme Barrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (521, '4116175', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria Fernanda Cruz Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (522, '20114808', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexandra Guadalupe de Leon Corvera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (523, '4985716', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Saul Adan Delgado Palacios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (524, '20089287', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriel Osvaldo Escamilla Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (525, '19734522', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Amilcar Flores Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (526, '20026606', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Yarepsy Mabel Flores Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (527, '19884446', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexandra Rocio Flores Portillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (528, '5102599', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ariane Michelle Garcia Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (529, '20001577', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Roberto Henriquez Nochez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (530, '5137284', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernanda Nicol Hernandez Najarro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (531, '5100947', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Daniel Hernandez Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (532, '5070041', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Jazmin Herrera Dominguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (533, '19819582', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Elias Daniel Huezo Acosta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (534, '20148308', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Nicolle Lainez Zelaya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (535, '20089887', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Alexander Lopez Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (536, '20157867', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Britany Nicole Lopez Lizama');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (537, '7122110', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Nicolle Lopez Quinteros');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (538, '5943448', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Samuel Alejandro Lopez Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (539, '3374695', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Clarissa Lozano Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (540, '5358527', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Angie Rachel Martinez Mira');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (541, '6339370', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose David Martinez Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (542, '4658933', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Camila Sarai Medina Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (543, '19806635', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Lisseth Mejia Barrios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (544, '6899470', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Valeria Mendoza Machuca');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (545, '5944924', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'David Alexander Mendoza Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (546, '5070046', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sandra Beatriz Miranda Ventura');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (547, '6658282', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'David Fernando Molina Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (548, '20147194', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Julissa Valeria Munoz Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (549, '4657885', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Tatiana Ortiz Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (550, '5070048', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashly Priscila Palacios Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (551, '2725953', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Joel Penate Munoz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (552, '4768294', 11, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Fabiola Rivas Crespin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (553, '4658507', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ismael Enrique Rivera Guardado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (554, '5819800', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Joel Eduardo Rodriguez Mendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (555, '4658396', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Samuel Esau Rodriguez Quintanilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (556, '4657627', 11, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Aristides Enrique Vega Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (557, '4960135', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Yancy Mariel Aguilar Guidos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (558, '19711143', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ariana Betsabe Alvarenga Valladares');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (559, '3270398', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dorcas Sarai Amaya Ceron');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (560, '2726007', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Abigail Amaya Landaverde');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (561, '3269262', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Erlinda Argueta Ruiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (562, '20147131', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Damaris Barahona Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (563, '4658390', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexander Melquisedec Carballo Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (564, '6048966', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jacqueline Esmeralda Coreas Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (565, '5364354', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sandra Marielos Coto Aragon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (566, '6376341', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Elias Sinai Cruz Polanco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (567, '10224522', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Magaly Nicole Diaz Alas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (568, '4602434', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Xavier Alessandro Erazo Santamaria');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (569, '19932816', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Oneida Alexandra Estrada Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (570, '6046742', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Alejandro Gomez Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (571, '19819581', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Emanuel Gonzalez Contreras');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (572, '19796926', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Keren Marcela Grimaldi Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (573, '4657884', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Meybel Pamela Gutierrez Giron');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (574, '4402113', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Moises Felipe Hernandez Cabrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (575, '19711355', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alexis Hernandez Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (576, '20121926', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alexander Hernandez Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (577, '4658386', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Raquel Jovel Nochez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (578, '20147169', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kimberly Yaneth Juarez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (579, '2891757', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Beatriz Juarez Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (580, '10299076', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Steven Lemus Bautista');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (581, '5364363', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Javier Alexander Lopez Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (582, '4301828', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lesly Nicole Lopez Gaitan');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (583, '20281222', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Liliana Liseth Martinez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (584, '6472440', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Moises Isaias Martinez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (585, '4659789', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Alfonso Martinez Salmeron');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (586, '4837075', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Michael Rigoberto Melgar Silva');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (587, '4966035', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Leticia Abigail Molina Monarca');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (588, '4658389', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Wuilber Yobany Molina Sorto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (589, '4095849', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Astrid Guadalupe Montano Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (590, '20161644', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Marely Navarro Parada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (591, '6438260', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Magno Alejandro Perez Ruiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (592, '19796899', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Manuel Alexander Perez Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (593, '4658506', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Valeria Portillo Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (594, '4658621', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kimberly Alexandra Preza Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (595, '5869173', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Ivania Michelle Quintanilla Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (596, '5304627', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Katerin Steffany Reyes Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (597, '4658406', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicole Alexandra Rivas Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (598, '4519568', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremy Galaad Rodriguez Erroa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (599, '6369637', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Eduardo Romero Villalobos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (600, '19887646', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Sofia Alejandra Sanchez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (601, '3249862', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Alexis Saravia Noubleau');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (602, '19852636', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Hiromy Gabriela Suria Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (603, '19914945', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Franklin Salvador Urquilla Contreras');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (604, '2692414', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Lucia Abigail Valverde Amaya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (605, '5102614', 12, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dulce Maria Zavaleta Crespin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (606, '20091848', 12, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Alejandro Zelaya Salmeron');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (607, '5451107', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Fernanda Amaya Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (608, '4658931', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Carolina Beltran Herrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (609, '3560645', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Jose Caceres Huezo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (610, '19719377', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nathaly Yasmin Calles Zavala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (611, '4702941', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Belen Cardoza Mena');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (612, '5873573', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Daniel Carranza Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (613, '20161511', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jairo Ismael Castillo Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (614, '3007742', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Tatiana Elizabeth Chacon Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (615, '4659734', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Gabriel Chavez Recinos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (616, '19941364', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jackeline Michelle Clavel Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (617, '20121821', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gamaliel Enrique Cordero Soto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (618, '20161522', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Tatiana Noemi Coto Casco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (619, '7300884', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Darlyn Dariana Flores Dominguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (620, '19734805', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Inmer Wilfredo Guevara Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (621, '4659326', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Erika Stefhania Leal Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (622, '5750665', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Margarita Leiva Acosta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (623, '5873566', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nathalia Estrella Lopez Marin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (624, '20001682', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Liliana Maria Lopez Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (625, '4658622', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Abigail Lopez Moreno');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (626, '2748579', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Alberto Lopez Palacios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (627, '20148311', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Nicole Mangandi Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (628, '20133571', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Damaris Edith Maravilla Siliezar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (629, '20150292', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Nicole Marin Zavaleta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (630, '6339357', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Georgina Marroquin Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (631, '19873564', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Leslie Lissette Martinez Carbajal');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (632, '4659726', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Milagro Esther Martinez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (633, '5304760', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexandra Yamileth Martinez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (634, '19813698', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Laura Steffany Mendez Rodas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (635, '4658470', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Maricela Nicolle Montes Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (636, '19988960', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Scarlet Nahomy Mulato Castro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (637, '5542308', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kelly Elizabeth Nolasco Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (638, '20147196', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Donovan Alexis Oliva Berciano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (639, '5363237', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Esteban Paz Carpio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (640, '20147203', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandon Moises Ramirez Galdamez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (641, '20002036', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Adrian Isaac Rivas Acevedo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (642, '5364057', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Enmanuel Rivas Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (643, '19863956', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Elias Josue Rodriguez Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (644, '4658604', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Jazmin Salazar Duran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (645, '3555198', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Steven Santos Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (646, '20293619', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Deyny Marbely Urbano Serrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (647, '5100951', 28, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Justin Josue Valenzuela Parada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (648, '19853960', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Alexandra Velasco Portillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (649, '19853840', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Rosario Lisseth Ventura Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (650, '5584091', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Michelle Villacorta Ventura');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (651, '4657877', 28, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Lissette Zuniga Alas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (652, '7093316', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Darlin Hilary Aguilar Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (653, '20283481', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Sarai Aguillon Santos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (654, '4214559', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremy Alexis Alfaro Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (655, '19853139', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Damaris Alicia Alvarado Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (656, '19874608', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Alessandro Ayala Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (657, '19806632', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Doris Adriana Berrios Platero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (658, '19972518', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Nestor Omar Candelario Gamez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (659, '4659213', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Patricia Carbajal Granados');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (660, '19939222', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gerson Alejandro Carrillo Deodanes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (661, '19939221', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Daniel Carrillo Deodanes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (662, '20121819', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Daniela Contreras');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (663, '6559537', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Guadalupe Corvera Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (664, '4960197', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Mayely Alejandra Cruz Barahona');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (665, '6559692', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jenniffer Vanessa Diaz Alas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (666, '4659246', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Liesly Yamileth Escalante Orantes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (667, '20281256', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Iveth Galdamez Guerra');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (668, '6050015', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jason Jose Garcia Moran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (669, '5453591', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Naomi Danairi Gonzalez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (670, '4659362', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Melvin Osvaldo Guevara Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (671, '20003070', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Marelyn Sarai Hernandez Aguillon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (672, '3007741', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Berlis Sofia Hernandez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (673, '5451739', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeniffer Carolina Jacobo Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (674, '19984514', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Heysel Lissbeth Jovel Fuentes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (675, '4659786', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Carlos Larios Cornejo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (676, '19804865', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Keiry Melissa Martir Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (677, '2789109', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Michael Antonio Martir Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (678, '19878933', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Samantha Medrano Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (679, '4659611', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Guadalupe Melendez Escobar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (680, '20147190', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Blanca Victoria Mendez Guzman');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (681, '4957468', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Fabricio Molina Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (682, '5454048', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Omar Monroy Contreras');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (683, '6658352', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Adriana Morales Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (684, '4658474', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Rodrigo Perez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (685, '19721370', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Giovanni Quintanilla Alas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (686, '5867531', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Jazmin Alejandra Ramirez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (688, '20122122', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Aileen Abigail Salguero Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (689, '3007851', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Arleth Alexandra Sanabria Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (690, '2644772', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Randal Xavier Sanchez Santamaria');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (691, '6898576', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevyn Alejandro Sigaran Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (692, '4521273', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Isaac Ivanovich Ulloa Fuentes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (693, '4658479', 29, 2026, true, 'Femenino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Yeimy Abigail Urbina Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (694, '3485067', 29, 2026, true, 'Masculino', NULL, NULL, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'Bryan Josue Ventura Aquino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (695, '3264927', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Gissell Alvarado Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (696, '3562535', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Michelle Argueta Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (697, '4658754', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Adriana Coreas Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (698, '20147140', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Guadalupe de la O Montoya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (699, '5584080', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Rebeca Eunice Diaz Escobar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (700, '5451950', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicolle Guadalupe Figueroa Figueroa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (701, '3853710', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristopher Edgardo Fuentes Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (702, '4659415', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Nereida Nahomy Gomez Loarca');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (703, '20121888', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherin Nahomy Granados Alonso');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (704, '5070070', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Sarai Hernandez Ruano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (705, '19815815', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Cesia Milagro Hernandez Solis');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (706, '19769012', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Brenda Nicole Jimenez de Paz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (707, '19709836', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Dana Massiel Leiva Valladares');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (708, '2686480', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Yesenia Rosmery Lipe Ortiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (709, '19804877', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Maria Lizama Alvarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (710, '5070020', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Krissia Esmeralda Lopez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (711, '19773897', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashly Michelle Lopez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (712, '20354930', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Griscelda Yamileth Maldonado Rios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (713, '5304621', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Allison Mayrene Martinez Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (714, '4658617', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Antonio Martinez Marroquin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (715, '20147179', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Yajaira Lisbeth Martinez Serrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (716, '5825851', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ester Noemi Martinez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (717, '19765976', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Isabel Martinez Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (718, '5451904', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Hellen Cristal Mendez Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (719, '4658763', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Alexandra Molina Silva');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (720, '4966022', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Isabel Monterroza Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (721, '19914979', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Alessandro Morales Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (722, '4658472', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kelvin Isaac Peraza Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (723, '19813716', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Valeria Perez Cubias');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (724, '2726013', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sheyla Nicole Ramirez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (725, '4030501', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Joselyn Marisol Ramos Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (726, '3131395', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernando Giovanni Rivas Cuellar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (727, '5100949', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Diana Marcela Rivas Mariona');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (728, '20147221', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Angeline Sofia Rosales Munoz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (729, '4658477', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Meylin Alessandra Sanchez Colorado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (730, '4959933', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Adonay Sandoval Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (731, '2891667', 23, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Elissa Nicolle Telule Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (732, '5358534', 23, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Milton Giovanni Umana Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (733, '5100939', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ashley Dayanna Aguilar Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (734, '19724112', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Alexis Alvarenga Arteaga');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (735, '4214560', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Nataly Valeria Aranzamendi Guerrero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (736, '3194881', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Rebeca Elizabeth Avalos Berrios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (737, '20025359', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sofia Esmeralda Calles');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (738, '3007843', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Melissa Canales Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (739, '4659614', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Iveth Castro Nunez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (740, '4658134', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Grecia Fabiola Cruz Patino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (741, '4659735', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Javier Duran Merino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (742, '3562421', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sofia Aracely Duran Muller');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (743, '5034971', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Darling Anahi Flores Guevara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (744, '6047339', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana Maria Flores Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (745, '5584084', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Henry Vladimir Garcia Benitez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (746, '4658757', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Meybelyn Estefany Garcia Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (747, '7091171', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar David Gomez Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (748, '5070015', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Joselinne Sarai Gonzalez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (749, '6046743', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Samuel Hernandez Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (750, '19941400', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Berenice Irantzu Leiva Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (751, '4094160', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kenia Abigail Leiva Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (752, '4656545', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Marbely Anahi Lopez Alberto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (753, '20126861', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'William Alejandro Lopez Juarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (754, '6955061', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sonia Beatriz Majano Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (755, '4602414', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Fernando Marroquin Estrada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (756, '19988550', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Brizeth Mendez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (757, '5532021', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Priscila Floridalma Menendez Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (758, '20090449', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Alexandra Navas Giron');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (759, '4657310', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Tatiana Alejandra Piche Juarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (760, '5102607', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Nahomy Pineda Palacios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (761, '6046794', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Michelle Ponce Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (762, '4659512', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Stephany Ramirez Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (763, '4520653', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Stephany Carolina Rivera Jovel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (764, '5070057', 24, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Christofer Ivan Ugarte Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (765, '19711373', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Michelle Valencia Fuentes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (766, '4658377', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Alessandra Velasquez Vigil');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (767, '20122166', 24, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeannette Beatriz Ventura Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (768, '5869146', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Alexander Abrego Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (769, '4966014', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristofer Josue Alvarenga Fuentes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (770, '20085954', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Andersson Vladimir Ayala Arriaga');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (771, '19783676', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Jahir Bojorquez Brizuela');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (772, '2891576', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Rikelmy Caballero Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (773, '20001343', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Marvin Geovany Cedillos Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (774, '5070001', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Brayan Edenilson Chicas Monterrosa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (775, '5304755', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Ernesto Donez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (776, '4658463', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kenneth Dominick Erazo Guevara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (777, '5304640', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Henry Josue Garcia Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (778, '6376323', 25, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Alexandra Lopez Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (779, '4658618', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jack Antonio Madrid Duenas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (780, '19804867', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Ariel Martinez Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (781, '4658498', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Joel Ernesto Martinez Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (782, '20035425', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Armando Massin Carabantes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (783, '20001866', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Josue Nieto Andino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (784, '4472404', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Josue Pablo Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (785, '4658473', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Steven Perez Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (786, '5304642', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Juan Ernesto Portillo Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (787, '5070023', 25, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Yanci Beatriz Ramos Lemus');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (788, '3267630', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Giovanny Salomon Rodriguez Ortega');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (789, '19806642', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Matthew Gabriel Sanchez Maravilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (790, '3555305', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Jeremias Santamaria Gil');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (791, '4951947', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Adonay Antonio Saravia Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (792, '6376329', 25, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Nicole Sibrian Guillen');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (793, '20091216', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Edenilson Adonay Siguenza Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (794, '4658370', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Eliseo Fernando Tejada Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (795, '3040921', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Christian Alfredo Torres Bermudez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (796, '4658496', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Joel Nehemias Urquilla Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (797, '6955051', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Harold Donovan Valladares Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (798, '20002182', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Baltazar Antonio Valle Montesinos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (799, '19854095', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Erick Samuel Vargas Carbajal');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (800, '4966007', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Antonio Vasquez Duran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (801, '4658482', 25, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Esau Alexander Zelaya Estrada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (802, '4235670', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Sarai Abrego Fernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (803, '5867473', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Angelica Rosalia Amaya Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (804, '7122101', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela del Carmen Bueno Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (805, '4993598', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Keren Paola Elias Quintanilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (806, '4657599', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Mateo Ernesto Funes Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (807, '5020634', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Nathaly Andrea Funes Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (808, '2726033', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Saori Elizabeth Hernandez Colocho');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (809, '19751443', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Bryan Alberto Lemus Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (810, '4965365', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Marilyn Yamileth Mancia Mayorga');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (811, '2891614', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Manuel de Jesus Martinez Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (812, '5584013', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Moises Alejandro Martinez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (813, '6438250', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Marjory Elizabeth Palacios Valencia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (814, '2789571', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Cesar Fernando Paz Argueta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (815, '20114826', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Berenice Portillo Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (816, '6658283', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'David Alessandro Portillo Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (817, '19952256', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Yasmin Elizabeth Rodriguez Santos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (818, '19719409', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Rebeca Abigail Romero Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (819, '19862910', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Romeo Josue Romualdo Tejada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (820, '19941486', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Fatima Carolina Sanchez Chavez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (821, '5584031', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Steven Viera Quintanilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (822, '19989600', 22, 2026, true, 'Femenino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Ester Villalobos Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (823, '20163442', 22, 2026, true, 'Masculino', NULL, NULL, 4, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Ernesto Zaens Corvera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (824, '19725535', 21, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana Delmy Amaya Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (825, '5070037', 21, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Maritza del Carmen Campos Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (826, '3555193', 21, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Esperanza Briggeth Coto Cortez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (827, '19865950', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Ricardo Ernesto Garcia Escamilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (828, '6376243', 21, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Gissela Jasmin Gomez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (829, '10158013', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Edgardo Lopez Jacobo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (830, '20001844', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Neftali Morales Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (831, '4966012', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Steven Nataren Alas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (832, '20040921', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Elias Ortiz Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (833, '4659374', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Daniel Ortiz Ortiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (834, '20090914', 21, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Emmanuel Reyes Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (835, '2686505', 21, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'Allison Esther Urbano Antillon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (836, '3714778', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Meybelline Melissa Aguilar Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (837, '19852862', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Brian Stanley Aguilar Ponce');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (838, '19874383', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Gerson Andres Aldana Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (839, '4931626', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Nicole Amaya Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (840, '20147124', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Rodrigo Alejandro Andrade Mendoza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (841, '3270363', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson David Arevalo Vivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (842, '2726008', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Mariana Margarita Bonilla Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (843, '19784624', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Erick Giovanni Bonilla Urbina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (844, '4959879', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Elizabet Nicole Carbajal Chavez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (845, '19882192', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Gisela Alexandra Carranza Balcaceres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (846, '5070002', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Sofia Cruz Luna');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (847, '6339343', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Victor Alexis Erroa Landaverde');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (848, '5070039', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Angel Enrique Fuentes Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (849, '4659784', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Laura Maria Gonzalez Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (850, '6300597', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Kendy Yamileth Guerrero Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (851, '19868316', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Kelsy Alessandra Gutierrez Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (852, '3267623', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Nahomy Estefani Guzman Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (853, '7363377', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Marlene de Jesus Hernandez Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (854, '20147167', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Michelle Iraheta Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (855, '20089891', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Lesly Yamileth Lopez Castillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (856, '4659787', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'William Alexander Lopez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (857, '4840148', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Ingrid Nicole Lopez Soto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (858, '19784745', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Antonio Lopez Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (859, '4966071', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernanda Gabriela Menjivar Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (860, '20122004', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Erick Jesus Miranda Galindo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (861, '6658360', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Elizabeth Ordonez Serrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (862, '20147205', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Astrid Nayeli Ramos Sifontes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (863, '20028443', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'William Alexander Rivas Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (864, '10224397', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'David Ernesto Santiago Alfaro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (865, '5304630', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Nicolle Solis Calderon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (866, '5069999', 26, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Ernesto Soriano Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (867, '20091862', 26, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Samantha Raquel Zometa Canenguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (868, '5615950', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Waldemar Antonio Abrego Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (869, '5304682', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Marely Eunice Alvarado Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (870, '19710487', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Walter Anthony Alvarenga Serrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (871, '4657585', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Elias Jafet Asuncion Palacios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (872, '5943756', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Justin Alexis Carrillo Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (873, '5304639', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Inmar Alexander Cruz Moran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (874, '2955472', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Eduardo Figueroa Alfaro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (875, '4657907', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Ximena Garcia Henriquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (876, '5070066', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jese Alexander Garcia Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (877, '6955058', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Abner Ademir Gomez Umana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (878, '6337564', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Erick Adonai Gonzalez Payes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (879, '4659366', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jesus Adrian Guardado Colorado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (880, '6014947', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Miguel Angel Guerra Rubio');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (881, '19933694', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Adonay Guzman Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (882, '4658384', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Christian Gabriel Hernandez Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (883, '19896350', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Ana Elizabeth Hernandez Lazo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (884, '5070094', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Michael Mauricio Martinez Chavez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (885, '19988755', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Valeria Mejia Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (886, '19819584', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Byron Enmanuel Melendez Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (887, '19806604', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Aaron Miranda Herrera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (888, '4657887', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Leonardo Efren Ramirez Soriano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (889, '4658410', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Reyes Ramos Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (890, '5615970', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'David Ernesto Rauda Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (891, '4658151', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Marvin Ademir Rios Ventura');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (892, '4235668', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Manuel Adonis Rodriguez Argueta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (893, '6376340', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Abimael Romero Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (894, '19806640', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Alexander Ruiz Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (895, '19806641', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernanda Paola Salguero Portillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (896, '20091638', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Ernesto Sanchez Granados');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (897, '19711317', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Leonardo Enmanuel Santamaria Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (898, '19754861', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Sarai Urias Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (899, '19815883', 14, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Ernesto Villalta Oliva');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (900, '19719337', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Stefanny Zelaya Reyes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (901, '5615943', 14, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jimena de los Angeles Zumba Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (902, '2694633', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Elias Enrique Aguilar Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (903, '4658455', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Krissia Pamela Aguilar Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (904, '20147120', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'William Josue Aguirre Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (905, '4602365', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Margaret Sarai Arias Merino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (906, '5615517', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Ezequiel Ayala Monge');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (907, '19845626', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Emely Dayana Carranza Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (908, '5869129', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Antonio Cornejo Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (909, '19806633', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Emanuel Espinoza Lino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (910, '2891613', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alejandro Efrain Hernandez Mendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (911, '4836339', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Leonardo Antonio Landaverde Sorto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (912, '2727231', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Ariel Lemus Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (913, '19987536', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Alberto Martinez Juarez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (914, '20147182', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Amadeo Mejia Castillo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (915, '4658469', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Nancy Elizabeth Mejia Orantes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (916, '6878851', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexandra Elizabeth Meza Santamaria');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (917, '20090366', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Franklin Antonio Molina Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (918, '4654099', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Rodrigo Adalberto Oporto Medrano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (919, '19988762', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Daniel Ortiz Gil');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (920, '5070050', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Yelena Magaly Panameno Vega');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (921, '5358530', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria Alejandra Parada Raymundo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (922, '19777833', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Enrique Portillo Flores');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (923, '19984886', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria de los Angeles Ramirez Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (924, '2694629', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Camila Fernanda Ramirez Calderon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (925, '4658947', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jason Alexander Ramos Alvarenga');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (926, '19813739', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Levi Natanael Rivas Acevedo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (927, '19983973', 27, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Estefany Rivera Molina');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (928, '2694649', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniel Alexander Solito Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (929, '19719471', 27, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Brayan Armando Vilaseca Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (930, '5454129', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Sara Elizabeth Aguilar Salama');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (931, '19714053', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Brandy Daniela Alfaro Arevalo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (932, '19853215', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Michelle Alvarez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (933, '4521340', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Patricia Beatriz Carballo Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (934, '4094166', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Arleth Paola Cardona Navarrete');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (935, '5070132', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria del Rosario Carrillo Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (936, '3374400', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Wendy Gabriela Contreras Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (937, '4366586', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gisselle Abigail Corpeno Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (938, '6080072', 31, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Levi Duran Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (939, '5750657', 31, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Marcos Nathanael Flores Ayala');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (940, '20001488', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Madelin Yadira Garcia Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (941, '6955162', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ariana Carolina Gutierrez Marquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (942, '6955161', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karen Betsabe Gutierrez Marquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (943, '4966032', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Daniela Herrera Barraza');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (944, '3485025', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jhoselyn Maricela Lara Urrutia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (945, '4213258', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Monica Patricia Lopez Cortez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (946, '5304675', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernanda de los Angeles Luna Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (947, '5304751', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Esthela Lisseth Mejia Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (948, '5241908', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Teresita Guadalupe Monges Lara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (949, '10176622', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Marilyn Grisel Munoz Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (950, '5241878', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Alexandra Pereira Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (951, '6865180', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Leslie Giselle Polanco Velasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (952, '6930291', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Evelyn Andrea Portillo Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (953, '4931623', 31, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Nelson Caleb Ramirez del Cid');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (954, '4931444', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Maybelline Berenice Ramirez Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (955, '4658942', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Angely Gabriela Ramirez Melara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (956, '3668401', 31, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Adonay Ernesto Renderos Turcios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (957, '19941478', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kelly Sofia Romero Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (958, '6797038', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Angie Michelle Vaquereno Miranda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (959, '2936610', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Paola Lisseth Villalta Paredes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (960, '20157889', 31, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kelly Elizabeth Villalta Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (961, '4141744', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Denis Alberto Acevedo Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (962, '6955043', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Berenice Barrientos de Leon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (963, '6955119', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ivania Mariel Campos Iraheta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (964, '20001304', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Dominick Gabriel Campos Ortiz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (965, '5358533', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Eduardo Alejandro Carbajal Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (966, '19859171', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Eunice Contreras Amaya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (967, '6409887', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Meybelin Lisseth Dominguez Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (968, '19776716', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Alexia Anahi Garcia Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (969, '19868463', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Israel Adonay Guerra Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (970, '19814215', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Nayeli Esmeralda Hernandez Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (971, '1915264', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Arely Hernandez Villalobos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (972, '2789586', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Pamela Nicole Lopez Tejada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (973, '2936607', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Christian Isaac Melara Munguia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (974, '19719469', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Emerson Enrique Mestanza Taura');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (975, '19719316', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Daniela Esther Moya Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (976, '2726140', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Alexander Munoz Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (977, '5945062', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Karla Yolanda Nieto Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (978, '5819805', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Rachel Palacios Mancia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (979, '5358535', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Fabiola Natali Perez Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (980, '20001973', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Valeria Fernanda Portillo Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (981, '5070081', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Magaly Judith Ramos Duran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (982, '19719451', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Kathya Abigail Rodriguez Jovel');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (983, '6048877', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Valery Elisa Sandoval Interiano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (984, '10260708', 32, 2026, true, 'Masculino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeremy Alexander Siliezar Genovez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (985, '5584063', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Ester Abigail Silva Nieto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (986, '293662', 32, 2026, true, 'Femenino', NULL, NULL, 2, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriella Jazmin Villa Vasquez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (987, '19769324', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'David Isaias Angulo Orellana');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (988, '6955111', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Moises Rigoberto Campos Guevara');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (989, '4858162', 30, 2026, true, 'Femenino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Hazel Tatiana Chamul Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (990, '7093231', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Rene Antonio Chavez Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (991, '3377382', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Stanley Chicas Monterrosa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (992, '3007824', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernando Josue de Paz Vides');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (993, '5454090', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jorge Antonio Dubon Ramos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (994, '20001442', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Enrique Estrada Garay');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (995, '5615946', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Douglas Ernesto Hernandez Aguilar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (996, '6134381', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Kevin Ernesto Hernandez Franco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (997, '19806590', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Douglas Isaac Lino Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (998, '5717825', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Elmer Josue Lopez Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (999, '5070045', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Emerson Ariel Lopez Melendez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1000, '20001708', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'William Josue Marquez Canales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1001, '2891876', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Isaac Martel Campos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1002, '3040878', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Christopher Alexander Mendoza Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1003, '6048192', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Michael Alejandro Molina Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1004, '2349642', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Orlando Alexander Ochoa Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1005, '7178997', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Steven Geovany Perez Santos');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1006, '4966041', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Leonardo Rivera Echeverria');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1007, '6012068', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Osmar Rivera Rosales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1008, '19719322', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Johansen Suria Gomez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1009, '19773559', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Stanley Tovar Castro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1010, '19766033', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernando Javier Ulloa Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1011, '19800263', 30, 2026, true, 'Masculino', NULL, NULL, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'Guillermo Eduardo Vides Quintanilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1012, '4300088', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Sarai Beatriz Anzora Marroquin');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1013, '4299936', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Briseyda Carolina Arriola Machado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1014, '5873590', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Estefany Abigail Barahona Argueta');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1015, '5020342', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Sugey Nicolle Beltran Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1016, '6955126', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jolie Bersabe Candelario Diaz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1017, '3007780', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Bryan Eliezer Carranza Castro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1018, '2652599', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Meylin Jamileth Castillo Torres');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1019, '3485074', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Adiel Chavez Sorto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1020, '5750653', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Marisol Chue Pineda');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1021, '2851143', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Isaac Salomon Contreras Alfaro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1022, '5136833', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Estefani Carolina Diaz Ardon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1023, '5003353', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jocelyn Michelle Escobar Sarabia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1024, '6335564', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernanda Eunice Figueroa Pacheco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1025, '5070062', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Estefany Gabriela Funes Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1026, '5070064', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Katherine Valeria Garcia Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1027, '2891710', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Andrea Gonzalez Azenon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1028, '5137194', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jairo Isaias Hernandez Sanchez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1029, '4966034', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Gabriel Linares Alfaro');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1030, '4602413', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Cynthia Alessandra Lopez Cruz');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1031, '4366590', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Anderson Gilberto Lopez Mejia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1032, '4094171', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Jeniffer Veronica Lovo Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1033, '6798335', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Dayana Alexandra Menjivar Beltran');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1034, '19719313', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Genesis Lissette Merino Alvarado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1035, '4094163', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Lucia Perez Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1036, '2789622', 33, 2026, true, 'Masculino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Alexander Perez Perez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1037, '20001956', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Andrea Gabriela Platero Garcia');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1038, '4213264', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Kimberly Dayanara Rivera Quezada');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1039, '2588302', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Denisse Alexandra Rodriguez Tamayo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1040, '4966049', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Emma Karina Sanchez Canenguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1041, '2936157', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Maria Eugenia Sanchez Madrid');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1042, '5873638', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Yeimi Noemi Sandoval Palma');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1043, '19701040', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Helen Yasmin Santamaria Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1044, '5865048', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Nahomi Yamileth Soriano Regalado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1045, '19719323', 33, 2026, true, 'Femenino', NULL, NULL, 7, NULL, NULL, NULL, NULL, NULL, NULL, 'Darlyn Sofia Vasquez Chacon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1046, '19853394', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Iveth Aquino Figueroa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1047, '3164674', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Ricardo Antonio Ardon Arevalo');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1048, '6798351', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alvaro Javier Ardon Morales');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1049, '5454134', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Antonio Josue Aviles Benitez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1050, '3269231', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Adriana Elizabeth Barahona Sorto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1051, '5335194', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Victoria Guadalupe Beltran Charuc');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1052, '4767288', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Javier Bojorquez Menjivar');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1053, '20088946', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Emmanuel Calles Ramirez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1054, '2891722', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Douglas Mcliberty Canales Azenon');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1055, '19719307', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Alisson Alejandra Cruz Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1056, '5750655', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Gerson Josue Dinarte Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1057, '5450732', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Alejandro Escobar Barahona');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1058, '20001444', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Camila Sofia Figueroa Gonzalez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1059, '4602410', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Martir Saul Flamenco Granados');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1060, '2727329', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Dennis Francisco Garcia Lopez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1061, '4366588', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Evelyn Dayana Garcia Merino');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1062, '3717126', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jennifer Guadalupe Gonzalez Guardado');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1063, '4952017', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Marcos Gabriel Granados Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1064, '6955176', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Manuel Guerra Soriano');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1065, '4602411', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Yurem Ademir Guevara Mulato');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1066, '4966033', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Esdras Alexander Hernandez del Cid');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1067, '2609185', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Walter Adriel Jarquin Alberto');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1068, '19806591', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Carlos Antonio Lopez Romero');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1069, '4960740', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Bryan Alexander Martinez Cortez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1070, '20001733', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Nicolle Stefany Martinez Turcios');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1071, '4366601', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Gabriela Alejandra Martinez Zelaya');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1072, '6472448', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Fernando Daniel Melendez Alas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1073, '20001854', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jefferson Samuel Mulato Martinez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1074, '5454077', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Luis Eduardo Najarro Jaco');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1075, '19987235', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jonathan Gamaliel Ortiz Rivera');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1076, '5451905', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Cristian Alexis Perez Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1077, '4930913', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Oscar Enrique Perez Ticas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1078, '5304772', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Antonio Ramos Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1079, '2774134', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Allison Elizabeth Rivas Sosa');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1080, '19941477', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Angie Pamela Romero Hernandez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1081, '5364350', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Diego Alberto Salamanca Rivas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1082, '19711217', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Pamela Dayana Sanchez Coreas');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1083, '19898807', 16, 2026, true, 'Femenino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Keny Odaly Sanchez Escamilla');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1084, '5070123', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Jose Esau Terezon Funes');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1085, '20147232', 16, 2026, true, 'Masculino', NULL, NULL, 6, NULL, NULL, NULL, NULL, NULL, NULL, 'Josue Enrique Vega Rodriguez');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1086, '6798350', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'ARDON RIVAS, DANIELA ELIZABETH');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1087, '6798334', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'ARDON SANTOS, MARIELA ESMERALDA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1088, '5827897', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'ASUNCION PALACIOS, ELIEZER LEVI');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1089, '19874628', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'AYALA RAMOS, JEREMIAS ALEXANDER');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1090, '4141752', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'BARRERA TORRES, AILEEN CELESTE');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1091, '20001284', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'BOLAÑOS ROSALES, JOSUE ARNULFO');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1092, '5874856', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'CASTILLO CARRANZA, ESTEFANY ROSIBEL');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1093, '19872989', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'CHAVEZ PINTO, DAYANA ESPERANZA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1094, '19777823', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'CLAROS ORTIZ, NEFTALI DE JESUS');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1095, '19719440', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'DIAZ CHAVEZ, DANIEL STEVEN');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1096, '4518037', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'ECHEVERRIA RODRIGUEZ, ANDERSON ADOLFO');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1097, '5304698', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'JOVEL CANALES, JESUS ERNESTO');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1098, '4931622', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'LANDAVERDE NAVAS, SANDRA CAROLINA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1099, '4437991', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'LAZO MARTINEZ, KATHERINE VALERIA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1100, '19815997', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'LOPEZ MARTINEZ, HAZEL STEFANY');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1101, '5819835', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'MEJIA MARTINEZ, GLORIA CAMILA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1102, '5241926', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'MORALES MELARA, SONIA RAQUEL');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1103, '3007789', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'MUÑOZ ALVARADO, JANETTE ELIZABETH');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1104, '5136256', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'MURCIA AQUINO, GILMA MAGDALENA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1105, '3267483', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'MUSTO ROMERO, CARMEN YAMILETH');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1106, '20156307', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'NIETO RECINOS, KATHERINE MARELYN');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1107, '5304676', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'ORELLANA MARADIAGA, XAVIER ALEXANDER');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1108, '20090576', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'PALMA PEREZ, NEYDI ELIZABETH');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1109, '19719318', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'PORTILLO ALAS, KAREN DAYANNA');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1110, '19706218', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'PRADO TREJO, ROLANDO ALBERTO');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1111, '3269264', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'RIVERA ORELLANA, YOHANA MARISOL');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1112, '2727354', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'SEQUEIRA MOLINA, JORGE ADAN');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1113, '2891861', 34, 2026, true, 'Femenino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'VALENCIA MOLINA, KARLA YAMILETH');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1114, '4603177', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'VASQUEZ MIRANDA, MOISES ELISEO');
INSERT INTO principal.estudiantes OVERRIDING SYSTEM VALUE VALUES (1115, '5717133', 34, 2026, true, 'Masculino', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, 'ZELAYA NAVARRO, KEVIN ALEXANDER');


--
-- TOC entry 3667 (class 0 OID 26323)
-- Dependencies: 247
-- Data for Name: familiares; Type: TABLE DATA; Schema: principal; Owner: postgres
--



--
-- TOC entry 3642 (class 0 OID 26068)
-- Dependencies: 222
-- Data for Name: grados; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.grados VALUES (1, 1, 1, 1, 1, 2026, '2026-04-04 21:14:30.656513');
INSERT INTO principal.grados VALUES (2, 1, 1, 2, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (3, 1, 4, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (4, 1, 2, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (5, 1, 2, 2, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (6, 1, 3, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (7, 1, 5, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (8, 1, 6, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (9, 1, 6, 2, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (10, 1, 7, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (11, 2, 1, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (12, 2, 1, 2, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (13, 2, 5, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (14, 2, 6, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (15, 3, 4, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (16, 3, 6, 1, 1, 2026, '2026-04-04 21:15:09.814524');
INSERT INTO principal.grados VALUES (17, 1, 1, 3, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (18, 1, 1, 4, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (19, 1, 1, 5, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (20, 1, 1, 6, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (21, 2, 5, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (22, 2, 4, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (23, 2, 2, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (24, 2, 2, 2, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (25, 2, 3, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (26, 2, 7, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (27, 2, 6, 2, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (28, 2, 1, 3, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (29, 2, 1, 4, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (30, 3, 3, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (31, 3, 2, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (32, 3, 2, 2, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (33, 3, 7, 1, 2, 2026, '2026-05-25 04:46:42.110281');
INSERT INTO principal.grados VALUES (34, 3, 5, 1, 1, 2026, '2026-08-23 16:46:52.240647');


--
-- TOC entry 3646 (class 0 OID 26110)
-- Dependencies: 226
-- Data for Name: maestros; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (1, 'Pedro Hernandez Martinez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 1, true, '2026-05-06 04:59:11.714805+00', '2026-07-14 03:31:08.364351+00', 'pedro.hernandez@clases.edu.sv', 'insal2026', 'director', false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (2, 'Gisela Mayerlin Bonilla', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 5, 1, 2, true, '2026-05-06 05:04:15.354027+00', '2026-05-28 23:20:56.326011+00', 'gisela.mayerlin@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (3, 'Noe Antonio Lopez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 3, 1, 2, true, '2026-05-06 05:05:04.957647+00', '2026-05-28 23:20:56.420989+00', 'noe.antonio@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (4, 'Norma Gissela Rivera de Lopez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 1, 1, 2, true, '2026-05-06 05:06:24.496989+00', '2026-05-28 23:20:56.523869+00', 'norma.gissela@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (5, 'Ursula Delmy Garay de Gutierrez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 2, 1, 2, true, '2026-05-06 05:07:15.96875+00', '2026-05-28 23:20:57.454378+00', 'ursula.delmy@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (6, 'Mercedes del Carmen Minero Minero', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 5, 1, 3, true, '2026-05-06 05:22:26.300477+00', '2026-05-28 23:20:57.541154+00', 'mercedes.del@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (7, 'Roberto Antonio Martinez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 3, 1, 3, true, '2026-05-06 05:23:22.259202+00', '2026-05-28 23:20:57.632367+00', 'roberto.antonio@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (8, 'Fiorela Margarita Velis Velasco', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 4, 1, 3, true, '2026-05-06 05:27:33.487477+00', '2026-05-28 23:20:57.877421+00', 'fiorela.margarita@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (9, 'Ana Bella Guadalupe Perez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 4, 1, 3, true, '2026-05-06 05:28:19.913046+00', '2026-05-28 23:20:57.991472+00', 'ana.bella@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (10, 'Glenda del Carmen Marquez de Ayala', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 2, 1, 3, true, '2026-05-06 05:40:35.873307+00', '2026-05-28 23:20:58.07834+00', 'glenda.del@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (11, 'Jorge David Flores Vasquez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 1, 1, 3, true, '2026-05-06 05:21:17.955617+00', '2026-05-28 23:20:58.165214+00', 'jorge.david@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (12, 'Martina del Carrmen Aguilar Cardenas', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 2, 1, 3, true, '2026-05-06 05:46:15.225997+00', '2026-05-28 23:20:58.273495+00', 'martina.del@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (13, 'Luis Roberto Ramirez Guzman', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 6, 1, 3, true, '2026-05-06 05:48:14.76948+00', '2026-05-28 23:20:58.363034+00', 'luis.roberto@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (14, 'Jose Lorenzo Henriquez Calles', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 3, 1, 3, true, '2026-05-06 06:04:40.80163+00', '2026-05-28 23:20:58.455778+00', 'jose.lorenzo@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (15, 'Doris Alejandra Hernandez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 2, 1, 3, true, '2026-05-06 06:08:00.426382+00', '2026-05-28 23:20:58.558428+00', 'doris.alejandra@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (16, 'Victoria Guadalupe Perez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 4, 1, 3, true, '2026-05-06 06:10:47.46978+00', '2026-05-28 23:20:58.645154+00', 'victoria.guadalupe@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (17, 'Salvador de Jesus Antonio Gutierrez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', NULL, 1, 2, true, '2026-05-06 06:18:49.011006+00', '2026-05-28 23:20:58.764631+00', 'salvador.de@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (18, 'Heidi Odaly Hernandez Morales', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', NULL, 1, 2, true, '2026-05-06 06:22:54.728652+00', '2026-05-28 23:20:58.919154+00', 'heidi.odaly@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (19, 'Hector Alexander Villalta Oviedo', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 3, 1, 3, true, '2026-05-06 06:25:52.15846+00', '2026-05-28 23:20:59.016982+00', 'hector.alexander@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (20, 'Ruth Noemi Rodriguez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 2, 2, 2, true, '2026-05-06 06:27:07.315301+00', '2026-05-28 23:20:59.130803+00', 'ruth.noemi@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (21, 'Anibal Vladimir Martinez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:27:38.347772+00', '2026-05-28 23:20:59.217688+00', 'anibal.vladimir@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (22, 'Floridalma Ramirez de Lopez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:28:13.627493+00', '2026-05-28 23:20:59.309893+00', 'floridalma.ramirez@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (23, 'Omar Vladimir Martinez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:28:43.581403+00', '2026-05-28 23:20:59.529389+00', 'omar.vladimir@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (24, 'Eva Milagro Lopez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:29:19.780303+00', '2026-05-28 23:20:59.621812+00', 'eva.milagro@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (25, 'Claudia Lopez Escobar', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 2, 3, true, '2026-05-06 06:31:52.290196+00', '2026-05-28 23:20:59.708782+00', 'claudia.lopez@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (26, 'Gloria Vilma Acevedo', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:36:02.405255+00', '2026-05-28 23:20:59.836166+00', 'gloria.vilma@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (27, 'Ana Ruth Saravia', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 4, 1, 3, true, '2026-05-06 06:36:56.307133+00', '2026-05-28 23:20:59.922931+00', 'ana.ruth@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (28, 'Sandra Patricia Garcia', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 2, 2, true, '2026-05-06 06:37:38.200834+00', '2026-05-28 23:21:00.039366+00', 'sandra.patricia@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (29, 'Sandra Noemy Guillen', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 1, 2, 3, true, '2026-05-06 06:39:16.016182+00', '2026-05-28 23:21:00.248555+00', 'sandra.noemy@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (30, 'Evelyn Mabel Campos Bautista', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:40:40.439028+00', '2026-05-28 23:21:00.462655+00', 'evelyn.mabel@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (31, 'Evelyn Lissette Perez de Hernandez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:41:37.633704+00', '2026-05-28 23:21:00.552263+00', 'evelyn.lissette@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (32, 'Rene William Barahona', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 1, 3, true, '2026-05-06 06:42:25.551115+00', '2026-05-28 23:21:00.63894+00', 'rene.william@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (33, 'Mauricio Arturo Sibrian', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 2, 3, true, '2026-05-06 06:39:57.777113+00', '2026-05-28 23:21:00.728468+00', 'mauricio.arturo@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (34, 'Eduardo Alexander Blanco Aguilar', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 1, 2, 3, true, '2026-05-06 07:02:13.053867+00', '2026-05-28 23:21:00.823522+00', 'eduardo.alexander@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (35, 'Sandra Elizabeth Bayona', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', NULL, 2, 3, true, '2026-05-06 07:02:54.209065+00', '2026-05-28 23:21:01.25755+00', 'sandra.elizabeth@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (36, 'Azucena del Carmen Cordova', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 5, 2, 3, true, '2026-05-06 07:03:59.165303+00', '2026-05-28 23:21:01.344233+00', 'azucena.del@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (37, 'Edelmira Liduvina Ponce', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 8, 2, 3, true, '2026-05-06 07:05:27.39473+00', '2026-05-28 23:21:01.452816+00', 'edelmira.liduvina@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (38, 'Geovanny Cortez', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 2, 2, 3, true, '2026-05-06 07:06:38.513455+00', '2026-05-28 23:21:01.539624+00', 'geovanny.cortez@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (39, 'Victor Manuel Bonilla', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 5, 2, 3, true, '2026-05-06 07:08:38.467222+00', '2026-05-28 23:21:01.634665+00', 'victor.manuel@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (40, 'Cecilia del Carmen Diaz', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 2, 3, true, '2026-05-06 07:12:00.601803+00', '2026-05-28 23:21:01.721463+00', 'cecilia.del@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (41, 'Ana Vilma Alvarado', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 3, 2, 3, true, '2026-05-06 07:07:46.186473+00', '2026-05-28 23:21:01.816293+00', 'ana.vilma@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (42, 'Genaro Gilberto Flores', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 3, 2, 3, true, '2026-05-06 07:10:37.576416+00', '2026-05-28 23:21:01.908512+00', 'genaro.gilberto@clases.edu.sv', NULL, NULL, false);
INSERT INTO principal.maestros OVERRIDING SYSTEM VALUE VALUES (43, 'Abraham Echeverria', '$2a$12$OYoCd2rh343HmoXKCyRS..93jrpsHVB7Pyq4gpDtegK9EaPeNNQ6W', 7, 2, 3, true, '2026-05-06 07:14:07.741978+00', '2026-05-28 23:21:02.00362+00', 'abraham.echeverria@clases.edu.sv', NULL, NULL, false);


--
-- TOC entry 3647 (class 0 OID 26131)
-- Dependencies: 227
-- Data for Name: materias; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (1, 'Ciudadania y Valores');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (2, 'Lengua y Literatura');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (3, 'Precalculo');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (4, 'Ciencias y Tecnologia');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (5, 'Ingles');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (6, 'Desarrollo Corporal');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (7, 'Modulo');
INSERT INTO principal.materias OVERRIDING SYSTEM VALUE VALUES (8, 'Ciencias de la Computacion');


--
-- TOC entry 3644 (class 0 OID 26091)
-- Dependencies: 224
-- Data for Name: niveles_estudios; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.niveles_estudios VALUES (1, '1 Año', '2026-04-04 18:02:36.527555');
INSERT INTO principal.niveles_estudios VALUES (2, '2 Año', '2026-04-04 18:02:53.949951');
INSERT INTO principal.niveles_estudios VALUES (3, '3 Año', '2026-04-04 18:03:02.278897');


--
-- TOC entry 3673 (class 0 OID 26337)
-- Dependencies: 253
-- Data for Name: orientaciones_log; Type: TABLE DATA; Schema: principal; Owner: postgres
--



--
-- TOC entry 3648 (class 0 OID 26183)
-- Dependencies: 228
-- Data for Name: orientadores; Type: TABLE DATA; Schema: principal; Owner: postgres
--



--
-- TOC entry 3649 (class 0 OID 26213)
-- Dependencies: 229
-- Data for Name: roles; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.roles OVERRIDING SYSTEM VALUE VALUES (1, 'director', true);
INSERT INTO principal.roles OVERRIDING SYSTEM VALUE VALUES (2, 'administrador', true);
INSERT INTO principal.roles OVERRIDING SYSTEM VALUE VALUES (3, 'docente', true);


--
-- TOC entry 3645 (class 0 OID 26098)
-- Dependencies: 225
-- Data for Name: secciones; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.secciones VALUES (1, 'A', '2026-04-04 17:40:23.746661');
INSERT INTO principal.secciones VALUES (2, 'B', '2026-04-04 17:40:23.746661');
INSERT INTO principal.secciones VALUES (3, 'C', '2026-04-04 17:40:51.610121');
INSERT INTO principal.secciones VALUES (4, 'D', '2026-04-04 17:40:51.610121');
INSERT INTO principal.secciones VALUES (6, 'F', '2026-05-25 04:46:29.016193');
INSERT INTO principal.secciones VALUES (5, 'E', '2026-04-04 17:40:51.610121');


--
-- TOC entry 3650 (class 0 OID 26239)
-- Dependencies: 230
-- Data for Name: turnos; Type: TABLE DATA; Schema: principal; Owner: postgres
--

INSERT INTO principal.turnos OVERRIDING SYSTEM VALUE VALUES (1, 'Matutino');
INSERT INTO principal.turnos OVERRIDING SYSTEM VALUE VALUES (2, 'Vespertino');


--
-- TOC entry 3709 (class 0 OID 0)
-- Dependencies: 232
-- Name: criterios_criterio_id_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.criterios_criterio_id_seq', 39, true);


--
-- TOC entry 3710 (class 0 OID 0)
-- Dependencies: 234
-- Name: estudiantes_estudiante_id_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.estudiantes_estudiante_id_seq', 36, true);


--
-- TOC entry 3711 (class 0 OID 0)
-- Dependencies: 236
-- Name: evaluacion_criterios_id_evaluacion_criterio_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.evaluacion_criterios_id_evaluacion_criterio_seq', 134, true);


--
-- TOC entry 3712 (class 0 OID 0)
-- Dependencies: 238
-- Name: evaluaciones_evaluacion_id_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.evaluaciones_evaluacion_id_seq', 18, true);


--
-- TOC entry 3713 (class 0 OID 0)
-- Dependencies: 240
-- Name: evaluadores_evaluador_id_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.evaluadores_evaluador_id_seq', 40, true);


--
-- TOC entry 3714 (class 0 OID 0)
-- Dependencies: 242
-- Name: niveles_nivel_id_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.niveles_nivel_id_seq', 4, true);


--
-- TOC entry 3715 (class 0 OID 0)
-- Dependencies: 244
-- Name: proyectos_proyecto_id_seq; Type: SEQUENCE SET; Schema: evaluaciones; Owner: postgres
--

SELECT pg_catalog.setval('evaluaciones.proyectos_proyecto_id_seq', 94, true);


--
-- TOC entry 3716 (class 0 OID 0)
-- Dependencies: 245
-- Name: bachilleratos_bachillerato_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.bachilleratos_bachillerato_id_seq', 8, false);


--
-- TOC entry 3717 (class 0 OID 0)
-- Dependencies: 246
-- Name: estudiantes_estudiante_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.estudiantes_estudiante_id_seq', 1115, true);


--
-- TOC entry 3718 (class 0 OID 0)
-- Dependencies: 248
-- Name: familiares_familiar_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.familiares_familiar_id_seq', 1, false);


--
-- TOC entry 3719 (class 0 OID 0)
-- Dependencies: 249
-- Name: grados_grado_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.grados_grado_id_seq', 34, true);


--
-- TOC entry 3720 (class 0 OID 0)
-- Dependencies: 250
-- Name: maestros_maestro_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.maestros_maestro_id_seq', 44, false);


--
-- TOC entry 3721 (class 0 OID 0)
-- Dependencies: 251
-- Name: materias_materia_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.materias_materia_id_seq', 8, false);


--
-- TOC entry 3722 (class 0 OID 0)
-- Dependencies: 252
-- Name: niveles_estudios_niveles_estudios_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.niveles_estudios_niveles_estudios_id_seq', 3, false);


--
-- TOC entry 3723 (class 0 OID 0)
-- Dependencies: 254
-- Name: orientaciones_log_log_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.orientaciones_log_log_id_seq', 1, false);


--
-- TOC entry 3724 (class 0 OID 0)
-- Dependencies: 255
-- Name: orientadores_orientador_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.orientadores_orientador_id_seq', 6, true);


--
-- TOC entry 3725 (class 0 OID 0)
-- Dependencies: 256
-- Name: roles_rol_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.roles_rol_id_seq', 3, false);


--
-- TOC entry 3726 (class 0 OID 0)
-- Dependencies: 257
-- Name: secciones_seccion_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.secciones_seccion_id_seq', 6, false);


--
-- TOC entry 3727 (class 0 OID 0)
-- Dependencies: 258
-- Name: turnos_turno_id_seq; Type: SEQUENCE SET; Schema: principal; Owner: postgres
--

SELECT pg_catalog.setval('principal.turnos_turno_id_seq', 2, false);


--
-- TOC entry 3443 (class 2606 OID 26387)
-- Name: criterios criterios_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.criterios
    ADD CONSTRAINT criterios_pkey PRIMARY KEY (criterio_id);


--
-- TOC entry 3446 (class 2606 OID 26389)
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (estudiante_id);


--
-- TOC entry 3450 (class 2606 OID 26391)
-- Name: evaluacion_criterios evaluacion_criterios_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluacion_criterios
    ADD CONSTRAINT evaluacion_criterios_pkey PRIMARY KEY (id_evaluacion_criterio);


--
-- TOC entry 3454 (class 2606 OID 26393)
-- Name: evaluaciones evaluaciones_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluaciones
    ADD CONSTRAINT evaluaciones_pkey PRIMARY KEY (evaluacion_id);


--
-- TOC entry 3459 (class 2606 OID 26395)
-- Name: evaluadores evaluadores_email_key; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluadores
    ADD CONSTRAINT evaluadores_email_key UNIQUE (email);


--
-- TOC entry 3461 (class 2606 OID 26397)
-- Name: evaluadores evaluadores_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluadores
    ADD CONSTRAINT evaluadores_pkey PRIMARY KEY (evaluador_id);


--
-- TOC entry 3463 (class 2606 OID 26399)
-- Name: niveles niveles_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.niveles
    ADD CONSTRAINT niveles_pkey PRIMARY KEY (nivel_id);


--
-- TOC entry 3467 (class 2606 OID 26401)
-- Name: proyectos proyectos_pkey; Type: CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.proyectos
    ADD CONSTRAINT proyectos_pkey PRIMARY KEY (proyecto_id);


--
-- TOC entry 3419 (class 2606 OID 26403)
-- Name: bachilleratos bachilleratos_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.bachilleratos
    ADD CONSTRAINT bachilleratos_pkey PRIMARY KEY (bachillerato_id);


--
-- TOC entry 3408 (class 2606 OID 26405)
-- Name: estudiantes estudiantes_nie_key; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.estudiantes
    ADD CONSTRAINT estudiantes_nie_key UNIQUE (nie);


--
-- TOC entry 3410 (class 2606 OID 26407)
-- Name: estudiantes estudiantes_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.estudiantes
    ADD CONSTRAINT estudiantes_pkey PRIMARY KEY (estudiante_id);


--
-- TOC entry 3469 (class 2606 OID 26409)
-- Name: familiares familiares_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.familiares
    ADD CONSTRAINT familiares_pkey PRIMARY KEY (familiar_id);


--
-- TOC entry 3417 (class 2606 OID 26411)
-- Name: grados grados_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.grados
    ADD CONSTRAINT grados_pkey PRIMARY KEY (grado_id);


--
-- TOC entry 3427 (class 2606 OID 26413)
-- Name: maestros maestros_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.maestros
    ADD CONSTRAINT maestros_pkey PRIMARY KEY (maestro_id);


--
-- TOC entry 3429 (class 2606 OID 26415)
-- Name: materias materias_nombre_materia_key; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.materias
    ADD CONSTRAINT materias_nombre_materia_key UNIQUE (nombre_materia);


--
-- TOC entry 3431 (class 2606 OID 26417)
-- Name: materias materias_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.materias
    ADD CONSTRAINT materias_pkey PRIMARY KEY (materia_id);


--
-- TOC entry 3421 (class 2606 OID 26419)
-- Name: niveles_estudios niveles_estudios_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.niveles_estudios
    ADD CONSTRAINT niveles_estudios_pkey PRIMARY KEY (niveles_estudios_id);


--
-- TOC entry 3473 (class 2606 OID 26421)
-- Name: orientaciones_log orientaciones_log_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.orientaciones_log
    ADD CONSTRAINT orientaciones_log_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3433 (class 2606 OID 26423)
-- Name: orientadores orientadores_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.orientadores
    ADD CONSTRAINT orientadores_pkey PRIMARY KEY (orientador_id);


--
-- TOC entry 3435 (class 2606 OID 26425)
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- TOC entry 3437 (class 2606 OID 26427)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (rol_id);


--
-- TOC entry 3423 (class 2606 OID 26429)
-- Name: secciones secciones_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.secciones
    ADD CONSTRAINT secciones_pkey PRIMARY KEY (seccion_id);


--
-- TOC entry 3439 (class 2606 OID 26431)
-- Name: turnos turnos_nombre_key; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.turnos
    ADD CONSTRAINT turnos_nombre_key UNIQUE (nombre);


--
-- TOC entry 3441 (class 2606 OID 26433)
-- Name: turnos turnos_pkey; Type: CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.turnos
    ADD CONSTRAINT turnos_pkey PRIMARY KEY (turno_id);


--
-- TOC entry 3444 (class 1259 OID 26464)
-- Name: idx_criterios_nivel; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_criterios_nivel ON evaluaciones.criterios USING btree (nivel_id);


--
-- TOC entry 3447 (class 1259 OID 26465)
-- Name: idx_estudiantes_grado; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_estudiantes_grado ON evaluaciones.estudiantes USING btree (grado_id);


--
-- TOC entry 3448 (class 1259 OID 26466)
-- Name: idx_estudiantes_proyecto; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_estudiantes_proyecto ON evaluaciones.estudiantes USING btree (proyecto_id);


--
-- TOC entry 3451 (class 1259 OID 26467)
-- Name: idx_eval_crit_criterio; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_eval_crit_criterio ON evaluaciones.evaluacion_criterios USING btree (criterio_id);


--
-- TOC entry 3452 (class 1259 OID 26468)
-- Name: idx_eval_crit_evaluacion; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_eval_crit_evaluacion ON evaluaciones.evaluacion_criterios USING btree (evaluacion_id);


--
-- TOC entry 3455 (class 1259 OID 26469)
-- Name: idx_evaluaciones_evaluador; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_evaluaciones_evaluador ON evaluaciones.evaluaciones USING btree (evaluador_id);


--
-- TOC entry 3456 (class 1259 OID 26470)
-- Name: idx_evaluaciones_fecha; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_evaluaciones_fecha ON evaluaciones.evaluaciones USING btree (fecha_evaluacion);


--
-- TOC entry 3457 (class 1259 OID 26471)
-- Name: idx_evaluaciones_proyecto; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_evaluaciones_proyecto ON evaluaciones.evaluaciones USING btree (proyecto_id);


--
-- TOC entry 3464 (class 1259 OID 26472)
-- Name: idx_proyectos_grado; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_proyectos_grado ON evaluaciones.proyectos USING btree (grado_id);


--
-- TOC entry 3465 (class 1259 OID 26473)
-- Name: idx_proyectos_nivel; Type: INDEX; Schema: evaluaciones; Owner: postgres
--

CREATE INDEX idx_proyectos_nivel ON evaluaciones.proyectos USING btree (nivel_id);


--
-- TOC entry 3411 (class 1259 OID 26474)
-- Name: idx_estudiantes_activo; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_estudiantes_activo ON principal.estudiantes USING btree (estado) WHERE (estado = true);


--
-- TOC entry 3412 (class 1259 OID 26475)
-- Name: idx_estudiantes_anio; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_estudiantes_anio ON principal.estudiantes USING btree (anio_escolar);


--
-- TOC entry 3413 (class 1259 OID 26476)
-- Name: idx_estudiantes_grado; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_estudiantes_grado ON principal.estudiantes USING btree (grado_id);


--
-- TOC entry 3414 (class 1259 OID 26477)
-- Name: idx_estudiantes_nie_activo; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_estudiantes_nie_activo ON principal.estudiantes USING btree (nie) WHERE (estado = true);


--
-- TOC entry 3424 (class 1259 OID 26478)
-- Name: idx_maestros_activo; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_maestros_activo ON principal.maestros USING btree (activo) WHERE (activo = true);


--
-- TOC entry 3425 (class 1259 OID 26479)
-- Name: idx_maestros_rol; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_maestros_rol ON principal.maestros USING btree (rol_id);


--
-- TOC entry 3470 (class 1259 OID 26480)
-- Name: idx_orien_log_anio; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_orien_log_anio ON principal.orientaciones_log USING btree (anio_escolar);


--
-- TOC entry 3471 (class 1259 OID 26481)
-- Name: idx_orien_log_maestro; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE INDEX idx_orien_log_maestro ON principal.orientaciones_log USING btree (maestro_id);


--
-- TOC entry 3415 (class 1259 OID 26482)
-- Name: uq_principal_estudiantes_nie; Type: INDEX; Schema: principal; Owner: postgres
--

CREATE UNIQUE INDEX uq_principal_estudiantes_nie ON principal.estudiantes USING btree (nie);


--
-- TOC entry 3493 (class 2620 OID 26483)
-- Name: maestros trg_maestros_actualizado; Type: TRIGGER; Schema: principal; Owner: postgres
--

CREATE TRIGGER trg_maestros_actualizado BEFORE UPDATE ON principal.maestros FOR EACH ROW EXECUTE FUNCTION principal.fn_set_actualizado_en();


--
-- TOC entry 3484 (class 2606 OID 26604)
-- Name: criterios criterios_nivel_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.criterios
    ADD CONSTRAINT criterios_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES evaluaciones.niveles(nivel_id);


--
-- TOC entry 3485 (class 2606 OID 26609)
-- Name: estudiantes estudiantes_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.estudiantes
    ADD CONSTRAINT estudiantes_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES evaluaciones.proyectos(proyecto_id);


--
-- TOC entry 3486 (class 2606 OID 26614)
-- Name: evaluacion_criterios evaluacion_criterios_criterio_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluacion_criterios
    ADD CONSTRAINT evaluacion_criterios_criterio_id_fkey FOREIGN KEY (criterio_id) REFERENCES evaluaciones.criterios(criterio_id);


--
-- TOC entry 3487 (class 2606 OID 26619)
-- Name: evaluacion_criterios evaluacion_criterios_evaluacion_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluacion_criterios
    ADD CONSTRAINT evaluacion_criterios_evaluacion_id_fkey FOREIGN KEY (evaluacion_id) REFERENCES evaluaciones.evaluaciones(evaluacion_id);


--
-- TOC entry 3488 (class 2606 OID 26624)
-- Name: evaluaciones evaluaciones_evaluador_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluaciones
    ADD CONSTRAINT evaluaciones_evaluador_id_fkey FOREIGN KEY (evaluador_id) REFERENCES evaluaciones.evaluadores(evaluador_id);


--
-- TOC entry 3489 (class 2606 OID 26629)
-- Name: evaluaciones evaluaciones_proyecto_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.evaluaciones
    ADD CONSTRAINT evaluaciones_proyecto_id_fkey FOREIGN KEY (proyecto_id) REFERENCES evaluaciones.proyectos(proyecto_id);


--
-- TOC entry 3490 (class 2606 OID 26634)
-- Name: proyectos proyectos_nivel_id_fkey; Type: FK CONSTRAINT; Schema: evaluaciones; Owner: postgres
--

ALTER TABLE ONLY evaluaciones.proyectos
    ADD CONSTRAINT proyectos_nivel_id_fkey FOREIGN KEY (nivel_id) REFERENCES evaluaciones.niveles(nivel_id);


--
-- TOC entry 3474 (class 2606 OID 26639)
-- Name: estudiantes estudiantes_bachillerato_id_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.estudiantes
    ADD CONSTRAINT estudiantes_bachillerato_id_fkey FOREIGN KEY (bachillerato_id) REFERENCES principal.bachilleratos(bachillerato_id);


--
-- TOC entry 3475 (class 2606 OID 26644)
-- Name: estudiantes estudiantes_relation_1; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.estudiantes
    ADD CONSTRAINT estudiantes_relation_1 FOREIGN KEY (grado_id) REFERENCES principal.grados(grado_id);


--
-- TOC entry 3491 (class 2606 OID 26649)
-- Name: familiares familiares_estudiante_id_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.familiares
    ADD CONSTRAINT familiares_estudiante_id_fkey FOREIGN KEY (estudiante_id) REFERENCES principal.estudiantes(estudiante_id);


--
-- TOC entry 3476 (class 2606 OID 26654)
-- Name: grados grados_relation_1; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.grados
    ADD CONSTRAINT grados_relation_1 FOREIGN KEY (niveles_estudio_id) REFERENCES principal.niveles_estudios(niveles_estudios_id);


--
-- TOC entry 3477 (class 2606 OID 26659)
-- Name: grados grados_relation_3; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.grados
    ADD CONSTRAINT grados_relation_3 FOREIGN KEY (seccion_id) REFERENCES principal.secciones(seccion_id);


--
-- TOC entry 3478 (class 2606 OID 26664)
-- Name: grados grados_turnos_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.grados
    ADD CONSTRAINT grados_turnos_fkey FOREIGN KEY (turno_id) REFERENCES principal.turnos(turno_id);


--
-- TOC entry 3479 (class 2606 OID 26669)
-- Name: maestros maestros_materias_id_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.maestros
    ADD CONSTRAINT maestros_materias_id_fkey FOREIGN KEY (materia_id) REFERENCES principal.materias(materia_id) ON DELETE SET NULL;


--
-- TOC entry 3480 (class 2606 OID 26674)
-- Name: maestros maestros_rol_id_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.maestros
    ADD CONSTRAINT maestros_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES principal.roles(rol_id);


--
-- TOC entry 3481 (class 2606 OID 26679)
-- Name: maestros maestros_turnos_id_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.maestros
    ADD CONSTRAINT maestros_turnos_id_fkey FOREIGN KEY (turno_id) REFERENCES principal.turnos(turno_id) ON DELETE SET NULL;


--
-- TOC entry 3492 (class 2606 OID 26684)
-- Name: orientaciones_log orientaciones_log_maestro_id_fkey; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.orientaciones_log
    ADD CONSTRAINT orientaciones_log_maestro_id_fkey FOREIGN KEY (maestro_id) REFERENCES principal.maestros(maestro_id);


--
-- TOC entry 3482 (class 2606 OID 26689)
-- Name: orientadores orientadores_relation_1; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.orientadores
    ADD CONSTRAINT orientadores_relation_1 FOREIGN KEY (maestro_id) REFERENCES principal.maestros(maestro_id);


--
-- TOC entry 3483 (class 2606 OID 26694)
-- Name: orientadores orientadores_relation_2; Type: FK CONSTRAINT; Schema: principal; Owner: postgres
--

ALTER TABLE ONLY principal.orientadores
    ADD CONSTRAINT orientadores_relation_2 FOREIGN KEY (grado_id) REFERENCES principal.grados(grado_id);


-- Completed on 2026-08-23 21:53:30

--
-- PostgreSQL database dump complete
--

\unrestrict iZt6gIZ1wETF3OObo5CefeWTSBCgeVTUapIoIYdVaeVdYOmmhkClckIAQenIwHN

