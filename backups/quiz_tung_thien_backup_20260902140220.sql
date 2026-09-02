--
-- PostgreSQL database dump
--

\restrict nW4cgJ9fQhRNrfS32wnwog9Bfg9uqhVMa7HPQKspElwWjFe26CLgcaQEkNH85cA

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(255) NOT NULL,
    organization character varying(255) NOT NULL,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    submitted_at timestamp with time zone,
    score integer,
    duration_ms bigint,
    status character varying(50) DEFAULT 'IN_PROGRESS'::character varying NOT NULL,
    answers jsonb,
    client_fingerprint character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_attempt_status CHECK (((status)::text = ANY ((ARRAY['IN_PROGRESS'::character varying, 'SUBMITTED'::character varying])::text[])))
);


ALTER TABLE public.attempts OWNER TO postgres;

--
-- Name: quiz_state; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_state (
    id integer DEFAULT 1 NOT NULL,
    state character varying(20) DEFAULT 'WAITING'::character varying NOT NULL,
    title character varying(255) DEFAULT 'Hội thi Trắc nghiệm Kiến thức — Phường Tùng Thiện'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_single_row CHECK ((id = 1)),
    CONSTRAINT chk_valid_state CHECK (((state)::text = ANY ((ARRAY['WAITING'::character varying, 'RUNNING'::character varying, 'CLOSED'::character varying, 'RESULT'::character varying])::text[])))
);


ALTER TABLE public.quiz_state OWNER TO postgres;

--
-- Data for Name: attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attempts (id, full_name, organization, started_at, submitted_at, score, duration_ms, status, answers, client_fingerprint, created_at) FROM stdin;
ae7c36bf-b7ee-44e7-9449-32771a9207ad	Kiểm Thử Bảo Mật	Đoàn Thanh niên Cộng sản Hồ Chí Minh phường	2026-09-02 20:59:46.809917+07	\N	\N	\N	IN_PROGRESS	\N	\N	2026-09-02 20:59:46.809917+07
3924d930-e509-4d74-bb72-06946145263b	Kiểm Thử Bảo Mật	Đoàn Thanh niên Cộng sản Hồ Chí Minh phường	2026-09-02 21:01:16.675033+07	\N	\N	\N	IN_PROGRESS	\N	\N	2026-09-02 21:01:16.675033+07
\.


--
-- Data for Name: quiz_state; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_state (id, state, title, updated_at) FROM stdin;
1	RUNNING	Hội thi Trắc nghiệm Kiến thức — Phường Tùng Thiện	2026-09-02 21:01:16.627067+07
\.


--
-- Name: attempts attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attempts
    ADD CONSTRAINT attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_state quiz_state_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_state
    ADD CONSTRAINT quiz_state_pkey PRIMARY KEY (id);


--
-- Name: idx_attempts_leaderboard; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attempts_leaderboard ON public.attempts USING btree (score DESC, duration_ms, submitted_at) WHERE ((status)::text = 'SUBMITTED'::text);


--
-- Name: idx_attempts_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attempts_started_at ON public.attempts USING btree (started_at);


--
-- Name: idx_attempts_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attempts_status ON public.attempts USING btree (status);


--
-- Name: idx_attempts_submitted_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attempts_submitted_at ON public.attempts USING btree (submitted_at);


--
-- PostgreSQL database dump complete
--

\unrestrict nW4cgJ9fQhRNrfS32wnwog9Bfg9uqhVMa7HPQKspElwWjFe26CLgcaQEkNH85cA

